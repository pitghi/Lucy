import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { ApiError, GoogleGenAI } from '@google/genai';
import { translate, DEFAULT_MODEL, MAX_INPUT_CHARS, TranslationUnusable } from './query.ts';
import { adresseClient, creerLimiteDebit } from './debit.ts';

/**
 * Service de traduction des demandes en criteres.
 *
 * Il existe pour une seule raison : une cle d'API ne peut pas vivre dans une
 * application mobile, d'ou elle s'extrait en quelques minutes. Ce service la
 * porte, et n'expose qu'un point d'entree qui ne sait rien faire d'autre.
 *
 * Il est volontairement sans etat et sans base : il ne recoit pas de profil,
 * n'en stocke aucun, et ne journalise pas les demandes. C'est ce qui permet de
 * ne pas faire entrer de donnees de sante dans l'infrastructure.
 */

const MODEL = process.env.LUCY_MODEL ?? DEFAULT_MODEL;
const PORT = Number(process.env.PORT ?? 8787);

/**
 * Origine autorisee a appeler le service depuis un navigateur.
 *
 * Vide par defaut, donc refuse : l'application mobile n'a pas besoin de CORS,
 * et l'ouvrir a tous laisserait n'importe quel site consommer le budget
 * d'API. A renseigner pour l'apercu web du depot (`http://localhost:8081`).
 */
const CORS_ORIGIN = process.env.LUCY_CORS_ORIGIN ?? '';

/** Corps maximal accepte, largement au-dessus d'une phrase de recherche. */
const MAX_BODY_BYTES = 4 * 1024;

/** Appels acceptes par minute et par adresse. Zero desactive la limite. */
const RATE_LIMIT = Number(process.env.LUCY_RATE_LIMIT ?? 10);

/**
 * En-tete portant l'adresse du client reel, derriere un proxy. Vide par
 * defaut : voir `adresseClient` pour ce qu'il est prudent d'y mettre.
 */
const IP_HEADER = (process.env.LUCY_IP_HEADER ?? '').toLowerCase();

const limite = creerLimiteDebit(RATE_LIMIT);

/**
 * Le SDK ne lit aucune variable d'environnement de lui-meme : sans cette cle,
 * le service demarrerait et echouerait a chaque recherche. Mieux vaut refuser
 * de demarrer — une machine qui ne repond pas se voit dans les journaux et au
 * controle de sante, une panne par requete ne se voit que chez l'utilisateur.
 */
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY && process.env.NODE_ENV !== 'test') {
  console.error('GEMINI_API_KEY absente : le service ne peut pas traduire.');
  process.exit(1);
}

const client = new GoogleGenAI({ apiKey: API_KEY ?? '' });

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...(CORS_ORIGIN ? { 'access-control-allow-origin': CORS_ORIGIN } : {}),
  });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('corps trop volumineux');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS' && CORS_ORIGIN) {
    res.writeHead(204, {
      'access-control-allow-origin': CORS_ORIGIN,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/sante') {
    return send(res, 200, { statut: 'ok', modele: MODEL });
  }
  if (req.method !== 'POST' || req.url !== '/recherche/criteres') {
    return send(res, 404, { erreur: 'route inconnue' });
  }

  // La limite s'applique avant la lecture du corps et avant tout appel au
  // modele : ce qu'elle protege, c'est la depense, pas le serveur. `/sante`
  // en est exclu, sinon les verifications de l'hebergeur consommeraient le
  // quota de leur propre adresse et finiraient par se voir refuser.
  if (!limite.autorise(adresseClient(req, IP_HEADER))) {
    return send(res, 429, { erreur: 'trop de demandes' });
  }

  let text: unknown;
  try {
    const raw = await readBody(req);
    text = (JSON.parse(raw) as Record<string, unknown>).text;
  } catch {
    return send(res, 400, { erreur: 'corps illisible' });
  }

  if (typeof text !== 'string' || text.trim().length === 0) {
    return send(res, 400, { erreur: 'champ text attendu' });
  }

  try {
    const { query, empty } = await translate(client, text, MODEL);
    // `empty` n'est pas une erreur : l'interface annonce qu'elle n'a rien
    // compris de la demande plutot que de renvoyer un classement par defaut
    // en laissant croire qu'elle a repondu.
    return send(res, 200, { query, empty });
  } catch (error) {
    // Le quota du fournisseur et le plafond local se presentent de la meme
    // facon a l'application : dans les deux cas elle invite a patienter.
    if (error instanceof ApiError && error.status === 429) {
      return send(res, 429, { erreur: 'trop de demandes' });
    }
    if (error instanceof ApiError) {
      console.error('erreur API', error.status, error.message);
      return send(res, 502, { erreur: 'service de traduction indisponible' });
    }
    // Sortie inexploitable : une panne, pas une demande incomprise. La
    // distinction compte — l'application propose de reformuler dans un cas et
    // de reessayer dans l'autre.
    if (error instanceof TranslationUnusable) {
      console.error('reponse inexploitable', error.message);
      return send(res, 502, { erreur: 'service de traduction indisponible' });
    }
    console.error('erreur inattendue', error);
    return send(res, 500, { erreur: 'erreur interne' });
  }
}

export const server = createServer((req, res) => {
  handle(req, res).catch((error: unknown) => {
    console.error('erreur non rattrapee', error);
    if (!res.headersSent) send(res, 500, { erreur: 'erreur interne' });
  });
});

/**
 * Arret propre.
 *
 * L'hebergement eteint la machine des qu'elle est inactive et la rallume a la
 * demande suivante : les arrets sont frequents, pas exceptionnels. Sans ce
 * traitement, Node quitte immediatement sur SIGTERM et coupe la traduction en
 * cours — une recherche perdue a chaque mise en veille. Le delai de grace
 * borne l'attente : une requete bloquee ne doit pas retenir la machine.
 */
function arretPropre(signal: NodeJS.Signals): void {
  console.log(`${signal} recu, arret apres les demandes en cours.`);
  const couperet = setTimeout(() => process.exit(0), 10_000);
  couperet.unref();
  server.close(() => process.exit(0));
}

if (process.env.NODE_ENV !== 'test') {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => arretPropre(signal));
  }

  server.listen(PORT, () => {
    console.log(`Lucy — traduction des demandes sur :${PORT} (modele ${MODEL})`);
    console.log(`Demandes tronquees a ${MAX_INPUT_CHARS} caracteres.`);
    console.log(
      RATE_LIMIT > 0
        ? `Limite : ${RATE_LIMIT} demandes par minute et par adresse.`
        : 'Limite de debit desactivee.',
    );
  });
}

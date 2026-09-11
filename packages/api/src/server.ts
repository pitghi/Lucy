import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { translate, MAX_INPUT_CHARS } from './query.ts';

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

const MODEL = process.env.LUCY_MODEL ?? 'claude-opus-5';
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

const client = new Anthropic();

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
    if (error instanceof Anthropic.RateLimitError) {
      return send(res, 429, { erreur: 'trop de demandes' });
    }
    if (error instanceof Anthropic.APIError) {
      console.error('erreur API', error.status, error.message);
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

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Lucy — traduction des demandes sur :${PORT} (modele ${MODEL})`);
    console.log(`Demandes tronquees a ${MAX_INPUT_CHARS} caracteres.`);
  });
}

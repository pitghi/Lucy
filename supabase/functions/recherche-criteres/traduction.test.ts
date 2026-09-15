import { assertEquals, assert } from 'jsr:@std/assert@1';
import { traiter, type Dependances } from './traduction.ts';

/**
 * Les dependances sont remplacees par des doubles : ces tests verifient la
 * traduction et les garde-fous, pas le modele ni la base. Ce qui doit tenir
 * sans reseau, c'est que rien d'inattendu venu du modele n'atteigne le moteur,
 * et que le plafond s'applique avant toute depense.
 */

/** Sortie complete et anodine, quand le test porte sur autre chose. */
const RIEN = {
  category: null,
  targetConcern: null,
  maxIngredients: null,
  axes: [],
  avoidFragrance: false,
  excludeInci: [],
};

interface Options {
  sortie?: unknown;
  autorise?: boolean;
  erreurDebit?: { message: string } | null;
  erreurModele?: unknown;
  capture?: (params: Record<string, unknown>) => void;
  captureDebit?: (params: Record<string, unknown>) => void;
}

function deps(o: Options = {}): Dependances {
  return {
    mistral: {
      chat: {
        complete: (params: Record<string, unknown>) => {
          o.capture?.(params);
          if (o.erreurModele) throw o.erreurModele;
          const contenu =
            typeof o.sortie === 'string' ? o.sortie : JSON.stringify(o.sortie ?? RIEN);
          return Promise.resolve({ choices: [{ message: { content: contenu } }] });
        },
      },
    },
    base: {
      rpc: (_nom: string, params: Record<string, unknown>) => {
        o.captureDebit?.(params);
        return Promise.resolve({
          data: o.autorise ?? true,
          error: o.erreurDebit ?? null,
        });
      },
    },
  } as unknown as Dependances;
}

function demande(text: string, ip = '203.0.113.7'): Request {
  return new Request('https://exemple/recherche-criteres', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ text }),
  });
}

Deno.test('les champs nuls du modele deviennent des criteres absents', async () => {
  const res = await traiter(
    demande('une creme hydratante avec maximum 9 ingredients, bonne pour ma peau'),
    deps({
      sortie: {
        category: 'leave_on_face',
        targetConcern: null,
        maxIngredients: 9,
        axes: ['skin', 'env'],
        avoidFragrance: false,
        excludeInci: [],
      },
    }),
  );

  assertEquals(res.status, 200);
  const corps = await res.json();
  assertEquals(corps.empty, false);
  assertEquals(corps.query, {
    category: 'leave_on_face',
    maxIngredients: 9,
    axes: ['skin', 'env'],
  });
  // Un champ nul ne doit pas apparaitre, meme a undefined : il serait compte
  // comme un critere compris par l'interface.
  assert(!('targetConcern' in corps.query));
  assert(!('avoidFragrance' in corps.query));
});

Deno.test('une valeur hors enumeration est ecartee, pas transmise au moteur', async () => {
  const res = await traiter(
    demande('peu importe'),
    deps({
      sortie: {
        category: 'leave_on_hair',
        targetConcern: 'wrinkles',
        maxIngredients: 0,
        axes: ['prix'],
        avoidFragrance: false,
        excludeInci: [],
      },
    }),
  );

  assertEquals((await res.json()).query, {});
});

Deno.test('une phrase dont rien ne se tire est signalee comme vide', async () => {
  const corps = await (await traiter(demande('bonjour'), deps())).json();
  assertEquals(corps.query, {});
  assertEquals(corps.empty, true);
});

Deno.test('une sortie illisible est une panne, pas une demande incomprise', async () => {
  // La distinction porte a consequence : l'interface propose de reformuler
  // dans un cas et de reessayer dans l'autre.
  const res = await traiter(demande('une creme'), deps({ sortie: '{"category": "leave_on_fa' }));
  assertEquals(res.status, 502);
});

Deno.test('une sortie vide est une panne', async () => {
  const res = await traiter(demande('une creme'), deps({ sortie: '' }));
  assertEquals(res.status, 502);
});

Deno.test('le plafond refuse avant tout appel au modele', async () => {
  let appele = false;
  const res = await traiter(
    demande('une creme'),
    deps({ autorise: false, capture: () => (appele = true) }),
  );

  assertEquals(res.status, 429);
  // Ce que le plafond protege, c'est la depense : appeler le modele puis
  // refuser ne protegerait rien.
  assert(!appele, 'le modele ne doit pas etre appele quand le plafond refuse');
});

Deno.test('un compteur en panne refuse, il ne laisse pas passer', async () => {
  // Un plafond qui s'efface des qu'il tombe ne protege rien le jour ou il
  // compte.
  let appele = false;
  const res = await traiter(
    demande('une creme'),
    deps({ erreurDebit: { message: 'base injoignable' }, capture: () => (appele = true) }),
  );

  assertEquals(res.status, 503);
  assert(!appele);
});

Deno.test('l adresse est hachee, jamais transmise en clair', async () => {
  let params: Record<string, unknown> = {};
  await traiter(demande('une creme', '198.51.100.42'), deps({ captureDebit: (p) => (params = p) }));

  const empreinte = String(params.p_ip_hash);
  assert(!empreinte.includes('198.51.100.42'), 'l adresse ne doit pas apparaitre');
  assertEquals(empreinte.length, 64, 'une empreinte SHA-256 fait 64 caracteres hexadecimaux');
});

Deno.test('deux adresses differentes donnent deux empreintes differentes', async () => {
  const empreintes: string[] = [];
  const capte = (p: Record<string, unknown>) => empreintes.push(String(p.p_ip_hash));

  await traiter(demande('a', '203.0.113.1'), deps({ captureDebit: capte }));
  await traiter(demande('a', '203.0.113.2'), deps({ captureDebit: capte }));

  assert(empreintes[0] !== empreintes[1]);
});

Deno.test('la demande est tronquee et encadree avant d atteindre le modele', async () => {
  // 1000 caracteres : au-dela de la troncature a 500, mais en deca des 4 Ko de
  // corps acceptes — sinon la demande serait refusee avant meme d'etre lue, et
  // ce test ne verifierait plus la troncature.
  let params: Record<string, unknown> = {};
  await traiter(demande('a'.repeat(1000)), deps({ capture: (p) => (params = p) }));

  const messages = params.messages as { role: string; content: string }[];
  const envoye = messages.find((m) => m.role === 'user')!.content;

  assert(envoye.length < 1000);
  assert(envoye.startsWith('<demande>'));
  assert(envoye.endsWith('</demande>'));
});

Deno.test('la sortie structuree est imposee au modele', async () => {
  let params: Record<string, unknown> = {};
  await traiter(demande('une creme'), deps({ capture: (p) => (params = p) }));

  const format = params.responseFormat as Record<string, unknown>;
  assertEquals(format.type, 'json_schema');

  const schema = format.jsonSchema as Record<string, unknown>;
  // Impose, pas suggere : sinon le modele reste libre d'ajouter ou d'omettre
  // un champ.
  assertEquals(schema.strict, true);
  assertEquals(
    Object.keys((schema.schemaDefinition as { properties: object }).properties).sort(),
    ['avoidFragrance', 'axes', 'category', 'excludeInci', 'maxIngredients', 'targetConcern'],
  );
});

Deno.test('aucune donnee de profil n est transmise au modele', async () => {
  // Garde-fou de conception : le type de peau et les intolerances sont des
  // donnees de sante. Si un jour quelqu'un les ajoute a l'appel, ce test casse.
  let params: Record<string, unknown> = {};
  await traiter(demande('une creme pour peau sensible'), deps({ capture: (p) => (params = p) }));

  const envoye = JSON.stringify(params);
  for (const interdit of ['skinType', 'notTolerated', 'tolerated', 'concerns']) {
    assert(!envoye.includes(interdit), `${interdit} ne doit pas quitter l appareil`);
  }
});

Deno.test('le quota du fournisseur se presente comme le plafond local', async () => {
  const res = await traiter(demande('une creme'), deps({ erreurModele: { statusCode: 429 } }));
  assertEquals(res.status, 429);
});

Deno.test('un corps illisible est refuse sans appeler le modele', async () => {
  let appele = false;
  const req = new Request('https://exemple/recherche-criteres', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'pas du json',
  });

  const res = await traiter(req, deps({ capture: () => (appele = true) }));
  assertEquals(res.status, 400);
  assert(!appele);
});

Deno.test('une demande vide est refusee', async () => {
  assertEquals((await traiter(demande('   '), deps())).status, 400);
});

Deno.test('un corps demesure est refuse avant d etre analyse', async () => {
  // Deux bornes se succedent : le corps accepte (4 Ko) et la demande retenue
  // (500 caracteres). La premiere protege la lecture, la seconde la depense.
  let appele = false;
  const req = new Request('https://exemple/recherche-criteres', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'a'.repeat(10_000) }),
  });

  const res = await traiter(req, deps({ capture: () => (appele = true) }));
  assertEquals(res.status, 400);
  assert(!appele);
});

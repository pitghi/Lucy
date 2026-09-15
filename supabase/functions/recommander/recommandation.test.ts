import { assertEquals, assert } from 'jsr:@std/assert@1';
import { decrireProfil, lireSortie, traiter, validerReponse } from './recommandation.ts';

const demande = (corps: unknown, ip = '203.0.113.7') =>
  new Request('http://local/recommander', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify(corps),
  });

function deps(options: {
  sortie?: unknown;
  debit?: boolean;
  capture?: (r: unknown) => void;
} = {}) {
  return {
    mistral: {
      beta: {
        conversations: {
          start: (r: unknown) => {
            options.capture?.(r);
            return Promise.resolve(
              options.sortie ?? {
                outputs: [
                  {
                    type: 'message.output',
                    content: JSON.stringify({ suggestions: [], reserves: [] }),
                  },
                ],
              },
            );
          },
        },
      },
    },
    base: {
      rpc: () => Promise.resolve({ data: options.debit ?? true, error: null }),
    },
  } as never;
}

Deno.test('le profil declare est transmis au modele, en clair', () => {
  const decrit = decrireProfil({
    typeDePeau: 'sensible',
    nonToleres: ['ALCOHOL DENAT'],
    sansParfum: true,
  });
  assert(decrit?.includes('sensible'));
  assert(decrit?.includes('ALCOHOL DENAT'));
  assert(decrit?.includes('parfum'));
});

Deno.test('un profil vide ne fait rien partir', () => {
  assertEquals(decrireProfil(undefined), null);
  assertEquals(decrireProfil({}), null);
});

Deno.test('la recherche en ligne est demandee, et la conversation non conservee', async () => {
  let recu: Record<string, unknown> = {};
  await traiter(demande({ texte: 'une creme apaisante' }), deps({ capture: (r) => (recu = r as never) }));
  assertEquals((recu.tools as { type: string }[])[0].type, 'web_search');
  // Une conversation portant un profil de peau ne se laisse pas stocker.
  assertEquals(recu.store, false);
});

Deno.test('le profil apparait dans l entree quand il est fourni', async () => {
  let recu: Record<string, unknown> = {};
  await traiter(
    demande({ texte: 'une creme', profil: { typeDePeau: 'sensible' } }),
    deps({ capture: (r) => (recu = r as never) }),
  );
  assert(String(recu.inputs).includes('<profil>'));
  assert(String(recu.inputs).includes('sensible'));
});

Deno.test('aucun profil : rien de personnel ne part', async () => {
  let recu: Record<string, unknown> = {};
  await traiter(demande({ texte: 'une creme' }), deps({ capture: (r) => (recu = r as never) }));
  assert(!String(recu.inputs).includes('<profil>'));
});

Deno.test('un produit sans nom est ecarte, pas affiche vide', () => {
  const r = validerReponse({
    suggestions: [{ nom: '', marque: 'X', pourquoi: 'y', sources: [] }, { nom: 'A', marque: 'B', pourquoi: 'c', sources: [] }],
    reserves: [],
  });
  assertEquals(r.suggestions.length, 1);
  assertEquals(r.suggestions[0].nom, 'A');
});

Deno.test('une source qui n est pas une adresse est ecartee', () => {
  const r = validerReponse({
    suggestions: [{ nom: 'A', marque: 'B', pourquoi: 'c', sources: ['de memoire', 'https://ok.example'] }],
    reserves: [],
  });
  assertEquals(r.suggestions[0].sources, ['https://ok.example']);
});

Deno.test('la liste est bornee a cinq', () => {
  const s = Array.from({ length: 9 }, (_, i) => ({ nom: `p${i}`, marque: 'm', pourquoi: '', sources: [] }));
  assertEquals(validerReponse({ suggestions: s, reserves: [] }).suggestions.length, 5);
});

Deno.test('le plafond refuse avant tout appel au modele', async () => {
  let appele = false;
  const r = await traiter(
    demande({ texte: 'une creme' }),
    deps({ debit: false, capture: () => (appele = true) }),
  );
  assertEquals(r.status, 429);
  assertEquals(appele, false);
});

Deno.test('une sortie vide est une panne, pas une demande incomprise', async () => {
  const r = await traiter(demande({ texte: 'une creme' }), deps({ sortie: { outputs: [] } }));
  assertEquals(r.status, 502);
});

Deno.test('une demande vide est refusee', async () => {
  assertEquals((await traiter(demande({ texte: '   ' }), deps())).status, 400);
});

Deno.test('la sortie se lit meme en morceaux', () => {
  const t = lireSortie({
    outputs: [{ type: 'message.output', content: [{ text: '{"a":' }, { text: '1}' }] }],
  });
  assertEquals(t, '{"a":1}');
});

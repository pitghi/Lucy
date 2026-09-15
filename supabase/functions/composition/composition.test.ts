import { assertEquals, assert } from 'jsr:@std/assert@1';
import { lireSortie, traiter, validerComposition } from './composition.ts';

const LISTE = 'AQUA, GLYCERIN, CETEARYL ALCOHOL, NIACINAMIDE, PHENOXYETHANOL, PARFUM';

const demande = (corps: unknown) =>
  new Request('http://local/composition', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.9' },
    body: JSON.stringify(corps),
  });

const deps = (o: { sortie?: unknown; debit?: boolean; capture?: (r: unknown) => void } = {}) =>
  ({
    mistral: {
      beta: {
        conversations: {
          start: (r: unknown) => {
            o.capture?.(r);
            return Promise.resolve(
              o.sortie ?? {
                outputs: [{ type: 'message.output', content: JSON.stringify({
                  inci: LISTE, nomTrouve: 'X', source: 'https://e.test', reserve: '',
                }) }],
              },
            );
          },
        },
      },
    },
    base: { rpc: () => Promise.resolve({ data: o.debit ?? true, error: null }) },
  }) as never;

Deno.test('une phrase n est pas une composition', () => {
  const c = validerComposition({ inci: 'Je n ai pas trouve la liste des ingredients.', reserve: '' });
  assertEquals(c.inci, null);
  assert(c.reserve.length > 0);
});

Deno.test('un debut de liste n est pas une composition', () => {
  assertEquals(validerComposition({ inci: 'AQUA, GLYCERIN', reserve: '' }).inci, null);
});

Deno.test('une vraie liste est retenue telle quelle', () => {
  const c = validerComposition({ inci: LISTE, nomTrouve: 'Creme X', source: 'https://e.test', reserve: '' });
  assertEquals(c.inci, LISTE);
  assertEquals(c.nomTrouve, 'Creme X');
});

Deno.test('le nom trouve est rendu, pour pouvoir refuser une autre variante', () => {
  const c = validerComposition({ inci: LISTE, nomTrouve: 'Toleriane Sensitive RICHE', source: null, reserve: '' });
  assertEquals(c.nomTrouve, 'Toleriane Sensitive RICHE');
});

Deno.test('une source qui n est pas une adresse est ecartee', () => {
  assertEquals(validerComposition({ inci: LISTE, source: 'de memoire', reserve: '' }).source, null);
});

Deno.test('aucun profil ne peut partir par ce service', async () => {
  let recu: Record<string, unknown> = {};
  await traiter(
    demande({ nom: 'Creme X', marque: 'M', profil: { typeDePeau: 'sensible' } }),
    deps({ capture: (r) => (recu = r as never) }),
  );
  const entree = String(recu.inputs);
  assert(!entree.includes('sensible'), 'rien du profil ne doit atteindre le modele');
  assert(entree.includes('Creme X'));
});

Deno.test('la recherche en ligne est demandee, la conversation non conservee', async () => {
  let recu: Record<string, unknown> = {};
  await traiter(demande({ nom: 'Creme X' }), deps({ capture: (r) => (recu = r as never) }));
  assertEquals((recu.tools as { type: string }[])[0].type, 'web_search');
  assertEquals(recu.store, false);
});

Deno.test('un produit non designe est refuse', async () => {
  assertEquals((await traiter(demande({ nom: '  ' }), deps())).status, 400);
});

Deno.test('le plafond refuse avant tout appel au modele', async () => {
  let appele = false;
  const r = await traiter(demande({ nom: 'X' }), deps({ debit: false, capture: () => (appele = true) }));
  assertEquals(r.status, 429);
  assertEquals(appele, false);
});

Deno.test('la sortie se lit meme en morceaux', () => {
  assertEquals(lireSortie({ outputs: [{ type: 'message.output', content: [{ text: '{"a":' }, { text: '1}' }] }] }), '{"a":1}');
});

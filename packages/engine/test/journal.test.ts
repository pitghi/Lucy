import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestIntolerances, SUGGESTION_THRESHOLD } from '../src/reco/journal.ts';
import { recommend } from '../src/reco/recommend.ts';
import { estimateTexture } from '../src/scoring/texture.ts';
import { parseInciList } from '../src/inci/parse.ts';
import { resolveAll } from '../src/inci/resolve.ts';
import { estimateConcentrations } from '../src/concentration/estimate.ts';
import type { Product, SkinProfile, ToleranceEntry } from '../src/types.ts';

const catalog: Product[] = [
  {
    barcode: 'A',
    name: 'Creme A',
    brand: 'Alpha',
    category: 'leave_on_face',
    inciList: 'Aqua, Glycerin, Squalane, Limonene, Xanthan Gum, Phenoxyethanol',
  },
  {
    barcode: 'B',
    name: 'Creme B',
    brand: 'Beta',
    category: 'leave_on_face',
    inciList: 'Aqua, Glycerin, Caprylic/Capric Triglyceride, Limonene, Tocopherol, Phenoxyethanol',
  },
  {
    barcode: 'C',
    name: 'Creme C',
    brand: 'Gamma',
    category: 'leave_on_face',
    inciList: 'Aqua, Glycerin, Panthenol, Limonene, Citric Acid, Phenoxyethanol',
  },
  {
    barcode: 'D',
    name: 'Creme D',
    brand: 'Delta',
    category: 'leave_on_face',
    inciList: 'Aqua, Glycerin, Squalane, Panthenol, Xanthan Gum, Phenoxyethanol',
  },
];

function profile(journal: ToleranceEntry[] = []): SkinProfile {
  return {
    skinType: 'normal',
    concerns: [],
    tolerated: [],
    notTolerated: [],
    journal,
  };
}

const rejet = (barcode: string, name: string): ToleranceEntry => ({
  barcode,
  name,
  verdict: 'unsuited',
  date: '2026-09-11',
});

test('un produit juge non convenable n est plus propose', () => {
  const results = recommend(catalog, profile([rejet('A', 'Creme A')]), {
    category: 'leave_on_face',
  });
  assert.ok(!results.some((r) => r.product.barcode === 'A'));
  assert.ok(results.length > 0, 'les autres produits restent proposes');
});

test('un produit juge convenable reste propose', () => {
  const journal: ToleranceEntry[] = [
    { barcode: 'A', name: 'Creme A', verdict: 'suited', date: '2026-09-11' },
  ];
  const results = recommend(catalog, profile(journal), { category: 'leave_on_face' });
  assert.ok(results.some((r) => r.product.barcode === 'A'));
});

test('un seul rejet ne condamne aucun ingredient', () => {
  // C'est la limite a ne pas franchir : un produit porte quinze ingredients,
  // et rien ne dit lequel a pose probleme.
  const suggestions = suggestIntolerances(profile([rejet('A', 'Creme A')]), catalog);
  assert.deepEqual(suggestions, []);
});

test('un ingredient commun a assez de rejets est suggere, pas applique', () => {
  const journal = [rejet('A', 'Creme A'), rejet('B', 'Creme B'), rejet('C', 'Creme C')];
  const user = profile(journal);
  const suggestions = suggestIntolerances(user, catalog);

  const limonene = suggestions.find((s) => s.inci === 'limonene');
  assert.ok(limonene, `limonene attendu, obtenu ${JSON.stringify(suggestions.map((s) => s.inci))}`);
  assert.equal(limonene.inRejected, SUGGESTION_THRESHOLD);
  assert.equal(limonene.products.length, 3);

  // La suggestion ne modifie pas le profil : l'utilisateur tranche.
  assert.deepEqual(user.notTolerated, []);
});

test('un ingredient present dans un produit accepte n est pas suggere', () => {
  // L'experience le disculpe : le retenir reviendrait a accuser ce que
  // l'utilisateur a lui-meme bien tolere.
  const journal: ToleranceEntry[] = [
    rejet('A', 'Creme A'),
    rejet('B', 'Creme B'),
    rejet('C', 'Creme C'),
    { barcode: 'D', name: 'Creme D', verdict: 'suited', date: '2026-09-11' },
  ];
  const suggestions = suggestIntolerances(profile(journal), catalog);
  assert.ok(!suggestions.some((s) => s.inci === 'glycerin'));
  assert.ok(!suggestions.some((s) => s.inci === 'panthenol'));
});

test('les ingredients omnipresents ne sont jamais suggeres', () => {
  const journal = [rejet('A', 'Creme A'), rejet('B', 'Creme B'), rejet('C', 'Creme C')];
  const suggestions = suggestIntolerances(profile(journal), catalog).map((s) => s.inci);
  for (const banal of ['aqua', 'glycerin', 'phenoxyethanol']) {
    assert.ok(!suggestions.includes(banal), `${banal} ne doit pas etre suggere`);
  }
});

test('une intolerance deja declaree n est pas suggeree a nouveau', () => {
  const user = profile([rejet('A', 'Creme A'), rejet('B', 'Creme B'), rejet('C', 'Creme C')]);
  user.notTolerated = ['limonene'];
  const suggestions = suggestIntolerances(user, catalog);
  assert.ok(!suggestions.some((s) => s.inci === 'limonene'));
});

function texture(inciList: string) {
  const parsed = resolveAll(parseInciList(inciList));
  return estimateTexture(parsed, estimateConcentrations(parsed, 'leave_on_face', []));
}

test('une formule chargee en corps gras est estimee riche', () => {
  const estimate = texture(
    'Aqua, Butyrospermum Parkii Butter, Caprylic/Capric Triglyceride, Squalane, ' +
      'Glycerin, Cetearyl Alcohol, Xanthan Gum, Phenoxyethanol',
  );
  assert.equal(estimate.texture, 'rich');
  assert.ok(estimate.fattyInci.length >= 3);
});

test('une formule sans corps gras notable est estimee fluide', () => {
  const estimate = texture('Aqua, Glycerin, Niacinamide, Xanthan Gum, Phenoxyethanol, Squalane');
  assert.equal(estimate.texture, 'fluid');
});

test('la masse estimee des corps gras ne sert jamais a trancher', () => {
  // Elle est affichee a titre indicatif, mais sur une formule reelle son
  // intervalle chevauche tous les seuils plausibles : c'est l'ordre de la
  // liste qui decide.
  const estimate = texture(
    'Aqua, Butyrospermum Parkii Butter, Caprylic/Capric Triglyceride, Squalane, ' +
      'Glycerin, Cetearyl Alcohol, Xanthan Gum, Phenoxyethanol',
  );
  assert.ok(estimate.fatty.min < 15 && estimate.fatty.max > 15, 'intervalle a cheval attendu');
  assert.equal(estimate.texture, 'rich', 'la decision ne depend pas de cet intervalle');
});

test("l'estimation de texture ne depasse jamais une confiance moyenne", () => {
  // La texture depend aussi de l'emulsionnant, du gelifiant et du procede,
  // dont rien ne se lit dans une liste d'ingredients.
  for (const liste of [
    'Aqua, Butyrospermum Parkii Butter, Squalane, Glycerin, Phenoxyethanol',
    'Aqua, Glycerin, Niacinamide, Xanthan Gum, Phenoxyethanol',
  ]) {
    assert.notEqual(texture(liste).confidence, 'high');
  }
});

test('une texture indeterminee n ecarte pas le produit du filtre', () => {
  // Le filtre retire ce qui contredit la preference, pas ce qui ne la
  // confirme pas : sinon une estimation prudente devient une exclusion.
  const results = recommend(catalog, profile(), {
    category: 'leave_on_face',
    texture: 'rich',
  });
  const fluides = results.filter(
    (r) => texture(r.product.inciList).texture === 'fluid',
  );
  assert.equal(fluides.length, 0, 'aucun produit nettement fluide ne doit passer');
});

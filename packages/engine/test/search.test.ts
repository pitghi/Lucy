import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search, parseSearchQuery, AXIS_FLOOR } from '../src/reco/search.ts';
import { parseInciList } from '../src/inci/parse.ts';
import type { Product, SkinProfile } from '../src/types.ts';

const catalog: Product[] = [
  {
    barcode: '1',
    name: 'Creme courte',
    brand: 'Alpha',
    category: 'leave_on_face',
    inciList: 'Aqua, Glycerin, Squalane, Xanthan Gum, Tocopherol, Phenoxyethanol',
  },
  {
    barcode: '2',
    name: 'Creme longue',
    brand: 'Beta',
    category: 'leave_on_face',
    inciList:
      'Aqua, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, ' +
      'Squalane, Panthenol, Xanthan Gum, Tocopherol, Citric Acid, Phenoxyethanol, ' +
      'Ethylhexylglycerin',
  },
  {
    barcode: '3',
    name: 'Gel parfume',
    brand: 'Gamma',
    category: 'leave_on_face',
    inciList: 'Aqua, Alcohol Denat, Parfum, Limonene, Glycerin, Phenoxyethanol',
  },
  {
    barcode: '4',
    name: 'Nettoyant moussant',
    brand: 'Alpha',
    category: 'rinse_off_face',
    inciList: 'Aqua, Coco-Glucoside, Glycerin, Xanthan Gum, Sodium Benzoate',
  },
];

const profile: SkinProfile = {
  skinType: 'normal',
  concerns: ['dryness'],
  tolerated: [],
  notTolerated: [],
};

test('le nombre maximal d ingredients est un filtre, pas une preference', () => {
  const { results } = search(catalog, profile, { maxIngredients: 6 });
  assert.ok(results.length > 0);
  for (const r of results) {
    assert.ok(
      parseInciList(r.product.inciList).length <= 6,
      `${r.product.name} depasse la limite demandee`,
    );
  }
  assert.ok(!results.some((r) => r.product.name === 'Creme longue'));
});

test('un axe demande devient un plancher, jamais un terme de moyenne', () => {
  const { results } = search(catalog, profile, { axes: ['skin'] });
  for (const r of results) {
    assert.ok(
      r.assessment.skin.value >= AXIS_FLOOR,
      `${r.product.name} passe sous le plancher de tolerance`,
    );
  }
});

test('les deux axes demandes s appliquent ensemble, sans se compenser', () => {
  // Un produit excellent sur un axe ne doit pas racheter sa note sur l'autre :
  // c'est precisement le defaut des notations qui fusionnent les deux.
  const { results } = search(catalog, profile, { axes: ['skin', 'env'] });
  for (const r of results) {
    assert.ok(r.assessment.skin.value >= AXIS_FLOOR);
    assert.ok(r.assessment.env.value >= AXIS_FLOOR);
  }
});

test('la categorie demandee est respectee', () => {
  const { results } = search(catalog, profile, { category: 'rinse_off_face' });
  assert.ok(results.length > 0);
  for (const r of results) assert.equal(r.product.category, 'rinse_off_face');
});

test('un INCI exclu nommement ecarte le produit', () => {
  const { results } = search(catalog, profile, { excludeInci: ['Parfum'] });
  assert.ok(!results.some((r) => r.product.name === 'Gel parfume'));
});

test('chaque resultat porte les criteres qu il satisfait', () => {
  const { results } = search(catalog, profile, {
    category: 'leave_on_face',
    maxIngredients: 6,
    axes: ['skin', 'env'],
  });
  assert.ok(results.length > 0);
  const first = results[0];
  assert.ok(first);
  const labels = first.matched.map((m) => m.label);
  assert.ok(labels.some((l) => l.includes('6 ingredients')));
  assert.ok(labels.includes('tolerance cutanee'));
  assert.ok(labels.includes('impact environnemental'));
  // Un critere sans constat mesure ne vaut rien : il doit porter sa preuve.
  for (const m of first.matched) assert.ok(m.evidence.length > 0);
});

test('un axe intenable est relache et signale, plutot que de rendre une liste vide', () => {
  const mediocre: Product[] = [
    {
      barcode: '9',
      name: 'Formule agressive',
      brand: 'Delta',
      category: 'leave_on_face',
      inciList: 'Aqua, Sodium Lauryl Sulfate, Alcohol Denat, Parfum, Limonene, Geraniol',
    },
  ];
  const { results, unmet } = search(mediocre, profile, { axes: ['skin'] });
  assert.equal(results.length, 0, 'aucun produit ne merite d etre propose ici');
  assert.ok(unmet.length > 0, 'le critere non tenu doit etre annonce');
  assert.ok(unmet[0]?.includes('tolerance'));
});

test('un axe trop exigeant est relache quand le catalogue a mieux a offrir', () => {
  // Ici un produit correct existe : plutot qu'une liste vide, on le propose en
  // annoncant que le plancher demande n'est pas tenu.
  const melange: Product[] = [
    catalog[0] as Product,
    {
      barcode: '9',
      name: 'Formule agressive',
      brand: 'Delta',
      category: 'leave_on_face',
      inciList: 'Aqua, Sodium Lauryl Sulfate, Alcohol Denat, Parfum, Limonene, Geraniol',
    },
  ];
  const strict = search(melange, profile, { axes: ['skin'], maxIngredients: 6 });
  assert.ok(strict.results.length > 0);
});

test('une recherche sans resultat dit quel critere est en cause', () => {
  const { results, unmet } = search(catalog, profile, { maxIngredients: 2 });
  assert.equal(results.length, 0);
  assert.ok(
    unmet.some((u) => u.includes('2 ingredients')),
    `attendu une mention du nombre d ingredients, obtenu ${JSON.stringify(unmet)}`,
  );
});

test('la categorie n est jamais relachee, meme sans resultat', () => {
  // Relacher une categorie explicitement demandee rendrait la reponse absurde :
  // un nettoyant propose a qui demande une creme.
  const { results } = search(catalog, profile, {
    category: 'leave_on_body',
    axes: ['skin'],
  });
  assert.equal(results.length, 0);
});

test('une sortie de modele conforme est acceptee', () => {
  const query = parseSearchQuery({
    category: 'leave_on_face',
    targetConcern: 'dryness',
    maxIngredients: 9,
    axes: ['skin', 'env'],
    avoidFragrance: true,
    excludeInci: ['Parfum'],
  });
  assert.deepEqual(query, {
    category: 'leave_on_face',
    targetConcern: 'dryness',
    maxIngredients: 9,
    axes: ['skin', 'env'],
    avoidFragrance: true,
    excludeInci: ['Parfum'],
  });
});

test('une valeur inventee par le modele est ecartee, jamais devinee', () => {
  const query = parseSearchQuery({
    category: 'leave_on_hair',
    targetConcern: 'wrinkles',
    axes: ['skin', 'prix'],
    maxIngredients: -3,
  });
  assert.equal(query.category, undefined);
  assert.equal(query.targetConcern, undefined);
  assert.equal(query.maxIngredients, undefined);
  assert.deepEqual(query.axes, ['skin']);
});

test('une sortie de modele inexploitable donne une requete vide, pas une erreur', () => {
  for (const raw of [null, undefined, 'texte libre', 42, []]) {
    assert.deepEqual(parseSearchQuery(raw), {});
  }
});

test('le nombre d ingredients demande reste un entier plausible', () => {
  assert.equal(parseSearchQuery({ maxIngredients: 9.5 }).maxIngredients, undefined);
  assert.equal(parseSearchQuery({ maxIngredients: 10_000 }).maxIngredients, undefined);
  assert.equal(parseSearchQuery({ maxIngredients: '9' }).maxIngredients, undefined);
});

test('les exclusions sont bornees en nombre', () => {
  const many = Array.from({ length: 50 }, (_, i) => `Ingredient ${i}`);
  const query = parseSearchQuery({ excludeInci: many });
  assert.ok((query.excludeInci?.length ?? 0) <= 20);
});

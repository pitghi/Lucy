import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from '../src/reco/recommend.ts';
import type { Product, SkinProfile } from '../src/types.ts';

const catalog: Product[] = [
  {
    barcode: '1',
    name: 'Serum niacinamide 5 %',
    brand: 'Alpha',
    category: 'leave_on_face',
    inciList: 'Aqua, Niacinamide, Glycerin, Xanthan Gum, Phenoxyethanol',
    claims: [{ inci: 'niacinamide', percent: 5 }],
  },
  {
    barcode: '2',
    name: 'Creme neutre',
    brand: 'Beta',
    category: 'leave_on_face',
    inciList: 'Aqua, Glycerin, Squalane, Cetearyl Alcohol, Xanthan Gum, Phenoxyethanol',
  },
  {
    barcode: '3',
    name: 'Gel parfume irritant',
    brand: 'Gamma',
    category: 'leave_on_face',
    inciList: 'Aqua, Alcohol Denat, Parfum, Limonene, Sodium Lauryl Sulfate, Glycerin',
  },
  {
    barcode: '4',
    name: 'Nettoyant moussant',
    brand: 'Alpha',
    category: 'rinse_off_face',
    inciList: 'Aqua, Coco-Glucoside, Glycerin, Xanthan Gum, Sodium Benzoate',
  },
  {
    barcode: '5',
    name: 'Serum niacinamide bis',
    brand: 'Alpha',
    category: 'leave_on_face',
    inciList: 'Aqua, Niacinamide, Glycerin, Pentylene Glycol, Phenoxyethanol',
    claims: [{ inci: 'niacinamide', percent: 4 }],
  },
  {
    barcode: '6',
    name: 'Serum niacinamide ter',
    brand: 'Alpha',
    category: 'leave_on_face',
    inciList: 'Aqua, Niacinamide, Glycerin, Betaine, Phenoxyethanol',
    claims: [{ inci: 'niacinamide', percent: 6 }],
  },
];

const acneProfile: SkinProfile = {
  skinType: 'oily',
  concerns: ['acne'],
  tolerated: [],
  notTolerated: [],
};

test('classe en tete les produits dont les actifs repondent au profil', () => {
  const results = recommend(catalog, acneProfile, { category: 'leave_on_face' });
  assert.ok(results.length > 0);
  assert.equal(
    results[0]?.product.brand,
    'Alpha',
    'un serum niacinamide dose doit passer devant une creme neutre',
  );
  assert.ok(results[0]!.highlights.length > 0, 'la recommandation doit etre justifiee');
});

test('ecarte les produits mal toleres', () => {
  const results = recommend(catalog, acneProfile, { category: 'leave_on_face' });
  assert.ok(
    !results.some((r) => r.product.barcode === '3'),
    'un produit alcoolise, parfume et tensioactif ne doit pas etre recommande',
  );
});

test('exclut sans compensation possible un ingredient non tolere', () => {
  const profile: SkinProfile = { ...acneProfile, notTolerated: ['niacinamide'] };
  const results = recommend(catalog, profile, { category: 'leave_on_face' });
  assert.ok(
    results.every((r) => !r.product.name.toLowerCase().includes('niacinamide')),
    'aucun produit contenant un ingredient non tolere ne doit ressortir',
  );
});

test('respecte le filtre de categorie', () => {
  const results = recommend(catalog, acneProfile, { category: 'rinse_off_face' });
  assert.ok(results.length > 0);
  assert.ok(results.every((r) => r.product.category === 'rinse_off_face'));
});

test('limite le nombre de produits d\'une meme marque', () => {
  const results = recommend(catalog, acneProfile, {
    category: 'leave_on_face',
    maxPerBrand: 2,
  });
  const alphaCount = results.filter((r) => r.product.brand === 'Alpha').length;
  assert.ok(
    alphaCount <= 2,
    `la contrainte de diversite doit limiter Alpha a 2 produits (obtenu ${alphaCount})`,
  );
});

test('respecte la limite de resultats', () => {
  const results = recommend(catalog, acneProfile, { limit: 1, maxPerBrand: 10 });
  assert.equal(results.length, 1);
});

test('le seuil de score minimal filtre les produits trop justes', () => {
  const permissive = recommend(catalog, acneProfile, { minScore: 0, maxPerBrand: 10 });
  const strict = recommend(catalog, acneProfile, { minScore: 95, maxPerBrand: 10 });
  assert.ok(strict.length < permissive.length);
});

test('la preoccupation ciblee remonte les produits qui y repondent', () => {
  const mixedProfile: SkinProfile = {
    skinType: 'normal',
    concerns: ['acne', 'dryness'],
    tolerated: [],
    notTolerated: [],
  };
  const targeted = recommend(catalog, mixedProfile, {
    category: 'leave_on_face',
    targetConcern: 'acne',
    maxPerBrand: 10,
  });
  assert.ok(targeted[0]?.product.name.toLowerCase().includes('niacinamide'));
});

test('chaque recommandation expose son evaluation complete', () => {
  const results = recommend(catalog, acneProfile, { category: 'leave_on_face' });
  const first = results[0];
  assert.ok(first);
  assert.ok(first.assessment.personalized, 'le score personnalise doit etre calcule');
  assert.ok(first.assessment.concentrations.length > 0, 'les concentrations doivent etre exposees');
  assert.ok(first.assessment.env.value >= 0, 'le score environnement doit etre disponible');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInciList } from '../src/inci/parse.ts';

test('retire le prefixe de liste et normalise la casse', () => {
  const parsed = parseInciList('INGREDIENTS: Aqua, Glycerin, Phenoxyethanol');
  assert.deepEqual(
    parsed.map((p) => p.normalized),
    ['aqua', 'glycerin', 'phenoxyethanol'],
  );
});

test('conserve les synonymes multilingues comme un seul ingredient', () => {
  const parsed = parseInciList('AQUA/WATER/EAU, GLYCERIN');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]?.normalized, 'aqua/water/eau');
});

test('separe en revanche plusieurs index de couleur accoles', () => {
  const parsed = parseInciList('CI 19140/CI 15985');
  assert.deepEqual(
    parsed.map((p) => p.normalized),
    ['ci 19140', 'ci 15985'],
  );
});

test('ne coupe pas sur une virgule interne a une parenthese', () => {
  const parsed = parseInciList('Aqua, Parfum (Linalool, Limonene), Glycerin');
  assert.equal(parsed.length, 3);
  assert.equal(parsed[1]?.normalized, 'parfum (linalool, limonene)');
});

test('marque les ingredients issus de la mention "peut contenir"', () => {
  const parsed = parseInciList('Aqua, Glycerin, May Contain: CI 77891, CI 77491');
  const optional = parsed.filter((p) => p.mayContain);
  assert.equal(optional.length, 2);
  assert.equal(parsed[0]?.mayContain, undefined);
});

test('reconnait la mention "peut contenir" en francais et la notation +/-', () => {
  assert.equal(parseInciList('Aqua, +/- CI 77891').filter((p) => p.mayContain).length, 1);
  assert.equal(
    parseInciList('Aqua, peut contenir CI 77891').filter((p) => p.mayContain).length,
    1,
  );
});

test('signale les ingredients biologiques marques par un asterisque', () => {
  const parsed = parseInciList('Aqua, Butyrospermum Parkii Butter*, Glycerin');
  assert.equal(parsed[1]?.organic, true);
  assert.equal(parsed[1]?.normalized, 'butyrospermum parkii butter');
});

test('supprime les accents pour la resolution', () => {
  assert.equal(parseInciList('Aqua, Parfum')[1]?.normalized, 'parfum');
  assert.equal(parseInciList('Eau, Glycérine')[1]?.normalized, 'glycerine');
});

test('tolere les separateurs point-virgule et retour ligne', () => {
  const parsed = parseInciList('Aqua;\nGlycerin;\nXanthan Gum');
  assert.equal(parsed.length, 3);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_INGREDIENTS } from '../src/data/ingredients.ts';
import { normalizeLabel } from '../src/inci/parse.ts';
import { resolveIngredient } from '../src/inci/resolve.ts';

/**
 * Integrite du referentiel.
 *
 * Ces controles ont vocation a devenir critiques : le referentiel doit passer
 * de 108 a plusieurs centaines d'entrees, contribuees au fil des scans, et une
 * entree incoherente degrade la confiance de tous les scores qui la traversent.
 */

test('chaque entree est identifiee par un nom INCI normalise', () => {
  for (const ingredient of ALL_INGREDIENTS) {
    assert.equal(
      ingredient.inci,
      normalizeLabel(ingredient.inci),
      `${ingredient.inci} n'est pas sous forme normalisee`,
    );
  }
});

test('aucun nom INCI n\'est declare deux fois', () => {
  const seen = new Set<string>();
  for (const ingredient of ALL_INGREDIENTS) {
    assert.ok(!seen.has(ingredient.inci), `${ingredient.inci} est declare plusieurs fois`);
    seen.add(ingredient.inci);
  }
});

test('chaque entree porte au moins une source', () => {
  for (const ingredient of ALL_INGREDIENTS) {
    assert.ok(
      ingredient.sources.length > 0,
      `${ingredient.inci} n'est pas sourcé : une entree non sourcee degrade la confiance du score`,
    );
  }
});

test('chaque entree porte une plage d\'usage exploitable', () => {
  for (const ingredient of ALL_INGREDIENTS) {
    assert.ok(
      ingredient.typicalRange,
      `${ingredient.inci} n'a pas de plage d'usage : il ne peut pas servir a l'estimation`,
    );
    const [min, max] = ingredient.typicalRange;
    assert.ok(min >= 0, `${ingredient.inci} : plancher negatif`);
    assert.ok(max <= 100, `${ingredient.inci} : plafond superieur a 100 %`);
    assert.ok(min <= max, `${ingredient.inci} : plancher ${min} superieur au plafond ${max}`);
  }
});

test('les limites reglementaires sont dans une plage physique', () => {
  for (const ingredient of ALL_INGREDIENTS) {
    for (const [category, limit] of Object.entries(ingredient.regulatoryMax ?? {})) {
      assert.ok(
        limit > 0 && limit <= 100,
        `${ingredient.inci} : limite ${category} invalide (${limit})`,
      );
    }
  }
});

test('les seuils d\'effet et les doses efficaces sont strictement positifs', () => {
  for (const ingredient of ALL_INGREDIENTS) {
    const skin = ingredient.skin;
    if (!skin) continue;
    for (const effect of [skin.irritation, skin.stripping]) {
      if (!effect) continue;
      assert.ok(
        effect.threshold > 0,
        `${ingredient.inci} : un seuil d'effet nul rendrait la penalite maximale a toute dose`,
      );
    }
    for (const benefit of skin.benefits ?? []) {
      assert.ok(
        benefit.minEffective > 0,
        `${ingredient.inci} : une dose efficace nulle crediterait l'actif a l'etat de trace`,
      );
    }
  }
});

test('l\'indice comedogene reste dans son echelle', () => {
  for (const ingredient of ALL_INGREDIENTS) {
    const value = ingredient.skin?.comedogenic;
    if (value === undefined) continue;
    assert.ok(value >= 0 && value <= 5, `${ingredient.inci} : indice comedogene ${value}`);
  }
});

test('chaque entree se resout par son nom INCI et par chacun de ses alias', () => {
  for (const ingredient of ALL_INGREDIENTS) {
    assert.equal(
      resolveIngredient(ingredient.inci)?.inci,
      ingredient.inci,
      `${ingredient.inci} ne se resout pas par son propre nom`,
    );
    for (const alias of ingredient.aliases ?? []) {
      const resolved = resolveIngredient(normalizeLabel(alias));
      assert.ok(resolved, `l'alias « ${alias} » de ${ingredient.inci} ne se resout pas`);
    }
  }
});

test('une plage d\'usage large exclut le statut d\'ancre', () => {
  // Une ancre sert a borner ce qui la suit : si sa propre plage est large,
  // elle ne borne rien et donne une fausse impression de precision.
  for (const ingredient of ALL_INGREDIENTS) {
    if (!ingredient.isAnchor || !ingredient.typicalRange) continue;
    const [min, max] = ingredient.typicalRange;
    const width = max - min;
    assert.ok(
      width <= 50,
      `${ingredient.inci} est declare ancre avec une plage de ${width} points`,
    );
  }
});

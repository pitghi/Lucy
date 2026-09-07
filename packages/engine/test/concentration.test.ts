import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInciList } from '../src/inci/parse.ts';
import { resolveAll } from '../src/inci/resolve.ts';
import { estimateConcentrations } from '../src/concentration/estimate.ts';
import type { ConcentrationEstimate, ProductCategory } from '../src/types.ts';

function estimate(
  inciList: string,
  category: ProductCategory = 'leave_on_face',
  claims: { inci: string; percent: number }[] = [],
): Map<string, ConcentrationEstimate> {
  const parsed = resolveAll(parseInciList(inciList));
  const estimates = estimateConcentrations(parsed, category, claims);
  return new Map(estimates.map((e) => [e.inci, e]));
}

test('la limite reglementaire plafonne l\'estimation', () => {
  const byInci = estimate('Aqua, Glycerin, Phenoxyethanol');
  const phenoxy = byInci.get('phenoxyethanol');
  assert.ok(phenoxy);
  assert.ok(phenoxy.max <= 1, `attendu <= 1 %, obtenu ${phenoxy.max}`);
});

test('une ancre borne tout ce qui la suit dans la liste', () => {
  // Le phenoxyethanol est plafonne a 1 % par la reglementation. Tout ce qui
  // est liste apres lui est donc necessairement present a moins de 1 %,
  // meme si sa plage d'usage habituelle est bien superieure.
  const byInci = estimate('Aqua, Glycerin, Phenoxyethanol, Dimethicone');
  const dimethicone = byInci.get('dimethicone');
  assert.ok(dimethicone);
  assert.ok(
    dimethicone.max <= 1,
    `le dimethicone suit une ancre a 1 % mais est estime jusqu'a ${dimethicone.max} %`,
  );
});

test('un ingredient inconnu place en fin de liste est borne malgre tout', () => {
  const byInci = estimate('Aqua, Glycerin, Tocopherol, Ingredient Totalement Inexistant Xyz');
  const unknown = byInci.get('ingredient totalement inexistant xyz');
  assert.ok(unknown);
  assert.ok(
    unknown.max <= 1,
    `un ingredient suivant une ancre a 0,5 % ne peut pas etre estime a ${unknown.max} %`,
  );
});

test('un dosage revendique par la marque est repris tel quel avec une confiance haute', () => {
  const byInci = estimate('Aqua, Niacinamide, Glycerin, Phenoxyethanol', 'leave_on_face', [
    { inci: 'niacinamide', percent: 10 },
  ]);
  const niacinamide = byInci.get('niacinamide');
  assert.ok(niacinamide);
  assert.equal(niacinamide.min, 10);
  assert.equal(niacinamide.max, 10);
  assert.equal(niacinamide.confidence, 'high');
  assert.equal(niacinamide.method, 'brand_claim');
});

test('le bilan de masse resserre la tete de liste', () => {
  // Avec des ingredients tous plafonnes bas, l'eau doit combler le reste.
  const byInci = estimate('Aqua, Glycerin, Xanthan Gum, Phenoxyethanol');
  const aqua = byInci.get('aqua');
  assert.ok(aqua);
  assert.ok(aqua.min >= 40, `l'eau devrait etre majoritaire, estimee a ${aqua.min} % minimum`);
});

test('l\'ordre decroissant impose est respecte au-dessus de 1 %', () => {
  const parsed = resolveAll(parseInciList('Aqua, Glycerin, Squalane, Dimethicone'));
  const estimates = estimateConcentrations(parsed, 'leave_on_face');
  for (let i = 1; i < estimates.length; i++) {
    const previous = estimates[i - 1];
    const current = estimates[i];
    assert.ok(previous && current);
    assert.ok(
      current.max <= previous.max + 1e-9,
      `position ${i} : ${current.inci} (max ${current.max}) depasse ${previous.inci} (max ${previous.max})`,
    );
  }
});

test('la categorie de produit change la limite applicable', () => {
  const leaveOn = estimate('Aqua, Sodium Benzoate').get('sodium benzoate');
  const rinseOff = estimate('Aqua, Sodium Benzoate', 'rinse_off_face').get('sodium benzoate');
  assert.ok(leaveOn && rinseOff);
  assert.ok(leaveOn.max <= 0.5, `sans rincage : attendu <= 0,5 %, obtenu ${leaveOn.max}`);
  assert.ok(rinseOff.max > leaveOn.max, 'la limite en rincage est plus permissive');
});

test('le retinol est plafonne differemment sur le visage et sur le corps', () => {
  const face = estimate('Aqua, Glycerin, Retinol').get('retinol');
  const body = estimate('Aqua, Glycerin, Retinol', 'leave_on_body').get('retinol');
  assert.ok(face && body);
  assert.ok(face.max <= 0.3, `visage : attendu <= 0,3 %, obtenu ${face.max}`);
  assert.ok(body.max <= 0.05, `corps : attendu <= 0,05 %, obtenu ${body.max}`);
});

test('l\'estimation retient la plus contraignante de la plage d\'usage et de la limite legale', () => {
  // Le titanium dioxide est autorise jusqu'a 25 %, mais liste apres une ancre
  // basse il ne peut pas y etre present a cette hauteur.
  const byInci = estimate('Aqua, Glycerin, Tocopherol, Titanium Dioxide');
  const tio2 = byInci.get('titanium dioxide');
  assert.ok(tio2);
  assert.ok(tio2.max < 25, `la limite legale seule donnerait 25 %, obtenu ${tio2.max}`);
});

test('un ingredient de la mention "peut contenir" n\'a pas de plancher', () => {
  const byInci = estimate('Aqua, Glycerin, May Contain: Titanium Dioxide');
  const optional = byInci.get('titanium dioxide');
  assert.ok(optional);
  assert.equal(optional.min, 0);
});

test('toutes les bornes restent coherentes et dans les limites physiques', () => {
  const parsed = resolveAll(
    parseInciList(
      'Aqua, Glycerin, Niacinamide, Squalane, Cetearyl Alcohol, Glyceryl Stearate, ' +
        'Xanthan Gum, Tocopherol, Phenoxyethanol, Ethylhexylglycerin, Parfum, Limonene',
    ),
  );
  const estimates = estimateConcentrations(parsed, 'leave_on_face');
  for (const e of estimates) {
    assert.ok(e.min >= 0, `${e.inci} : minimum negatif (${e.min})`);
    assert.ok(e.max <= 100, `${e.inci} : maximum superieur a 100 (${e.max})`);
    assert.ok(e.min <= e.max, `${e.inci} : minimum ${e.min} superieur au maximum ${e.max}`);
  }
  // La somme des planchers ne peut pas exceder la formule entiere.
  const totalMin = estimates.reduce((sum, e) => sum + e.min, 0);
  assert.ok(totalMin <= 100.5, `somme des planchers a ${totalMin} %`);
});

test('un plafond de position invalide le plancher de la plage d\'usage', () => {
  // La niacinamide s'emploie habituellement entre 1 et 10 %. Listee apres le
  // phenoxyethanol elle est necessairement sous 1 % : l'estimation doit alors
  // etre « au plus 1 % » et non « exactement 1 % », sans quoi le moteur
  // afficherait une precision qu'il n'a pas.
  const byInci = estimate('Aqua, Glycerin, Phenoxyethanol, Niacinamide');
  const niacinamide = byInci.get('niacinamide');
  assert.ok(niacinamide);
  assert.ok(niacinamide.max <= 1, `attendu <= 1 %, obtenu ${niacinamide.max}`);
  assert.equal(
    niacinamide.min,
    0,
    `le plancher issu de la plage d'usage doit tomber a 0 (obtenu ${niacinamide.min})`,
  );
});

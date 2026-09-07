/**
 * Audit de couverture sur un echantillon de produits reels.
 *
 * Repond aux deux questions qui conditionnent la faisabilite du MVP :
 *
 *  1. Quelle part des produits d'une base publique porte une liste INCI
 *     reellement exploitable ? C'est le taux au-dela duquel un socle ouvert
 *     suffit, et en dessous duquel la lecture optique devient le chemin
 *     principal plutot que le repli.
 *  2. Quelle part des ingredients rencontres le referentiel resout-il, et
 *     quels sont les ingredients manquants les plus frequents ? Cette liste
 *     ordonne le travail d'extension du referentiel : inutile de viser les
 *     30 000 entrees de CosIng, il faut viser les bonnes.
 *
 * Usage :
 *   node --experimental-strip-types scripts/audit-coverage.ts <echantillon.json>
 *
 * Le fichier attendu est un tableau JSON d'objets portant `code`,
 * `product_name`, `brands` et `ingredients_text`, tel que renvoye par l'API
 * Open Beauty Facts.
 */

import { readFileSync } from 'node:fs';
import { parseInciList } from '../src/inci/parse.ts';
import { resolveAll } from '../src/inci/resolve.ts';
import { estimateConcentrations } from '../src/concentration/estimate.ts';
import { scoreSkin } from '../src/scoring/skin.ts';

interface SampleProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
}

/**
 * Une liste INCI est jugee exploitable si elle comporte assez d'items pour
 * qu'un score ait un sens. En dessous, il s'agit generalement d'une mention
 * de saisie incomplete (« ingredients non visibles sur la photo ») plutot que
 * d'une formule.
 */
const MIN_ITEMS = 5;

/** Part minimale d'ingredients resolus pour qu'un score soit affichable. */
const MIN_COVERAGE_TO_SCORE = 0.7;

const path = process.argv[2];
if (!path) {
  console.error('Usage : audit-coverage.ts <echantillon.json>');
  process.exit(1);
}

const sample: SampleProduct[] = JSON.parse(readFileSync(path, 'utf-8'));

let withInci = 0;
let exploitable = 0;
let scorable = 0;
let totalItems = 0;
let resolvedItems = 0;
const coverages: number[] = [];
const missing = new Map<string, number>();

for (const product of sample) {
  const text = product.ingredients_text?.trim();
  if (!text) continue;
  withInci++;

  const parsed = resolveAll(parseInciList(text));
  if (parsed.length < MIN_ITEMS) continue;
  exploitable++;

  const resolved = parsed.filter((p) => p.ingredient).length;
  totalItems += parsed.length;
  resolvedItems += resolved;

  const coverage = resolved / parsed.length;
  coverages.push(coverage);
  if (coverage >= MIN_COVERAGE_TO_SCORE) scorable++;

  for (const item of parsed) {
    if (item.ingredient) continue;
    // Les libelles tres longs sont presque toujours du bruit de saisie
    // (phrases entieres, mentions legales) et non des ingredients.
    if (item.normalized.length > 45) continue;
    missing.set(item.normalized, (missing.get(item.normalized) ?? 0) + 1);
  }

  // Verification que la chaine complete ne leve pas d'exception sur du reel.
  const concentrations = estimateConcentrations(parsed, 'leave_on_face');
  scoreSkin(parsed, concentrations);
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
};

const pct = (value: number, total: number): string =>
  total === 0 ? 'n/a' : `${((value / total) * 100).toFixed(1)} %`;

console.log('\nAUDIT DE COUVERTURE');
console.log('='.repeat(70));
console.log(`Produits dans l'echantillon              ${sample.length}`);
console.log(
  `Avec un champ liste d'ingredients        ${withInci}  (${pct(withInci, sample.length)})`,
);
console.log(
  `Liste exploitable (>= ${MIN_ITEMS} ingredients)     ${exploitable}  (${pct(exploitable, sample.length)})`,
);
console.log(
  `Score affichable (couverture >= ${Math.round(MIN_COVERAGE_TO_SCORE * 100)} %)   ${scorable}  (${pct(scorable, sample.length)})`,
);
// Le ratio utile pour piloter le referentiel : parmi les produits dont la
// liste est exploitable, quelle part peut recevoir un score ? Les produits
// sans liste relevent de la collecte de donnees, pas du referentiel.
console.log(
  `  dont parmi les listes exploitables    ${pct(scorable, exploitable)}`,
);
console.log('-'.repeat(70));
console.log(`Ingredients rencontres                   ${totalItems}`);
console.log(
  `Resolus par le referentiel               ${resolvedItems}  (${pct(resolvedItems, totalItems)})`,
);
console.log(`Couverture medianne par produit          ${(median(coverages) * 100).toFixed(1)} %`);

const ranked = [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
console.log('\nINGREDIENTS MANQUANTS LES PLUS FREQUENTS');
console.log('='.repeat(70));
console.log("Ce classement ordonne l'extension du referentiel.\n");
for (const [inci, count] of ranked) {
  const share = ((count / exploitable) * 100).toFixed(0);
  console.log(`  ${String(count).padStart(4)} produits (${String(share).padStart(2)} %)  ${inci}`);
}
console.log('');

/**
 * Demonstration du moteur sur des formules types.
 *
 * Lancer avec : npm run demo --workspace @lucy/engine
 *
 * Les formules ci-dessous sont des compositions representatives du marche,
 * volontairement non attribuees a des marques reelles.
 */

import { assessProduct } from '../src/scoring/assess.ts';
import { formatRange } from '../src/scoring/dose.ts';
import { CONCERN_LABELS, CONFIDENCE_LABELS, SKIN_TYPE_LABELS } from '../src/i18n/fr.ts';
import type { Product, ProductAssessment, SkinProfile } from '../src/types.ts';

const CATALOG: Product[] = [
  {
    name: 'Creme hydratante simple',
    brand: 'Exemple A',
    category: 'leave_on_face',
    inciList:
      'Aqua, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, ' +
      'Squalane, Panthenol, Xanthan Gum, Tocopherol, Citric Acid, Phenoxyethanol, Ethylhexylglycerin',
  },
  {
    name: 'Creme parfumee grand public',
    brand: 'Exemple B',
    category: 'leave_on_face',
    inciList:
      'Aqua, Paraffinum Liquidum, Glycerin, Alcohol Denat, Cetearyl Alcohol, Dimethicone, ' +
      'Parfum, Linalool, Limonene, Geraniol, Disodium EDTA, Phenoxyethanol',
  },
  {
    name: 'Serum niacinamide dose',
    brand: 'Exemple C',
    category: 'leave_on_face',
    inciList:
      'Aqua, Niacinamide, Glycerin, Pentylene Glycol, Zinc PCA, Xanthan Gum, ' +
      'Allantoin, Phenoxyethanol, Ethylhexylglycerin',
    claims: [{ inci: 'niacinamide', percent: 10 }],
  },
  {
    name: 'Serum niacinamide vitrine',
    brand: 'Exemple D',
    category: 'leave_on_face',
    inciList:
      'Aqua, Glycerin, Butylene Glycol, Xanthan Gum, Phenoxyethanol, ' +
      'Ethylhexylglycerin, Niacinamide, Centella Asiatica Extract',
  },
  {
    name: 'Nettoyant moussant sulfate',
    brand: 'Exemple E',
    category: 'rinse_off_face',
    inciList:
      'Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Glycerin, ' +
      'Sodium Chloride, Parfum, Citric Acid, Sodium Benzoate',
  },
];

const PROFILE: SkinProfile = {
  skinType: 'sensitive',
  concerns: ['redness', 'barrier'],
  tolerated: [],
  notTolerated: [],
};

const ACNE_PROFILE: SkinProfile = {
  skinType: 'oily',
  concerns: ['acne'],
  tolerated: [],
  notTolerated: [],
};

function bar(value: number, width = 20): string {
  const filled = Math.round((value / 100) * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}

function printAssessment(product: Product, assessment: ProductAssessment): void {
  console.log(`\n${'='.repeat(78)}`);
  console.log(`${product.name}  (${product.brand})`);
  console.log('='.repeat(78));
  console.log(`  Tolerance cutanee   ${bar(assessment.skin.value)}  ${assessment.skin.value}/100`);
  console.log(`  Environnement       ${bar(assessment.env.value)}  ${assessment.env.value}/100`);
  if (assessment.personalized) {
    console.log(
      `  Adequation profil   ${bar(assessment.personalized.value)}  ${assessment.personalized.value}/100`,
    );
  }
  console.log(`  Couverture referentiel : ${Math.round(assessment.skin.coverage * 100)} %`);

  const reasons = (assessment.personalized ?? assessment.skin).reasons.slice(0, 4);
  if (reasons.length > 0) {
    console.log('\n  Pourquoi ce score :');
    for (const reason of reasons) {
      const sign = reason.informational ? 'i' : reason.impact > 0 ? '+' : '-';
      const points = reason.informational
        ? 'info'
        : `${Math.abs(reason.impact).toFixed(0)} pts`;
      console.log(
        `    [${sign}] ${reason.inci} (${points}, confiance ${CONFIDENCE_LABELS[reason.confidence]})`,
      );
      console.log(`        ${reason.label}`);
    }
  }

  const envReasons = assessment.env.reasons.slice(0, 2);
  if (envReasons.length > 0) {
    console.log('\n  Cote environnement :');
    for (const reason of envReasons) {
      console.log(`    [-] ${reason.inci} (${Math.abs(reason.impact).toFixed(0)} pts)`);
      console.log(`        ${reason.label}`);
    }
  }
}

console.log('\nMOTEUR LUCY — demonstration');
console.log(
  `Profil : peau ${SKIN_TYPE_LABELS[PROFILE.skinType]}, ` +
    `preoccupations ${PROFILE.concerns.map((c) => CONCERN_LABELS[c]).join(', ')}`,
);

for (const product of CATALOG) {
  printAssessment(product, assessProduct(product, PROFILE));
}

// ---------------------------------------------------------------------------
// Le cas qui illustre l'apport du moteur : deux serums affichent le meme actif,
// un seul le dose reellement.
// ---------------------------------------------------------------------------
console.log(`\n\n${'='.repeat(78)}`);
console.log('CAS D\'ECOLE : niacinamide dosee contre niacinamide de vitrine');
console.log('='.repeat(78));

const dosed = CATALOG[2]!;
const showcase = CATALOG[3]!;

for (const product of [dosed, showcase]) {
  const assessment = assessProduct(product, ACNE_PROFILE);
  const niacinamide = assessment.concentrations.find((c) => c.inci === 'niacinamide');
  console.log(`\n${product.name}`);
  console.log(`  Niacinamide estimee a ${niacinamide ? formatRange(niacinamide) : 'n/a'}`);
  console.log(
    `  Confiance de l'estimation : ${niacinamide ? CONFIDENCE_LABELS[niacinamide.confidence] : 'n/a'}`,
  );
  console.log(
    `  Adequation pour une peau grasse cherchant a traiter les imperfections : ` +
      `${assessment.personalized?.value}/100`,
  );
}

console.log(
  '\nLes deux listes INCI mentionnent la niacinamide. Une notation par simple\n' +
    'presence de l\'ingredient les crediterait a l\'identique.\n',
);

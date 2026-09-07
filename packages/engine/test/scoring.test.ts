import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessProduct } from '../src/scoring/assess.ts';
import type { Product, SkinProfile } from '../src/types.ts';

function product(inciList: string, overrides: Partial<Product> = {}): Product {
  return {
    name: 'Produit test',
    brand: 'Marque test',
    category: 'leave_on_face',
    inciList,
    ...overrides,
  };
}

const sensitiveProfile: SkinProfile = {
  skinType: 'sensitive',
  concerns: ['redness'],
  tolerated: [],
  notTolerated: [],
};

test('un irritant present a l\'etat de trace ne fait pas chuter le score', () => {
  // C'est la these du produit. Le limonene est un allergene de parfum, mais
  // liste en toute fin d'INCI il est present a moins de 0,01 % : le penaliser
  // comme s'il etait a 5 % est precisement l'erreur des notations existantes.
  const trace = assessProduct(
    product('Aqua, Glycerin, Squalane, Xanthan Gum, Tocopherol, Phenoxyethanol, Limonene'),
  );
  assert.ok(
    trace.skin.value >= 80,
    `un allergene a l'etat de trace ne devrait pas faire chuter le score (obtenu ${trace.skin.value})`,
  );
});

test('le meme ingredient a forte dose est bien penalise', () => {
  const trace = assessProduct(product('Aqua, Glycerin, Phenoxyethanol, Limonene'));
  const heavy = assessProduct(
    product('Aqua, Limonene, Glycerin', undefined),
  );
  assert.ok(
    heavy.skin.value < trace.skin.value,
    `un allergene en deuxieme position (${heavy.skin.value}) doit etre plus penalise qu'a l'etat de trace (${trace.skin.value})`,
  );
});

test('la dose module la penalite de facon continue, pas binaire', () => {
  const scores = [
    'Aqua, Sodium Lauryl Sulfate, Glycerin',
    'Aqua, Glycerin, Sodium Lauryl Sulfate',
    'Aqua, Glycerin, Xanthan Gum, Phenoxyethanol, Sodium Lauryl Sulfate',
  ].map((list) => assessProduct(product(list)).skin.value);

  assert.ok(
    scores[0]! < scores[1]! && scores[1]! <= scores[2]!,
    `le score doit croitre a mesure que l'irritant descend dans la liste : ${scores.join(' < ')}`,
  );
});

test('les scores peau et environnement sont independants', () => {
  // Le dimethicone est tres bien tolere par la peau et faiblement
  // biodegradable : les deux axes doivent divergerence nettement.
  const silicone = assessProduct(product('Aqua, Dimethicone, Glycerin, Phenoxyethanol'));
  assert.ok(
    silicone.skin.value >= 85,
    `un silicone est bien tolere par la peau (obtenu ${silicone.skin.value})`,
  );
  assert.ok(
    silicone.env.value < silicone.skin.value,
    `le score environnement (${silicone.env.value}) doit etre inferieur au score peau (${silicone.skin.value})`,
  );
});

test('un microplastique penalise l\'environnement sans toucher au score peau', () => {
  const withMicroplastic = assessProduct(product('Aqua, Polyethylene, Glycerin'));
  const without = assessProduct(product('Aqua, Squalane, Glycerin'));
  assert.ok(
    withMicroplastic.env.value < without.env.value - 20,
    'le microplastique doit peser lourdement sur le score environnement',
  );
  assert.equal(
    withMicroplastic.skin.value,
    without.skin.value,
    'le microplastique ne concerne pas la tolerance cutanee',
  );
});

test('un actif sous sa dose efficace ne rapporte aucun point', () => {
  const profile: SkinProfile = {
    skinType: 'oily',
    concerns: ['acne'],
    tolerated: [],
    notTolerated: [],
  };
  // Niacinamide efficace des 2 % : liste apres le phenoxyethanol, elle est
  // sous ce seuil et ne doit donc pas etre creditee.
  const sprinkled = assessProduct(
    product('Aqua, Glycerin, Phenoxyethanol, Niacinamide'),
    profile,
  );
  const dosed = assessProduct(
    product('Aqua, Niacinamide, Glycerin, Phenoxyethanol', {
      claims: [{ inci: 'niacinamide', percent: 5 }],
    }),
    profile,
  );

  const sprinkledBonus = sprinkled.personalized!.reasons.filter((r) => r.impact > 0);
  const dosedBonus = dosed.personalized!.reasons.filter((r) => r.impact > 0);

  assert.equal(
    sprinkledBonus.length,
    0,
    'un actif en fin de liste ne doit pas etre credite comme actif',
  );
  assert.ok(dosedBonus.length > 0, 'un actif dose a 5 % doit etre credite');
  assert.ok(dosed.personalized!.value > sprinkled.personalized!.value);
});

test('le profil peau sensible durcit les penalites liees au parfum', () => {
  const list = 'Aqua, Glycerin, Parfum, Phenoxyethanol';
  const generic = assessProduct(product(list));
  const sensitive = assessProduct(product(list), sensitiveProfile);
  assert.ok(
    sensitive.personalized!.value < generic.skin.value,
    `peau sensible (${sensitive.personalized!.value}) doit etre plus severe que le score generique (${generic.skin.value})`,
  );
});

test('un ingredient declare non tolere annule le score personnalise', () => {
  const profile: SkinProfile = {
    skinType: 'normal',
    concerns: [],
    tolerated: [],
    notTolerated: ['phenoxyethanol'],
  };
  const assessment = assessProduct(product('Aqua, Glycerin, Phenoxyethanol'), profile);
  assert.deepEqual(assessment.blockers, ['phenoxyethanol']);
  assert.equal(assessment.personalized!.value, 0);
  // Le score generique du produit reste inchange : c'est une inadequation au
  // profil, pas un defaut de formulation.
  assert.ok(assessment.skin.value > 50);
});

test('un ingredient declare bien tolere neutralise sa penalite', () => {
  const list = 'Aqua, Glycerin, Parfum, Phenoxyethanol';
  const neutral: SkinProfile = {
    skinType: 'sensitive',
    concerns: [],
    tolerated: [],
    notTolerated: [],
  };
  const tolerant: SkinProfile = { ...neutral, tolerated: ['parfum'] };

  const withoutTolerance = assessProduct(product(list), neutral).personalized!.value;
  const withTolerance = assessProduct(product(list), tolerant).personalized!.value;

  assert.ok(
    withTolerance > withoutTolerance,
    `declarer bien tolerer le parfum doit remonter le score (${withoutTolerance} -> ${withTolerance})`,
  );
});

test('la preference "sans parfum" est appliquee au score personnalise', () => {
  const list = 'Aqua, Glycerin, Parfum, Phenoxyethanol';
  const base: SkinProfile = {
    skinType: 'normal',
    concerns: [],
    tolerated: [],
    notTolerated: [],
  };
  const withPreference = assessProduct(product(list), { ...base, avoidFragrance: true });
  const without = assessProduct(product(list), base);
  assert.ok(withPreference.personalized!.value < without.personalized!.value);
});

test('chaque raison affichee porte sa concentration estimee et ses sources', () => {
  const assessment = assessProduct(product('Aqua, Sodium Lauryl Sulfate, Glycerin'));
  const reason = assessment.skin.reasons[0];
  assert.ok(reason, 'un tensioactif irritant doit produire au moins une raison');
  assert.ok(reason.sources.length > 0, 'toute raison doit etre sourcee');
  assert.ok(
    reason.concentration.max > reason.concentration.min,
    'la raison doit porter un intervalle de concentration',
  );
  assert.ok(reason.label.length > 10, 'la raison doit etre explicable a l\'utilisateur');
});

test('la couverture du referentiel est remontee', () => {
  const known = assessProduct(product('Aqua, Glycerin, Phenoxyethanol'));
  assert.equal(known.skin.coverage, 1);

  const partial = assessProduct(product('Aqua, Substance Inconnue Zzz, Autre Truc Yyy'));
  assert.ok(
    partial.skin.coverage < 0.5,
    `couverture attendue faible, obtenue ${partial.skin.coverage}`,
  );
});

test('les scores restent bornes entre 0 et 100', () => {
  const lists = [
    'Aqua',
    'Aqua, Sodium Lauryl Sulfate, Methylisothiazolinone, Parfum, Cinnamal, Isoeugenol',
    'Aqua, Glycerin, Niacinamide, Retinol, Ascorbic Acid, Azelaic Acid, Salicylic Acid',
  ];
  for (const list of lists) {
    const a = assessProduct(product(list), sensitiveProfile);
    for (const score of [a.skin, a.env, a.personalized!]) {
      assert.ok(score.value >= 0 && score.value <= 100, `${list} -> ${score.value}`);
    }
  }
});

test('le parfum et ses allergenes declares comptent pour un seul poste', () => {
  // Une liste INCI mentionne « parfum » puis les allergenes qu'il contient.
  // Ces substances composent le parfum, elles ne s'y ajoutent pas : declarer
  // sa composition ne doit pas etre plus penalisant que ne rien declarer.
  const undeclared = assessProduct(product('Aqua, Glycerin, Parfum, Phenoxyethanol'));
  const declared = assessProduct(
    product(
      'Aqua, Glycerin, Parfum, Linalool, Limonene, Geraniol, Citronellol, Coumarin, Phenoxyethanol',
    ),
  );

  const gap = undeclared.skin.value - declared.skin.value;
  assert.ok(
    gap <= 12,
    `declarer cinq allergenes de parfum ne doit pas coûter ${gap} points de plus que ne rien declarer`,
  );
});

test('le plafond du poste parfum s\'applique quel que soit le nombre d\'allergenes', () => {
  const three = assessProduct(product('Aqua, Parfum, Linalool, Limonene, Geraniol')).skin.value;
  const eight = assessProduct(
    product(
      'Aqua, Parfum, Linalool, Limonene, Geraniol, Citral, Eugenol, Coumarin, Citronellol, Farnesol',
    ),
  ).skin.value;
  assert.ok(
    Math.abs(three - eight) <= 6,
    `le poste parfum est plafonne : ${three} contre ${eight} pour huit allergenes`,
  );
});

test('les impacts affiches restent coherents avec la note apres plafonnement', () => {
  const assessment = assessProduct(
    product('Aqua, Parfum, Linalool, Limonene, Geraniol, Citral, Eugenol, Coumarin'),
  );
  const displayed = assessment.skin.reasons
    .filter((r) => !r.informational)
    .reduce((sum, r) => sum + r.impact, 0);
  const implied = assessment.skin.value - 100;
  assert.ok(
    Math.abs(displayed - implied) <= 4,
    `la somme des lignes affichees (${displayed.toFixed(1)}) doit approcher l'ecart a 100 (${implied})`,
  );
});

test('le score environnement discrimine reellement les formules', () => {
  const clean = assessProduct(
    product('Aqua, Glycerin, Squalane, Xanthan Gum, Tocopherol, Phenoxyethanol'),
  ).env.value;
  const loaded = assessProduct(
    product(
      'Aqua, Paraffinum Liquidum, Dimethicone, Cyclopentasiloxane, Disodium EDTA, Carbomer, Phenoxyethanol',
    ),
  ).env.value;
  assert.ok(clean >= 90, `une formule sobre doit rester haute (obtenu ${clean})`);
  assert.ok(
    clean - loaded >= 25,
    `l'ecart entre formule sobre (${clean}) et formule chargee (${loaded}) doit etre net`,
  );
});

test('aucune explication ne laisse filtrer de vocabulaire technique anglais', () => {
  const assessment = assessProduct(
    product('Aqua, Glycerin, Niacinamide, Parfum, Sodium Lauryl Sulfate, Phenoxyethanol'),
    { skinType: 'sensitive', concerns: ['acne', 'barrier'], tolerated: [], notTolerated: [] },
  );
  // Limites de mots : « barriere cutanee » contient « barrier » comme
  // sous-chaine sans etre pour autant un anglicisme.
  const englishTerms = ['sensitive', 'oily', 'barrier', 'acne', 'redness', 'dryness', 'aging'];
  for (const reason of assessment.personalized!.reasons) {
    for (const term of englishTerms) {
      assert.ok(
        !new RegExp(`\\b${term}\\b`).test(reason.label),
        `la ligne « ${reason.label} » contient le terme anglais « ${term} »`,
      );
    }
  }
});

test('les intervalles ouverts vers le bas sont formules en clair', async () => {
  const assessment = assessProduct(product('Aqua, Glycerin, Phenoxyethanol, Niacinamide'));
  const estimate = assessment.concentrations.find((c) => c.inci === 'niacinamide');
  assert.ok(estimate);
  assert.equal(estimate.min, 0);
  // Un intervalle partant de zero doit se lire « au plus X », pas « 0,0e+0 a X ».
  const { formatRange } = await import('../src/scoring/dose.ts');
  assert.match(formatRange(estimate), /^au plus /);
});

import type { Ingredient } from '../types.ts';

/**
 * Referentiel ingredients Lucy.
 *
 * Perimetre MVP : soin visage. Une centaine d'entrees couvre l'essentiel des
 * formules du marche, l'ordre de grandeur utile etant de 150 a 300 entrees
 * pour depasser 90 % de resolution.
 *
 * Trois champs portent la valeur du moteur :
 *  - `typicalRange` : plage d'usage reelle, base de l'estimation par ancrage
 *  - `isAnchor`     : marque les ingredients dont la plage est assez contrainte
 *                     pour borner tout ce qui les suit dans la liste INCI
 *  - `skin.irritation.threshold` : concentration en dessous de laquelle l'effet
 *                     est negligeable, ce qui evite de penaliser les traces
 *
 * ATTENTION : les valeurs `regulatoryMax` doivent etre auditees contre les
 * textes consolides (EUR-Lex) avant toute mise en production. Elles sont
 * exactes a la connaissance de la redaction mais les Annexes du reglement
 * 1223/2009 sont amendees plusieurs fois par an.
 */

const SRC_ANNEX_V = 'Reglement (CE) 1223/2009, Annexe V (conservateurs autorises)';
const SRC_ANNEX_III = 'Reglement (CE) 1223/2009, Annexe III (substances restreintes)';
const SRC_ANNEX_VI = 'Reglement (CE) 1223/2009, Annexe VI (filtres UV autorises)';
const SRC_2024_996 = 'Reglement (UE) 2024/996 (retinol, alpha-hydroxyacides)';
const SRC_COSING = 'Base de donnees CosIng, Commission europeenne';
const SRC_FORMULATION = "Plages d'usage courantes en formulation cosmetique";
const SRC_REACH_MP = 'Reglement (UE) 2023/2055 (microplastiques, REACH Annexe XVII)';

export const INGREDIENTS: Ingredient[] = [
  // ---------------------------------------------------------------------------
  // Solvants et base aqueuse
  // ---------------------------------------------------------------------------
  {
    inci: 'aqua',
    aliases: ['water', 'eau', 'aqua/water/eau', 'water/aqua/eau', 'purified water'],
    functions: ['solvent'],
    typicalRange: [40, 90],
    isAnchor: true,
    env: { biodegradability: 'good', aquaticToxicity: 0 },
    sources: [SRC_COSING],
  },
  {
    inci: 'alcohol denat',
    aliases: ['alcohol denatured', 'sd alcohol 40', 'ethanol', 'alcohol'],
    functions: ['solvent'],
    typicalRange: [1, 40],
    skin: {
      stripping: { severity: 2, threshold: 5, onlyForTypes: ['dry', 'sensitive'] },
      irritation: { severity: 2, threshold: 10, onlyForTypes: ['sensitive'] },
    },
    env: { biodegradability: 'good', aquaticToxicity: 0 },
    sources: [
      SRC_COSING,
      "L'effet assechant de l'ethanol est dose-dependant et concerne surtout les peaux seches et reactives",
    ],
  },

  // ---------------------------------------------------------------------------
  // Humectants
  // ---------------------------------------------------------------------------
  {
    inci: 'glycerin',
    aliases: ['glycerol', 'glycerine'],
    functions: ['humectant'],
    typicalRange: [2, 20],
    isAnchor: true,
    skin: {
      benefits: [
        { concern: 'dryness', minEffective: 3, strength: 3, evidence: 'high' },
        { concern: 'barrier', minEffective: 3, strength: 2, evidence: 'high' },
      ],
    },
    env: { biodegradability: 'good', aquaticToxicity: 0 },
    sources: [SRC_COSING, 'Humectant de reference, efficacite bien documentee des 3 %'],
  },
  {
    inci: 'butylene glycol',
    functions: ['humectant', 'solvent'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good', aquaticToxicity: 1 },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'propylene glycol',
    functions: ['humectant', 'solvent'],
    typicalRange: [1, 10],
    skin: { irritation: { severity: 1, threshold: 5, onlyForTypes: ['sensitive'] } },
    env: { biodegradability: 'good', aquaticToxicity: 1 },
    sources: [
      SRC_COSING,
      'Sensibilisant de contact rare, essentiellement au-dela de 5 % sur peau alteree',
    ],
  },
  {
    inci: 'pentylene glycol',
    functions: ['humectant', 'solvent', 'preservative'],
    typicalRange: [1, 5],
    isAnchor: true,
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sodium hyaluronate',
    aliases: [
      'hyaluronic acid',
      'sodium acetylated hyaluronate',
      'hydrolyzed hyaluronic acid',
      'hydrolyzed sodium hyaluronate',
      'sodium hyaluronate crosspolymer',
      'dimethylsilanol hyaluronate',
    ],
    functions: ['humectant'],
    typicalRange: [0.05, 2],
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'dryness', minEffective: 0.1, strength: 2, evidence: 'high' }],
    },
    env: { biodegradability: 'good', aquaticToxicity: 0 },
    sources: [SRC_COSING, "Actif efficace des 0,1 % ; au-dela l'apport est surtout sensoriel"],
  },
  {
    inci: 'panthenol',
    aliases: ['d-panthenol', 'dl-panthenol', 'provitamin b5'],
    functions: ['humectant', 'active'],
    typicalRange: [0.5, 5],
    isAnchor: true,
    skin: {
      benefits: [
        { concern: 'barrier', minEffective: 1, strength: 2, evidence: 'high' },
        { concern: 'redness', minEffective: 1, strength: 2, evidence: 'medium' },
      ],
    },
    sources: [SRC_COSING, 'Effet apaisant et reparateur documente entre 1 et 5 %'],
  },
  {
    inci: 'urea',
    functions: ['humectant', 'active'],
    typicalRange: [2, 10],
    skin: {
      benefits: [{ concern: 'dryness', minEffective: 5, strength: 3, evidence: 'high' }],
      irritation: { severity: 1, threshold: 10, onlyForTypes: ['sensitive'] },
    },
    sources: [SRC_COSING, 'Keratolytique des 10 %, hydratant en dessous'],
  },
  {
    inci: 'betaine',
    functions: ['humectant'],
    typicalRange: [0.5, 5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'trehalose',
    functions: ['humectant'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // ---------------------------------------------------------------------------
  // Emollients et occlusifs
  // ---------------------------------------------------------------------------
  {
    inci: 'dimethicone',
    functions: ['emollient', 'film_former'],
    typicalRange: [1, 15],
    skin: { comedogenic: 1 },
    env: { biodegradability: 'poor', aquaticToxicity: 1, persistent: true },
    sources: [
      SRC_COSING,
      'Silicone lineaire : tres bien tolere par la peau mais faiblement biodegradable',
    ],
  },
  {
    inci: 'cyclopentasiloxane',
    aliases: ['d5', 'decamethylcyclopentasiloxane'],
    functions: ['emollient'],
    typicalRange: [1, 15],
    env: { biodegradability: 'poor', aquaticToxicity: 2, persistent: true },
    sources: [
      'Substance identifiee vPvB (tres persistante, tres bioaccumulable) par l\'ECHA',
      'Restrictions REACH progressives sur les siloxanes cycliques D4/D5/D6',
    ],
  },
  {
    inci: 'caprylic/capric triglyceride',
    aliases: ['caprylic capric triglyceride', 'cocoglycerides'],
    functions: ['emollient'],
    typicalRange: [1, 15],
    skin: { comedogenic: 1 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'squalane',
    functions: ['emollient'],
    typicalRange: [1, 20],
    skin: { comedogenic: 0 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Emollient tres bien tolere, non comedogene'],
  },
  {
    inci: 'cetearyl alcohol',
    functions: ['emollient', 'emulsifier', 'thickener'],
    typicalRange: [1, 5],
    isAnchor: true,
    skin: { comedogenic: 2 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Alcool gras : emollient, sans rapport avec l\'ethanol assechant'],
  },
  {
    inci: 'cetyl alcohol',
    functions: ['emollient', 'thickener'],
    typicalRange: [1, 5],
    isAnchor: true,
    skin: { comedogenic: 2 },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'butyrospermum parkii butter',
    aliases: ['shea butter', 'butyrospermum parkii', 'beurre de karite'],
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: {
      comedogenic: 1,
      benefits: [{ concern: 'dryness', minEffective: 2, strength: 2, evidence: 'medium' }],
    },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'cocos nucifera oil',
    aliases: ['coconut oil', 'huile de coco'],
    functions: ['emollient'],
    typicalRange: [1, 15],
    skin: { comedogenic: 4 },
    env: { biodegradability: 'good' },
    sources: [
      SRC_COSING,
      'Reputee comedogene : donnee issue de tests sur oreille de lapin, transposition humaine incertaine',
    ],
  },
  {
    inci: 'simmondsia chinensis seed oil',
    aliases: ['jojoba oil', 'huile de jojoba', 'simmondsia chinensis oil'],
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: { comedogenic: 2 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'isopropyl myristate',
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: {
      comedogenic: 5,
      irritation: { severity: 1, threshold: 3, onlyForTypes: ['oily', 'combination'] },
    },
    sources: [
      SRC_COSING,
      'Ester a fort potentiel comedogene dans les modeles disponibles ; a considerer avec prudence',
    ],
  },
  {
    inci: 'paraffinum liquidum',
    aliases: ['mineral oil', 'huile minerale', 'petrolatum', 'paraffin'],
    functions: ['emollient', 'film_former'],
    typicalRange: [1, 30],
    skin: { comedogenic: 0 },
    env: { biodegradability: 'poor', petrochemical: true },
    sources: [
      SRC_COSING,
      'Occlusif tres bien tolere par la peau ; origine petrochimique et faible biodegradabilite',
    ],
  },
  {
    inci: 'coco-caprylate',
    aliases: ['coco-caprylate/caprate'],
    functions: ['emollient'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // ---------------------------------------------------------------------------
  // Emulsifiants
  // ---------------------------------------------------------------------------
  {
    inci: 'glyceryl stearate',
    functions: ['emulsifier'],
    typicalRange: [1, 5],
    isAnchor: true,
    skin: { comedogenic: 1 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'peg-100 stearate',
    functions: ['emulsifier'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    env: { biodegradability: 'moderate', petrochemical: true },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'polysorbate 20',
    aliases: ['polysorbate 60', 'polysorbate 80'],
    functions: ['emulsifier', 'surfactant'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    env: { biodegradability: 'moderate' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'cetearyl olivate',
    aliases: ['sorbitan olivate'],
    functions: ['emulsifier'],
    typicalRange: [1, 5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // ---------------------------------------------------------------------------
  // Surfactants (nettoyants)
  // ---------------------------------------------------------------------------
  {
    inci: 'sodium laureth sulfate',
    aliases: ['sles'],
    functions: ['surfactant'],
    typicalRange: [2, 15],
    skin: { stripping: { severity: 2, threshold: 5 } },
    env: { biodegradability: 'good', aquaticToxicity: 2 },
    sources: [SRC_COSING, 'Tensioactif anionique : effet degraissant dose-dependant'],
  },
  {
    inci: 'sodium lauryl sulfate',
    aliases: ['sls'],
    functions: ['surfactant'],
    typicalRange: [1, 10],
    skin: {
      stripping: { severity: 3, threshold: 1 },
      irritation: { severity: 2, threshold: 2, onlyForTypes: ['sensitive', 'dry'] },
    },
    env: { biodegradability: 'good', aquaticToxicity: 2 },
    sources: [
      SRC_COSING,
      'Utilise comme irritant de reference dans les tests dermatologiques : effet marque des 1 a 2 %',
    ],
  },
  {
    inci: 'cocamidopropyl betaine',
    functions: ['surfactant'],
    typicalRange: [1, 10],
    skin: {
      allergen: 'known_sensitizer',
      stripping: { severity: 1, threshold: 5 },
    },
    env: { biodegradability: 'good', aquaticToxicity: 2 },
    sources: [
      SRC_COSING,
      'Tensioactif doux mais sensibilisant de contact reconnu (impuretes amidoamine)',
    ],
  },
  {
    inci: 'coco-glucoside',
    aliases: ['lauryl glucoside', 'decyl glucoside', 'caprylyl/capryl glucoside'],
    functions: ['surfactant'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good', aquaticToxicity: 1 },
    sources: [SRC_COSING, 'Tensioactif non ionique doux, bien tolere'],
  },
  {
    inci: 'sodium cocoyl isethionate',
    functions: ['surfactant'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Tensioactif doux, bonne tolerance cutanee'],
  },

  // ---------------------------------------------------------------------------
  // Conservateurs
  //
  // Ce sont les ancres les plus utiles du moteur : leurs limites legales sont
  // basses et strictes, donc tout ce qui les suit dans une liste INCI est
  // necessairement present a une concentration inferieure.
  // ---------------------------------------------------------------------------
  {
    inci: 'phenoxyethanol',
    functions: ['preservative'],
    typicalRange: [0.3, 1],
    regulatoryMax: { leave_on_face: 1, rinse_off_face: 1, leave_on_body: 1 },
    isAnchor: true,
    skin: { irritation: { severity: 1, threshold: 0.7, onlyForTypes: ['sensitive'] } },
    env: { biodegradability: 'moderate', aquaticToxicity: 1 },
    sources: [
      SRC_ANNEX_V,
      "Plafonne a 1 % : ancre de reference pour borner la fin d'une liste INCI",
    ],
  },
  {
    inci: 'ethylhexylglycerin',
    functions: ['preservative', 'humectant'],
    typicalRange: [0.3, 1],
    isAnchor: true,
    sources: [SRC_COSING, "Booster de conservation, usage courant entre 0,3 et 1 %"],
  },
  {
    inci: 'caprylyl glycol',
    functions: ['preservative', 'humectant'],
    typicalRange: [0.3, 1],
    isAnchor: true,
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sodium benzoate',
    functions: ['preservative'],
    // Plage tous produits confondus : c'est la limite legale par categorie
    // qui la resserre ensuite (0,5 % sans rincage, 2,5 % en rincage).
    typicalRange: [0.1, 1],
    regulatoryMax: { leave_on_face: 0.5, leave_on_body: 0.5, rinse_off_face: 2.5 },
    isAnchor: true,
    env: { biodegradability: 'good', aquaticToxicity: 1 },
    sources: [
      SRC_ANNEX_V,
      'Limite exprimee en acide benzoique : 0,5 % en produit sans rincage',
    ],
  },
  {
    inci: 'potassium sorbate',
    functions: ['preservative'],
    typicalRange: [0.1, 0.6],
    regulatoryMax: { leave_on_face: 0.6, rinse_off_face: 0.6, leave_on_body: 0.6 },
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_ANNEX_V, 'Limite exprimee en acide sorbique : 0,6 %'],
  },
  {
    inci: 'benzyl alcohol',
    functions: ['preservative', 'fragrance'],
    typicalRange: [0.1, 1],
    regulatoryMax: { leave_on_face: 1, rinse_off_face: 1, leave_on_body: 1 },
    isAnchor: true,
    skin: { allergen: 'declarable_fragrance' },
    sources: [
      SRC_ANNEX_V,
      SRC_ANNEX_III,
      "Conservateur plafonne a 1 %, egalement allergene de parfum a declaration obligatoire",
    ],
  },
  {
    inci: 'chlorphenesin',
    functions: ['preservative'],
    typicalRange: [0.1, 0.3],
    regulatoryMax: { leave_on_face: 0.3, rinse_off_face: 0.3, leave_on_body: 0.3 },
    isAnchor: true,
    sources: [SRC_ANNEX_V],
  },
  {
    inci: 'dehydroacetic acid',
    aliases: ['sodium dehydroacetate'],
    functions: ['preservative'],
    typicalRange: [0.1, 0.6],
    regulatoryMax: { leave_on_face: 0.6, rinse_off_face: 0.6, leave_on_body: 0.6 },
    isAnchor: true,
    sources: [SRC_ANNEX_V],
  },
  {
    inci: 'methylisothiazolinone',
    aliases: ['mit', 'mi'],
    functions: ['preservative'],
    typicalRange: [0.0001, 0.0015],
    regulatoryMax: { rinse_off_face: 0.0015 },
    isAnchor: true,
    skin: { allergen: 'known_sensitizer', irritation: { severity: 3, threshold: 0.0001 } },
    sources: [
      SRC_ANNEX_V,
      'Interdit en produit sans rincage depuis 2017 ; sensibilisant de contact majeur, actif a l\'etat de trace',
    ],
  },
  {
    inci: 'methylchloroisothiazolinone',
    aliases: ['cmit', 'methylchloroisothiazolinone/methylisothiazolinone'],
    functions: ['preservative'],
    typicalRange: [0.0001, 0.0015],
    regulatoryMax: { rinse_off_face: 0.0015 },
    isAnchor: true,
    skin: { allergen: 'known_sensitizer', irritation: { severity: 3, threshold: 0.0001 } },
    sources: [SRC_ANNEX_V, 'Autorise en rincage uniquement, en melange 3:1 avec la MIT'],
  },
  {
    inci: 'dmdm hydantoin',
    functions: ['preservative'],
    typicalRange: [0.1, 0.6],
    regulatoryMax: { leave_on_face: 0.6, rinse_off_face: 0.6, leave_on_body: 0.6 },
    isAnchor: true,
    skin: { allergen: 'known_sensitizer', irritation: { severity: 2, threshold: 0.1 } },
    sources: [
      SRC_ANNEX_V,
      'Liberateur de formaldehyde : etiquetage "liberateur de formaldehyde" obligatoire au-dela de 0,001 %',
    ],
  },
  {
    inci: 'imidazolidinyl urea',
    aliases: ['diazolidinyl urea'],
    functions: ['preservative'],
    typicalRange: [0.1, 0.5],
    regulatoryMax: { leave_on_face: 0.5, rinse_off_face: 0.5, leave_on_body: 0.5 },
    isAnchor: true,
    skin: { allergen: 'known_sensitizer', irritation: { severity: 2, threshold: 0.1 } },
    sources: [SRC_ANNEX_V, 'Liberateur de formaldehyde'],
  },
  {
    inci: 'methylparaben',
    functions: ['preservative'],
    typicalRange: [0.1, 0.4],
    regulatoryMax: { leave_on_face: 0.4, rinse_off_face: 0.4, leave_on_body: 0.4 },
    isAnchor: true,
    env: { biodegradability: 'good', aquaticToxicity: 1 },
    sources: [
      SRC_ANNEX_V,
      'Autorise a 0,4 % seul, 0,8 % en melange de parabens ; juge sur par le SCCS aux doses autorisees',
    ],
  },
  {
    inci: 'propylparaben',
    aliases: ['butylparaben'],
    functions: ['preservative'],
    typicalRange: [0.05, 0.14],
    regulatoryMax: { leave_on_face: 0.14, rinse_off_face: 0.14, leave_on_body: 0.14 },
    isAnchor: true,
    env: { aquaticToxicity: 2 },
    sources: [
      SRC_ANNEX_V,
      'Limite abaissee a 0,14 % en 2014 suite a l\'avis du SCCS sur l\'activite endocrinienne',
    ],
  },

  // ---------------------------------------------------------------------------
  // Chelateurs et ajusteurs de pH — ancres tres fiables
  // ---------------------------------------------------------------------------
  {
    inci: 'disodium edta',
    aliases: ['tetrasodium edta', 'edta', 'trisodium edta'],
    functions: ['chelator'],
    typicalRange: [0.05, 0.2],
    isAnchor: true,
    env: { biodegradability: 'poor', aquaticToxicity: 1, persistent: true },
    sources: [
      SRC_COSING,
      "Chelateur utilise a tres faible dose ; faiblement biodegradable et mobilise les metaux en milieu aquatique",
    ],
  },
  {
    inci: 'citric acid',
    functions: ['ph_adjuster', 'chelator'],
    typicalRange: [0.05, 0.5],
    isAnchor: true,
    env: { biodegradability: 'good', aquaticToxicity: 0 },
    sources: [SRC_COSING, "Ajusteur de pH : usage limite a quelques dixiemes de pourcent"],
  },
  {
    inci: 'sodium hydroxide',
    functions: ['ph_adjuster'],
    typicalRange: [0.05, 0.5],
    isAnchor: true,
    sources: [SRC_COSING, 'Neutralisant, present en quantite stoechiometrique tres faible'],
  },
  {
    inci: 'sodium citrate',
    aliases: ['trisodium citrate'],
    functions: ['ph_adjuster', 'chelator'],
    typicalRange: [0.1, 0.5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'trisodium ethylenediamine disuccinate',
    functions: ['chelator'],
    typicalRange: [0.05, 0.3],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, "Alternative biodegradable a l'EDTA"],
  },

  // ---------------------------------------------------------------------------
  // Epaississants — ancres fiables
  // ---------------------------------------------------------------------------
  {
    inci: 'xanthan gum',
    functions: ['thickener'],
    typicalRange: [0.1, 1],
    isAnchor: true,
    env: { biodegradability: 'good', aquaticToxicity: 0 },
    sources: [SRC_COSING, "Gelifiant efficace des 0,1 % ; rarement au-dela de 1 %"],
  },
  {
    inci: 'carbomer',
    functions: ['thickener'],
    typicalRange: [0.1, 1],
    isAnchor: true,
    env: { biodegradability: 'poor', petrochemical: true },
    sources: [SRC_COSING, "Polymere acrylique : gelifiant a tres faible dose"],
  },
  {
    inci: 'acrylates/c10-30 alkyl acrylate crosspolymer',
    functions: ['thickener', 'film_former'],
    typicalRange: [0.1, 1],
    isAnchor: true,
    env: { biodegradability: 'poor', petrochemical: true },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sclerotium gum',
    aliases: ['hydroxyethylcellulose', 'cellulose gum', 'hydroxypropyl methylcellulose'],
    functions: ['thickener'],
    typicalRange: [0.1, 1],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // ---------------------------------------------------------------------------
  // Antioxydants — ancres fiables
  // ---------------------------------------------------------------------------
  {
    inci: 'tocopherol',
    aliases: ['vitamin e', 'mixed tocopherols'],
    functions: ['antioxidant'],
    typicalRange: [0.05, 0.5],
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'aging', minEffective: 0.1, strength: 1, evidence: 'medium' }],
    },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, "Antioxydant de formule, dose usuelle inferieure a 0,5 %"],
  },
  {
    inci: 'tocopheryl acetate',
    functions: ['antioxidant'],
    typicalRange: [0.1, 1],
    isAnchor: true,
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'bht',
    aliases: ['butylated hydroxytoluene'],
    functions: ['antioxidant'],
    typicalRange: [0.01, 0.8],
    regulatoryMax: { leave_on_face: 0.8, rinse_off_face: 0.8, leave_on_body: 0.8 },
    isAnchor: true,
    env: { biodegradability: 'poor', aquaticToxicity: 2, persistent: true },
    sources: [SRC_ANNEX_III, 'Antioxydant de synthese, persistant en milieu aquatique'],
  },

  // ---------------------------------------------------------------------------
  // Actifs
  //
  // Le champ `minEffective` est le pendant positif du seuil d'irritation :
  // un actif liste en fin d'INCI, donc sous sa dose efficace, ne doit pas
  // rapporter de points. C'est ce qui distingue un vrai serum d'un produit
  // qui saupoudre un actif pour l'afficher sur son packaging.
  // ---------------------------------------------------------------------------
  {
    inci: 'niacinamide',
    aliases: ['nicotinamide', 'vitamin b3'],
    functions: ['active'],
    typicalRange: [1, 10],
    skin: {
      benefits: [
        { concern: 'acne', minEffective: 2, strength: 3, evidence: 'high' },
        { concern: 'barrier', minEffective: 2, strength: 2, evidence: 'high' },
        { concern: 'pigmentation', minEffective: 4, strength: 2, evidence: 'high' },
        { concern: 'redness', minEffective: 2, strength: 1, evidence: 'medium' },
      ],
      irritation: { severity: 1, threshold: 10, onlyForTypes: ['sensitive'] },
    },
    sources: [
      SRC_COSING,
      "Efficacite sebo-regulatrice documentee des 2 %, depigmentante des 4 %",
      'Tolerance decroissante au-dela de 10 % sur peau reactive',
    ],
  },
  {
    inci: 'ascorbic acid',
    aliases: ['l-ascorbic acid', 'vitamin c'],
    functions: ['active', 'antioxidant'],
    typicalRange: [5, 20],
    skin: {
      benefits: [
        { concern: 'dullness', minEffective: 8, strength: 3, evidence: 'high' },
        { concern: 'pigmentation', minEffective: 8, strength: 2, evidence: 'high' },
        { concern: 'aging', minEffective: 10, strength: 2, evidence: 'medium' },
      ],
      irritation: { severity: 2, threshold: 10, onlyForTypes: ['sensitive'] },
    },
    sources: [
      SRC_COSING,
      "Penetration cutanee documentee entre 8 et 20 % a pH acide",
      'Le pH bas necessaire a la stabilite explique la mauvaise tolerance sur peau reactive',
    ],
  },
  {
    inci: 'sodium ascorbyl phosphate',
    aliases: ['ascorbyl glucoside', 'magnesium ascorbyl phosphate', 'ethyl ascorbic acid'],
    functions: ['active', 'antioxidant'],
    typicalRange: [0.5, 5],
    skin: {
      benefits: [{ concern: 'dullness', minEffective: 1, strength: 1, evidence: 'medium' }],
    },
    sources: [
      SRC_COSING,
      'Derive stabilise de vitamine C : mieux tolere mais efficacite moindre a dose egale',
    ],
  },
  {
    inci: 'retinol',
    functions: ['active'],
    typicalRange: [0.01, 0.3],
    regulatoryMax: { leave_on_face: 0.3, leave_on_body: 0.05 },
    isAnchor: true,
    skin: {
      benefits: [
        { concern: 'aging', minEffective: 0.05, strength: 3, evidence: 'high' },
        { concern: 'acne', minEffective: 0.05, strength: 2, evidence: 'high' },
      ],
      irritation: { severity: 2, threshold: 0.05 },
    },
    sources: [
      SRC_2024_996,
      'Plafonne a 0,3 % (equivalent retinol) sur le visage, 0,05 % sur le corps',
      "Efficacite et irritation sont indissociables et apparaissent au meme seuil",
    ],
  },
  {
    inci: 'retinyl palmitate',
    functions: ['active'],
    typicalRange: [0.05, 1],
    skin: {
      benefits: [{ concern: 'aging', minEffective: 0.3, strength: 1, evidence: 'low' }],
    },
    sources: [
      SRC_2024_996,
      'Ester de retinol : conversion cutanee faible, efficacite tres inferieure au retinol libre',
    ],
  },
  {
    inci: 'salicylic acid',
    aliases: ['bha'],
    functions: ['active'],
    typicalRange: [0.5, 2],
    regulatoryMax: { leave_on_face: 2, rinse_off_face: 2, leave_on_body: 2 },
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'acne', minEffective: 0.5, strength: 3, evidence: 'high' }],
      irritation: { severity: 2, threshold: 1, onlyForTypes: ['sensitive', 'dry'] },
    },
    sources: [
      SRC_ANNEX_III,
      'Plafonne a 2 % hors usage conservateur (0,5 %)',
      'Keratolytique efficace des 0,5 %',
    ],
  },
  {
    inci: 'glycolic acid',
    aliases: ['aha'],
    functions: ['active'],
    typicalRange: [1, 4],
    regulatoryMax: { leave_on_face: 4, rinse_off_face: 4 },
    isAnchor: true,
    skin: {
      benefits: [
        { concern: 'dullness', minEffective: 2, strength: 2, evidence: 'high' },
        { concern: 'pigmentation', minEffective: 3, strength: 1, evidence: 'medium' },
      ],
      irritation: { severity: 2, threshold: 2, onlyForTypes: ['sensitive', 'dry'] },
    },
    sources: [
      SRC_2024_996,
      'Restreint a 4 % pour le grand public, pH minimal impose',
    ],
  },
  {
    inci: 'lactic acid',
    functions: ['active', 'humectant'],
    typicalRange: [1, 10],
    regulatoryMax: { leave_on_face: 10, rinse_off_face: 10 },
    skin: {
      benefits: [
        { concern: 'dullness', minEffective: 3, strength: 2, evidence: 'high' },
        { concern: 'dryness', minEffective: 3, strength: 1, evidence: 'medium' },
      ],
      irritation: { severity: 1, threshold: 5, onlyForTypes: ['sensitive'] },
    },
    sources: [
      SRC_2024_996,
      'AHA mieux tolere que l\'acide glycolique a dose egale (poids moleculaire superieur)',
    ],
  },
  {
    inci: 'azelaic acid',
    functions: ['active'],
    typicalRange: [1, 10],
    skin: {
      benefits: [
        { concern: 'redness', minEffective: 5, strength: 3, evidence: 'high' },
        { concern: 'acne', minEffective: 5, strength: 2, evidence: 'high' },
        { concern: 'pigmentation', minEffective: 5, strength: 2, evidence: 'medium' },
      ],
    },
    sources: [
      SRC_COSING,
      'Efficacite sur la rosacee et les imperfections documentee a partir de 5 a 10 %',
    ],
  },
  {
    inci: 'alpha-arbutin',
    aliases: ['arbutin'],
    functions: ['active'],
    typicalRange: [0.5, 2],
    regulatoryMax: { leave_on_face: 2 },
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'pigmentation', minEffective: 0.5, strength: 2, evidence: 'medium' }],
    },
    sources: [SRC_ANNEX_III, 'Restreint a 2 % en creme visage suite a l\'avis du SCCS'],
  },
  {
    inci: 'ceramide np',
    aliases: ['ceramide ns', 'ceramide ap', 'ceramide eop', 'ceramide 3'],
    functions: ['active', 'emollient'],
    typicalRange: [0.05, 1],
    isAnchor: true,
    skin: {
      benefits: [
        { concern: 'barrier', minEffective: 0.1, strength: 2, evidence: 'high' },
        { concern: 'dryness', minEffective: 0.1, strength: 2, evidence: 'medium' },
      ],
    },
    sources: [SRC_COSING, "Lipide de la barriere cutanee, actif a tres faible dose"],
  },
  {
    inci: 'allantoin',
    functions: ['active'],
    typicalRange: [0.1, 0.5],
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'barrier', minEffective: 0.2, strength: 1, evidence: 'medium' }],
    },
    sources: [SRC_COSING, 'Apaisant, dose usuelle de 0,1 a 0,5 %'],
  },
  {
    inci: 'bisabolol',
    functions: ['active'],
    typicalRange: [0.1, 1],
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'redness', minEffective: 0.2, strength: 2, evidence: 'medium' }],
    },
    sources: [SRC_COSING, 'Anti-inflammatoire issu de la camomille, actif des 0,2 %'],
  },
  {
    inci: 'centella asiatica extract',
    aliases: ['centella asiatica leaf extract', 'madecassoside', 'asiaticoside'],
    functions: ['active'],
    typicalRange: [0.1, 5],
    skin: {
      benefits: [
        { concern: 'redness', minEffective: 0.5, strength: 2, evidence: 'medium' },
        { concern: 'barrier', minEffective: 0.5, strength: 1, evidence: 'medium' },
      ],
    },
    sources: [SRC_COSING, 'Effet apaisant et cicatrisant documente sur extraits titres'],
  },
  {
    inci: 'zinc pca',
    functions: ['active'],
    typicalRange: [0.1, 1],
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'acne', minEffective: 0.2, strength: 1, evidence: 'low' }],
    },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'adenosine',
    functions: ['active'],
    typicalRange: [0.02, 0.1],
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'aging', minEffective: 0.04, strength: 1, evidence: 'medium' }],
    },
    sources: [SRC_COSING, 'Actif anti-rides utilise entre 0,04 et 0,1 %'],
  },
  {
    inci: 'caffeine',
    functions: ['active'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // ---------------------------------------------------------------------------
  // Parfum
  // ---------------------------------------------------------------------------
  {
    inci: 'parfum',
    aliases: ['fragrance', 'aroma', 'parfum (fragrance)', 'fragrance (parfum)'],
    functions: ['fragrance'],
    typicalRange: [0.05, 1],
    isAnchor: true,
    skin: {
      allergen: 'known_sensitizer',
      irritation: { severity: 2, threshold: 0.1, onlyForTypes: ['sensitive'] },
    },
    env: { aquaticToxicity: 1 },
    sources: [
      SRC_COSING,
      "Melange non detaille : premiere cause de dermatite allergique de contact d'origine cosmetique",
      "Dose usuelle en soin visage inferieure a 1 %",
    ],
  },

  // ---------------------------------------------------------------------------
  // Filtres UV
  // ---------------------------------------------------------------------------
  {
    inci: 'ethylhexyl methoxycinnamate',
    aliases: ['octinoxate'],
    functions: ['uv_filter'],
    typicalRange: [1, 10],
    regulatoryMax: { leave_on_face: 10, leave_on_body: 10 },
    isAnchor: true,
    skin: { irritation: { severity: 1, threshold: 5, onlyForTypes: ['sensitive'] } },
    env: { aquaticToxicity: 3, biodegradability: 'poor' },
    sources: [
      SRC_ANNEX_VI,
      'Toxicite documentee sur les coraux et les organismes aquatiques',
    ],
  },
  {
    inci: 'octocrylene',
    functions: ['uv_filter'],
    typicalRange: [1, 10],
    regulatoryMax: { leave_on_face: 10, leave_on_body: 10 },
    isAnchor: true,
    env: { aquaticToxicity: 2, biodegradability: 'poor' },
    sources: [SRC_ANNEX_VI, "Persistance et ecotoxicite aquatique documentees"],
  },
  {
    inci: 'butyl methoxydibenzoylmethane',
    aliases: ['avobenzone'],
    functions: ['uv_filter'],
    typicalRange: [1, 5],
    regulatoryMax: { leave_on_face: 5, leave_on_body: 5 },
    isAnchor: true,
    env: { aquaticToxicity: 1 },
    sources: [SRC_ANNEX_VI],
  },
  {
    inci: 'titanium dioxide',
    aliases: ['ci 77891'],
    functions: ['uv_filter', 'colorant'],
    typicalRange: [1, 25],
    regulatoryMax: { leave_on_face: 25, leave_on_body: 25 },
    env: { aquaticToxicity: 1 },
    sources: [SRC_ANNEX_VI, 'Filtre mineral, bonne tolerance cutanee'],
  },
  {
    inci: 'zinc oxide',
    functions: ['uv_filter'],
    typicalRange: [1, 25],
    regulatoryMax: { leave_on_face: 25, leave_on_body: 25 },
    env: { aquaticToxicity: 2 },
    sources: [SRC_ANNEX_VI, 'Filtre mineral ; ecotoxicite aquatique sous forme nanometrique'],
  },
  {
    inci: 'homosalate',
    functions: ['uv_filter'],
    typicalRange: [1, 7.34],
    regulatoryMax: { leave_on_face: 7.34 },
    isAnchor: true,
    env: { aquaticToxicity: 2 },
    sources: [
      SRC_ANNEX_VI,
      'Limite abaissee a 7,34 % pour le visage en 2022 (avis SCCS sur la perturbation endocrinienne)',
    ],
  },

  // ---------------------------------------------------------------------------
  // Microplastiques et polymeres de synthese
  // ---------------------------------------------------------------------------
  {
    inci: 'polyethylene',
    functions: ['film_former', 'thickener'],
    typicalRange: [0.5, 10],
    env: { microplastic: true, biodegradability: 'poor', persistent: true, petrochemical: true },
    sources: [SRC_REACH_MP, 'Microparticule de polymere de synthese, interdiction progressive'],
  },
  {
    inci: 'nylon-12',
    aliases: ['nylon-6', 'polyamide-3'],
    functions: ['film_former'],
    typicalRange: [0.5, 10],
    env: { microplastic: true, biodegradability: 'poor', persistent: true, petrochemical: true },
    sources: [SRC_REACH_MP],
  },
  {
    inci: 'triclosan',
    functions: ['preservative'],
    typicalRange: [0.05, 0.3],
    regulatoryMax: { leave_on_face: 0.3, rinse_off_face: 0.3 },
    isAnchor: true,
    env: { aquaticToxicity: 3, biodegradability: 'poor', persistent: true },
    sources: [
      SRC_ANNEX_V,
      'Tres toxique pour les organismes aquatiques ; contribue a la resistance bacterienne',
    ],
  },

  // ---------------------------------------------------------------------------
  // Extension issue de l'audit de couverture
  //
  // Les entrees ci-dessous ont ete ajoutees dans l'ordre de frequence
  // constatee sur un echantillon de produits reels (voir
  // scripts/audit-coverage.ts). Cet ordre est le bon critere d'extension :
  // viser les ingredients effectivement rencontres, non l'exhaustivite de
  // CosIng.
  // ---------------------------------------------------------------------------

  // --- Humectants et solvants ---
  {
    inci: 'propanediol',
    aliases: ['1,3-propanediol', 'propanediol (corn)'],
    functions: ['humectant', 'solvent'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, "Alternative d'origine vegetale au propylene glycol"],
  },
  {
    inci: '1,2-hexanediol',
    aliases: ['hexanediol'],
    functions: ['humectant', 'preservative'],
    typicalRange: [0.3, 2],
    isAnchor: true,
    sources: [SRC_COSING, 'Booster de conservation, usage courant sous 2 %'],
  },
  {
    inci: 'sorbitol',
    functions: ['humectant'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sodium pca',
    functions: ['humectant'],
    typicalRange: [0.1, 2],
    isAnchor: true,
    skin: { benefits: [{ concern: 'dryness', minEffective: 0.5, strength: 1, evidence: 'medium' }] },
    sources: [SRC_COSING, 'Facteur naturel d\'hydratation, usage sous 2 %'],
  },

  // --- Acides gras et alcools gras ---
  {
    inci: 'stearic acid',
    functions: ['emollient', 'emulsifier'],
    typicalRange: [1, 5],
    isAnchor: true,
    skin: { comedogenic: 2 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'palmitic acid',
    functions: ['emollient', 'emulsifier'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    skin: { comedogenic: 2 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'myristic acid',
    functions: ['emollient', 'emulsifier'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    skin: { comedogenic: 3 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'behenyl alcohol',
    functions: ['emollient', 'thickener'],
    typicalRange: [1, 5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Alcool gras epaississant, sans effet assechant'],
  },
  {
    inci: 'stearyl alcohol',
    functions: ['emollient', 'thickener'],
    typicalRange: [1, 5],
    isAnchor: true,
    skin: { comedogenic: 2 },
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // --- Esters emollients ---
  {
    inci: 'dicaprylyl carbonate',
    functions: ['emollient'],
    typicalRange: [1, 15],
    skin: { comedogenic: 1 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'c12-15 alkyl benzoate',
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: { comedogenic: 2 },
    env: { biodegradability: 'moderate' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'octyldodecanol',
    functions: ['emollient'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'cetyl palmitate',
    functions: ['emollient', 'thickener'],
    typicalRange: [1, 5],
    isAnchor: true,
    skin: { comedogenic: 2 },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'myristyl myristate',
    functions: ['emollient'],
    typicalRange: [1, 5],
    isAnchor: true,
    skin: { comedogenic: 3 },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'dibutyl adipate',
    functions: ['emollient'],
    typicalRange: [1, 10],
    env: { biodegradability: 'moderate' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'isopropyl palmitate',
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: { comedogenic: 4 },
    sources: [
      SRC_COSING,
      'Ester a potentiel comedogene dans les modeles disponibles ; donnee de faible robustesse',
    ],
  },

  // --- Huiles vegetales ---
  {
    inci: 'helianthus annuus seed oil',
    aliases: ['helianthus annuus (sunflower) seed oil', 'sunflower oil', 'huile de tournesol'],
    functions: ['emollient'],
    typicalRange: [1, 15],
    skin: {
      comedogenic: 0,
      benefits: [{ concern: 'barrier', minEffective: 2, strength: 2, evidence: 'medium' }],
    },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Riche en acide linoleique, bien tolere y compris sur peau alteree'],
  },
  {
    inci: 'prunus amygdalus dulcis oil',
    aliases: ['sweet almond oil', 'huile d\'amande douce'],
    functions: ['emollient'],
    typicalRange: [1, 15],
    skin: { comedogenic: 2 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'persea gratissima oil',
    aliases: ['avocado oil', 'huile d\'avocat'],
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: { comedogenic: 3 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'olea europaea fruit oil',
    aliases: ['olive oil', 'huile d\'olive'],
    functions: ['emollient'],
    typicalRange: [1, 15],
    skin: { comedogenic: 2 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'argania spinosa kernel oil',
    aliases: ['argan oil', 'huile d\'argan'],
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: { comedogenic: 0 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // --- Emulsifiants ---
  {
    inci: 'lecithin',
    functions: ['emulsifier'],
    typicalRange: [0.1, 2],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sodium stearoyl glutamate',
    functions: ['emulsifier'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Emulsifiant doux d\'origine vegetale'],
  },
  {
    inci: 'cetearyl glucoside',
    functions: ['emulsifier'],
    typicalRange: [1, 5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'glyceryl stearate citrate',
    functions: ['emulsifier'],
    typicalRange: [1, 5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'glyceryl stearate se',
    functions: ['emulsifier'],
    typicalRange: [1, 5],
    isAnchor: true,
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'ceteareth-20',
    aliases: ['ceteareth-12', 'ceteareth-25', 'steareth-20', 'steareth-2'],
    functions: ['emulsifier', 'surfactant'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    env: { biodegradability: 'moderate', petrochemical: true },
    sources: [SRC_COSING, 'Emulsifiant ethoxyle, biodegradabilite moderee'],
  },
  {
    inci: 'potassium cetyl phosphate',
    functions: ['emulsifier'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sucrose stearate',
    aliases: ['sucrose palmitate', 'sucrose laurate'],
    functions: ['emulsifier'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Ester de sucre, emulsifiant doux'],
  },

  // --- Polymeres et epaississants ---
  {
    inci: 'sodium polyacrylate',
    functions: ['thickener'],
    typicalRange: [0.1, 2],
    isAnchor: true,
    env: { biodegradability: 'poor', petrochemical: true },
    sources: [SRC_COSING, 'Polymere acrylique de synthese'],
  },
  {
    inci: 'ammonium acryloyldimethyltaurate/vp copolymer',
    aliases: ['hydroxyethyl acrylate/sodium acryloyldimethyl taurate copolymer'],
    functions: ['thickener', 'film_former'],
    typicalRange: [0.1, 2],
    isAnchor: true,
    env: { biodegradability: 'poor', petrochemical: true },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sodium carbomer',
    functions: ['thickener'],
    typicalRange: [0.1, 1],
    isAnchor: true,
    env: { biodegradability: 'poor', petrochemical: true },
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // --- Charges minerales ---
  {
    inci: 'silica',
    functions: ['thickener', 'film_former'],
    typicalRange: [0.5, 10],
    env: { aquaticToxicity: 0 },
    sources: [SRC_COSING, 'Charge minerale inerte'],
  },
  {
    inci: 'mica',
    functions: ['colorant', 'film_former'],
    typicalRange: [0.5, 10],
    env: { aquaticToxicity: 0 },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'tapioca starch',
    aliases: ['zea mays starch', 'oryza sativa starch', 'corn starch'],
    functions: ['thickener', 'film_former'],
    typicalRange: [0.5, 5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Amidon vegetal, agent de toucher'],
  },
  {
    inci: 'kaolin',
    functions: ['thickener'],
    typicalRange: [1, 10],
    env: { aquaticToxicity: 0 },
    sources: [SRC_COSING, SRC_FORMULATION],
  },

  // --- Antioxydants ---
  {
    inci: 'ascorbyl palmitate',
    functions: ['antioxidant'],
    typicalRange: [0.05, 0.5],
    isAnchor: true,
    sources: [SRC_COSING, 'Derive liposoluble de vitamine C, antioxydant de formule'],
  },
  {
    inci: 'ubiquinone',
    aliases: ['coenzyme q10'],
    functions: ['antioxidant', 'active'],
    typicalRange: [0.05, 1],
    isAnchor: true,
    skin: { benefits: [{ concern: 'aging', minEffective: 0.1, strength: 1, evidence: 'low' }] },
    sources: [SRC_COSING, 'Antioxydant ; efficacite cutanee peu documentee en application topique'],
  },

  // --- Conservation et pH ---
  {
    inci: 'hydroxyacetophenone',
    functions: ['antioxidant', 'preservative'],
    typicalRange: [0.3, 1],
    isAnchor: true,
    sources: [SRC_COSING, 'Booster de conservation, usage entre 0,3 et 1 %'],
  },
  {
    inci: 'triethanolamine',
    aliases: ['tea'],
    functions: ['ph_adjuster'],
    typicalRange: [0.1, 2.5],
    regulatoryMax: { leave_on_face: 2.5, leave_on_body: 2.5 },
    isAnchor: true,
    skin: { irritation: { severity: 1, threshold: 2, onlyForTypes: ['sensitive'] } },
    env: { aquaticToxicity: 1 },
    sources: [SRC_ANNEX_III, 'Neutralisant restreint a 2,5 % en produit sans rincage'],
  },
  {
    inci: 'sodium chloride',
    functions: ['thickener'],
    typicalRange: [0.5, 5],
    isAnchor: true,
    env: { aquaticToxicity: 0 },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sodium phytate',
    aliases: ['phytic acid'],
    functions: ['chelator'],
    typicalRange: [0.05, 0.5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, "Chelateur biodegradable, alternative a l'EDTA"],
  },
  {
    inci: 'sodium levulinate',
    aliases: ['levulinic acid', 'sodium anisate', 'p-anisic acid', 'anisic acid'],
    functions: ['preservative'],
    typicalRange: [0.2, 1],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Conservateur agree en cosmetique biologique'],
  },

  // --- Filtres UV complementaires ---
  {
    inci: 'ethylhexyl triazone',
    functions: ['uv_filter'],
    typicalRange: [1, 5],
    regulatoryMax: { leave_on_face: 5, leave_on_body: 5 },
    isAnchor: true,
    env: { aquaticToxicity: 1, biodegradability: 'poor' },
    sources: [SRC_ANNEX_VI, 'Filtre UVB photostable, faible penetration cutanee'],
  },
  {
    inci: 'diethylamino hydroxybenzoyl hexyl benzoate',
    functions: ['uv_filter'],
    typicalRange: [1, 10],
    regulatoryMax: { leave_on_face: 10, leave_on_body: 10 },
    isAnchor: true,
    env: { aquaticToxicity: 1, biodegradability: 'poor' },
    sources: [SRC_ANNEX_VI, 'Filtre UVA photostable'],
  },
  {
    inci: 'ethylhexyl salicylate',
    aliases: ['octisalate'],
    functions: ['uv_filter'],
    typicalRange: [1, 5],
    regulatoryMax: { leave_on_face: 5, leave_on_body: 5 },
    isAnchor: true,
    env: { aquaticToxicity: 2, biodegradability: 'poor' },
    sources: [SRC_ANNEX_VI],
  },
  {
    inci: 'phenylbenzimidazole sulfonic acid',
    aliases: ['ensulizole'],
    functions: ['uv_filter'],
    typicalRange: [1, 8],
    regulatoryMax: { leave_on_face: 8, leave_on_body: 8 },
    isAnchor: true,
    env: { aquaticToxicity: 1 },
    sources: [SRC_ANNEX_VI, 'Filtre UVB hydrosoluble, limite exprimee en acide'],
  },
  {
    inci: 'bis-ethylhexyloxyphenol methoxyphenyl triazine',
    aliases: ['tinosorb s'],
    functions: ['uv_filter'],
    typicalRange: [1, 10],
    regulatoryMax: { leave_on_face: 10, leave_on_body: 10 },
    isAnchor: true,
    env: { aquaticToxicity: 1, biodegradability: 'poor' },
    sources: [SRC_ANNEX_VI, 'Filtre large spectre photostable'],
  },
  {
    inci: 'methylene bis-benzotriazolyl tetramethylbutylphenol',
    aliases: ['tinosorb m'],
    functions: ['uv_filter'],
    typicalRange: [1, 10],
    regulatoryMax: { leave_on_face: 10, leave_on_body: 10 },
    isAnchor: true,
    env: { aquaticToxicity: 1, biodegradability: 'poor' },
    sources: [SRC_ANNEX_VI, 'Filtre large spectre particulaire'],
  },

  // --- Extraits vegetaux courants ---
  {
    inci: 'aloe barbadensis leaf juice',
    aliases: ['aloe barbadensis leaf extract', 'aloe vera juice', 'aloe barbadensis'],
    functions: ['humectant', 'active'],
    typicalRange: [0.1, 10],
    skin: { benefits: [{ concern: 'redness', minEffective: 1, strength: 1, evidence: 'low' }] },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Apaisant traditionnel ; niveau de preuve clinique limite'],
  },
  {
    inci: 'camellia sinensis leaf extract',
    aliases: ['green tea extract', 'camellia sinensis extract'],
    functions: ['antioxidant', 'active'],
    typicalRange: [0.1, 5],
    skin: { benefits: [{ concern: 'redness', minEffective: 0.5, strength: 1, evidence: 'medium' }] },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Polyphenols antioxydants'],
  },
  {
    inci: 'glycyrrhiza glabra root extract',
    aliases: ['licorice extract', 'glycyrrhiza glabra extract'],
    functions: ['active'],
    typicalRange: [0.1, 2],
    isAnchor: true,
    skin: {
      benefits: [
        { concern: 'pigmentation', minEffective: 0.5, strength: 1, evidence: 'medium' },
        { concern: 'redness', minEffective: 0.5, strength: 1, evidence: 'medium' },
      ],
    },
    sources: [SRC_COSING, 'Extrait de reglisse, effet depigmentant et apaisant'],
  },

  // --- Seconde vague d'extension, meme methode ---
  {
    inci: 'glyceryl caprylate',
    aliases: ['glyceryl undecylenate', 'glyceryl laurate'],
    functions: ['preservative', 'emulsifier'],
    typicalRange: [0.3, 1],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Booster de conservation d\'origine vegetale'],
  },
  {
    inci: 'benzoic acid',
    functions: ['preservative'],
    typicalRange: [0.1, 0.5],
    regulatoryMax: { leave_on_face: 0.5, leave_on_body: 0.5, rinse_off_face: 2.5 },
    isAnchor: true,
    env: { biodegradability: 'good', aquaticToxicity: 1 },
    sources: [SRC_ANNEX_V],
  },
  {
    inci: 'arginine',
    functions: ['ph_adjuster', 'humectant'],
    typicalRange: [0.1, 2],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, 'Acide amine, neutralisant doux'],
  },
  {
    inci: 'methylpropanediol',
    functions: ['humectant', 'solvent'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'xylitol',
    aliases: ['glucose', 'maltodextrin', 'anhydroxylitol', 'xylitylglucoside'],
    functions: ['humectant'],
    typicalRange: [0.5, 5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sodium lactate',
    functions: ['humectant', 'ph_adjuster'],
    typicalRange: [0.5, 5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, "Facteur naturel d'hydratation"],
  },
  {
    inci: 'hydrogenated coco-glycerides',
    aliases: ['hydrogenated vegetable oil', 'hydrogenated palm glycerides'],
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: { comedogenic: 1 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'dicaprylyl ether',
    functions: ['emollient'],
    typicalRange: [1, 10],
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'ethylhexyl stearate',
    aliases: ['ethylhexyl palmitate', 'propylheptyl caprylate', 'ethylhexyl cocoate'],
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: { comedogenic: 2 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'isohexadecane',
    aliases: ['isododecane', 'c13-14 isoparaffin', 'hydrogenated polyisobutene', 'polyisobutene'],
    functions: ['emollient', 'solvent'],
    typicalRange: [1, 15],
    env: { biodegradability: 'poor', petrochemical: true },
    sources: [SRC_COSING, 'Hydrocarbure de synthese, faiblement biodegradable'],
  },
  {
    inci: 'cera microcristallina',
    aliases: ['microcrystalline wax', 'cera alba', 'beeswax', 'cire d\'abeille'],
    functions: ['thickener', 'film_former'],
    typicalRange: [1, 10],
    env: { biodegradability: 'poor', petrochemical: true },
    sources: [SRC_COSING, 'Cire de structure ; origine petrochimique pour la forme microcristalline'],
  },
  {
    inci: 'vitis vinifera seed oil',
    aliases: ['grape seed oil', 'huile de pepins de raisin'],
    functions: ['emollient'],
    typicalRange: [1, 10],
    skin: { comedogenic: 1 },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'sorbitan isostearate',
    aliases: ['sorbitan stearate', 'sorbitan oleate', 'sorbitan laurate'],
    functions: ['emulsifier'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'phospholipids',
    aliases: ['hydrogenated lecithin', 'phosphatidylcholine'],
    functions: ['emulsifier'],
    typicalRange: [0.1, 2],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'laureth-7',
    aliases: ['laureth-4', 'laureth-23'],
    functions: ['emulsifier', 'surfactant'],
    typicalRange: [0.2, 2],
    isAnchor: true,
    env: { biodegradability: 'moderate', petrochemical: true },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'polyacrylamide',
    aliases: ['ammonium polyacryloyldimethyl taurate', 'sodium polyacryloyldimethyl taurate'],
    functions: ['thickener', 'film_former'],
    typicalRange: [0.1, 2],
    isAnchor: true,
    env: { biodegradability: 'poor', persistent: true, petrochemical: true },
    sources: [
      SRC_COSING,
      'Polymere de synthese non biodegradable ; residus d\'acrylamide surveilles',
    ],
  },
  {
    inci: 'dimethicone crosspolymer',
    aliases: ['dimethicone/vinyl dimethicone crosspolymer', 'cyclohexasiloxane'],
    functions: ['film_former', 'emollient'],
    typicalRange: [0.5, 5],
    env: { biodegradability: 'poor', persistent: true },
    sources: [SRC_COSING, 'Silicone reticule, faiblement biodegradable'],
  },
  {
    inci: 'aluminum starch octenylsuccinate',
    functions: ['thickener', 'film_former'],
    typicalRange: [0.5, 5],
    isAnchor: true,
    env: { biodegradability: 'moderate' },
    sources: [SRC_COSING, 'Amidon modifie, agent matifiant'],
  },
  {
    inci: 'biosaccharide gum-1',
    aliases: ['biosaccharide gum-4', 'beta-glucan'],
    functions: ['humectant', 'film_former'],
    typicalRange: [0.1, 3],
    isAnchor: true,
    skin: { benefits: [{ concern: 'barrier', minEffective: 0.5, strength: 1, evidence: 'low' }] },
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'capryloyl salicylic acid',
    aliases: ['lha'],
    functions: ['active'],
    typicalRange: [0.1, 2],
    regulatoryMax: { leave_on_face: 2 },
    isAnchor: true,
    skin: {
      benefits: [{ concern: 'acne', minEffective: 0.3, strength: 2, evidence: 'medium' }],
      irritation: { severity: 1, threshold: 1, onlyForTypes: ['sensitive'] },
    },
    sources: [SRC_ANNEX_III, 'Derive lipophile de l\'acide salicylique, mieux tolere'],
  },
  {
    inci: 'tetrasodium glutamate diacetate',
    functions: ['chelator'],
    typicalRange: [0.05, 0.5],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, "Chelateur biodegradable, alternative a l'EDTA"],
  },
  {
    inci: 'tromethamine',
    aliases: ['aminomethyl propanol'],
    functions: ['ph_adjuster'],
    typicalRange: [0.05, 1],
    isAnchor: true,
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'disodium phosphate',
    aliases: ['potassium phosphate', 'sodium phosphate', 'magnesium sulfate', 'sodium sulfate'],
    functions: ['ph_adjuster'],
    typicalRange: [0.05, 1],
    isAnchor: true,
    env: { aquaticToxicity: 0 },
    sources: [SRC_COSING, 'Sel tampon, usage a tres faible dose'],
  },
  {
    inci: 'myristyl alcohol',
    aliases: ['lauryl alcohol', 'arachidyl alcohol'],
    functions: ['emollient', 'thickener'],
    typicalRange: [0.5, 3],
    isAnchor: true,
    env: { biodegradability: 'good' },
    sources: [SRC_COSING, SRC_FORMULATION],
  },
  {
    inci: 'ci 42090',
    aliases: ['ci 19140', 'ci 15985', 'ci 77491', 'ci 77492', 'ci 77499', 'ci 16035'],
    functions: ['colorant'],
    typicalRange: [0.0001, 0.1],
    isAnchor: true,
    sources: [
      'Reglement (CE) 1223/2009, Annexe IV (colorants autorises)',
      'Colorants employes a tres faible dose',
    ],
  },
];

/**
 * Les 23 allergenes de parfum a declaration obligatoire les plus rencontres
 * (Annexe III du reglement 1223/2009). Leur declaration est requise des
 * 0,001 % en produit sans rincage, ce qui plafonne de fait leur presence
 * connue a des doses faibles : c'est la raison pour laquelle le moteur leur
 * applique une penalite proportionnee et non forfaitaire.
 *
 * Le reglement (UE) 2023/1545 porte cette liste a plus de 80 substances ;
 * l'extension du referentiel suit la meme structure.
 */
const DECLARABLE_FRAGRANCE_ALLERGENS: Array<[string, 1 | 2 | 3]> = [
  ['limonene', 1],
  ['linalool', 1],
  ['citronellol', 1],
  ['geraniol', 2],
  ['citral', 2],
  ['eugenol', 2],
  ['coumarin', 1],
  ['benzyl salicylate', 1],
  ['hexyl cinnamal', 1],
  ['alpha-isomethyl ionone', 1],
  ['hydroxycitronellal', 2],
  ['benzyl benzoate', 1],
  ['cinnamal', 3],
  ['cinnamyl alcohol', 2],
  ['isoeugenol', 3],
  ['amyl cinnamal', 1],
  ['anise alcohol', 1],
  ['benzyl cinnamate', 1],
  ['farnesol', 2],
  ['methyl 2-octynoate', 2],
  ['evernia prunastri extract', 3],
  ['evernia furfuracea extract', 3],
  ['butylphenyl methylpropional', 3],
];

const FRAGRANCE_ALLERGEN_ENTRIES: Ingredient[] = DECLARABLE_FRAGRANCE_ALLERGENS.map(
  ([inci, severity]): Ingredient => ({
    inci,
    functions: ['fragrance'],
    typicalRange: [0.001, 0.5],
    isAnchor: true,
    skin: {
      allergen: 'declarable_fragrance',
      irritation: { severity, threshold: 0.01, onlyForTypes: ['sensitive'] },
    },
    env: { aquaticToxicity: 1 },
    sources: [
      SRC_ANNEX_III,
      'Allergene de parfum a declaration obligatoire des 0,001 % en produit sans rincage',
    ],
  }),
);

/** Referentiel complet, expose au moteur. */
export const ALL_INGREDIENTS: Ingredient[] = [
  ...INGREDIENTS,
  ...FRAGRANCE_ALLERGEN_ENTRIES,
];

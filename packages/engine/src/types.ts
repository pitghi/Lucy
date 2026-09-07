/**
 * Types du moteur Lucy.
 *
 * Principe directeur : on ne fusionne jamais le score peau et le score
 * environnement, et aucune penalite n'est appliquee sans passer par la
 * concentration estimee de l'ingredient.
 */

export type SkinType = 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';

/** Preoccupations declarees par l'utilisateur dans son profil. */
export type Concern =
  | 'acne'
  | 'redness'
  | 'dryness'
  | 'aging'
  | 'pigmentation'
  | 'dullness'
  | 'barrier';

/** Type de produit : conditionne les limites reglementaires applicables. */
export type ProductCategory = 'leave_on_face' | 'rinse_off_face' | 'leave_on_body';

/** Fonction technique de l'ingredient dans la formule. */
export type IngredientFunction =
  | 'solvent'
  | 'humectant'
  | 'emollient'
  | 'emulsifier'
  | 'surfactant'
  | 'preservative'
  | 'thickener'
  | 'ph_adjuster'
  | 'chelator'
  | 'antioxidant'
  | 'fragrance'
  | 'colorant'
  | 'active'
  | 'film_former'
  | 'uv_filter';

/** Niveau de confiance attache a une estimation ou a une penalite. */
export type Confidence = 'high' | 'medium' | 'low';

/** Effet irritant potentiel, avec le seuil en dessous duquel il est negligeable. */
export interface IrritationProfile {
  /** 0 = aucun, 1 = leger, 2 = modere, 3 = fort. */
  severity: 1 | 2 | 3;
  /**
   * Concentration (%) en dessous de laquelle l'effet est considere negligeable.
   * C'est ce seuil qui permet de ne pas penaliser un irritant present a l'etat
   * de trace, contrairement aux notations binaires du marche.
   */
  threshold: number;
  /** Si renseigne, l'irritation ne concerne que ces types de peau. */
  onlyForTypes?: SkinType[];
}

/** Benefice attendu d'un actif, a partir d'une concentration efficace. */
export interface BenefitProfile {
  concern: Concern;
  /** Concentration (%) minimale a partir de laquelle l'effet est documente. */
  minEffective: number;
  /** 1 = benefice mineur, 2 = notable, 3 = bien etabli. */
  strength: 1 | 2 | 3;
  evidence: Confidence;
}

export interface SkinData {
  irritation?: IrritationProfile;
  /**
   * Indice comedogene 0-5. Les donnees publiques proviennent de tests sur
   * oreille de lapin (annees 70) et sont faiblement transposables a l'humain :
   * le scoring leur applique volontairement un poids reduit.
   */
  comedogenic?: number;
  /** Allergene de parfum a declaration obligatoire (Annexe III UE) ou sensibilisant connu. */
  allergen?: 'declarable_fragrance' | 'known_sensitizer';
  /** Effet assechant / degraissant marque (surfactants notamment). */
  stripping?: IrritationProfile;
  benefits?: BenefitProfile[];
}

export interface EnvData {
  biodegradability?: 'good' | 'moderate' | 'poor';
  /** 0 = non concerne, 1 = faible, 2 = modere, 3 = elevee. */
  aquaticToxicity?: 0 | 1 | 2 | 3;
  /** Microplastique au sens du reglement REACH 2023/2055. */
  microplastic?: boolean;
  /** Persistant / bioaccumulable (PBT ou vPvB). */
  persistent?: boolean;
  /** Origine petrochimique (information, non penalisante en soi). */
  petrochemical?: boolean;
}

/** Une entree du referentiel ingredients. */
export interface Ingredient {
  /** Nom INCI canonique, en minuscules. */
  inci: string;
  /** Variantes rencontrees sur les emballages (multilingue, synonymes). */
  aliases?: string[];
  functions: IngredientFunction[];
  /**
   * Plage d'usage typique (%) en soin visage. Sert de borne pour l'estimation
   * de concentration par ancrage.
   */
  typicalRange?: [number, number];
  /** Limite reglementaire (%) par categorie de produit (Annexes UE 1223/2009). */
  regulatoryMax?: Partial<Record<ProductCategory, number>>;
  /**
   * true si la plage d'usage de cet ingredient est suffisamment contrainte
   * pour l'utiliser comme marqueur de seuil dans une liste INCI.
   */
  isAnchor?: boolean;
  skin?: SkinData;
  env?: EnvData;
  /** References documentaires, affichees a l'utilisateur. */
  sources: string[];
}

/** Un ingredient tel que lu sur l'emballage, apres parsing. */
export interface ParsedIngredient {
  /** Position dans la liste (0 = premier). */
  position: number;
  /** Libelle brut tel qu'imprime. */
  raw: string;
  /** Libelle normalise, utilise pour la resolution dans le referentiel. */
  normalized: string;
  /** Entree du referentiel, si resolue. */
  ingredient?: Ingredient;
  /** Ingredient issu de l'agriculture biologique (astérisque sur l'emballage). */
  organic?: boolean;
  /**
   * true si l'ingredient provient d'une mention "peut contenir" (colorants
   * alternatifs) : sa presence n'est pas garantie.
   */
  mayContain?: boolean;
}

/** Concentration estimee d'un ingredient dans le produit. */
export interface ConcentrationEstimate {
  position: number;
  inci: string;
  /** Borne basse (%) de l'intervalle estime. */
  min: number;
  /** Borne haute (%) de l'intervalle estime. */
  max: number;
  confidence: Confidence;
  /** Comment l'estimation a ete obtenue, pour l'affichage de la methode. */
  method:
    | 'brand_claim'
    | 'regulatory_cap'
    | 'anchored'
    | 'typical_range'
    | 'below_one_percent'
    | 'mass_balance'
    | 'unknown';
}

/** Claim chiffre revendique par la marque, ex. "10% niacinamide". */
export interface BrandClaim {
  inci: string;
  percent: number;
}

/** Profil utilisateur : ce que l'app collecte a l'onboarding puis affine. */
export interface SkinProfile {
  skinType: SkinType;
  concerns: Concern[];
  /** INCI que l'utilisateur declare bien tolerer : neutralise les penalites. */
  tolerated: string[];
  /** INCI que l'utilisateur ne tolere pas : exclusion du produit. */
  notTolerated: string[];
  /** L'utilisateur souhaite eviter tout parfum. */
  avoidFragrance?: boolean;
}

/** Une ligne d'explication du score, affichee dans la fiche produit. */
export interface ScoreReason {
  inci: string;
  /** Impact sur le score : negatif = penalite, positif = bonus. */
  impact: number;
  /** Explication en langage utilisateur. */
  label: string;
  /** Concentration estimee retenue pour ce calcul. */
  concentration: { min: number; max: number };
  confidence: Confidence;
  sources: string[];
  /**
   * true si la ligne est affichee a titre d'information sans peser sur la
   * valeur du score. Le score de tolerance liste ainsi les actifs presents
   * a dose efficace sans les crediter : la tolerance et l'efficacite sont
   * deux questions distinctes.
   */
  informational?: boolean;
}

export interface ScoreResult {
  /** 0-100. */
  value: number;
  reasons: ScoreReason[];
  /** Part de la formule non resolue dans le referentiel (0-1). */
  coverage: number;
}

export interface ProductAssessment {
  /**
   * Tolerance cutanee de la formule, independamment de tout profil : risque
   * d'irritation, d'allergie et d'effet degraissant, pondere par la dose.
   * Part de 100 et ne descend qu'en presence d'un motif identifie.
   */
  skin: ScoreResult;
  /** Impact environnemental, calcule separement et jamais moyenne avec le precedent. */
  env: ScoreResult;
  /**
   * Adequation au profil de l'utilisateur (null si aucun profil fourni).
   * Part d'une base neutre : un produit inoffensif mais sans interet pour le
   * profil reste au milieu de l'echelle, un produit dont les actifs repondent
   * aux preoccupations declarees monte, un produit mal tolere descend.
   */
  personalized: ScoreResult | null;
  /** Ingredients declares non toleres par l'utilisateur et presents. */
  blockers: string[];
  concentrations: ConcentrationEstimate[];
}

/** Un produit tel que stocke en base. */
export interface Product {
  barcode?: string;
  name: string;
  brand: string;
  category: ProductCategory;
  /** Liste INCI brute telle qu'imprimee sur l'emballage. */
  inciList: string;
  claims?: BrandClaim[];
}

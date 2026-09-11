/**
 * Types du moteur Lucy.
 *
 * Principe directeur : on ne fusionne jamais le score peau et le score
 * environnement, et aucune penalite n'est appliquee sans passer par la
 * concentration estimée de l'ingrédient.
 */

export type SkinType = 'dry' | 'oily' | 'combination' | 'normal' | 'sensitive';

/** Préoccupations declarees par l'utilisateur dans son profil. */
export type Concern =
  | 'acne'
  | 'redness'
  | 'dryness'
  | 'aging'
  | 'pigmentation'
  | 'dullness'
  | 'barrier';

/** Type de produit : conditionne les limites réglementaires applicables. */
export type ProductCategory = 'leave_on_face' | 'rinse_off_face' | 'leave_on_body';

/** Fonction technique de l'ingrédient dans la formule. */
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

/** Niveau de confiance attache à une estimation ou à une penalite. */
export type Confidence = 'high' | 'medium' | 'low';

/** Effet irritant potentiel, avec le seuil en dessous duquel il est negligeable. */
export interface IrritationProfile {
  /** 0 = aucun, 1 = leger, 2 = modéré, 3 = fort. */
  severity: 1 | 2 | 3;
  /**
   * Concentration (%) en dessous de laquelle l'effet est considere negligeable.
   * C'est ce seuil qui permet de ne pas penaliser un irritant present à l'etat
   * de trace, contrairement aux notations binaires du marche.
   */
  threshold: number;
  /** Si renseigne, l'irritation ne concerne que ces types de peau. */
  onlyForTypes?: SkinType[];
}

/** Benefice attendu d'un actif, a partir d'une concentration efficace. */
export interface BenefitProfile {
  concern: Concern;
  /** Concentration (%) minimale à partir de laquelle l'effet est documenté. */
  minEffective: number;
  /** 1 = benefice mineur, 2 = notable, 3 = bien etabli. */
  strength: 1 | 2 | 3;
  evidence: Confidence;
}

export interface SkinData {
  irritation?: IrritationProfile;
  /**
   * Indice comédogène 0-5. Les donnees publiques proviennent de tests sur
   * oreille de lapin (annees 70) et sont faiblement transposables à l'humain :
   * le scoring leur applique volontairement un poids reduit.
   */
  comedogenic?: number;
  /** Allergène de parfum à déclaration obligatoire (Annexe III UE) ou sensibilisant connu. */
  allergen?: 'declarable_fragrance' | 'known_sensitizer';
  /** Effet asséchant / dégraissant marque (surfactants notamment). */
  stripping?: IrritationProfile;
  benefits?: BenefitProfile[];
}

export interface EnvData {
  biodegradability?: 'good' | 'moderate' | 'poor';
  /** 0 = non concerne, 1 = faible, 2 = modéré, 3 = élevée. */
  aquaticToxicity?: 0 | 1 | 2 | 3;
  /** Microplastique au sens du règlement REACH 2023/2055. */
  microplastic?: boolean;
  /** Persistant / bioaccumulable (PBT ou vPvB). */
  persistent?: boolean;
  /** Origine pétrochimique (information, non penalisante en soi). */
  petrochemical?: boolean;
}

/** Une entree du referentiel ingrédients. */
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
  /** Limite réglementaire (%) par categorie de produit (Annexes UE 1223/2009). */
  regulatoryMax?: Partial<Record<ProductCategory, number>>;
  /**
   * true si la plage d'usage de cet ingrédient est suffisamment contrainte
   * pour l'utiliser comme marqueur de seuil dans une liste INCI.
   */
  isAnchor?: boolean;
  skin?: SkinData;
  env?: EnvData;
  /** References documentaires, affichees à l'utilisateur. */
  sources: string[];
}

/** Un ingrédient tel que lu sur l'emballage, apres parsing. */
export interface ParsedIngredient {
  /** Position dans la liste (0 = premier). */
  position: number;
  /** Libelle brut tel qu'imprime. */
  raw: string;
  /** Libelle normalise, utilise pour la resolution dans le referentiel. */
  normalized: string;
  /** Entree du referentiel, si resolue. */
  ingredient?: Ingredient;
  /** Ingrédient issu de l'agriculture biologique (astérisque sur l'emballage). */
  organic?: boolean;
  /**
   * true si l'ingrédient provient d'une mention "peut contenir" (colorants
   * alternatifs) : sa presence n'est pas garantie.
   */
  mayContain?: boolean;
}

/** Concentration estimée d'un ingrédient dans le produit. */
export interface ConcentrationEstimate {
  position: number;
  inci: string;
  /** Borne basse (%) de l'intervalle estimé. */
  min: number;
  /** Borne haute (%) de l'intervalle estimé. */
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

/** Verdict porte par l'utilisateur sur un produit qu'il a essaye. */
export type ToleranceVerdict = 'suited' | 'unsuited';

/**
 * Une entree du journal de tolerance.
 *
 * C'est la seule donnee du projet qu'aucun concurrent ne possede. Sa valeur
 * n'apparait qu'au volume : croisee sur assez d'entrees, elle permet de
 * recalibrer les seuils d'effet par ingredient. Sur une seule entree, elle ne
 * permet rien — un produit porte quinze ingredients, et rien ne dit lequel a
 * pose probleme.
 */
export interface ToleranceEntry {
  barcode?: string;
  /** Nom du produit au moment du verdict, pour rester lisible si le catalogue bouge. */
  name: string;
  verdict: ToleranceVerdict;
  /** Date ISO du verdict. */
  date: string;
}

/**
 * Texture d'un produit, estimee a partir de sa formule.
 *
 * « unknown » n'est pas un echec mais un resultat : quand l'intervalle de
 * concentration des corps gras chevauche le seuil, la formule ne permet pas de
 * trancher, et l'annoncer vaut mieux que deviner.
 */
export type Texture = 'fluid' | 'rich' | 'unknown';

/** Profil utilisateur : ce que l'app collecte à l'onboarding puis affine. */
export interface SkinProfile {
  skinType: SkinType;
  concerns: Concern[];
  /** INCI que l'utilisateur déclaré bien tolérer : neutralise les penalites. */
  tolerated: string[];
  /** INCI que l'utilisateur ne toléré pas : exclusion du produit. */
  notTolerated: string[];
  /** L'utilisateur souhaite eviter tout parfum. */
  avoidFragrance?: boolean;
  /**
   * Produits essayes et leur verdict. Un produit juge non convenable n'est
   * plus propose : le reproposer apres un retour negatif est le defaut le plus
   * visible qu'une recommandation puisse avoir.
   */
  journal?: ToleranceEntry[];
  /** Texture preferee, si l'utilisateur en a declare une. */
  preferredTexture?: Exclude<Texture, 'unknown'>;
}

/** Une ligne d'explication du score, affichee dans la fiche produit. */
export interface ScoreReason {
  inci: string;
  /** Impact sur le score : negatif = penalite, positif = bonus. */
  impact: number;
  /** Explication en langage utilisateur. */
  label: string;
  /** Concentration estimée retenue pour ce calcul. */
  concentration: { min: number; max: number };
  confidence: Confidence;
  sources: string[];
  /**
   * true si la ligne est affichee a titre d'information sans peser sur la
   * valeur du score. Le score de tolérance liste ainsi les actifs presents
   * a dose efficace sans les crediter : la tolérance et l'efficacité sont
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
   * Tolérance cutanée de la formule, independamment de tout profil : risque
   * d'irritation, d'allergie et d'effet dégraissant, pondere par la dose.
   * Part de 100 et ne descend qu'en presence d'un motif identifié.
   */
  skin: ScoreResult;
  /** Impact environnemental, calcule séparément et jamais moyenne avec le precedent. */
  env: ScoreResult;
  /**
   * Adéquation au profil de l'utilisateur (null si aucun profil fourni).
   * Part d'une base neutre : un produit inoffensif mais sans interet pour le
   * profil reste au milieu de l'echelle, un produit dont les actifs repondent
   * aux préoccupations declarees monte, un produit mal toléré descend.
   */
  personalized: ScoreResult | null;
  /** Ingrédients déclarés non toleres par l'utilisateur et presents. */
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

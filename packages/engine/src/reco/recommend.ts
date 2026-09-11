import type {
  Concern,
  Product,
  ProductAssessment,
  ProductCategory,
  SkinProfile,
} from '../types.ts';
import { assessProduct } from '../scoring/assess.ts';
import { parseInciList, normalizeLabel } from '../inci/parse.ts';

/**
 * Recommandation de produits.
 *
 * Au stade MVP, il s'agit d'un moteur de regles : filtrage sur le profil puis
 * classement par score personnalise. Le filtrage collaboratif est écarté
 * volontairement — sans base d'utilisateurs il n'a aucune donnee a exploiter,
 * et le demarrage a froid le rendrait moins pertinent qu'un simple tri.
 *
 * La brique a conserver pour la suite est le journal de tolérance : ce sont
 * les retours « ce produit m'a convenu / ne m'a pas convenu » qui permettront
 * de recalibrer les seuils par ingrédient, ce qu'aucune notation existante ne
 * peut faire.
 */

export interface RecommendOptions {
  /** Restreint àux produits de cette categorie. */
  category?: ProductCategory;
  /** Preoccupation que l'utilisateur cherche a traiter en priorite. */
  targetConcern?: Concern;
  /** Nombre de résultats renvoyes. */
  limit?: number;
  /** Score personnalise minimal pour qu'un produit soit propose. */
  minScore?: number;
  /** Nombre maximal de produits d'une meme marque dans les résultats. */
  maxPerBrand?: number;
  /**
   * Nombre maximal d'ingrédients dans la liste INCI.
   *
   * Une liste courte n'est pas en soi un gage de qualite — le moteur n'en fait
   * donc pas un critere de score — mais c'est une demande frequente et
   * parfaitement objective, d'ou un filtre et non un bonus.
   */
  maxIngredients?: number;
  /**
   * Planchers par axe. Un axe explicitement demande devient une contrainte,
   * jamais le terme d'une moyenne : « bonne pour ma peau et pour la planete »
   * se traduit par deux seuils a franchir, pas par la fusion des deux notes.
   */
  minSkinScore?: number;
  minEnvScore?: number;
  /** INCI a ecarter en plus de ceux que le profil declare non toleres. */
  excludeInci?: string[];
}

export interface Recommendation {
  product: Product;
  assessment: ProductAssessment;
  /** Score de classement : score personnalise ajuste par la pertinence. */
  rank: number;
  /** Raisons positives justifiant la recommandation. */
  highlights: string[];
}

const DEFAULTS = {
  limit: 10,
  minScore: 50,
  maxPerBrand: 2,
} as const;

/**
 * Bonus de pertinence accorde à un produit dont un actif repond effectivement
 * a la préoccupation ciblee, a dose efficace.
 */
const TARGET_CONCERN_BONUS = 15;

/** Le produit contient-il un actif efficace pour la préoccupation ciblee ? */
function addressesConcern(
  assessment: ProductAssessment,
  concern: Concern,
): boolean {
  const reasons = (assessment.personalized ?? assessment.skin).reasons;
  return reasons.some((r) => r.impact > 0 && r.label.includes(concern));
}

/**
 * Classe un catalogue de produits pour un profil donne.
 *
 * Le tri applique une contrainte de diversite par marque : sans elle, une
 * marque à la formulation homogene monopolise les premiers résultats, ce qui
 * degrade l'utilite percue autant que la credibilite du classement.
 */
export function recommend(
  catalog: Product[],
  profile: SkinProfile,
  options: RecommendOptions = {},
): Recommendation[] {
  const limit = options.limit ?? DEFAULTS.limit;
  const minScore = options.minScore ?? DEFAULTS.minScore;
  const maxPerBrand = options.maxPerBrand ?? DEFAULTS.maxPerBrand;

  const scored: Recommendation[] = [];

  const excluded = new Set((options.excludeInci ?? []).map(normalizeLabel));

  for (const product of catalog) {
    if (options.category && product.category !== options.category) continue;

    const parsed = parseInciList(product.inciList);

    if (options.maxIngredients !== undefined && parsed.length > options.maxIngredients) {
      continue;
    }
    if (excluded.size > 0 && parsed.some((i) => excluded.has(i.normalized))) continue;

    const assessment = assessProduct(product, profile);

    // Un ingrédient non toléré est eliminatoire, jamais compense.
    if (assessment.blockers.length > 0) continue;

    // Un axe demande explicitement est une contrainte a franchir. Il n'entre
    // pas dans le classement : moyenner tolérance et environnement rendrait
    // les deux notes illisibles, ce que le projet refuse par construction.
    if (options.minSkinScore !== undefined && assessment.skin.value < options.minSkinScore) {
      continue;
    }
    if (options.minEnvScore !== undefined && assessment.env.value < options.minEnvScore) {
      continue;
    }

    const personalizedScore = assessment.personalized?.value ?? assessment.skin.value;
    if (personalizedScore < minScore) continue;

    let rank = personalizedScore;
    const highlights: string[] = [];

    if (options.targetConcern && addressesConcern(assessment, options.targetConcern)) {
      rank += TARGET_CONCERN_BONUS;
    }

    for (const reason of (assessment.personalized ?? assessment.skin).reasons) {
      if (reason.impact > 0 && highlights.length < 3) highlights.push(reason.label);
    }

    scored.push({ product, assessment, rank, highlights });
  }

  scored.sort((a, b) => b.rank - a.rank);

  // Diversite par marque, en conservant l'ordre de classement.
  const perBrand = new Map<string, number>();
  const result: Recommendation[] = [];
  for (const candidate of scored) {
    const brand = candidate.product.brand.toLowerCase();
    const count = perBrand.get(brand) ?? 0;
    if (count >= maxPerBrand) continue;
    perBrand.set(brand, count + 1);
    result.push(candidate);
    if (result.length >= limit) break;
  }

  return result;
}

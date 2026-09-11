import type { ConcentrationEstimate, ParsedIngredient, Texture, Confidence } from '../types.ts';

/**
 * Estimation de la texture a partir de la formule.
 *
 * L'utilisateur raisonne en textures — « un truc leger », « un baume » — mais
 * une liste INCI ne porte pas cette information. Ce module l'approche par la
 * seule voie qui tienne, et le chemin ecarte est instructif.
 *
 * **Ce qui ne marche pas : la masse.** Sommer les concentrations estimees des
 * corps gras donne, sur une creme riche typique, un intervalle de 7 a 35 % :
 * il chevauche tous les seuils plausibles, et la reponse est « indeterminee »
 * a peu pres a chaque fois. Le mecanisme d'estimation du moteur est concu pour
 * encadrer un ingredient, pas pour additionner une dizaine d'intervalles dont
 * les incertitudes se cumulent.
 *
 * **Ce qui marche : l'ordre.** Une liste INCI est ordonnee par concentration
 * decroissante — c'est la seule information qu'elle garantit. Trois corps gras
 * ou plus, dont un dans les premieres positions, decrivent une phase grasse
 * substantielle ; un seul corps gras en fin de liste decrit un gel ou un
 * serum. On lit donc la structure de la liste, sans pretendre a une precision
 * que la donnee ne porte pas.
 *
 * L'estimation reste grossiere et **ne pese sur aucun score**. Elle filtre une
 * liste quand l'utilisateur exprime une preference, et s'affiche avec son
 * niveau de confiance. Deux formules de meme composition grasse peuvent avoir
 * un touche tres different : l'emulsionnant, le gelifiant et le procede y
 * comptent autant, et rien de cela ne se lit dans une liste d'ingredients.
 */

/** Fonctions qui font le gras d'une formule. */
const FATTY = new Set(['emollient', 'film_former']);

/** Positions considerees comme « en tete » de liste. */
const HEAD_POSITIONS = 5;

/** Nombre de corps gras a partir duquel la phase grasse est substantielle. */
const RICH_COUNT = 3;

export interface TextureEstimate {
  texture: Texture;
  /** Corps gras identifies, dans l'ordre de la liste. */
  fattyInci: string[];
  /**
   * Total estime des corps gras (%), en intervalle. Affiche a titre indicatif,
   * **jamais utilise pour trancher** : sur une formule reelle il chevauche
   * tous les seuils utiles.
   */
  fatty: { min: number; max: number };
  confidence: Confidence;
}

/**
 * Estime la texture d'une formule.
 *
 * La confiance ne depasse jamais `medium` : la texture est une consequence
 * indirecte de la composition, et la liste INCI n'en dit qu'une partie.
 */
export function estimateTexture(
  parsed: ParsedIngredient[],
  estimates: ConcentrationEstimate[],
): TextureEstimate {
  const fattyItems = parsed.filter((item) =>
    item.ingredient?.functions.some((f) => FATTY.has(f)),
  );
  const fattyInci = fattyItems.map((item) => item.normalized);

  const byInci = new Map(estimates.map((e) => [e.inci, e]));
  let min = 0;
  let max = 0;
  for (const inci of fattyInci) {
    const estimate = byInci.get(inci);
    if (!estimate) continue;
    min += estimate.min;
    max += estimate.max;
  }
  const fatty = { min: round(min), max: round(max) };

  // Une liste dont rien n'est resolu ne dit rien : c'est une lacune du
  // referentiel, pas une formule sans corps gras.
  const resolved = parsed.filter((item) => item.ingredient).length;
  if (resolved === 0) return { texture: 'unknown', fattyInci, fatty, confidence: 'low' };

  const inHead = fattyItems.filter((item) => item.position < HEAD_POSITIONS).length;

  if (fattyInci.length >= RICH_COUNT && inHead >= 1) {
    return { texture: 'rich', fattyInci, fatty, confidence: 'medium' };
  }
  if (fattyInci.length <= 1 || inHead === 0) {
    return { texture: 'fluid', fattyInci, fatty, confidence: 'medium' };
  }
  return { texture: 'unknown', fattyInci, fatty, confidence: 'low' };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

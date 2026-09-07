import type { Ingredient, ParsedIngredient } from '../types.ts';
import { ALL_INGREDIENTS } from '../data/ingredients.ts';
import { normalizeLabel } from './parse.ts';

/**
 * Resolution d'un libelle d'emballage vers une entree du referentiel.
 *
 * La resolution doit tolérer le bruit reel : parentheses explicatives,
 * suffixes botaniques variables ("centella asiatica leaf extract" vs
 * "centella asiatica extract") et coquilles d'OCR.
 */

function buildIndex(ingredients: Ingredient[]): Map<string, Ingredient> {
  const index = new Map<string, Ingredient>();
  for (const ingredient of ingredients) {
    const keys = [ingredient.inci, ...(ingredient.aliases ?? [])];
    for (const key of keys) {
      const normalized = normalizeLabel(key);
      // La premiere entree gagne : le referentiel est ordonne par specificite.
      if (!index.has(normalized)) index.set(normalized, ingredient);
    }
  }
  return index;
}

const INDEX = buildIndex(ALL_INGREDIENTS);

/** Retire une parenthese explicative : "parfum (fragrance)" -> "parfum". */
function withoutParentheses(label: string): string {
  return label.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

/** Extrait le contenu d'une parenthese : "ci 77891 (titanium dioxide)". */
function insideParentheses(label: string): string | null {
  const match = /\(([^)]+)\)/.exec(label);
  return match?.[1]?.trim() ?? null;
}

/**
 * Distance de Levenshtein bornee : renvoie une valeur > max des que le seuil
 * est depasse, ce qui evite de calculer la matrice complete inutilement.
 */
function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length] ?? max + 1;
}

/**
 * Tolérance orthographique proportionnelle à la longueur du libelle : une
 * coquille sur "aqua" ne doit pas etre traitee comme sur un nom botanique
 * de trente caracteres.
 */
function fuzzyMatch(normalized: string): Ingredient | undefined {
  if (normalized.length < 5) return undefined;
  const budget = normalized.length <= 10 ? 1 : 2;
  let best: { ingredient: Ingredient; distance: number } | undefined;
  for (const [key, ingredient] of INDEX) {
    const distance = boundedLevenshtein(normalized, key, budget);
    if (distance <= budget && (!best || distance < best.distance)) {
      best = { ingredient, distance };
      if (distance === 0) break;
    }
  }
  return best?.ingredient;
}

/** Resout un libelle normalise vers une entree du referentiel, si possible. */
export function resolveIngredient(normalized: string): Ingredient | undefined {
  const direct = INDEX.get(normalized);
  if (direct) return direct;

  const stripped = normalizeLabel(withoutParentheses(normalized));
  if (stripped && stripped !== normalized) {
    const viaStripped = INDEX.get(stripped);
    if (viaStripped) return viaStripped;
  }

  const inner = insideParentheses(normalized);
  if (inner) {
    const viaInner = INDEX.get(normalizeLabel(inner));
    if (viaInner) return viaInner;
  }

  return fuzzyMatch(stripped || normalized);
}

/** Attache l'entree du referentiel a chaque ingrédient parse. */
export function resolveAll(parsed: ParsedIngredient[]): ParsedIngredient[] {
  return parsed.map((item) => {
    const ingredient = resolveIngredient(item.normalized);
    return ingredient ? { ...item, ingredient } : item;
  });
}

/** Part des ingrédients resolus dans le referentiel, entre 0 et 1. */
export function coverage(parsed: ParsedIngredient[]): number {
  if (parsed.length === 0) return 0;
  const resolved = parsed.filter((p) => p.ingredient).length;
  return resolved / parsed.length;
}

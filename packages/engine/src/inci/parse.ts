import type { ParsedIngredient } from '../types.ts';

/**
 * Parsing d'une liste INCI telle qu'imprimee sur un emballage.
 *
 * Les listes reelles sont bruitees : casse variable, separateurs multiples,
 * synonymes multilingues accoles par des slashs, mentions "peut contenir",
 * asterisques signalant l'origine biologique, OCR imparfait. Ce module
 * ramene tout cela a une sequence ordonnee de libelles normalises.
 */

const LIST_PREFIXES = [
  'ingredients',
  'ingredient',
  'ingredienti',
  'ingredientes',
  'composition',
];

/** Mentions introduisant des colorants dont la presence n'est pas garantie. */
const MAY_CONTAIN_MARKERS = [
  'may contain',
  'peut contenir',
  'puo contenere',
  'puede contener',
  '+/-',
  '+ / -',
  '±',
];

/**
 * Normalise un libelle pour la resolution dans le referentiel :
 * minuscules, accents retires, ponctuation de bord et espaces superflus.
 */
export function normalizeLabel(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[*•·]/g, '')
    .replace(/[.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Retire le prefixe de liste ("INGREDIENTS:", "Composition :"...) s'il existe.
 */
function stripPrefix(input: string): string {
  const colon = input.indexOf(':');
  if (colon === -1 || colon > 40) return input;
  const head = normalizeLabel(input.slice(0, colon));
  return LIST_PREFIXES.includes(head) ? input.slice(colon + 1) : input;
}

/**
 * Isole la portion "peut contenir" de la liste principale.
 * Renvoie le corps de la liste et, le cas echeant, la portion optionnelle.
 */
function splitMayContain(input: string): { main: string; optional: string } {
  const re = new RegExp(
    MAY_CONTAIN_MARKERS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'i',
  );
  const match = re.exec(input);
  if (!match) return { main: input, optional: '' };
  return {
    main: input.slice(0, match.index),
    optional: input.slice(match.index + match[0].length),
  };
}

/**
 * Un libelle contenant des slashs peut etre :
 *   - un ingredient unique decline en plusieurs langues ("AQUA/WATER/EAU")
 *   - plusieurs colorants distincts ("CI 19140/CI 15985")
 * On ne separe que le second cas, identifie par le prefixe "ci " des index
 * de couleur.
 */
function expandSlashes(label: string): string[] {
  if (!label.includes('/')) return [label];
  const parts = label.split('/').map((p) => p.trim()).filter(Boolean);
  const allColorIndexes = parts.length > 1 && parts.every((p) => /^ci\s*\d/i.test(p));
  return allColorIndexes ? parts : [label];
}

/**
 * Decoupe la liste en libelles, en respectant les parentheses :
 * "CI 77891 (TITANIUM DIOXIDE)" ne doit pas etre coupe sur la virgule interne.
 */
function splitItems(input: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);

    const isSeparator = char === ',' || char === ';' || char === '\n';

    // Une virgule encadree de chiffres appartient au nom de l'ingredient :
    // « 1,2-hexanediol » et « acrylates/c10-30 » ne doivent pas etre coupes.
    const isNumericComma =
      char === ',' && /\d/.test(input[i - 1] ?? '') && /\d/.test(input[i + 1] ?? '');

    if (isSeparator && depth === 0 && !isNumericComma) {
      items.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  items.push(current);
  return items.map((i) => i.trim()).filter((i) => i.length > 0);
}

/**
 * Parse une liste INCI en sequence ordonnee d'ingredients.
 *
 * L'ordre est significatif : le reglement CE 1223/2009 impose un classement
 * par poids decroissant, ce qui fonde toute l'estimation de concentration.
 */
export function parseInciList(inciList: string): ParsedIngredient[] {
  const withoutPrefix = stripPrefix(inciList);
  const { main, optional } = splitMayContain(withoutPrefix);

  const result: ParsedIngredient[] = [];
  let position = 0;

  const push = (raw: string, mayContain: boolean) => {
    const organic = /[*•]/.test(raw);
    for (const label of expandSlashes(raw)) {
      const normalized = normalizeLabel(label);
      if (!normalized) continue;
      result.push({
        position: position++,
        raw: label.trim(),
        normalized,
        ...(organic ? { organic: true } : {}),
        ...(mayContain ? { mayContain: true } : {}),
      });
    }
  };

  for (const item of splitItems(main)) push(item, false);
  for (const item of splitItems(optional)) push(item, true);

  return result;
}

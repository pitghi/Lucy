/**
 * Construit le catalogue de demonstration a partir de vrais produits.
 *
 * Jusqu'ici le catalogue etait anonymise (decision 3.5) mais portait de vrais
 * codes-barres tires au hasard : la photo recuperee affichait donc une marque
 * qui ne correspondait pas a la composition decrite. Cette incoherence etait
 * visible a l'ecran et restait ouverte au §7 du journal.
 *
 * Ce script la ferme dans l'autre sens : nom, marque, code-barres et liste
 * INCI viennent tous de la meme fiche Open Beauty Facts, donc la photo
 * correspond au produit qu'elle illustre.
 *
 * Ce que cela engage, la decision 6.1 le dit : noter un produit identifiable
 * ouvre le droit de reponse. C'est acceptable sur un jeu de developpement,
 * mais ce catalogue ne doit pas etre publie tel quel sans que la methodologie
 * et la procedure de contestation soient en place.
 *
 * Usage :
 *   node --experimental-strip-types scripts/build-catalog.ts \
 *     <echantillon.json> <sortie.ts>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { parseInciList } from '../src/inci/parse.ts';
import { resolveAll, coverage } from '../src/inci/resolve.ts';
import type { ProductCategory } from '../src/types.ts';

interface SampleProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  categories_tags?: string[];
}

/** Longueur minimale pour qu'une liste decrive une formule et non une mention. */
const MIN_ITEMS = 6;
/** Couverture minimale du referentiel pour que les scores soient affichables. */
const MIN_COVERAGE = 0.75;
/** Diversite : au plus deux produits par marque, comme dans le classement. */
const MAX_PER_BRAND = 2;
/** Taille visee du catalogue de demonstration. */
const TARGET = 14;

/**
 * En dessous de ce nombre d'ingredients, une formule est dite courte.
 *
 * Le catalogue doit en contenir : trier sur la seule couverture favorise les
 * listes longues, et une demande du type « au maximum 9 ingredients » ne
 * renverrait alors jamais rien. Un jeu de demonstration qui ne sait pas
 * repondre a la demande type ne demontre rien.
 */
const SHORT_LIST = 12;
/** Nombre de formules courtes garanties dans le catalogue. */
const SHORT_QUOTA = 4;

/**
 * Correspondance des categories Open Beauty Facts.
 *
 * Les libelles sont ceux de la base, pas ceux qu'on devinerait : c'est
 * `en:facial-creams` et non `en:face-creams`, et se tromper d'un tiret ecarte
 * silencieusement les neuf dixiemes du jeu. Les tags rinces passent en
 * premier : un produit peut porter les deux, et la categorie conditionne les
 * limites reglementaires applicables.
 */
const CATEGORY_MAP: Array<[string, ProductCategory]> = [
  ['en:face-cleansers', 'rinse_off_face'],
  ['en:facial-cleansers', 'rinse_off_face'],
  ['en:cleansing-foams', 'rinse_off_face'],
  ['en:facial-creams', 'leave_on_face'],
  ['en:day-creams', 'leave_on_face'],
  ['en:night-creams', 'leave_on_face'],
  ['en:moisturizers', 'leave_on_face'],
  ['en:serums', 'leave_on_face'],
  ['en:facial-serums', 'leave_on_face'],
];

const args = process.argv.slice(2);
const outPath = args.pop();
const samplePaths = args;
if (samplePaths.length === 0 || !outPath) {
  console.error('Usage : build-catalog.ts <echantillon.json>... <sortie.ts>');
  process.exit(1);
}

// Plusieurs echantillons peuvent etre fusionnes : celui du marche francais est
// trop maigre a lui seul, l'echantillon mondial le complete. Le code-barres
// dedoublonne.
const seen = new Set<string>();
const sample: Array<SampleProduct & { origin: number }> = [];
samplePaths.forEach((path, origin) => {
  for (const product of JSON.parse(readFileSync(path, 'utf8')) as SampleProduct[]) {
    const code = product.code?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    sample.push({ ...product, origin });
  }
});

/**
 * Le catalogue sert une application en francais : un nom en turc ou en russe
 * y est illisible et fait douter du serieux du jeu de donnees. On ecarte donc
 * les libelles employant des caracteres hors de l'alphabet latin usuel du
 * francais et de l'anglais — un filtre grossier, mais sur un jeu de
 * demonstration il suffit.
 */
const READABLE = /^[\p{Script=Latin}\p{M}0-9\s'’\-+.,%&()\/:!"°]+$/u;
const FOREIGN_LETTERS = /[ıİşŞğĞıńŁłđĐ]/;

/**
 * Produits dont le nom dit qu'ils ne sont pas des soins visage.
 *
 * Open Beauty Facts est contributif et son etiquetage est approximatif : une
 * creme pour les mains et un baume apres-rasage remontent tous deux sous
 * `en:facial-creams`. Les laisser passer mettrait un soin des mains dans une
 * application de soin du visage, ce qui se voit immediatement.
 */
const NOT_FACE = /\b(mains?|pieds?|corps seul|apr[eè]s-rasage|aftershave|hand|h[äa]nde|foot|body lotion)\b/i;

interface Candidate {
  barcode: string;
  name: string;
  brand: string;
  category: ProductCategory;
  inciList: string;
  items: number;
  coverage: number;
  /** Rang de l'echantillon d'origine : 0 = le premier passe en argument. */
  origin: number;
}

const candidates: Candidate[] = [];

for (const product of sample) {
  const barcode = product.code?.trim();
  const name = product.product_name?.trim();
  const brandRaw = product.brands?.trim();
  const inciList = product.ingredients_text?.trim();
  if (!barcode || !name || !brandRaw || !inciList) continue;
  if (!READABLE.test(name) || FOREIGN_LETTERS.test(name)) continue;
  if (NOT_FACE.test(name)) continue;

  // Une marque multiple (« Nivea, Beiersdorf ») : on garde la premiere, celle
  // qui figure sur l'emballage.
  const brand = (brandRaw.split(',')[0] ?? '').trim();
  if (!brand) continue;

  const tags = product.categories_tags ?? [];
  const mapped = CATEGORY_MAP.find(([tag]) => tags.includes(tag));
  if (!mapped) continue;

  const parsed = resolveAll(parseInciList(inciList));
  if (parsed.length < MIN_ITEMS) continue;

  const covered = coverage(parsed);
  if (covered < MIN_COVERAGE) continue;

  candidates.push({
    barcode,
    name,
    brand,
    category: mapped[1],
    inciList: inciList.replace(/\s+/g, ' '),
    items: parsed.length,
    coverage: covered,
    origin: product.origin,
  });
}

// La couverture d'abord : un produit dont la formule est mal resolue produit
// des scores peu defendables, ce qui est le contraire du but recherche.
candidates.sort((a, b) => b.coverage - a.coverage || b.items - a.items);

const perBrand = new Map<string, number>();
const titles = new Set<string>();
const selected: Candidate[] = [];

function take(candidate: Candidate): boolean {
  const brand = candidate.brand.toLowerCase();
  if ((perBrand.get(brand) ?? 0) >= MAX_PER_BRAND) return false;
  // Deux references du meme nom chez la meme marque sont indiscernables a
  // l'ecran : elles font douter du jeu de donnees plutot qu'elles ne
  // l'enrichissent.
  const title = `${brand}|${candidate.name.toLowerCase()}`;
  if (titles.has(title)) return false;
  titles.add(title);
  perBrand.set(brand, (perBrand.get(brand) ?? 0) + 1);
  selected.push(candidate);
  return true;
}

// Les formules courtes d'abord, sinon le tri par couverture les evince toutes.
let short = 0;
for (const candidate of candidates) {
  if (short >= SHORT_QUOTA || selected.length >= TARGET) break;
  if (candidate.items > SHORT_LIST) continue;
  if (take(candidate)) short += 1;
}

// Puis le marche francais, l'application etant en francais : un nom en turc
// ou en allemand est illisible pour qui consulte la fiche.
for (const pass of [0, 1]) {
  for (const candidate of candidates) {
    if (selected.length >= TARGET) break;
    if (pass === 0 && candidate.origin !== 0) continue;
    take(candidate);
  }
}

selected.sort((a, b) => a.category.localeCompare(b.category) || a.brand.localeCompare(b.brand));

const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const entries = selected
  .map(
    (c) => `  {
    barcode: '${escape(c.barcode)}',
    name: '${escape(c.name)}',
    brand: '${escape(c.brand)}',
    category: '${c.category}',
    // ${c.items} ingredients, ${Math.round(c.coverage * 100)} % resolus par le referentiel
    inciList:
      '${escape(c.inciList)}',
  },`,
  )
  .join('\n');

const file = `import type { Product } from '@lucy/engine';

/**
 * Catalogue de demonstration.
 *
 * Produits reels, issus d'Open Beauty Facts : nom, marque, code-barres et
 * liste INCI viennent tous de la meme fiche. La photo affichee correspond donc
 * au produit decrit — ce qui n'etait pas le cas tant que le catalogue etait
 * anonymise avec de vrais codes-barres tires au hasard.
 *
 * Genere par \`packages/engine/scripts/build-catalog.ts\`. Ne pas modifier a la
 * main : relancer le script, dont les criteres de selection sont documentes.
 *
 * Ce que ce choix engage (decision 6.1) : une note portee sur un produit
 * identifiable ouvre le droit de reponse de la marque. Acceptable sur un jeu
 * de developpement ; a ne pas publier tel quel avant que la methodologie et la
 * procedure de contestation soient en place.
 *
 * Donnees sous licence ODbL (Open Beauty Facts), base contributive : une
 * liste peut etre incomplete ou datee par rapport a l'emballage actuel.
 */
export const DEMO_CATALOG: Product[] = [
${entries}
];
`;

writeFileSync(outPath, file);

console.log(`${candidates.length} candidats retenus sur ${sample.length} produits.`);
console.log(`${selected.length} produits ecrits dans ${outPath} :\n`);
for (const c of selected) {
  console.log(
    `  ${c.brand.padEnd(22)} ${c.name.slice(0, 40).padEnd(42)} ` +
      `${String(c.items).padStart(2)} ingr.  ${Math.round(c.coverage * 100)} %`,
  );
}

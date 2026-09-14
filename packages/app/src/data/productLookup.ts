import { parseInciList, type Product, type ProductCategory } from '@lucy/engine';
import { DEMO_CATALOG } from './catalog';

/**
 * Recherche d'un produit par son code-barres.
 *
 * L'ecran de scan lisait correctement les codes-barres mais ne les cherchait
 * que dans le catalogue de demonstration — quatorze produits. Tout le reste du
 * rayon repartait sans rien : ni fiche, ni message. Vu de l'utilisateur, plus
 * aucun code-barres n'etait reconnu.
 *
 * Le code-barres interroge donc maintenant Open Beauty Facts, la meme base et
 * la meme cle de jointure que les photographies (decision 3.7). Le catalogue
 * local reste consulte en premier : il repond hors ligne et sans delai.
 *
 * L'audit de couverture (decision 3.1) dit ce qui en ressort : environ six
 * produits sur dix portent une liste exploitable. Un echec n'est donc pas un
 * incident mais un etat ordinaire, et il se distingue en trois cas que
 * l'interface ne doit pas confondre — code inconnu de la base, produit connu
 * sans composition, reseau indisponible. Chacun appelle une suite differente.
 */

const ENDPOINT = 'https://world.openbeautyfacts.org/api/v2/product';

/** Open Beauty Facts demande un agent identifiant pour tracer les usages. */
const USER_AGENT = 'Lucy/0.1.0 (application d evaluation cosmetique)';

/** Au-dela, l'attente devant une camera figee n'est plus tenable. */
const TIMEOUT_MS = 8000;

/**
 * En deca, la liste n'est pas exploitable. Seuil de l'audit de couverture :
 * une fiche qui ne porte que « Aqua, Parfum » ne permet aucune estimation de
 * concentration, et une note calculee dessus serait une precision empruntee.
 */
const MIN_INGREDIENTS = 5;

export type LookupOutcome =
  /** Produit trouve avec une liste INCI exploitable. */
  | { statut: 'trouve'; product: Product; source: 'catalogue' | 'openbeautyfacts' }
  /** Code-barres present dans la base, mais sans composition utilisable. */
  | { statut: 'sans_composition'; barcode: string; name?: string; brand?: string }
  /** Code-barres absent de la base. */
  | { statut: 'inconnu'; barcode: string }
  /** Reseau coupe ou service indisponible : l'etat du produit reste inconnu. */
  | { statut: 'reseau'; barcode: string };

/**
 * Ecritures equivalentes d'un meme code-barres.
 *
 * Le zero de tete ne survit pas a la lecture sur iOS : AVFoundation restitue
 * les UPC-A en EAN-13 prefixes d'un zero, et `expo-camera` retire ce zero de
 * tout EAN-13 qui en porte un — y compris un EAN-13 nord-americain qui le
 * portait legitimement. Android, lui, rend le code tel qu'imprime. Le meme
 * emballage arrive donc a douze ou treize chiffres selon le telephone, alors
 * que la base ne connait qu'une des deux ecritures.
 */
export function barcodeVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, '');
  const variants: string[] = [];

  const add = (value: string) => {
    if (value && !variants.includes(value)) variants.push(value);
  };

  add(raw.trim());
  add(digits);
  if (digits.length === 12) add(`0${digits}`);
  if (digits.length === 13 && digits.startsWith('0')) add(digits.slice(1));

  return variants;
}

/**
 * Categorie de produit, deduite des categories et du nom Open Beauty Facts.
 *
 * Elle pese sur la note : un produit rince expose la peau bien moins longtemps
 * qu'un soin laisse en place. Or la donnee est faible — les categories sont
 * contributives et arrivent dans la langue du contributeur, un gel nettoyant
 * CeraVe etant par exemple classe « Reinigingsgel ». On cherche donc aussi
 * dans le nom, et sur des racines assez specifiques pour ne pas confondre un
 * « Aqua-Gel » hydratant avec un gel moussant.
 *
 * Dans le doute, `leave_on_face` : c'est l'hypothese la plus exposante. S'y
 * tromper sous-estime une note, se tromper dans l'autre sens la surestime.
 * Cette deduction reste une approximation et devra remonter a l'ecran, avec
 * la possibilite de la corriger (voir §7 du journal des decisions).
 */
export function inferCategory(tags: readonly string[], name = ''): ProductCategory {
  const haystack = [...tags, name]
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Racines choisies pour leur specificite : chacune designe un geste de
  // rincage, dans l'une des langues courantes de la base.
  const rinsed = [
    'shampoo',
    'shampoing',
    'cleans',
    'nettoyant',
    'reinig',
    'moussant',
    'foaming',
    'soap',
    'savon',
    'shower',
    'douche',
    'gommage',
    'scrub',
    'exfoliant',
    'demaquillant',
    'dentifrice',
    'toothpaste',
  ];
  const body = ['body', 'corps', 'hand', 'foot', 'pied', 'deodorant'];
  const face = ['face', 'visage', 'facial', 'gezicht', 'eye', 'yeux', 'levre', 'lip'];

  const mentions = (words: string[]) => words.some((word) => haystack.includes(word));

  if (mentions(rinsed)) return 'rinse_off_face';
  if (mentions(body) && !mentions(face)) return 'leave_on_body';
  return 'leave_on_face';
}

interface ObfProduct {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  ingredients_text?: string;
  ingredients_text_fr?: string;
  ingredients_text_en?: string;
  categories_tags?: string[];
}

type Fetched =
  | { kind: 'fiche'; fiche: ObfProduct }
  | { kind: 'absent' }
  | { kind: 'reseau' };

async function fetchRecord(barcode: string): Promise<Fetched> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url =
      `${ENDPOINT}/${encodeURIComponent(barcode)}.json` +
      '?fields=product_name,product_name_fr,brands,ingredients_text,' +
      'ingredients_text_fr,ingredients_text_en,categories_tags';

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });

    // 404 est la reponse normale d'un code-barres inconnu, pas une panne.
    if (response.status === 404) return { kind: 'absent' };
    if (!response.ok) return { kind: 'reseau' };

    const body = (await response.json()) as { status?: number; product?: ObfProduct };

    // `status: 0` signale lui aussi un code-barres absent de la base.
    if (body.status !== 1 || !body.product) return { kind: 'absent' };

    return { kind: 'fiche', fiche: body.product };
  } catch {
    return { kind: 'reseau' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Traduit une fiche Open Beauty Facts en produit scorable.
 *
 * La liste francaise est preferee quand elle existe : elle correspond a
 * l'emballage vendu ici. Les noms INCI y restent en denomination
 * internationale, le parsing n'y perd donc rien.
 */
function toOutcome(barcode: string, fiche: ObfProduct): LookupOutcome {
  const name = (fiche.product_name_fr || fiche.product_name || '').trim();
  const brand = (fiche.brands ?? '').split(',')[0]?.trim() ?? '';

  const inciList = (
    fiche.ingredients_text_fr ||
    fiche.ingredients_text ||
    fiche.ingredients_text_en ||
    ''
  ).trim();

  if (!inciList || parseInciList(inciList).length < MIN_INGREDIENTS) {
    return {
      statut: 'sans_composition',
      barcode,
      ...(name ? { name } : {}),
      ...(brand ? { brand } : {}),
    };
  }

  return {
    statut: 'trouve',
    source: 'openbeautyfacts',
    product: {
      barcode,
      // Un produit peut etre reference sans nom : le code-barres tient alors
      // lieu d'identifiant, plutot qu'un titre vide sur la fiche.
      name: name || `Produit ${barcode}`,
      brand: brand || 'Marque non renseignée',
      category: inferCategory(fiche.categories_tags ?? [], name),
      inciList,
    },
  };
}

/** Resultats deja obtenus dans la session, pour ne pas rejouer une requete. */
const cache = new Map<string, LookupOutcome>();

/** Requetes en cours, pour qu'un meme code scanne deux fois n'appelle qu'une fois. */
const inFlight = new Map<string, Promise<LookupOutcome>>();

async function resolve(barcode: string): Promise<LookupOutcome> {
  const variants = barcodeVariants(barcode);

  const local = DEMO_CATALOG.find(
    (item) => item.barcode && variants.includes(item.barcode),
  );
  if (local) return { statut: 'trouve', product: local, source: 'catalogue' };

  // Une variante est interrogee seulement si la precedente est absente : l'API
  // plafonne a une dizaine de requetes par minute (decision 3.4).
  let networkFailed = false;
  for (const variant of variants) {
    const fetched = await fetchRecord(variant);
    if (fetched.kind === 'fiche') return toOutcome(variant, fetched.fiche);
    if (fetched.kind === 'reseau') networkFailed = true;
  }

  // Une panne reseau ne se conclut pas en « produit inconnu » : le produit
  // existe peut-etre, et proposer une saisie manuelle pour une coupure de
  // reseau ferait perdre son temps a l'utilisateur.
  return networkFailed
    ? { statut: 'reseau', barcode }
    : { statut: 'inconnu', barcode };
}

/** Cherche le produit derriere un code-barres, ou dit pourquoi il n'y en a pas. */
export function lookupBarcode(barcode: string): Promise<LookupOutcome> {
  const known = cache.get(barcode);
  if (known) return Promise.resolve(known);

  const pending = inFlight.get(barcode);
  if (pending) return pending;

  const promise = resolve(barcode)
    .then((outcome) => {
      // Une panne reseau n'est pas memorisee : elle se retente.
      if (outcome.statut !== 'reseau') cache.set(barcode, outcome);
      return outcome;
    })
    .finally(() => {
      inFlight.delete(barcode);
    });

  inFlight.set(barcode, promise);
  return promise;
}

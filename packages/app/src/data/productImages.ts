import { useEffect, useState } from 'react';

/**
 * Photographies d'emballage, depuis Open Beauty Facts.
 *
 * La photo est une aide a la reconnaissance en rayon, jamais un element du
 * calcul : aucun score ne depend de sa presence, et son absence n'est pas
 * une information sur le produit. C'est aussi pourquoi elle ne figure pas
 * dans le type `Product` du moteur — celui-ci reste une entree de scoring,
 * et le code-barres suffit comme cle de jointure.
 *
 * Open Beauty Facts est une base contributive : la couverture est partielle
 * et une photo peut manquer pour un produit parfaitement reference. Le repli
 * doit donc etre un etat normal de l'interface, pas une erreur affichee.
 */

const ENDPOINT = 'https://world.openbeautyfacts.org/api/v2/product';

/** Open Beauty Facts demande un agent identifiant pour tracer les usages. */
const USER_AGENT = 'Lucy/0.1.0 (application d evaluation cosmetique)';

/** Au-dela, mieux vaut afficher le repli que laisser un emplacement vide. */
const TIMEOUT_MS = 8000;

export interface ProductImage {
  /** Vignette (~200 px), pour les listes. */
  small: string;
  /** Rendu pleine largeur, pour la fiche produit. */
  full: string;
}

export type ImageStatus = 'loading' | 'found' | 'missing';

/**
 * Cache de session. `null` memorise une absence confirmee : sans cela, chaque
 * reapparition d'une carte relancerait une requete vouee a echouer.
 */
const cache = new Map<string, ProductImage | null>();

/** Requetes en cours, pour qu'une meme photo affichee deux fois n'appelle qu'une fois. */
const inFlight = new Map<string, Promise<ProductImage | null>>();

async function request(barcode: string): Promise<ProductImage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url =
      `${ENDPOINT}/${encodeURIComponent(barcode)}.json` +
      '?fields=image_front_small_url,image_front_url';

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      status?: number;
      product?: { image_front_small_url?: string; image_front_url?: string };
    };

    // `status: 0` signale un code-barres absent de la base, ce qui n'est pas
    // une panne : c'est le cas courant sur une base contributive.
    if (body.status !== 1 || !body.product) return null;

    const full = body.product.image_front_url;
    const small = body.product.image_front_small_url ?? full;
    if (!full || !small) return null;

    return { small, full };
  } catch {
    // Reseau coupe, delai depasse ou reponse illisible : on retombe sur le
    // repli. Une photo manquante ne justifie pas d'interrompre la lecture.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Recupere la photo d'un produit, en memorisant le resultat pour la session. */
export function loadProductImage(barcode: string): Promise<ProductImage | null> {
  if (cache.has(barcode)) return Promise.resolve(cache.get(barcode) ?? null);

  const pending = inFlight.get(barcode);
  if (pending) return pending;

  const promise = request(barcode)
    .then((image) => {
      cache.set(barcode, image);
      return image;
    })
    .finally(() => {
      inFlight.delete(barcode);
    });

  inFlight.set(barcode, promise);
  return promise;
}

/**
 * Photo d'un produit, avec son etat de chargement.
 *
 * Un produit sans code-barres — liste INCI saisie a la main — passe
 * directement a `missing` : il n'y a rien a interroger.
 */
export function useProductImage(barcode?: string): {
  image: ProductImage | null;
  status: ImageStatus;
} {
  const cached = barcode ? cache.get(barcode) : null;

  const [image, setImage] = useState<ProductImage | null>(cached ?? null);
  const [status, setStatus] = useState<ImageStatus>(() => {
    if (!barcode) return 'missing';
    if (!cache.has(barcode)) return 'loading';
    return cached ? 'found' : 'missing';
  });

  useEffect(() => {
    if (!barcode) {
      setImage(null);
      setStatus('missing');
      return;
    }

    if (cache.has(barcode)) {
      const known = cache.get(barcode) ?? null;
      setImage(known);
      setStatus(known ? 'found' : 'missing');
      return;
    }

    let active = true;
    setImage(null);
    setStatus('loading');

    loadProductImage(barcode).then((result) => {
      if (!active) return;
      setImage(result);
      setStatus(result ? 'found' : 'missing');
    });

    return () => {
      active = false;
    };
  }, [barcode]);

  return { image, status };
}

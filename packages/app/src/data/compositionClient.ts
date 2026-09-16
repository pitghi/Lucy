/**
 * Appel au service de recherche de composition.
 *
 * Quand Open Beauty Facts ne porte pas la liste d'ingredients d'un produit —
 * quatre produits sur dix (decision 3.1) — le scan s'arretait la. Le service
 * va chercher cette liste sur le web et la rapporte avec la page ou il l'a
 * lue. Il porte la cle du modele, qui ne peut pas vivre dans le binaire.
 *
 * CE QUI PART : un code-barres, un nom, une marque. Ce qui est imprime sur un
 * emballage, rien du profil. Comme pour la recherche en langage libre, un
 * produit scanne peut malgre tout reveler une condition cutanee : d'ou
 * l'en-tete de region, qui maintient le traitement dans l'Union.
 *
 * CE QUI REVIENT N'EST PAS UNE FICHE OFFICIELLE. La liste vient d'une page web
 * recopiee par un modele, et elle peut concerner une autre contenance ou une
 * formule anterieure. L'adresse revient avec elle, et l'interface l'affiche :
 * une composition dont on ne peut pas montrer la provenance n'a pas sa place
 * dans une notation qui se veut opposable (decision 6.1).
 */

const BASE = process.env.EXPO_PUBLIC_LUCY_API ?? 'http://localhost:54321/functions/v1';

/** Meme raison que dans `searchClient.ts` : ne pas retirer cet en-tete. */
const REGION = 'eu-west-3';

/**
 * Une recherche web enchaine plusieurs requetes et une lecture de pages : elle
 * se compte en dizaines de secondes, la ou une fiche Open Beauty Facts se
 * compte en centaines de millisecondes. Le delai de garde est donc bien plus
 * long — et l'ecran de scan annonce l'etape, sans quoi l'attente passerait
 * pour une panne.
 */
const TIMEOUT_MS = 30_000;

export interface CompositionTrouvee {
  trouve: true;
  inciList: string;
  /** Page ou la liste a ete lue. Affichee sur la fiche. */
  source: string;
  /** Rapportes seulement quand la base ne connaissait pas le produit. */
  name?: string;
  brand?: string;
}

export type CompositionOutcome = CompositionTrouvee | { trouve: false };

const ABSENTE: CompositionOutcome = { trouve: false };

/**
 * Cherche la composition d'un produit sur le web, ou dit qu'elle reste absente.
 *
 * Aucune distinction n'est faite entre « le service n'a rien trouve » et « le
 * service est en panne » : dans les deux cas l'application n'a pas de liste, et
 * l'ecran de scan dit deja ce qu'il en est du reseau a partir de la recherche
 * en base, qui l'a precede.
 */
export async function chercherComposition(produit: {
  barcode: string;
  name?: string;
  brand?: string;
}): Promise<CompositionOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE}/composition-produit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-region': REGION },
      body: JSON.stringify(produit),
      signal: controller.signal,
    });

    if (!response.ok) return ABSENTE;

    const body = (await response.json()) as Record<string, unknown>;

    // Le service valide deja la liste, mais l'application n'a pas a faire
    // confiance a ce qui vient du reseau — et cette lecture vaut aussi si le
    // service change un jour de forme.
    if (body.trouve !== true) return ABSENTE;

    const inciList = typeof body.inciList === 'string' ? body.inciList.trim() : '';
    const source = typeof body.source === 'string' ? body.source : '';
    if (!inciList || !source) return ABSENTE;

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const brand = typeof body.brand === 'string' ? body.brand.trim() : '';

    return {
      trouve: true,
      inciList,
      source,
      ...(name ? { name } : {}),
      ...(brand ? { brand } : {}),
    };
  } catch {
    return ABSENTE;
  } finally {
    clearTimeout(timer);
  }
}

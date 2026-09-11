import { parseSearchQuery, type SearchQuery } from '@lucy/engine';

/**
 * Appel au service de traduction des demandes.
 *
 * Seule la phrase part. Le profil reste sur l'appareil et c'est le moteur,
 * local, qui l'applique aux resultats : type de peau et intolerances sont des
 * donnees de sante, et rien n'oblige a les faire sortir d'ici.
 *
 * La reponse repasse par `parseSearchQuery` a l'arrivee. Le service valide
 * deja, mais l'application n'a pas a faire confiance a ce qui vient du reseau,
 * et cette validation vaut aussi si le service change un jour de forme.
 */

const BASE = process.env.EXPO_PUBLIC_LUCY_API ?? 'http://localhost:8787';

/** Au-dela, l'attente n'est plus acceptable dans un champ de recherche. */
const TIMEOUT_MS = 12_000;

export type SearchFailure =
  | 'reseau'
  | 'service'
  | 'trop_de_demandes'
  | 'demande_vide';

export interface TranslationSuccess {
  ok: true;
  query: SearchQuery;
}

export interface TranslationFailure {
  ok: false;
  reason: SearchFailure;
}

export type TranslationOutcome = TranslationSuccess | TranslationFailure;

/** Traduit une phrase en criteres, ou dit pourquoi elle n'a pas pu l'etre. */
export async function translateQuery(text: string): Promise<TranslationOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE}/recherche/criteres`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (response.status === 429) return { ok: false, reason: 'trop_de_demandes' };
    if (!response.ok) return { ok: false, reason: 'service' };

    const body = (await response.json()) as { query?: unknown; empty?: unknown };
    const query = parseSearchQuery(body.query);

    // Une requete vide n'est pas une panne : la phrase n'a rien donne. Le
    // distinguer d'une erreur reseau permet a l'interface de proposer une
    // reformulation plutot qu'une nouvelle tentative.
    if (Object.keys(query).length === 0) return { ok: false, reason: 'demande_vide' };

    return { ok: true, query };
  } catch {
    return { ok: false, reason: 'reseau' };
  } finally {
    clearTimeout(timer);
  }
}

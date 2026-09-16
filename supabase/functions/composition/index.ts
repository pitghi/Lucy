import { Mistral } from 'npm:@mistralai/mistralai@2.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { traiter } from './composition.ts';

/**
 * Cle du modele de recommandation.
 *
 * Separable de celle de la traduction : les deux services n'appellent pas les
 * memes modeles, et l'acces a un modele depend du plan sur lequel la cle est
 * emise. `LUCY_RECO_MISTRAL_KEY` prime, `MISTRAL_API_KEY` sert de repli — ce
 * qui laisse le cas courant, une seule cle pour tout, sans configuration.
 */
const CLE = Deno.env.get('LUCY_RECO_MISTRAL_KEY') || Deno.env.get('MISTRAL_API_KEY') || '';

const mistral = new Mistral({
  apiKey: CLE,
  /**
   * **Point d'entree mondial, et non europeen.**
   *
   * Mesure, sans cle : sur `api.eu.mistral.ai`, `/v1/chat/completions` repond
   * 401 — la route existe — mais `/v1/conversations` et `/v1/agents` repondent
   * 404. L'API Conversations, donc le connecteur de recherche en ligne,
   * n'existe pas en Europe. Aucun modele n'y change rien : la route n'y est
   * pas.
   *
   * Sortir d'Europe est donc le prix de la recherche en ligne, et il est paye
   * en connaissance de cause (1.11). La traduction, elle, reste sur le point
   * d'entree europeen : elle n'a pas besoin de connecteur.
   */
  server: (Deno.env.get('LUCY_RECO_REGION') ?? 'global') as 'eu' | 'global' | 'us',
});

const base = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve((req: Request) => traiter(req, { mistral, base }));

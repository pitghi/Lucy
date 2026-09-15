import { Mistral } from 'npm:@mistralai/mistralai@2.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { traiter } from './composition.ts';

const mistral = new Mistral({
  apiKey: Deno.env.get('MISTRAL_API_KEY') ?? '',
  server: (Deno.env.get('LUCY_MISTRAL_REGION') ?? 'eu') as 'eu' | 'global' | 'us',
});

const base = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve((req: Request) => traiter(req, { mistral, base }));

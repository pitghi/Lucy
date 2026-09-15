-- Limitation de debit du service de traduction, par adresse et par fenetre.
--
-- Le service porte la cle du modele : une URL publique sans plafond est une
-- cle ouverte a qui la trouve, et la facture suit.
--
-- CE QUI EST STOCKE, ET RIEN D'AUTRE : une empreinte d'adresse IP, un
-- horodatage. **Aucune phrase de recherche, aucun profil, aucune
-- intolerance.** Ce sont des donnees de sante au sens du RGPD et elles ne
-- quittent pas l'appareil ; ce qui est ici est un compteur, pas une demande.
--
-- L'adresse elle-meme n'est pas conservee : seule son empreinte SHA-256,
-- calculee avec un sel qui ne vit que dans l'environnement de la fonction.
-- Sans ce sel, l'empreinte ne se remonte pas — l'espace des adresses IPv4 est
-- assez petit pour etre parcouru en entier.

create table if not exists public.rate_limit (
  id         bigserial primary key,
  ip_hash    text        not null,
  appele_a   timestamptz not null default now()
);

create index if not exists rate_limit_ip_temps
  on public.rate_limit (ip_hash, appele_a desc);

-- Personne n'y accede depuis le client : seule la fonction, qui ecrit avec la
-- cle de service, a une raison de la lire. La RLS active sans aucune politique
-- ferme donc la table a tout le reste.
alter table public.rate_limit enable row level security;

/**
 * Enregistre un appel et dit s'il reste sous le plafond.
 *
 * Tout se fait en une seule instruction, cote base : compter puis inserer en
 * deux temps laisserait deux requetes simultanees passer le plafond toutes les
 * deux, ce qui est precisement le cas qu'un plafond doit couvrir.
 *
 * La tentative refusee n'est pas enregistree, sinon un client qui insiste
 * repousserait indefiniment sa propre sortie de penalite.
 */
create or replace function public.verifier_debit(
  p_ip_hash text,
  p_max     int,
  p_fenetre interval
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appels int;
begin
  -- Un plafond absurde desactive la limite plutot que le point d'entree : une
  -- variable d'environnement mal renseignee ne doit pas fermer le service.
  if p_max is null or p_max <= 0 then
    return true;
  end if;

  select count(*) into v_appels
  from public.rate_limit
  where ip_hash = p_ip_hash
    and appele_a > now() - p_fenetre;

  if v_appels >= p_max then
    return false;
  end if;

  insert into public.rate_limit (ip_hash) values (p_ip_hash);

  -- Purge opportuniste : la table ne doit pas grossir indefiniment, et une
  -- tache planifiee serait une piece de plus a surveiller pour un nettoyage
  -- que chaque appel peut faire en passant. Bornee, pour ne pas transformer
  -- une recherche en balayage de table.
  delete from public.rate_limit
  where id in (
    select id from public.rate_limit
    where appele_a < now() - (p_fenetre * 10)
    limit 500
  );

  return true;
end;
$$;

revoke all on function public.verifier_debit(text, int, interval) from public, anon, authenticated;

-- `revoke ... from public` retire aussi le droit a `service_role`, qui le
-- tenait par `public` et non en propre. Sans ce grant, l'Edge Function se voit
-- repondre `42501 permission denied` par son propre compteur, et comme elle
-- refuse plutot que de laisser passer, **tout** le service repond 503. Le
-- symptome ressemble a une panne d'hebergement ; la cause est deux lignes plus
-- haut. Eprouve : c'est exactement ce qui est arrive a la premiere mise en
-- ligne.
grant execute on function public.verifier_debit(text, int, interval) to service_role;

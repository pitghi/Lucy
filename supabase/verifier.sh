#!/usr/bin/env bash
#
# Verifie qu'une instance des services repond correctement.
#
# Chaque etape elimine une inconnue precise, dans l'ordre ou elles peuvent
# echouer. Deux seules comptent vraiment, et aucun controle de sante ne les
# remplace : une phrase entiere traduite en criteres, et une composition
# reellement retrouvee sur le web. Les deux depensent — c'est le prix d'une
# verification qui prouve quelque chose.
#
#   ./supabase/verifier.sh                                   # instance locale
#   ./supabase/verifier.sh https://<ref>.supabase.co/functions/v1
#   ./supabase/verifier.sh "$BASE" "" <ean> <nom> <marque>   # autre produit
#
set -uo pipefail

BASE="${1:-http://localhost:54321/functions/v1}"
PHRASE="${2:-une creme apaisante sans parfum pour peau sensible}"

# Un produit reel, absent d'Open Beauty Facts ou sans liste : c'est exactement
# le cas que le service de composition doit rattraper.
EAN="${3:-3600524188665}"
NOM="${4:-Men Expert Derma Control Pate S.O.S Anti-Imperfections}"
MARQUE="${5:-L Oreal}"

# Meme en-tete que l'application : sans lui, la fonction s'executerait au plus
# pres de l'appelant, donc potentiellement hors d'Europe.
REGION='eu-west-3'

vert()  { printf '\033[32m%s\033[0m\n' "$1"; }
rouge() { printf '\033[31m%s\033[0m\n' "$1"; }
gris()  { printf '\033[90m%s\033[0m\n' "$1"; }

echec=0

echo "Service : $BASE"
echo

# --- 1. La fonction est joignable -------------------------------------------
# Une demande vide : elle doit etre refusee proprement (400), ce qui prouve que
# la fonction est deployee et repond, sans rien depenser en traduction.
printf '1. La fonction est joignable   ... '
code=$(curl -sS -m 40 -o /dev/null -w '%{http_code}' -X POST "$BASE/recherche-criteres" \
  -H 'content-type: application/json' -H "x-region: $REGION" -d '{"text":""}' 2>&1)
if [ "$code" = '400' ]; then
  vert 'ok'
else
  rouge "echec (code $code)"
  gris '   -> fonction non deployee, mauvaise URL, ou verification JWT active.'
  gris '      `supabase functions logs recherche-criteres` donne le detail.'
  exit 1
fi

# --- 2. Une phrase est traduite en criteres ---------------------------------
# L'etape decisive. Elle met en jeu, d'un coup : la validite de la cle, la
# disponibilite du modele sur l'abonnement, l'ouverture du point d'entree
# regional, et l'acceptation du schema de sortie structuree. Un `/sante` vert
# ne prouve aucun de ces quatre points.
printf '2. Une phrase est traduite     ... '
reponse=$(curl -sS -m 40 -X POST "$BASE/recherche-criteres" \
  -H 'content-type: application/json' -H "x-region: $REGION" \
  -d "{\"text\":\"$PHRASE\"}" 2>&1)

if echo "$reponse" | grep -q '"query"'; then
  if echo "$reponse" | grep -q '"empty":true'; then
    rouge 'aucun critere'
    gris "   $reponse"
    gris '   -> le modele repond mais ne tire rien de la phrase.'
    gris '      Consigne ou schema a revoir, pas une panne d infrastructure.'
    echec=1
  else
    vert 'ok'
    gris "   $reponse"
  fi
else
  rouge 'echec'
  gris "   $reponse"
  gris '   -> cle invalide, modele indisponible sur l abonnement, point'
  gris '      d entree regional ferme, ou schema refuse.'
  gris '      `supabase functions logs recherche-criteres` donne le code et le'
  gris '      message exacts du fournisseur.'
  echec=1
fi

# --- 3. La limite de debit protege la depense -------------------------------
# Sans elle, l URL publique est une cle d API ouverte a qui la trouve.
printf '3. La limite de debit protege  ... '
vus=''
for _ in $(seq 1 12); do
  code=$(curl -sS -m 40 -o /dev/null -w '%{http_code}' -X POST "$BASE/recherche-criteres" \
    -H 'content-type: application/json' -H "x-region: $REGION" \
    -d '{"text":"test de plafond"}' 2>/dev/null)
  vus="$vus $code"
  [ "$code" = '429' ] && break
done

if echo "$vus" | grep -q '429'; then
  vert 'ok'
  gris "   codes :$vus"
else
  rouge 'jamais atteinte'
  gris "   codes :$vus"
  gris '   -> le plafond ne se declenche pas. Verifier LUCY_RATE_LIMIT, et que'
  gris '      la table `rate_limit` et la fonction `verifier_debit` existent'
  gris '      bien (supabase/rate_limit.sql).'
  echec=1
fi

# --- 4. Le service de composition est joignable ------------------------------
# Un corps sans code-barres : refuse proprement (400), ce qui prouve que la
# fonction est deployee sans rien depenser en recherche web.
printf '4. La composition est joignable ... '
code=$(curl -sS -m 60 -o /dev/null -w '%{http_code}' -X POST "$BASE/composition-produit" \
  -H 'content-type: application/json' -H "x-region: $REGION" -d '{}' 2>&1)
if [ "$code" = '400' ]; then
  vert 'ok'
else
  rouge "echec (code $code)"
  gris '   -> fonction non deployee, mauvaise URL, ou verification JWT active.'
  gris '      `supabase functions logs composition-produit` donne le detail.'
  echec=1
fi

# --- 5. Une composition est retrouvee sur le web -----------------------------
# L etape decisive du second service, et la seule qui prouve que le connecteur
# de recherche web est ouvert sur l abonnement. Elle coute une recherche
# facturee : c est voulu, un controle qui ne depense rien ne prouve rien ici.
printf '5. Une composition est trouvee ... '
reponse=$(curl -sS -m 90 -X POST "$BASE/composition-produit" \
  -H 'content-type: application/json' -H "x-region: $REGION" \
  -d "{\"barcode\":\"$EAN\",\"name\":\"$NOM\",\"brand\":\"$MARQUE\"}" 2>&1)

if echo "$reponse" | grep -q '"trouve":true'; then
  vert 'ok'
  gris "   $(echo "$reponse" | cut -c1-200)"
elif echo "$reponse" | grep -q '"trouve":false'; then
  # Pas une panne : le service a cherche et refuse ce qu il a vu. C est le
  # comportement attendu quand la composition n est nulle part, et il faut
  # distinguer ce cas d une cle invalide.
  rouge 'rien trouve'
  gris "   $reponse"
  gris '   -> le service repond mais ne rapporte aucune composition pour ce'
  gris '      produit. Ressayer avec un autre EAN avant de conclure a un defaut :'
  gris "      ./supabase/verifier.sh \"$BASE\" \"\" <ean> <nom> <marque>"
  echec=1
else
  rouge 'echec'
  gris "   $reponse"
  gris '   -> cle invalide, modele indisponible sur l abonnement, ou connecteur'
  gris '      de recherche web ferme sur le plan souscrit.'
  gris '      `supabase functions logs composition-produit` donne le code et le'
  gris '      message exacts du fournisseur.'
  echec=1
fi

echo
if [ "$echec" -eq 0 ]; then
  vert 'Tout est vert. Les services sont utilisables par l application.'
else
  rouge 'Au moins une verification a echoue. Voir les indications ci-dessus.'
fi
exit "$echec"

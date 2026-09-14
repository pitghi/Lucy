#!/usr/bin/env bash
#
# Verifie qu'une instance du service de traduction repond correctement.
#
# Chaque etape elimine une inconnue precise, dans l'ordre ou elles peuvent
# echouer. La derniere est la seule qui compte vraiment : une phrase entiere
# traduite en criteres, ce qu'aucun controle de sante ne prouve.
#
#   ./scripts/verifier.sh                          # instance locale
#   ./scripts/verifier.sh https://lucy-api.fly.dev # instance deployee
#
set -uo pipefail

BASE="${1:-http://localhost:8787}"
PHRASE="${2:-une creme apaisante sans parfum pour peau sensible}"

vert()  { printf '\033[32m%s\033[0m\n' "$1"; }
rouge() { printf '\033[31m%s\033[0m\n' "$1"; }
gris()  { printf '\033[90m%s\033[0m\n' "$1"; }

echec=0

echo "Service : $BASE"
echo

# --- 1. Le service repond ---------------------------------------------------
# Echoue si le service n'est pas demarre, si le deploiement n'a pas abouti, ou
# si la machine ne se reveille pas.
printf '1. Le service repond           ... '
sante=$(curl -sS -m 30 "$BASE/sante" 2>&1)
if echo "$sante" | grep -q '"statut":"ok"'; then
  vert 'ok'
  gris "   $sante"
else
  rouge 'echec'
  gris "   $sante"
  gris '   -> service arrete, deploiement non abouti, ou mauvaise URL.'
  exit 1
fi

# --- 2. Une phrase est traduite en criteres ---------------------------------
# L'etape decisive. Elle met en jeu, d'un coup : la validite de la cle, la
# disponibilite du modele sur l'abonnement, l'ouverture du point d'entree
# regional, et l'acceptation du schema de sortie structuree. Un `/sante` vert
# ne prouve aucun de ces quatre points.
printf '2. Une phrase est traduite     ... '
reponse=$(curl -sS -m 40 -X POST "$BASE/recherche/criteres" \
  -H 'content-type: application/json' \
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
  gris '      d entree regional ferme, ou schema refuse. `fly logs` donne le'
  gris '      code et le message exacts du fournisseur.'
  echec=1
fi

# --- 3. La limite de debit protege la depense -------------------------------
# Sans elle, l URL publique est une cle d API ouverte a qui la trouve.
printf '3. La limite de debit protege  ... '
vus=''
for _ in $(seq 1 12); do
  code=$(curl -sS -m 40 -o /dev/null -w '%{http_code}' -X POST "$BASE/recherche/criteres" \
    -H 'content-type: application/json' -d '{"text":"test de plafond"}' 2>/dev/null)
  vus="$vus $code"
  [ "$code" = '429' ] && break
done

if echo "$vus" | grep -q '429'; then
  vert 'ok'
  gris "   codes :$vus"
else
  rouge 'jamais atteinte'
  gris "   codes :$vus"
  gris '   -> le plafond ne se declenche pas. Verifier LUCY_RATE_LIMIT, et'
  gris '      LUCY_IP_HEADER qui doit valoir fly-client-ip derriere Fly.'
  echec=1
fi

echo
if [ "$echec" -eq 0 ]; then
  vert 'Tout est vert. Le service est utilisable par l application.'
else
  rouge 'Au moins une verification a echoue. Voir les indications ci-dessus.'
fi
exit "$echec"

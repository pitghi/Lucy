# Service de traduction des demandes

Traduit une demande en langage libre — « une creme hydratante avec maximum
9 ingredients, bonne pour ma peau et la planete » — en criteres de recherche
pour le moteur. Une Edge Function Supabase, `recherche-criteres`.

## Pourquoi ce service existe

Une cle d'API ne peut pas vivre dans une application mobile : elle s'extrait du
binaire en quelques minutes. Ce service la porte, et n'expose qu'un point
d'entree qui ne sait rien faire d'autre.

C'est la seule brique serveur du projet.

## Ce qui ne passe pas par ici

**Le profil ne quitte pas le telephone.** Le modele recoit la phrase, rien
d'autre : ni type de peau, ni intolerances, ni journal de tolerance. Ce sont
des donnees de sante au sens du RGPD, et le moteur applique le profil
localement, apres la traduction. Un test (`aucune donnee de profil n est
transmise au modele`) casse si quelqu'un ajoute un de ces champs a l'appel.

**Aucune demande n'est journalisee.** La seule ecriture en base est un compteur
de debit, indexe par empreinte d'adresse — jamais par phrase.

**Le modele ne choisit aucun produit.** Il ne voit pas le catalogue. Il produit
un `SearchQuery` — une structure fermee, faite de valeurs enumerees — que le
moteur de regles execute ensuite en fournissant ses motifs sources. Un
classement produit par un modele ne serait ni rejouable ni opposable a une
marque, alors que tout le projet consiste a fournir des notes defendables.

**Sa sortie n'est pas crue sur parole.** Elle repasse par `parseSearchQuery`,
la validation du moteur, qui ecarte en silence tout ce qui n'est pas reconnu
plutot que de le deviner. Le schema de sortie structuree impose deja la forme ;
la validation reste, parce que c'est elle qui fait foi. C'est elle qui a rendu
trois changements de fournisseur quasi gratuits.

## La copie du moteur

`functions/_shared/query.ts` et `types.ts` sont **generes** par
`./sync-moteur.sh` depuis `packages/engine/src/`. Une Edge Function est
deployee isolement : rien ne garantit qu'un import pointant hors de
`functions/` survive a l'empaquetage.

Ne pas les modifier a la main. Un test du moteur (`npm test --workspace
@lucy/engine`) compare la copie a sa source et casse si elle diverge — c'est ce
qui empeche la copie de devenir une seconde version de la regle.

```bash
./supabase/sync-moteur.sh    # apres toute modification de reco/query.ts
```

## Limitation de debit

Le service porte la cle du modele : une URL publique sans plafond est une cle
ouverte a qui la trouve. Dix demandes par minute et par adresse, comptees **en
base** (`rate_limit.sql`).

En base et non en memoire, parce qu'un compteur en memoire repart de zero a
chaque redemarrage et ne vaut que pour une instance — il ecarte l'accident,
pas un abus soutenu. La verification et l'insertion se font en **une seule
instruction** : compter puis inserer en deux temps laisserait deux requetes
simultanees passer le plafond toutes les deux.

**L'adresse n'est pas conservee**, seulement son empreinte SHA-256 calculee
avec `LUCY_IP_SALT`. Sans ce sel, une empreinte d'adresse IPv4 se retrouve par
force brute en quelques minutes : l'espace est trop petit.

Si le compteur est en panne, le service **refuse** (503) plutot que de laisser
passer. Un plafond qui s'efface des qu'il tombe ne protege rien le jour ou il
compte.

## Lancer et verifier

```bash
supabase functions serve recherche-criteres       # instance locale
./supabase/verifier.sh                            # verifie l'instance locale
./supabase/verifier.sh https://<ref>.supabase.co/functions/v1
```

Le script pousse une phrase entiere a travers le service, ce qui met en jeu
d'un coup la validite de la cle, la disponibilite du modele sur l'abonnement,
l'ouverture du point d'entree regional et l'acceptation du schema de sortie. Il
verifie aussi que le plafond se declenche.

Les tests tournent sans reseau :

```bash
cd supabase/functions/recherche-criteres
deno test --allow-env traduction.test.ts          # 16 tests
```

## Variables

| Variable | Defaut | Role |
| --- | --- | --- |
| `MISTRAL_API_KEY` | — | Cle du modele. Jamais dans le depot. |
| `LUCY_IP_SALT` | — | Sel du hachage des adresses. **A renseigner.** |
| `LUCY_MODEL` | `ministral-3b-2512` | Modele de traduction. |
| `LUCY_MISTRAL_REGION` | `eu` | Region du fournisseur : `eu`, `global`, `us`. |
| `LUCY_RATE_LIMIT` | `10` | Demandes par minute et par adresse. `0` desactive. |
| `LUCY_CORS_ORIGIN` | — | Origine autorisee pour l'apercu web. Ferme par defaut. |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies par la plateforme.

## Deployer

```bash
# 1. La table du compteur et sa fonction, une fois.
#    Coller supabase/rate_limit.sql dans l'editeur SQL du tableau de bord.

# 2. Les secrets.
supabase secrets set MISTRAL_API_KEY=...
supabase secrets set LUCY_IP_SALT="$(openssl rand -hex 32)"

# 3. La fonction. `--no-verify-jwt` parce que l'application n'a pas de
#    comptes : exiger un jeton reviendrait a embarquer la cle anonyme dans le
#    bundle, ou elle serait publique de toute facon. Cela n'ote aucune
#    protection reelle — voir « Ce qui reste ouvert ».
supabase functions deploy recherche-criteres --no-verify-jwt

# 4. Verifier.
./supabase/verifier.sh https://<ref>.supabase.co/functions/v1
```

Avant la premiere mise en ligne, **poser un plafond de depense sur la cle**
dans la console Mistral. C'est le seul garde-fou qui borne reellement la
facture ; la limitation de debit n'ecarte que l'accident.

**Refuser l'entrainement** sur le plan gratuit Mistral (console, menu
*Privacy*) : les entrees et sorties l'alimentent par defaut.

### La region ne se garantit plus cote serveur

Les Edge Functions s'executent au plus pres de l'appelant. L'Europe est imposee
par l'en-tete `x-region: eu-west-3`, envoye **par l'application**
(`searchClient.ts`). Le retirer ferait repartir les phrases hors d'Europe sans
qu'aucun test n'echoue — c'est une question ouverte, consignee comme telle.

## Cout et modele

Une demande represente environ 670 jetons en entree et 60 en sortie. Pour
10 000 recherches par mois :

| Modele | Entree $/M | Sortie $/M | 10 000 recherches |
| --- | --- | --- | --- |
| `ministral-3b-2512` | 0,10 | 0,10 | ~0,73 $ |
| `mistral-small-2603` | 0,15 | 0,60 | ~1,37 $ |

`ministral-3b-2512` n'est pas retenu pour son prix mais pour son debit : sur le
plan d'evaluation il autorise 1 300 000 jetons par minute contre 20 000 a
`mistral-small-2603`. Ces chiffres sont ceux d'un abonnement donne — les
verifier sur la page des limites plutot que les supposer.

## Ce qui reste ouvert

**L'authentification de l'application.** Le point d'entree est public : qui
connait l'URL peut l'appeler. Un jeton embarque dans le binaire s'en extrait
comme une cle d'API et ne ferait que ralentir ; le plafond par adresse et le
plafond de depense sont, en l'etat, ce qui tient lieu de protection. Une
attestation d'application (App Attest, Play Integrity) est la reponse serieuse,
et elle n'est pas ecrite.

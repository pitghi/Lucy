# Services serveur

Deux Edge Functions Supabase, et rien d'autre cote serveur.

| Fonction | Role |
| --- | --- |
| `recherche-criteres` | Traduit une demande en langage libre — « une creme hydratante avec maximum 9 ingredients, bonne pour ma peau et la planete » — en criteres de recherche pour le moteur. |
| `composition-produit` | Cherche sur le web la liste d'ingredients d'un produit scanne que les bases ouvertes ne portent pas, et la rapporte avec la page ou elle a ete lue. |

## Pourquoi ces services existent

Une cle d'API ne peut pas vivre dans une application mobile : elle s'extrait du
binaire en quelques minutes. Ces services la portent, et n'exposent chacun
qu'un point d'entree qui ne sait rien faire d'autre.

C'est toute la brique serveur du projet.

## Ce qui ne passe pas par ici

**Le profil ne quitte pas le telephone.** Le modele recoit la phrase de
recherche, ou le code-barres et le nom d'un produit. Rien d'autre : ni type de
peau, ni intolerances, ni journal de tolerance. Ce sont des donnees de sante au
sens du RGPD, et le moteur applique le profil localement, une fois la reponse
revenue. Dans chaque fonction, un test (`aucune donnee de profil n est transmise
au modele`) casse si quelqu'un ajoute un de ces champs a l'appel.

**Aucune demande n'est journalisee.** La seule ecriture en base est un compteur
de debit, indexe par empreinte d'adresse — jamais par phrase ni par produit. Du
cote du fournisseur, la conversation du service de composition n'est pas
conservee non plus (`store: false`).

**Le traitement reste dans l'Union.** Une phrase de recherche comme un produit
scanne peuvent reveler une condition cutanee. Region du fournisseur en `eu`,
et en-tete `x-region: eu-west-3` envoye par l'application pour la region
d'execution des fonctions elles-memes.

**Le modele ne choisit aucun produit et n'en note aucun.** Il ne voit pas le
catalogue. Pour la recherche, il produit un `SearchQuery` — une structure
fermee, faite de valeurs enumerees. Pour la composition, il recopie une liste
d'ingredients trouvee sur une page. Dans les deux cas c'est le moteur de regles
qui execute ensuite, localement, en fournissant ses motifs sources. Un
classement produit par un modele ne serait ni rejouable ni opposable a une
marque, alors que tout le projet consiste a fournir des notes defendables.

**Sa sortie n'est pas crue sur parole.** Pour la traduction, elle repasse par
`parseSearchQuery`, la validation du moteur, qui ecarte en silence tout ce
qu'elle ne reconnait pas plutot que de le deviner ; le schema de sortie
structuree impose deja la forme, mais c'est la validation qui fait foi, et
c'est elle qui a rendu trois changements de fournisseur quasi gratuits. Pour la
composition, trois refus decrits plus bas, puis une seconde lecture cote
application.

## Le service de composition

`composition-produit` recoit un code-barres, un nom et une marque — ce qui est
imprime sur un emballage. Il repond une liste d'ingredients et l'adresse de la
page ou elle a ete lue, ou bien « rien trouve ».

**Ce qu'il refuse d'accepter compte plus que ce qu'il demande.** Une recherche
vide est un resultat acceptable ; une composition plausible ne l'est pas, parce
qu'elle produirait trois notes fausses et parfaitement credibles. Trois refus,
donc :

| Refus | Ce qu'il ecarte |
| --- | --- |
| Aucune page citee par l'outil de recherche | Une liste recitee de memoire par le modele |
| Moins de cinq ingredients apres decoupage | Le seuil de l'audit de couverture, applique avec le parsing du moteur |
| Moins de 80 % de libelles ayant la forme d'un nom INCI | Un paragraphe de description commerciale decoupe sur ses virgules |

L'adresse rendue est prise dans les references posees par l'outil de recherche,
jamais dans ce que le modele annonce : c'est ce qui distingue une source d'une
citation. L'application l'affiche sur la fiche, au-dessus des scores.

La conversation n'est pas conservee chez le fournisseur (`store: false`). Le
plafond de debit de cette fonction est **distinct** de celui de la traduction :
le nom du service entre dans l'empreinte d'adresse, de sorte que deux seaux
coexistent sans migration de la table.

## La copie du moteur

`functions/_shared/query.ts`, `parse.ts` et `types.ts` sont **generes** par
`./sync-moteur.sh` depuis `packages/engine/src/`. Une Edge Function est
deployee isolement : rien ne garantit qu'un import pointant hors de
`functions/` survive a l'empaquetage.

Ne pas les modifier a la main. Un test du moteur (`npm test --workspace
@lucy/engine`) compare chaque copie a sa source et casse si elle diverge —
c'est ce qui empeche une copie de devenir une seconde version de la regle. Le
seuil de cinq ingredients du service de composition n'a d'ailleurs de sens que
si les deux cotes decoupent une liste de la meme maniere.

```bash
# apres toute modification de reco/query.ts ou de inci/parse.ts
./supabase/sync-moteur.sh
```

## Limitation de debit

Les services portent la cle du modele : une URL publique sans plafond est une
cle ouverte a qui la trouve. Dix demandes par minute et par adresse pour la
traduction, **cinq** pour la composition — une recherche web enchaine plusieurs
requetes et une lecture de pages, elle coute un ordre de grandeur de plus.
Comptees **en base** (`rate_limit.sql`), dans deux seaux distincts.

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
supabase functions serve                          # les deux fonctions, en local
./supabase/verifier.sh                            # verifie l'instance locale
./supabase/verifier.sh https://<ref>.supabase.co/functions/v1
```

Le script pousse une phrase entiere a travers le service de traduction, ce qui
met en jeu d'un coup la validite de la cle, la disponibilite du modele sur
l'abonnement, l'ouverture du point d'entree regional et l'acceptation du schema
de sortie. Il verifie aussi que le plafond se declenche, puis fait chercher la
composition d'un produit reel — la seule etape qui prouve que le connecteur de
recherche web est ouvert sur l'abonnement.

Les tests tournent sans reseau :

```bash
cd supabase/functions
deno test --allow-env recherche-criteres/traduction.test.ts    # 16 tests
deno test --allow-env composition-produit/composition.test.ts  # 19 tests
```

## Variables

| Variable | Defaut | Role |
| --- | --- | --- |
| `MISTRAL_API_KEY` | — | Cle du modele. Jamais dans le depot. |
| `LUCY_IP_SALT` | — | Sel du hachage des adresses. **A renseigner.** |
| `LUCY_MODEL` | `ministral-3b-2512` | Modele de traduction. |
| `LUCY_MODEL_COMPOSITION` | `mistral-small-2603` | Modele de recherche de composition. Doit savoir se servir d'un outil : `ministral-3b-2512` n'est pas un candidat. |
| `LUCY_MISTRAL_REGION` | `eu` | Region du fournisseur : `eu`, `global`, `us`. |
| `LUCY_RATE_LIMIT` | `10` | Traductions par minute et par adresse. `0` desactive. |
| `LUCY_RATE_LIMIT_COMPOSITION` | `5` | Recherches de composition par minute et par adresse. `0` desactive. |
| `LUCY_CORS_ORIGIN` | — | Origine autorisee pour l'apercu web. Ferme par defaut. |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies par la plateforme.

## Deployer

```bash
# 1. La table du compteur et sa fonction, une fois.
#    Coller supabase/rate_limit.sql dans l'editeur SQL du tableau de bord.

# 2. Les secrets.
supabase secrets set MISTRAL_API_KEY=...
supabase secrets set LUCY_IP_SALT="$(openssl rand -hex 32)"

# 3. Les fonctions. `--no-verify-jwt` parce que l'application n'a pas de
#    comptes : exiger un jeton reviendrait a embarquer la cle anonyme dans le
#    bundle, ou elle serait publique de toute facon. Cela n'ote aucune
#    protection reelle — voir « Ce qui reste ouvert ».
supabase functions deploy recherche-criteres  --no-verify-jwt
supabase functions deploy composition-produit --no-verify-jwt

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

**Le cout d'une recherche de composition n'est pas mesure**, et il n'a pas cet
ordre de grandeur : une requete web facturee par le fournisseur, plus la
lecture des pages ouvertes, dont le volume de jetons ne se prevoit pas. C'est
la premiere chose a mesurer avant d'ouvrir a des testeurs, et la raison pour
laquelle le plafond de cette fonction est a cinq appels par minute. Le plafond
de depense sur la cle reste le seul garde-fou qui borne reellement la facture.

## Ce qui reste ouvert

**L'authentification de l'application.** Les points d'entree sont publics : qui
connait l'URL peut les appeler. Un jeton embarque dans le binaire s'en extrait
comme une cle d'API et ne ferait que ralentir ; le plafond par adresse et le
plafond de depense sont, en l'etat, ce qui tient lieu de protection. Une
attestation d'application (App Attest, Play Integrity) est la reponse serieuse,
et elle n'est pas ecrite.

# @lucy/api

Traduit une demande en langage libre — « une creme hydratante avec maximum
9 ingredients, bonne pour ma peau et la planete » — en criteres de recherche
pour le moteur.

## Pourquoi ce service existe

Une cle d'API ne peut pas vivre dans une application mobile : elle s'extrait du
binaire en quelques minutes. Ce service la porte, et n'expose qu'un point
d'entree qui ne sait rien faire d'autre.

C'est la seule brique serveur du projet, et elle est volontairement minuscule :
sans etat, sans base, sans journalisation des demandes.

## Ce qui ne passe pas par ici

**Le profil ne quitte pas le telephone.** Le modele recoit la phrase, rien
d'autre : ni type de peau, ni intolerances, ni journal de tolerance. Ce sont des
donnees de sante au sens du RGPD, et le moteur applique le profil localement,
apres la traduction. Un test (`aucune donnee de profil n est transmise au
modele`) casse si quelqu'un ajoute un de ces champs a l'appel.

**Le modele ne choisit aucun produit.** Il ne voit pas le catalogue. Il produit
un `SearchQuery` — une structure fermee, faite de valeurs enumerees — que le
moteur de regles execute ensuite en fournissant ses motifs sources. Un
classement produit par un modele ne serait ni rejouable ni opposable a une
marque, alors que tout le projet consiste a fournir des notes defendables.

**Sa sortie n'est pas crue sur parole.** Elle repasse par `parseSearchQuery`,
la validation du moteur, qui ecarte en silence tout ce qui n'est pas reconnu
plutot que de le deviner. Le schema de sortie structuree impose deja la forme ;
la validation reste, parce que c'est elle qui fait foi.

## Lancer

```bash
export MISTRAL_API_KEY=...            # console Mistral (La Plateforme)
npm start --workspace @lucy/api       # ecoute sur :8787
npm test  --workspace @lucy/api       # 20 tests, sans reseau
```

Variables :

| Variable | Defaut | Role |
| --- | --- | --- |
| `MISTRAL_API_KEY` | — | Cle du modele. **Obligatoire** : sans elle le service refuse de demarrer. Jamais dans le depot ni dans l'image. |
| `PORT` | `8787` | Port d'ecoute. |
| `LUCY_MODEL` | `mistral-small-latest` | Modele de traduction. |
| `LUCY_MISTRAL_REGION` | `eu` | Region de traitement : `eu`, `global` ou `us`. |
| `LUCY_RATE_LIMIT` | `10` | Demandes par minute et par adresse. `0` desactive. |
| `LUCY_IP_HEADER` | — | En-tete portant l'adresse du client, derriere un proxy. |
| `LUCY_CORS_ORIGIN` | — | Origine autorisee pour l'apercu web. Ferme par defaut. |

## Limitation de debit

Le service porte la cle d'API : une URL publique sans plafond est une cle
ouverte a qui la trouve, et la facture suit. Dix demandes par minute et par
adresse, en fenetre glissante, en memoire, sans dependance ni base — le service
reste sans etat, ce qui est precisement ce qui lui permet de ne faire entrer
aucune donnee de sante dans l'infrastructure. Au-dela, il renvoie `429`, que
l'application sait deja presenter (« Trop de recherches »).

Deux limites assumees, qui tiennent a ce choix :

- **Le compteur est par instance.** A une machine, le cas actuel, le plafond
  est exact. Plusieurs instances le multiplieraient d'autant.
- **Il repart de zero au reveil de la machine**, l'hebergement l'eteignant des
  qu'elle est inactive.

Le garde-fou contre l'abus soutenu n'est donc pas ce compteur mais le **plafond
de depense pose sur la cle**, cote console Mistral. Le compteur ecarte
l'accident et le curieux ; il ne remplace pas la limite qui borne la facture.

`LUCY_IP_HEADER` ne doit designer qu'un en-tete que le proxy **ecrase** a
l'entree — `fly-client-ip` chez Fly. Un en-tete seulement transmis, comme
`x-forwarded-for` sur un service joignable en direct, est choisi par
l'appelant : la limite se contournerait alors en changeant une ligne de
requete. Sans cette variable, l'adresse de la connexion fait foi.

## Interface

```
GET  /sante               -> { statut, modele }
POST /recherche/criteres  { "text": "..." }
                          -> { "query": SearchQuery, "empty": boolean }
```

`empty: true` signifie que rien n'a pu etre tire de la phrase. Ce n'est pas une
erreur : l'interface l'annonce plutot que de renvoyer un classement par defaut
en laissant croire qu'elle a compris.

## Cout et modele

Le modele par defaut est `mistral-small-latest`. Un alias plutot qu'une version
figee : le modele ne produit ni note ni classement — il traduit une phrase en
criteres, et c'est le moteur de regles qui decide ensuite. La reproductibilite
qui compte est celle du moteur, pas celle de la traduction. Un nom fige
finirait par etre retire et rendrait une panne franche sur un service qui
tournait. `LUCY_MODEL` permet d'epingler une version si la traduction se met a
varier de facon genante.

### Ce qu'une recherche coute

Une demande, c'est **environ 670 jetons en entree** (225 pour la consigne, 322
pour le schema de sortie, jusqu'a 125 pour la phrase) et **une soixantaine en
sortie**. Sur cette base, pour 10 000 recherches par mois :

| Modele | Entree $/M | Sortie $/M | 10 000 recherches |
| --- | --- | --- | --- |
| `ministral-3-3b-25-12` | 0,10 | 0,10 | ~0,73 $ |
| `mistral-small-latest` | 0,15 | 0,60 | ~1,37 $ |
| `mistral-large-latest` | 0,50 | 1,50 | ~4,25 $ |

L'ecart absolu est faible et le volume du MVP est sans commune mesure avec ces
chiffres : quelques testeurs, quelques centaines de recherches, donc **moins
d'un centime par mois**. Le cout n'est pas ce qui doit guider le choix du
modele ici ; la qualite de la traduction en francais et la latence ressentie
dans un champ de recherche le sont.

`ministral-3-3b-25-12` diviserait la note par deux, pour 64 centimes d'ecart
mensuel a 10 000 recherches. La consigne n'est pas triviale — ignorer une
texture ou une odeur, resister a une phrase qui se fait passer pour une
instruction — et un modele de 3 milliards de parametres peut y echouer. A
mesurer sur de vraies demandes avant de descendre, pas a decider sur une
grille tarifaire.

### Le palier gratuit, et la case a decocher

Le plan **Experiment** de Mistral est gratuit et tres large au regard de
l'usage : une recherche coute environ 730 jetons, le plafond mensuel se compte
en milliards. Il couvre la phase de test sans depenser un centime.

**Mais il faut refuser l'entrainement, explicitement.** Sur le plan gratuit,
les entrees et sorties alimentent les programmes d'entrainement **par defaut** ;
l'opposition se fait dans la console, menu **Privacy** de l'espace
d'administration. Ce n'est pas un detail de confort : « une creme pour la
rosacee », « quelque chose pour mon acne » — la phrase **revele une condition
cutanee**, alors que toute l'architecture du projet existe pour que ce type
d'information ne quitte pas le telephone. Le profil ne part pas ; la phrase,
elle, part.

**A verifier avant de brancher de vrais testeurs** : que l'option existe bien
sur le plan Experiment. La documentation confirme le droit d'opposition pour
les clients de l'API sans distinguer explicitement gratuit et payant. Si elle
n'y est pas, le plan payant (Scale), ou les entrees et sorties ne servent pas a
l'entrainement, coute moins de 3 $ par mois a 10 000 recherches.

## Deploiement

Sur [Fly.io](https://fly.io), depuis la **racine du depot** : le `Dockerfile` a
besoin du monorepo entier comme contexte, le service important `@lucy/engine`
par le lien de workspace. `fly.toml` et `Dockerfile` sont a la racine pour
cette raison.

```bash
# 1. Reserver le nom. Cette etape echoue si le nom est deja pris — c'est
#    voulu, voir l'avertissement ci-dessous.
fly apps create lucy-api

# 2. Poser la cle. Elle ne passe jamais par le depot ni par une couche d'image.
fly secrets set MISTRAL_API_KEY=... --app lucy-api

# 3. Deployer. `--ha=false` n'est pas un detail : sans lui, Fly cree deux
#    machines, donc deux compteurs de debit en memoire, donc un plafond reel
#    deux fois plus haut que celui qui est configure.
fly deploy --ha=false

# 4. Verifier.
curl https://lucy-api.fly.dev/sante     # -> {"statut":"ok","modele":"..."}
```

> **Si `fly apps create lucy-api` echoue parce que le nom est pris**, changez-le
> a **deux** endroits : `app` dans `fly.toml`, et `EXPO_PUBLIC_LUCY_API` dans
> `packages/app/eas.json`. Ne laissez jamais l'application pointer vers un nom
> `.fly.dev` que vous ne possedez pas : les phrases de recherche des
> utilisateurs partiraient chez son proprietaire.

Avant la premiere mise en ligne, **poser un plafond de depense mensuel sur la
cle** dans la console Mistral. C'est le seul garde-fou qui borne reellement la
facture ; la limitation de debit ci-dessus ne fait qu'ecarter l'accident.

### Ce que le deploiement suppose

- **Une seule machine**, qui s'eteint quand personne ne cherche et se rallume a
  la demande suivante. Le demarrage a froid ajoute quelques secondes a la
  premiere recherche, largement sous le delai d'attente de l'application
  (12 s). Le prix de ce choix est le compteur de debit remis a zero au reveil.
- **Traitement en Europe de bout en bout.** Le service tourne a Paris (`cdg`)
  et appelle le point d'entree europeen de Mistral (`api.eu.mistral.ai`, via
  `LUCY_MISTRAL_REGION=eu`). La phrase de recherche ne sort pas de l'Union.
  Si l'abonnement n'ouvre pas ce point d'entree, `global` fonctionne — c'est
  un recul assume, pas un reglage anodin.
- **HTTPS impose.** L'application n'appellera pas en clair, et iOS le
  refuserait de toute facon (App Transport Security).

### Brancher l'application

`EXPO_PUBLIC_LUCY_API` est fige dans le bundle **a la compilation**, pas lu a
l'execution. Il est renseigne dans les trois profils de `eas.json`, donc un
nouveau build — ou une mise a jour en vol sur un binaire qui porte
`expo-updates` — suffit a brancher l'onglet Recherche.

Pour un essai en local depuis un telephone, l'adresse de boucle locale ne
convient pas : `localhost` designe le telephone lui-meme. Il faut l'adresse de
la machine sur le reseau local.

```bash
EXPO_PUBLIC_LUCY_API=http://192.168.x.x:8787 npm run ios --workspace @lucy/app
```

### Ce qui reste ouvert

**L'authentification de l'application.** Le point d'entree est public : qui
connait l'URL peut l'appeler. Un jeton embarque dans le binaire s'en extrait
comme une cle d'API et ne ferait que ralentir ; le plafond par adresse et le
plafond de depense sont, en l'etat, ce qui tient lieu de protection. Une
attestation d'application (App Attest, Play Integrity) est la reponse serieuse,
et elle n'est pas ecrite.

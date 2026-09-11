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
export ANTHROPIC_API_KEY=...          # ou `ant auth login`
npm start --workspace @lucy/api       # ecoute sur :8787
npm test  --workspace @lucy/api       # 6 tests, sans reseau
```

Variables : `PORT` (8787), `LUCY_MODEL` (`claude-opus-5`).

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

Le modele par defaut est `claude-opus-5`, a l'effort le plus bas — la
traduction d'une demande est une tache simple et la latence compte dans un
champ de recherche. `LUCY_MODEL` permet d'en changer : un modele plus petit
suffit probablement ici, mais c'est un arbitrage a mesurer sur de vraies
demandes avant de le figer.

## Deploiement

Non traite. Le service tient dans un conteneur ou une fonction, mais rien n'est
ecrit a ce sujet, et les questions qui vont avec — limitation de debit,
authentification de l'application, budget — sont ouvertes.

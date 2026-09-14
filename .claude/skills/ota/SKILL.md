---
name: ota
description: Livrer une modification de Lucy aux testeurs par mise a jour en vol (EAS Update), de la fusion de la PR a la verification de ce que le serveur sert reellement, avec la cible de rollback etablie avant publication. A utiliser des qu'il s'agit de « livrer », « deployer », « publier une OTA », « mettre a jour les testeurs », « pousser en production », ou de revenir en arriere sur une livraison. Couvre aussi le refus de livrer : un changement natif ne passe pas par l'OTA et demande un nouveau binaire.
---

# Livrer Lucy par mise a jour en vol

Une OTA remplace le bundle JavaScript d'une application deja installee, sans
repasser par Apple. Elle ne remplace pas le binaire : tout ce qui est natif est
fige a la compilation.

**Le risque propre a l'OTA** : une livraison qui atteint des appareils dont le
binaire ne porte pas le module appele plante au demarrage, et une application
qui plante au demarrage ne telecharge plus rien — l'OTA ne rattrape pas l'OTA.
D'ou l'ordre impose ci-dessous : eligibilite, puis cible de rollback, puis
publication. La cible de rollback s'etablit **avant** de publier, parce qu'une
fois publie on ne sait plus ce qu'on a remplace.

## 0. Cette livraison passe-t-elle par l'OTA ?

`runtimeVersion` suit la politique `fingerprint` (decision 1.6) : une empreinte
calculee sur les dependances natives, la configuration et quelques fichiers.
Un appareil ne recoit que les mises a jour dont l'empreinte egale la sienne.
Une empreinte differente n'est pas une erreur visible — **la mise a jour part,
et personne ne la recoit**.

Comparer l'empreinte des deux revisions :

```bash
cd packages/app
npx --yes expo-updates fingerprint:generate --platform ios | tail -c 60
```

Entrent dans l'empreinte, et cassent donc l'OTA :

- les dependances natives (`package.json` de `packages/app`), **y compris le
  bloc `scripts`** — renommer un script npm suffit a changer l'empreinte ;
- `app.json` dans son entier, `eas.json`, les plugins de configuration ;
- les fichiers cites par la configuration : `assets/icon.png`,
  `assets/splash.png`.

N'y entrent pas — donc livrables par OTA : tout `packages/app/src/`,
`App.tsx`, tout `packages/engine/`, `docs/`.

**Empreinte changee : ne pas publier.** Il faut un nouveau build
(`npm run build:ios --workspace @lucy/app`) et une nouvelle soumission. Le
dire, plutot que de publier une mise a jour que personne ne recevra.

`EXPO_PUBLIC_LUCY_API` est fige dans le bundle a la compilation du **bundle**,
pas du binaire : brancher l'onglet Recherche sur l'API deployee est donc bien
une OTA.

## 1. Fusionner la PR

Convention du depot depuis la #5 : **squash**, titre `… (#N)` en francais sans
accent, corps qui dit pourquoi et ce qui a ete ecarte. Puis se remettre sur
`main` a jour — c'est de la que la publication part, jamais de la branche.

```bash
git checkout main && git pull origin main && git log --oneline -1
```

`eas.json` porte `requireCommit: true` : l'arbre doit etre propre, la
publication embarque le commit courant.

## 2. Etablir la cible de rollback, avant de publier

Deux cibles possibles, et ce ne sont pas les memes commandes :

- **un groupe de mise a jour anterieur**, s'il y en a un deja publie sur la
  branche — on y revient par `eas update:republish` ;
- **le bundle embarque dans le binaire**, s'il n'y a rien avant — on y revient
  par `eas update:roll-back-to-embedded`.

Avec un compte connecte :

```bash
cd packages/app
npx --yes eas-cli@latest update:list --branch production --limit 5
```

Noter l'identifiant du groupe actuellement en tete : **c'est la cible**.

Sans compte connecte, on peut quand meme interroger le serveur de mise a jour,
qui repond sans authentification. C'est aussi la seule facon de voir ce que les
appareils recoivent vraiment, plutot que ce qu'on croit avoir publie :

```bash
RV=$(cd packages/app && npx --yes expo-updates fingerprint:generate --platform ios \
  | sed -n 's/.*"hash":"\([0-9a-f]*\)"}$/\1/p')

curl -s -i \
  -H "expo-platform: ios" \
  -H "expo-channel-name: production" \
  -H "expo-runtime-version: $RV" \
  -H "expo-protocol-version: 1" \
  -H "expo-api-version: 1" \
  -H "expo-expect-signature: false" \
  -H "Accept: multipart/mixed" \
  https://u.expo.dev/5adbde8f-36c2-48be-bcf3-8d499a610044
```

Lecture des reponses :

| Reponse | Ce que ca veut dire |
|---|---|
| `204` + `expo-reason-code: NO_UPDATE_AVAILABLE` | Rien de publie pour cette empreinte. Les appareils tournent sur le bundle embarque — **la cible de rollback est l'embarque**. |
| `200` multipart avec un manifeste | Une mise a jour est servie. Son `id` est la cible de rollback. |
| `404 There is no channel named …` | Le canal n'existe pas : aucun build n'a jamais ete fait avec ce profil. Publier dessus ne servirait personne. |

Un `204` peut aussi vouloir dire que l'empreinte locale ne correspond pas a
celle du binaire distribue. Les deux lectures menent au meme geste — verifier
avant de croire que la livraison est arrivee (§4).

## 3. Publier

```bash
npm run update:production --workspace @lucy/app   # canal TestFlight
npm run update:preview    --workspace @lucy/app   # canal interne
```

Ajouter un message lisible, c'est lui qui identifie le groupe plus tard :

```bash
cd packages/app
npx --yes eas-cli@latest update --branch production -m "Recherche au catalogue depuis le profil (#8)"
```

**Ne pas utiliser `--auto`** : il prend le nom de la branche git comme branche
EAS. Depuis `main`, il publierait sur une branche `main` que le canal
`production` n'ecoute pas — publication silencieusement sans effet.

Publier sur `preview` d'abord n'est possible que si un build `preview` existe
(sinon le canal n'existe pas, cf. le tableau ci-dessus).

Livraison prudente sur un changement large : `--rollout-percentage 20`, puis
`eas update:edit` pour elargir, ou `eas update:revert-update-rollout` pour
couper.

## 4. Verifier ce que le serveur sert

Republier la requete `curl` du §2 : elle doit maintenant renvoyer un manifeste
`200` dont l'`id` est celui du groupe qu'on vient de publier. Tant que ce
n'est pas verifie, la livraison n'est pas faite — le succes de la commande dit
seulement que le bundle est parti.

Cote appareil, `expo-updates` telecharge la mise a jour **au lancement suivant
et l'applique au lancement d'apres** : un testeur qui ouvre l'application une
seule fois ne verra rien. Le dire quand on annonce une livraison, sinon on
recoit trois fois la meme fausse panne.

## 5. Revenir en arriere

```bash
cd packages/app

# Cible = bundle embarque dans le binaire
npx --yes eas-cli@latest update:roll-back-to-embedded --branch production \
  -m "Retour au bundle embarque : <raison>"

# Cible = un groupe anterieur, note au §2
npx --yes eas-cli@latest update:republish --group <id-du-groupe> \
  -m "Retour au groupe <id> : <raison>"
```

Les deux **publient une nouvelle mise a jour** qui annule la precedente ; rien
n'est efface. Le retour suit donc le meme delai que l'aller : un lancement pour
telecharger, un lancement pour appliquer. `eas update:delete` ne sert pas a
revenir en arriere — il retire le groupe sans rien donner aux appareils qui
l'ont deja.

**Ce que le rollback ne rattrape pas** : une mise a jour qui plante avant que
le client `expo-updates` ne se lance. La seule parade est en amont — verifier
l'empreinte (§0) et ne pas publier a l'aveugle.

## Etat du projet, releve le 2026-09-14

A confirmer plutot qu'a croire : ces faits vieillissent.

- Projet EAS `5adbde8f-36c2-48be-bcf3-8d499a610044`, proprietaire `pitghi`.
- Canal **`production`** : existe (cree par le build 2), **aucune mise a jour
  publiee**. Les appareils tournent sur le bundle embarque du build 2 — donc
  cible de rollback = embarque.
- Canal **`preview`** : **n'existe pas**, aucun build interne n'a ete fait.
  `npm run update:preview` n'atteindrait personne.
- Le **build 1** a ete compile sans `expo-updates` : il ne recevra jamais rien,
  et cela ne se rattrape pas (decision 1.6).
- `react-native` est en 0.76.5 quand le SDK 52 attend 0.76.9. L'aligner change
  l'empreinte et coute un binaire — question ouverte, pas un oubli.

## Publier depuis une session distante

Le conteneur n'a pas de session Expo : `eas whoami` repond « Not logged in » et
aucun `EXPO_TOKEN` n'est injecte. Les commandes `eas update*` echouent donc
ici, et **c'est a dire, pas a contourner**. Deux voies :

1. l'utilisateur lance la commande depuis sa machine — lui donner la ligne
   exacte, et le §4 pour verifier ;
2. un `EXPO_TOKEN` (jeton d'acces Expo) est ajoute aux variables
   d'environnement de l'environnement distant. Ne jamais demander de coller un
   jeton dans la conversation.

Ce qui reste faisable sans compte, et qui a de la valeur : l'empreinte (§0), la
fusion (§1), l'interrogation du serveur de mise a jour (§2 et §4).

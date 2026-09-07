# Perimetre et etapes du MVP

## Decisions actees

| Sujet | Choix |
| --- | --- |
| Perimetre produit | Soin visage uniquement (cremes, serums, nettoyants) |
| Perimetre fonctionnel | Scan, score explique **et** recommandation |
| Plateforme | React Native / Expo, iOS et Android |
| Moteur de recommandation | Regles et filtrage, pas d'apprentissage |

Le maquillage, le capillaire et les solaires sont hors perimetre. Le solaire
en particulier releve d'une logique propre (indices de protection, filtres
reglementes separement) qui justifierait son propre modele.

## Etapes

### Etape 1 — Moteur de scoring — **fait**

Parsing INCI, referentiel de 185 ingredients, estimation des concentrations par
ancrage, trois scores independants, moteur de recommandation. 60 tests.

Voir [`methodologie.md`](methodologie.md).

### Etape 2 — Source de donnees produits — **mesuree**

Sans base produits, l'application n'existe pas. Ce poste a donc ete mesure
avant tout developpement d'interface, sur 323 produits de soin visage
d'Open Beauty Facts :

| Indicateur | Valeur | Lecture |
| --- | --- | --- |
| Produits portant une liste d'ingredients | 64,7 % | le champ existe |
| Liste exploitable (>= 5 ingredients) | 58,2 % | le reste est une mention de saisie incomplete |
| Ingredients resolus par le referentiel | 71,4 % | pilote par l'audit de frequence |
| Produits scorables parmi les exploitables | 51,6 % | indicateur de maturite du referentiel |

**Verdict : le socle ouvert est necessaire mais insuffisant.** Le seuil de
60 % de reconnaissance qui aurait permis de s'en contenter n'est pas atteint :
quatre produits sur dix n'ont pas de liste exploitable. La lecture optique de
la liste INCI et la contribution utilisateur passent donc du statut de repli a
celui de brique de premier plan, ce qui modifie la priorite de l'etape 4.

Architecture retenue :

1. **Socle : Open Beauty Facts.** Base ouverte, codes-barres et listes INCI,
   gratuite. Couverture partielle en cosmetique, a mesurer.
2. **Repli : lecture optique de la liste INCI.** Quand le code-barres est
   inconnu, l'utilisateur photographie la liste d'ingredients. Le parsing
   existant tolere deja le bruit de reconnaissance optique (coquilles,
   separateurs, casse).
3. **Contribution utilisateur.** Une liste saisie ou photographiee enrichit la
   base pour les suivants. C'est ce qui fait passer la couverture de partielle
   a suffisante, et c'est un actif qui s'accumule.

Reste a mesurer en rayon : le taux de **presence du code-barres** dans la base,
distinct du taux de presence de la liste d'ingredients mesure ici. Un scan qui
ne trouve pas le produit et un scan qui le trouve sans sa composition
appellent deux traitements differents dans l'interface.

### Etape 3 — Extension du referentiel

185 entrees resolvent 71 % des ingredients rencontres sur un echantillon reel.
Atteindre 90 % demande environ 150 entrees supplementaires, la queue de
distribution etant longue et plate.

La priorite d'extension se deduit des donnees, et cette methode a ete validee :
`scripts/audit-coverage.ts` classe les ingredients non resolus par frequence
reelle, et suivre ce classement a fait passer la resolution de 51 % a 64 %
puis 71 % en deux vagues. Inutile de viser les 30 000 entrees de CosIng.

L'audit a egalement revele un defaut du parsing que seule la donnee reelle
pouvait exposer : les noms chimiques comportant une virgule numerique
(« 1,2-hexanediol ») etaient scindes en deux libelles irresolubles.

Chaque entree doit porter ses sources. Une entree sans plage d'usage ni source
degrade la confiance du score plus qu'elle ne l'ameliore.

### Etape 4 — Application Expo

Quatre ecrans :

1. **Scan.** Camera, lecture de code-barres, repli photo de la liste INCI.
2. **Fiche produit.** Les trois scores, puis les lignes d'explication avec la
   concentration estimee, le niveau de confiance et les sources. L'incertitude
   doit etre visible, pas masquee derriere un chiffre unique.
3. **Profil.** Type de peau, preoccupations, listes tolere / ne tolere pas.
   Objectif : quatre-vingt-dix secondes d'onboarding, pas davantage.
4. **Recommandations.** Classement pour le profil, avec la raison du
   classement affichee sur chaque carte.

Le moteur etant du TypeScript pur sans dependance, il s'importe directement
dans l'application sans couche d'adaptation.

### Etape 5 — Journal de tolerance

L'utilisateur declare, produit par produit, si celui-ci lui a convenu.

Au MVP, cette donnee alimente simplement les listes tolere / ne tolere pas du
profil. Sa valeur reelle est ailleurs : croisee sur un volume suffisant
d'utilisateurs, elle permet de **recalibrer les seuils d'effet par ingredient**
et de detecter des correlations individuelles (« le point commun de vos trois
produits mal toleres est le propylene glycol »).

C'est la seule donnee du projet qu'aucun concurrent ne possede, et la raison
de la collecter des le MVP meme sans l'exploiter tout de suite.

## Risques

| Risque | Nature | Traitement |
| --- | --- | --- |
| Couverture de la base produits | bloquant | mesurer avant de developper (etape 2) |
| Contestation par les marques | juridique | methode publique, sources citees, droit de reponse |
| Calibrage du modele | credibilite | validation par une competence cosmetologie / dermatologie |
| Donnees reglementaires obsoletes | exactitude | audit contre les textes consolides, revue periodique |

Sur le risque juridique : les notations grand public de produits de
consommation ont deja fait l'objet de contentieux engages par des industriels.
La protection ne consiste pas a adoucir les notes, mais a rendre la methode
verifiable et la contestation possible sur des faits. C'est la raison pour
laquelle la methodologie est un livrable au meme titre que le code, et pourquoi
chaque ligne d'explication porte ses sources.

## Ce qui est volontairement hors MVP

- Filtrage collaboratif et recommandation par apprentissage : sans base
  d'utilisateurs, il n'a aucune donnee a exploiter et serait moins pertinent
  qu'un simple tri par score.
- Comparaison de produits cote a cote.
- Suivi de routine et rappels.
- Prix et disponibilite marchande.

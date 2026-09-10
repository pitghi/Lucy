# Journal des decisions

Ce fichier consigne ce qui a ete decide, **pourquoi**, et ce qui a ete ecarte.
Son but est double : ne pas relitiger des choix deja tranches, et permettre a
quelqu'un qui arrive — humain ou nouvelle session d'assistant — de reprendre le
fil sans reconstituer le raisonnement.

Convention : chaque entree porte son statut.

- **acte** — tranche, ne pas rouvrir sans raison nouvelle
- **provisoire** — tient pour l'instant, revue prevue (la condition est dite)
- **a valider** — decide par defaut, attend une competence qu'on n'a pas encore

Les decisions prises par le porteur du projet sont marquees **[PR]**, celles
prises par defaut faute d'arbitrage explicite **[defaut]**.

---

## 1. Cadrage produit

### 1.1 Perimetre : soin visage uniquement — *acte* **[PR]**

Cremes, serums, nettoyants. Hors perimetre : maquillage, capillaire, solaires.

Le soin visage est le terrain ou le type de peau et la tolerance individuelle
comptent le plus, donc celui ou la personnalisation a le plus de valeur. Les
solaires relevent d'une logique propre (indices de protection, filtres
reglementes separement) qui justifierait son propre modele.

### 1.2 Scope du MVP : scan + score + recommandation en parallele — *acte* **[PR]**

J'avais recommande de livrer d'abord le scan et le score explique, la
recommandation en V2 : c'est le differenciateur pur, il se teste vite et ne
demande pas de catalogue complet. Le porteur a tranche pour le scope complet.

Consequence acceptee : le MVP est nettement plus lourd, et la recommandation
depend d'un catalogue qui n'existe pas encore.

### 1.3 Plateforme : React Native / Expo — *acte* **[PR]**

Une base de code pour iOS et Android, scan code-barres correct via
`expo-camera`, OCR accessible. Ecarte : PWA (acces camera peu fiable sur iOS,
handicap majeur quand le scan est la fonction centrale), natif iOS seul (une
seule plateforme).

### 1.4 Distribution de test par TestFlight, via EAS Build — *acte*

`expo-camera` ne fonctionne pas dans Expo Go : tester le scan sur un appareil
reel suppose un binaire natif. EAS Build le produit sans chaine Xcode locale,
et TestFlight le distribue aux testeurs sans passer par la revue App Store.

Trois profils dans `packages/app/eas.json`, du moins engageant au plus :
`simulator` (binaire simulateur, aucun compte Apple requis), `preview`
(distribution interne sur appareils declares), `production` (TestFlight puis
App Store).

Le numero de build est tenu par EAS (`appVersionSource: "remote"`) et non dans
`app.json` : il s'incremente a chaque envoi sans salir l'arbre de travail ni
entrer en conflit entre worktrees. `app.json` ne porte que la valeur initiale.

`ITSAppUsesNonExemptEncryption` est declare a `false` : l'application n'emploie
que HTTPS, et sans cette declaration App Store Connect repose la question de
conformite export a chaque televersement.

Le plugin `expo-camera` reclamait le micro et `RECORD_AUDIO` par defaut. Les
deux sont desactives : Lucy lit un code-barres, et une demande de permission
non justifiee est exactement ce que le projet reproche a ses concurrents.

---

---

## 2. Methode d'evaluation

Le detail est dans [`methodologie.md`](methodologie.md), destine a etre publie.
Ne sont consignes ici que les arbitrages et ce qu'ils excluent.

### 2.1 Les concentrations sont encadrees, jamais calculees — *acte*

Aucune marque ne publie ses dosages, et le reglement CE 1223/2009 n'impose
qu'un ordre de poids decroissant, libre en dessous de 1 %. « Tenir compte du
dosage » au sens strict est donc **impossible** a partir d'un code-barres.

Ce qui est possible : encadrer la concentration par un intervalle assorti d'un
niveau de confiance. C'est suffisant pour repondre a la seule question qui
compte — cet ingredient est-il present a une dose qui fait une difference ? —
et c'est honnete.

Corollaire non negociable : **l'interface n'affiche jamais la moyenne d'un
intervalle**. Un point suggererait une precision qu'on n'a pas.

### 2.2 Ancrage par marqueurs de seuil — *acte*

C'est l'actif principal du projet. Certains ingredients ont une plage d'usage
tres contrainte (phenoxyethanol au plus 1 % par la loi, EDTA environ 0,1 %,
tocopherol au plus 0,5 %). Combines a l'ordre decroissant impose par le
reglement, ils bornent tout ce qui les suit dans la liste.

### 2.3 La borne retenue est la plus contraignante — *acte*

Entre la limite legale et la plage d'usage reelle, on garde la plus basse. Une
limite legale de 25 % n'apprend rien sur un ingredient dont l'usage plafonne a
5 %, et inversement.

Un test de non-regression fige ce comportement : il avait ete ecrit a l'envers
au depart, presupposant que la limite legale l'emportait.

### 2.4 Un plafond qui rejoint le plancher invalide ce plancher — *acte*

Bug corrige apres observation. La niacinamide s'emploie entre 1 et 10 % ;
listee apres le phenoxyethanol elle est sous 1 %, et etait alors estimee a
« exactement 1 % ». L'information disponible se reduit a un majorant : le
plancher tombe a 0 et l'affichage devient « sous 1 % ».

### 2.5 Un dosage revendique par la marque n'est jamais contredit — *acte*

C'est l'information la plus fiable disponible ; aucune contrainte deduite ne la
remet en cause.

### 2.6 Trois scores, jamais fusionnes — *acte* **[PR]**

Tolerance cutanee, environnement, adequation au profil. Aucune moyenne entre
eux, a aucun endroit de l'interface.

Un silicone est excellent pour la peau et faiblement biodegradable ; une huile
essentielle est biodegradable et allergisante. Une note unique n'informe sur
aucun des deux axes. C'est l'un des deux defauts que le projet corrige.

### 2.7 Les trois scores n'ont pas la meme semantique — *acte*

Decouvert en regardant la demonstration, pas par les tests.

- **Tolerance** part de 100 et ne descend qu'en presence d'un motif identifie.
  Elle mesure un risque.
- **Adequation** part de 60, au milieu de l'echelle. Partir de 100 saturait :
  tout produit simplement bien tolere plafonnait, et l'echelle ne distinguait
  plus « inoffensif mais sans interet pour toi » de « reellement adapte » — ce
  qui est precisement la question que l'app doit trancher.

### 2.8 Ponderation par la dose, avec seuil d'effet — *acte*

Chaque effet indesirable porte un seuil sous lequel il est neglige. La penalite
suit une rampe : nulle sous la moitie du seuil, maximale au-dela du triple.

C'est le correctif au premier defaut des notations existantes : un allergene de
parfum en fin d'INCI est present a moins de 0,01 %, le sanctionner comme s'il
etait a 5 % est une erreur.

### 2.9 Un actif sous sa dose efficace ne rapporte rien — *acte*

Le pendant positif du point precedent. Un actif saupoudre pour figurer sur
l'emballage n'est pas credite. C'est ce qui separe un serum a 10 % de
niacinamide (77/100) d'un serum vitrine ou elle est listee apres le
conservateur (60/100).

### 2.10 Le poste parfum est plafonne dans son ensemble — *acte*

Une liste INCI mentionne « parfum » puis, separement, les allergenes qu'il
contient : limonene, linalool, geraniol. **Ces substances composent le parfum,
elles ne s'y ajoutent pas.** Les penaliser une a une comptait quatre fois le
meme poste et penalisait une marque **parce qu'elle est transparente** sur sa
composition.

Constate sur la demonstration : la correction a fait remonter une creme
parfumee de 54 a 73 en tolerance. Deux tests figent le comportement.

### 2.11 La comedogenicite garde un poids faible — *acte*

Les indices publies viennent de tests sur oreille de lapin des annees 1970,
dont la transposition a la peau humaine n'est pas etablie. On ne peut pas les
ignorer, on ne doit pas les traiter comme une preuve : poids reduit,
application aux seules peaux grasses et mixtes, et mention explicite de la
faible robustesse de la donnee dans l'interface.

### 2.12 L'axe environnement se pondere par la masse, pas par un seuil — *acte*

Une irritation cutanee repond a un seuil d'effet ; un impact environnemental
est a peu pres proportionnel a la masse rejetee. Les poids s'expriment donc en
points par pourcent de formule, avec saturation a 20 % pour qu'un ingredient
majoritaire ne monopolise pas le calcul.

Exception : le microplastique est forfaitaire. Le rejet est definitif quelle
que soit la quantite.

### 2.13 Calibrage des poids — *provisoire* + *a valider* **[defaut]**

Les poids actuels produisent une echelle qui se tient sur les formules types du
marche, mais ils sont **les miens**, pas ceux d'un expert. L'echelle
environnement a du etre recalibree une fois : elle s'ecrasait entre 87 et 100,
donc n'informait sur rien.

**Condition de revue :** avant toute publication de notes sur des produits
identifiables, faire valider le modele par une competence en cosmetologie ou
dermatologie, et l'axe environnement par une competence en ecotoxicologie. Ce
n'est pas une precaution de forme : c'est la credibilite commerciale du produit.

### 2.14 Le vecu de l'utilisateur prime sur la moyenne statistique — *acte*

Un ingredient declare **bien tolere** voit ses penalites annulees. Un ingredient
declare **non tolere** ramene l'adequation a zero, sans compensation possible
par la qualite du reste de la formule. Le score de tolerance du produit reste
inchange dans ce cas : c'est une inadequation a un profil, pas un defaut de
formulation.

---

## 3. Donnees

### 3.1 Verdict mesure : le socle ouvert ne suffit pas — *acte*

Le risque principal du projet a ete mesure, pas suppose, sur 323 produits de
soin visage d'Open Beauty Facts :

| Indicateur | Valeur |
| --- | --- |
| Produits portant une liste d'ingredients | 64,7 % |
| Liste exploitable (>= 5 ingredients) | 58,2 % |
| Ingredients resolus par le referentiel | 71,4 % |
| Scorables parmi les listes exploitables | 51,6 % |

J'avais pose 60 % de reconnaissance comme condition pour se contenter du socle
ouvert. **Le seuil n'est pas atteint.**

**Consequence directe :** la lecture optique de la liste INCI et la
contribution utilisateur passent du statut de repli a celui de brique de
premier plan. L'ecran de scan est concu en consequence.

### 3.2 L'extension du referentiel se pilote par la frequence mesuree — *acte*

`packages/engine/scripts/audit-coverage.ts` classe les ingredients non resolus
par frequence reelle. Suivre ce classement a fait passer la resolution de 51 %
a 64 % puis 71 %, en portant le referentiel de 108 a 185 entrees.

Inutile de viser les 30 000 entrees de CosIng : il faut viser les bonnes. La
queue de distribution est desormais plate (aucun manquant au-dela de 6 %), donc
atteindre 90 % demande environ 150 entrees de plus, sans raccourci.

Cet audit a aussi revele un defaut de parsing que seule la donnee reelle
pouvait exposer : `1,2-hexanediol` etait scinde en « 1 » et « 2-hexanediol »,
deux libelles irresolubles.

### 3.3 Toute entree du referentiel porte ses sources — *acte*

Une entree sans plage d'usage ni source degrade la confiance du score plus
qu'elle ne l'ameliore. Un test d'integrite le verifie, ainsi que le fait que
les noms INCI restent en denomination internationale non accentuee.

### 3.4 Les donnees Open Beauty Facts ne sont pas versionnees — *acte*

Licence ODbL. `scripts/fetch-sample.sh` reconstitue l'echantillon a
l'identique. Note pratique : l'API plafonne a une dizaine de requetes par
minute et un `page_size` superieur a 24 declenche ce plafond silencieusement.

### 3.5 Les produits de demonstration ne sont attribues a aucune marque reelle — *acte*

Les compositions sont representatives du marche mais anonymisees. Publier une
note sur un produit identifiable engage ; cela se traite avec la methodologie
et le droit de reponse, pas dans un jeu de donnees de developpement.

### 3.7 Les photographies d'emballage viennent d'Open Beauty Facts — *acte* **[PR]**

Recuperees par code-barres via l'API `api/v2` (`image_front_url` et
`image_front_small_url`), avec cache de session. L'URL ne figure pas dans le
type `Product` du moteur : celui-ci reste une entree de scoring, et le
code-barres suffit comme cle de jointure. Aucun score ne depend de la presence
d'une photo.

Ecarte : des visuels generiques dessines en SVG, et un aplat aux initiales de
la marque. Les deux preservaient l'anonymisation de 3.5 ; l'arbitrage a
retenu la photo reelle, plus utile pour reconnaitre un produit en rayon.

**Tension assumee avec 3.5.** La photo attache une marque identifiable a une
fiche dont la composition et les trois notes sont inventees. Le constat est
mesure, pas theorique : sur les six codes-barres de demonstration, trois sont
absents d'Open Beauty Facts et les trois presents designent **d'autres
produits** — un shampooing Garnier s'affiche sur une creme de soin visage, une
creme Byphasse sur un serum a la niacinamide. Ces EAN avaient ete pris au
hasard. La sortie de cette tension n'est pas tranchee : voir §7.

Consequence pratique : la couverture d'Open Beauty Facts etant partielle, une
photo manquante est un etat ordinaire de l'interface et non une erreur (5.10).

### 3.6 Les valeurs reglementaires doivent etre auditees — *a valider*

Les Annexes du reglement 1223/2009 sont amendees plusieurs fois par an. Les
valeurs du referentiel sont exactes a ma connaissance mais doivent etre
confrontees aux textes consolides (EUR-Lex) avant mise en production, puis
revues periodiquement.

---

## 4. Recommandation

### 4.1 Moteur de regles, pas d'apprentissage — *acte*

Filtrage sur le profil puis classement par score personnalise. Le filtrage
collaboratif est ecarte : sans base d'utilisateurs il n'a aucune donnee a
exploiter, et le demarrage a froid le rendrait moins pertinent qu'un simple
tri.

### 4.2 Contrainte de diversite par marque — *acte*

Au plus deux produits d'une meme marque dans les resultats. Sans elle, une
marque a la formulation homogene monopolise les premieres places, ce qui degrade
l'utilite percue autant que la credibilite du classement.

### 4.3 Le journal de tolerance est collecte des le MVP — *acte*

« Ce produit m'a convenu / ne m'a pas convenu », sur la fiche produit. Au MVP,
cette donnee alimente simplement les listes du profil.

Sa valeur reelle est ailleurs : croisee sur un volume suffisant, elle permet de
**recalibrer les seuils d'effet par ingredient** et de detecter des
correlations individuelles. C'est la seule donnee du projet qu'aucun concurrent
ne possede — d'ou la collecte immediate, meme sans exploitation.

---

## 5. Design d'interface

Le detail et les ecarts assumes sont dans
[`../design-system/lucy/pages/app-mobile.md`](../design-system/lucy/pages/app-mobile.md).

### 5.1 Style « Trust & Authority » — *acte*

Retenu du design system genere pour le projet. Il se traduit ici par les
sources affichees sur chaque motif et les niveaux de confiance visibles, plutot
que par les badges et certifications d'une landing page.

### 5.2 Palette Healthcare, pas Beauty — *acte*

Le domaine couleur proposait une palette « Beauty/Spa » rose et lavande.
Ecartee : elle signale un produit de beaute lifestyle, quand Lucy vend de la
rigueur analytique. Socle Healthcare, avec un fond neutralise pour ne pas
teinter les surfaces de donnees.

### 5.3 Inter en corps de texte, Lora en titres — *acte*

Ecart assume au design system, qui recommandait Lora / Raleway. Lora est
conserve en titres : registre editorial, credibilite scientifique, et
differenciant face a des concurrents tous en sans-serif geometrique.

Raleway est remplace par Inter en application de la regle `number-tabular` du
skill lui-meme : l'interface affiche en permanence des concentrations et des
intervalles, et les chiffres tabulaires d'Inter evitent le decalage de mise en
page entre « entre 0,3 et 1 % » et « 10 % ».

### 5.4 Pas de vert dans l'echelle de score — *acte*

« Vert = bon » est la semantique des applications concurrentes et importerait
leur simplification. Le registre va du teal soutenu a l'ambre puis au rouge
brique, la progression etant aussi une progression de luminosite.

### 5.5 Jamais la couleur seule — *acte*

Chaque score porte un **libelle textuel** propre a son axe (« Bien toleree »,
« Impact modere », « Peu adapte a votre profil »). Un score n'est jamais
lisible par sa seule couleur : la note reste comprehensible en niveaux de gris,
pour un daltonisme et pour un lecteur d'ecran.

L'axe environnement s'inverse (score eleve = impact faible) : nommer les
niveaux par axe evite ce contresens, qu'un « bon / moyen / mauvais » generique
produirait.

### 5.6 La couverture du referentiel est annoncee — *acte*

L'audit mesure 71 % de resolution moyenne : une part des ingredients d'un
produit reel reste inconnue. Sous 70 %, l'ecran annonce une **analyse
partielle** assumee plutot qu'un score complet. Afficher une note calculee sur
la moitie d'une formule serait une precision empruntee.

### 5.7 La saisie de la liste INCI est au meme niveau que le scan — *acte*

Consequence directe de 3.1. Elle est presentee des l'ecran de scan, avant tout
echec, et non comme un recours apres echec.

### 5.8 Navigation par etat local — *provisoire*

Suffisant pour ce premier jet visuel. **Condition de revue :** passer a React
Navigation avant toute mise en ligne, la regle `deep-linking` imposant qu'une
fiche produit soit atteignable par une URL.

### 5.9 Le mode sombre change de tonalite, il n'inverse pas — *acte*

Corrige apres observation du rendu : les couleurs de score du mode clair
restaient illisibles sur fond sombre. Le mode sombre emploie des tons plus
clairs et moins satures, conformement a `color-dark-mode`. Les deux themes se
verifient separement.

### 5.10 La photo produit a un repli de meme encombrement — *acte*

Deux tailles : vignette de 56 px dans les cartes de recommandation, rendu
pleine largeur de 200 px en tete de fiche. Le repli — icone et, sur la fiche,
la mention « Photo indisponible » — occupe exactement la meme place que
l'image : un emplacement qui s'affaisse quand la photo manque ferait sauter la
mise en page a chaque chargement, et la moitie du catalogue de demonstration
est dans ce cas (3.7).

Le cadrage est `contain` et non `cover` : les photos d'une base contributive
sont cadrees de facon tres inegale, et un recadrage automatique ampute autant
d'etiquettes qu'il en centre.

La photo est decorative au sens de l'accessibilite : le nom et la marque sont
lus juste a cote, et « photo de l'emballage » n'ajouterait qu'une redite au
lecteur d'ecran.

---

## 6. Posture juridique et editoriale

### 6.1 La methodologie est un livrable, au meme titre que le code — *acte*

[`methodologie.md`](methodologie.md) est ecrit pour etre publie. Les notations
grand public de produits de consommation ont deja fait l'objet de contentieux
engages par des industriels.

La protection ne consiste pas a adoucir les notes, mais a rendre la methode
**verifiable** et la contestation possible sur des faits. D'ou : sources sur
chaque ligne d'explication, methode publique, droit de reponse des marques.

### 6.2 Lucy ne delivre pas de conseil medical — *acte*

Mention presente dans l'application (ecran profil) et dans la documentation.
Une reaction cutanee persistante releve d'un avis dermatologique.

---

## 7. Questions ouvertes

Rien n'a ete decide sur ces points ; ils ne sont pas des oublis.

| Sujet | Etat |
| --- | --- |
| **RGPD** | Les donnees de type de peau et de tolerance sont des **donnees de santé** au sens du RGPD. Base legale, duree de conservation, minimisation, analyse d'impact : non traite, et structurant pour l'architecture. |
| **Plafond du score d'adequation** | Le premier produit recommande affiche 100/100/100. Conforme au modele (base 60 + bonus plafonne a 40), mais trois fois 100 fait suspect a l'oeil. Un plafond a 95 garderait de la granularite en haut d'echelle. Non tranche. |
| **Modele economique** | Non aborde. Determine ce qui est acceptable en matiere de partenariats marques, donc la credibilite du classement. |
| **Nom et positionnement** | « Lucy » est le nom du depot, pas une decision de marque. |
| **Taux de presence du code-barres** | L'audit a mesure la presence de la **liste d'ingredients**, pas celle du code-barres. Un scan qui ne trouve pas le produit et un scan qui le trouve sans sa composition appellent deux traitements differents. |
| **Coherence des codes-barres de demonstration** | Depuis 3.7, l'incoherence entre les EAN du catalogue et les produits qu'ils designent est visible a l'ecran. Deux sorties : aligner le catalogue sur les vraies fiches Open Beauty Facts — ce qui rouvre le droit de reponse de 6.1 sur des produits identifiables — ou retirer les EAN reels et n'afficher la photo que pour un produit effectivement scanne. Non tranche. |
| **Ecran de saisie / OCR** | Identifie comme priorite fonctionnelle suivante (3.1), pas encore ecrit. |

---

## 8. Historique des sessions

### 2026-09-07 — photographies produit

Session courte, sur un depot deja constitue. L'application a d'abord ete
relancee sur simulateur iOS pour verifier qu'elle tournait en l'etat : elle
tourne, avec deux reserves relevees au passage et non traitees — `react-native`
est en 0.76.5 quand le SDK 52 attend 0.76.9, et `npm audit` remonte 23
vulnerabilites.

Ajout des **photographies d'emballage** (3.7, 5.10) : un module de
recuperation Open Beauty Facts avec cache de session, un composant a deux
tailles, integres aux cartes de recommandation et en tete de fiche produit.
Verifie sur simulateur dans les deux themes, avec photo et sans.

Le point notable est methodologique. La source des visuels a ete presentee
comme un arbitrage, en signalant d'emblee la tension avec 3.5 ; l'option des
photos reelles a ete retenue. C'est en interrogeant l'API **avant** d'integrer
qu'est apparu le vrai probleme, qui n'etait pas celui annonce : non seulement
la photo reintroduit une marque reelle, mais les codes-barres du catalogue de
demonstration ne designent pas les produits qu'ils pretendent decrire. Le
desaccord de conception portait sur un risque juridique ; la verification a
revele une incoherence de donnees. Les deux sont reels, et seul le second se
voit a l'ecran.

Cette incoherence reste ouverte (§7) : elle etait hors du perimetre demande, et
ses deux sorties possibles n'engagent pas la meme posture editoriale.

### 2026-09-07 — cadrage, moteur, audit, premiers ecrans

Point de depart : depot vide.

1. **Cadrage** du MVP et des etapes, arbitrages 1.1 a 1.3.
2. **Moteur** (`packages/engine`) : parsing INCI, estimation par ancrage, trois
   scores, recommandation par regles. 60 tests, sans dependance.
3. **Audit de couverture** sur 323 produits reels d'Open Beauty Facts, qui a
   transforme le risque principal en chiffre (3.1) et revele un defaut de
   parsing (3.2). Referentiel porte de 108 a 185 entrees.
4. **Quatre ecrans** (`packages/app`) verifies sur le vrai moteur de rendu
   React Native, dans les deux themes. Captures dans [`apercu/`](apercu/).

Trois corrections notables sont venues de l'observation du rendu ou de la
demonstration, non des tests : le double comptage du parfum (2.10), la
saturation du score d'adequation (2.7), et l'ecrasement de l'echelle
environnement (2.13). Les tests unitaires validaient un comportement sans
juger de sa pertinence.

Un defaut de langue a du etre corrige apres coup : les chaines d'interface
avaient ete ecrites sans accents. La correction automatique a d'abord touche
des identifiants de code (`ingredient` est a la fois un mot francais et une
variable), d'ou un traitement limite aux litteraux et aux commentaires.

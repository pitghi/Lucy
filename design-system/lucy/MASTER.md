# Design System — Lucy

> **LOGIQUE :** pour un ecran donne, consulter d'abord
> `design-system/lucy/pages/[ecran].md`. S'il existe, ses regles **priment**
> sur ce fichier. Sinon, suivre strictement ce qui suit.

---

**Projet :** Lucy
**Revise le :** 2026-11-12 — direction artistique « brun, creme, bleu layette »
(decision 5.15 du [journal](../../docs/decisions.md)). Remplace la version
generee le 2026-09-07 (palette Healthcare, Lora / Raleway).
**Reference :** une page produit de soin (« fawn », marque fictive) fournie par
le porteur : toile creme, encre brune, un seul bleu pour les actions, serif
editorial a accent italique.
**Source de verite :** `packages/app/src/theme/tokens.ts` et `scores.ts`. Ce
fichier les explique ; en cas d'ecart, ce sont les jetons qui font foi.

---

## ADN

| Role | Nom | Hex | Variable |
|------|-----|-----|----------|
| Primary | Bleu layette | `#8EC5FF` | `--color-primary` |
| Secondary | Brun | `#3B2418` | `--color-secondary` |
| Tertiary | Creme | `#F2E8DA` | `--color-tertiary` |

- **Primary** : l'aplat des actions — boutons principaux, onglet actif. Il ne
  porte **jamais** de texte ni de trait : 1,5:1 sur la creme. Ce qui se pose
  dessus est l'encre brune (8:1), jamais du blanc (1,8:1).
- **Secondary** : l'encre. Tout le texte, les contours d'action, les petits
  aplats (rang d'un produit, « Requis »).
- **Tertiary** : la toile de fond.

## Jetons semantiques

| Jeton | Clair | Sombre | Emploi |
|-------|-------|--------|--------|
| `background` | `#F2E8DA` | `#1C120C` | toile |
| `card` | `#FBF7F1` | `#281A12` | cartes, feuilles, barre d'onglets |
| `surfaceMuted` | `#EBDFCE` | `#33241A` | zones encastrees, bouton inactif |
| `text` | `#3B2418` | `#F2E8DA` | encre — 11,9:1 / 15,2:1 sur la toile |
| `textMuted` | `#5E4636` | `#D2C1AD` | texte secondaire — 7,2:1 sur la toile |
| `textSubtle` | `#725B4A` | `#B09A85` | mentions — 4,8:1 au pire (encastre) |
| `primary` | `#8EC5FF` | `#8EC5FF` | aplat d'action |
| `onPrimary` | `#3B2418` | `#3B2418` | texte sur l'aplat bleu — 8:1 |
| `primarySoft` | `#DCEBFC` | `#22324A` | option retenue, pastille d'etat |
| `primaryStrong` | `#234F80` | `#8EC5FF` | bleu qui se lit : bonus, trait de donnees — 6,9:1 |
| `secondary` | `#3B2418` | `#F2E8DA` | aplat d'encre, contour d'option retenue |
| `onSecondary` | `#F2E8DA` | `#3B2418` | texte sur l'aplat d'encre |
| `border` | `#E2D3BF` | `#3D2C21` | filets, piste des barres |
| `borderStrong` | `#9A846F` | `#7A6553` | contour d'un controle — 3:1 sur la carte |
| `danger` / `dangerSoft` | `#A0381F` / `#F8E1D9` | `#F09C88` / `#3D2019` | blocage, exclusion |
| `warning` / `warningSoft` | `#85520F` / `#F7E6C6` | `#E6B464` / `#3A2A14` | mise en garde |

Toutes les paires texte / fond atteignent 4,5:1 dans les deux themes ; les
contours de controle, 3:1 sur la carte qui les porte.

### Echelle de score

Pas de vert (decision 5.4), jamais la couleur seule (5.5). Chaque niveau est un
cran plus clair que le precedent, de sorte qu'ils restent distincts en niveaux
de gris.

| Niveau | Clair | Dilue | Sombre | Dilue sombre |
|--------|-------|-------|--------|--------------|
| haut | `#1B3E66` marine | `#DCEAFB` | `#B9DBFF` | `#1E2C3D` |
| bon | `#234F80` denim | `#E7F0FA` | `#8EC5FF` | `#1C2838` |
| moyen | `#85520F` ocre | `#F7E6C6` | `#D9A04A` | `#36270F` |
| faible | `#B4432A` terre cuite | `#FAE6DF` | `#E07C64` | `#3A1E17` |

Luminance (L*) : 26, 33, 40, 44 en clair ; 86, 78, 70, 63 en sombre.

## Typographie

- **Titres : Instrument Serif** 400, et son italique pour l'accent — un mot
  du titre, jamais un nom de produit (« Pour *vous* », « Pourquoi ce *score* »).
  Une seule graisse : jamais sous 22 px.
- **Corps : Inter** 400 / 500 / 600, chiffres tabulaires pour toute valeur
  (decision 5.3).
- **Surtitre** : Inter 600, 12 / 16, capitales par le style, interlettrage 1,2
  (marque d'un produit, « Cibler une préoccupation »).

| Style | Famille | Taille / interligne |
|-------|---------|---------------------|
| `display` | Instrument Serif | 40 / 44 |
| `title` | Instrument Serif | 28 / 32 |
| `titleSmall` | Instrument Serif | 22 / 26 |
| `subtitle` | Inter 600 | 18 / 26 |
| `body` / `bodyMedium` | Inter 400 / 500 | 16 / 24 |
| `small` / `smallMedium` | Inter 400 / 500 | 14 / 21 |
| `caption` | Inter 400 | 13 / 19 |
| `label` | Inter 600 | 13 / 18 |
| `eyebrow` | Inter 600, capitales | 12 / 16 |

```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');
```

## Espacement, rayons, ombres

| Jeton | Valeur |
|-------|--------|
| `space` | 4, 8, 12, 16, 24, 32, 48 |
| `radius.sm` / `md` | 8 / 12 — vignettes, champs |
| `radius.lg` | 14 — cartes |
| `radius.pill` | gelule — actions, pastilles, options |

Les surfaces se separent par des **filets** (`border`), comme dans la
reference ; les ombres sont teintees de brun et a peine marquees (opacite 0,05
pour une carte).

---

## Composants

### Boutons — `Button`

```css
/* Primaire : l'action d'un ecran. Un seul par ecran. */
.btn-primary {
  background: #8EC5FF;
  color: #3B2418;
  border-radius: 999px;
  min-height: 52px;          /* 44 dans une carte */
  padding: 0 24px;
  font: 500 16px/24px Inter;
}

/* Secondaire : contour d'encre, sans aplat. */
.btn-secondary {
  background: transparent;
  color: #3B2418;
  border: 1.5px solid #3B2418;
  border-radius: 999px;
  min-height: 52px;
}

/* Inactif : aplat creme, libelle qui dit ce qui manque. */
.btn-primary:disabled { background: #EBDFCE; color: #725B4A; }

/* Pression : l'opacite seule, la mise en page ne bouge pas. */
.btn:active { opacity: 0.75; }
```

### Lien — `TextLink`

Encre brune **soulignee**, Inter 500. Pas de couleur : un lien colore se
confondrait avec une valeur de score.

### Option selectionnable — `Chip`, cartes de choix du profil

- non retenue : fond `card`, filet `border`, texte `textMuted` ;
- retenue : fond `primarySoft`, **contour brun 1,5 px**, coche brune, texte
  `text` — trois signaux, dont aucun n'est la seule couleur ;
- exclusion retenue : fond `dangerSoft`, contour et croix `danger`.

### Pastilles d'etat

- **Niveau d'un score** : point + libelle sur l'aplat dilue du niveau
  (« ● Très bien tolérée »), a la maniere du « ● Back in stock » de la
  reference.
- **Critere compris** (recherche) : aplat `primarySoft`, coche et texte bruns.
- **Rang** : rond brun, chiffre creme, pose sur l'angle de la vignette.

### Cartes

Fond `card`, filet `border`, rayon 14, marge interne 16. Nom de produit en
`titleSmall`, marque en surtitre au-dessus.

### Champs

Fond `card`, filet `border`, rayon 12, texte 16 px, indication en `textSubtle`.

### Barre d'onglets

Fond `card`, filet superieur. L'onglet actif porte une pastille bleu layette de
56 × 32 derriere son icone, un libelle en semi-gras et un trait plus epais.

### Camera

Voile expresso a 60 % hors de la zone de visee, coins de visee bleu layette de
4 px, pastille d'instruction expresso a texte creme.

---

## Style

Le style **« Trust & Authority »** (decision 5.1) est maintenu sur le fond :
sources sur chaque motif, niveaux de confiance, intervalles, couverture
annoncee. Le registre visuel, lui, est celui de la reference : **editorial et
chaud** — toile creme, encre brune, un seul bleu, filets fins, serif a accent
italique, gelules.

---

## Interdits

- ❌ **Bleu layette en texte, en lien ou en trait de donnees** (1,5:1).
- ❌ **Texte blanc sur le bleu layette** (1,8:1).
- ❌ **Deux aplats bleus a l'ecran** : l'action principale ne se distingue plus.
- ❌ **Vert dans l'echelle de score** (decision 5.4).
- ❌ **Un etat porte par la couleur seule** (decision 5.5).
- ❌ **Une couleur ecrite en dur dans un composant** : passer par les jetons,
  condition pour que le theme sombre suive.
- ❌ **Instrument Serif sous 22 px**, ou un nom de produit coupe en italique.
- ❌ **Emojis comme icones** : Lucide uniquement.
- ❌ **Changements d'etat instantanes** : transitions de 150 a 300 ms.

---

## Avant de livrer un ecran

- [ ] Aucune couleur en dur ; theme clair **et** sombre verifies.
- [ ] Contraste texte 4,5:1, contour de controle 3:1, dans les deux themes.
- [ ] Une seule action primaire (aplat bleu) par ecran.
- [ ] Chaque score porte son libelle ; chaque etat a un signal autre que la
      couleur.
- [ ] Les chiffres sont tabulaires (Inter), les titres en Instrument Serif
      d'au moins 22 px.
- [ ] Surfaces tactiles de 44 px au moins.
- [ ] Rien n'est masque par la barre d'onglets ni par la barre d'action.

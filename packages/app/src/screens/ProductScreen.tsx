import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ban, ChevronLeft, FlaskConical, Heart, ThumbsDown } from 'lucide-react-native';
import type { Product, ProductAssessment } from '@lucy/engine';
import { formatRange } from '@lucy/engine';
import { radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';
import { ScoreRow } from '../components/ScoreRow';
import { ReasonCard } from '../components/ReasonCard';
import { CoverageNotice } from '../components/CoverageNotice';
import { ConfidenceIndicator } from '../components/Confidence';

/**
 * Fiche produit.
 *
 * L'ecran est ordonne selon ce que Lucy revendique : les trois scores restent
 * separes, puis viennent immediatement leurs motifs. L'explication n'est pas
 * un detail relegue en bas de page, c'est la raison d'etre du produit — une
 * note sans son motif ne se distingue pas d'un avis.
 *
 * La composition estimée vient en dernier, comme piece justificative
 * consultable plutot que comme information de premiere lecture.
 */

interface Props {
  product: Product;
  assessment: ProductAssessment;
  onBack: () => void;
  /** Enregistre le produit comme bien toléré ou non, pour affiner le profil. */
  onToleranceFeedback: (tolerated: boolean) => void;
}

export function ProductScreen({
  product,
  assessment,
  onBack,
  onToleranceFeedback,
}: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  const displayed = assessment.personalized ?? assessment.skin;

  /** Index des estimations par nom INCI, pour tracer l'intervalle sur chaque motif. */
  const estimateByInci = useMemo(
    () => new Map(assessment.concentrations.map((c) => [c.inci, c])),
    [assessment.concentrations],
  );

  const ingredients = showAllIngredients
    ? assessment.concentrations
    : assessment.concentrations.slice(0, 8);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + space.sm,
            backgroundColor: palette.card,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Revenir au scan"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ChevronLeft size={24} color={palette.text} strokeWidth={2} />
        </Pressable>
        <Text style={[type.smallMedium, { color: palette.textMuted }]} numberOfLines={1}>
          {product.brand}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          // Marge basse pour que la barre d'action n'occulte pas la fin de la liste.
          { paddingBottom: insets.bottom + space.xxxl + TOUCH_MIN },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={[type.display, { color: palette.text }]}>{product.name}</Text>
          {product.barcode ? (
            <Text style={[type.caption, { color: palette.textSubtle }]}>
              Code-barres {product.barcode}
            </Text>
          ) : null}
        </View>

        {/* Un ingrédient déclaré non toléré est éliminatoire : il est annoncé
            avant tout score, qu'aucune qualité de formule ne compense. */}
        {assessment.blockers.length > 0 ? (
          <View
            style={[
              styles.blocker,
              { backgroundColor: palette.dangerSoft, borderColor: palette.danger },
            ]}
            accessibilityRole="alert"
          >
            <Ban size={20} color={palette.danger} strokeWidth={2} />
            <View style={styles.blockerText}>
              <Text style={[type.bodyMedium, { color: palette.danger }]}>
                Ce produit ne vous convient pas
              </Text>
              <Text style={[type.small, { color: palette.danger }]}>
                Il contient {assessment.blockers.join(', ')}, que vous avez déclaré ne pas
                tolérer.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ScoreRow axis="tolerance" value={assessment.skin.value} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <ScoreRow axis="environment" value={assessment.env.value} />
          {assessment.personalized ? (
            <>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
              <ScoreRow axis="fit" value={assessment.personalized.value} />
            </>
          ) : null}
        </View>

        <CoverageNotice coverage={assessment.skin.coverage} />

        <View style={styles.section}>
          <Text style={[type.title, { color: palette.text }]}>Pourquoi ce score</Text>
          <Text style={[type.small, { color: palette.textMuted }]}>
            Chaque motif indique la concentration estimée de l'ingrédient et la fiabilité de
            cette estimation. Les concentrations ne sont pas publiées par les marques : elles
            sont encadrées à partir de l'ordre de la liste et des limites réglementaires.
          </Text>

          {displayed.reasons.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: palette.surfaceMuted }]}>
              <Text style={[type.small, { color: palette.textMuted }]}>
                Aucun point de vigilance identifié sur cette formule.
              </Text>
            </View>
          ) : (
            <View style={styles.reasons}>
              {displayed.reasons.map((reason, index) => (
                <ReasonCard
                  key={`${reason.inci}-${index}`}
                  reason={reason}
                  estimate={estimateByInci.get(reason.inci)}
                />
              ))}
            </View>
          )}
        </View>

        {assessment.env.reasons.length > 0 ? (
          <View style={styles.section}>
            <Text style={[type.title, { color: palette.text }]}>Côté environnement</Text>
            <Text style={[type.small, { color: palette.textMuted }]}>
              Calcule séparément du score cutané. Un silicone est bien toléré par la peau et
              faiblement biodégradable : moyenner les deux n'informerait sur aucun des deux.
            </Text>
            <View style={styles.reasons}>
              {assessment.env.reasons.slice(0, 4).map((reason, index) => (
                <ReasonCard
                  key={`env-${reason.inci}-${index}`}
                  reason={reason}
                  estimate={estimateByInci.get(reason.inci)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <FlaskConical size={18} color={palette.textMuted} strokeWidth={2} />
            <Text style={[type.title, { color: palette.text }]}>Composition estimée</Text>
          </View>

          <View
            style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            {ingredients.map((estimate, index) => (
              <View key={`${estimate.inci}-${index}`}>
                {index > 0 ? (
                  <View style={[styles.divider, { backgroundColor: palette.border }]} />
                ) : null}
                <View style={styles.ingredientRow}>
                  <View style={styles.ingredientName}>
                    <Text style={[type.small, { color: palette.text }]} numberOfLines={2}>
                      {estimate.inci}
                    </Text>
                    <ConfidenceIndicator value={estimate.confidence} />
                  </View>
                  {/* Chiffres tabulaires : un intervalle et une valeur unique
                      s'alignent sur la meme colonne. */}
                  <Text
                    style={[type.smallMedium, styles.ingredientValue, { color: palette.text }]}
                  >
                    {formatRange(estimate)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {assessment.concentrations.length > 8 ? (
            <Pressable
              onPress={() => setShowAllIngredients(!showAllIngredients)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showAllIngredients }}
              style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}
            >
              <Text style={[type.smallMedium, { color: palette.primary }]}>
                {showAllIngredients
                  ? 'Afficher moins'
                  : `Afficher les ${assessment.concentrations.length - 8} autres ingrédients`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {/* Journal de tolérance. Cette donnee est la seule qu'aucune notation
          concurrente ne possede : elle permettra de recalibrer les seuils par
          ingrédient a partir du vécu réel des utilisateurs. */}
      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: insets.bottom + space.md,
            backgroundColor: palette.card,
            borderTopColor: palette.border,
          },
        ]}
      >
        <Pressable
          onPress={() => onToleranceFeedback(true)}
          accessibilityRole="button"
          accessibilityLabel="Ce produit me convient"
          style={({ pressed }) => [
            styles.feedbackButton,
            { backgroundColor: palette.primary },
            pressed && styles.pressed,
          ]}
        >
          <Heart size={17} color={palette.onPrimary} strokeWidth={2} />
          <Text style={[type.smallMedium, { color: palette.onPrimary }]}>Il me convient</Text>
        </Pressable>

        <Pressable
          onPress={() => onToleranceFeedback(false)}
          accessibilityRole="button"
          accessibilityLabel="Ce produit ne me convient pas"
          style={({ pressed }) => [
            styles.feedbackButton,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.border, borderWidth: 1 },
            pressed && styles.pressed,
          ]}
        >
          <ThumbsDown size={17} color={palette.textMuted} strokeWidth={2} />
          <Text style={[type.smallMedium, { color: palette.textMuted }]}>Mal toléré</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
  },
  backButton: { width: TOUCH_MIN, height: TOUCH_MIN, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },

  content: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.xl },
  heading: { gap: space.xs },

  blocker: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  blockerText: { flex: 1, gap: space.xs },

  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  divider: { height: 1 },

  section: { gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reasons: { gap: space.md },
  empty: { padding: space.lg, borderRadius: radius.md },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingVertical: space.xs,
  },
  ingredientName: { flex: 1, gap: space.xs },
  ingredientValue: { fontVariant: ['tabular-nums'] },

  moreButton: {
    minHeight: TOUCH_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: TOUCH_MIN,
    borderRadius: radius.pill,
  },
});

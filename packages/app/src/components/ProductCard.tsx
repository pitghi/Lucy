import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Product, ProductAssessment } from '@lucy/engine';
import { AXIS_TITLES_SHORT, font, presentScore, radius, space, type } from '../theme/index';
import { useIsDark, usePalette } from '../theme/usePalette';
import { ProductImage } from './ProductImage';

/**
 * Carte produit, partagee par les recommandations et la recherche.
 *
 * Les deux listes montrent les memes choses dans le meme ordre : la
 * recherche n'est pas un classement d'une autre nature, seulement un
 * classement dont les criteres viennent d'une phrase. Les presenter
 * differemment laisserait croire le contraire.
 *
 * Les trois scores restent visibles des la liste. Classer sur le seul score
 * d'adequation masquerait un produit adapte mais lourd pour l'environnement.
 */

interface Props {
  product: Product;
  assessment: ProductAssessment;
  /** Rang affiche a gauche du titre. Absent, la place n'est pas reservee. */
  rank?: number;
  /** Motif du classement, sous les scores. */
  note?: ReactNode;
  onPress: () => void;
  accessibilityHint?: string;
}

export function ProductCard({
  product,
  assessment,
  rank,
  note,
  onPress,
  accessibilityHint,
}: Props) {
  const palette = usePalette();
  const dark = useIsDark();
  const fitValue = assessment.personalized?.value ?? assessment.skin.value;
  const fit = presentScore('fit', fitValue, dark);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rank !== undefined ? `${rank}. ` : ''}${product.name} de ${product.brand}. ${fit.accessibilityLabel}`}
      {...(accessibilityHint ? { accessibilityHint } : {})}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardHead}>
        <View>
          <ProductImage barcode={product.barcode} />
          {/* Le rang en pastille brune, a la maniere du compteur de panier de
              la reference : lisible d'un coup d'oeil sans voler la place du
              titre. */}
          {rank !== undefined ? (
            <View
              style={[
                styles.rank,
                { backgroundColor: palette.secondary, borderColor: palette.card },
              ]}
            >
              <Text style={[styles.rankText, { color: palette.onSecondary }]}>{rank}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardTitle}>
          <Text style={[type.eyebrow, { color: palette.textMuted }]} numberOfLines={1}>
            {product.brand}
          </Text>
          <Text style={[type.titleSmall, { color: palette.text }]} numberOfLines={2}>
            {product.name}
          </Text>
        </View>
        <ChevronRight size={20} color={palette.textSubtle} strokeWidth={1.75} />
      </View>

      <View style={styles.scores}>
        {(
          [
            ['fit', fitValue],
            ['tolerance', assessment.skin.value],
            ['environment', assessment.env.value],
          ] as const
        ).map(([axis, value]) => {
          const score = presentScore(axis, value, dark);
          return (
            <View key={axis} style={[styles.scorePill, { backgroundColor: score.soft }]}>
              <Text style={[styles.scoreLabel, { color: palette.textMuted }]} numberOfLines={1}>
                {AXIS_TITLES_SHORT[axis]}
              </Text>
              <Text style={[type.smallMedium, styles.scoreValue, { color: score.color }]}>
                {value}
              </Text>
            </View>
          );
        })}
      </View>

      {note ? (
        <View style={[styles.note, { borderTopColor: palette.border }]}>{note}</View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  pressed: { opacity: 0.85 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardTitle: { flex: 1, gap: space.xs },
  rank: {
    position: 'absolute',
    top: -6,
    left: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 11, lineHeight: 14, fontFamily: font.bodySemiBold, fontVariant: ['tabular-nums'] },

  scores: { flexDirection: 'row', gap: space.sm },
  scorePill: {
    flex: 1,
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  scoreLabel: { fontSize: 11, lineHeight: 15, fontFamily: font.body },
  scoreValue: { fontVariant: ['tabular-nums'], fontSize: 18, fontFamily: font.bodySemiBold },

  note: { borderTopWidth: 1, paddingTop: space.md, gap: space.sm },
});

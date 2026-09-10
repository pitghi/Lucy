import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Sparkles, UserCog } from 'lucide-react-native';
import type { Concern, Product, SkinProfile } from '@lucy/engine';
import { recommend, type Recommendation } from '@lucy/engine';
import { CONCERN_LABELS } from '../data/labels';
import {
  AXIS_TITLES_SHORT,
  font,
  presentScore,
  radius,
  space,
  TOUCH_MIN,
  type,
} from '../theme/index';
import { useIsDark, usePalette } from '../theme/usePalette';
import { Chip, ChipGroup } from '../components/Chip';
import { ProductImage } from '../components/ProductImage';

/**
 * Recommandations pour le profil.
 *
 * Chaque carte affiche le motif de son classement. Une liste de produits sans
 * justification ne se distingue pas d'un placement publicitaire : c'est la
 * raison affichee qui rend le classement contestable, donc credible.
 */

interface Props {
  catalog: Product[];
  profile: SkinProfile | null;
  onSelect: (recommendation: Recommendation) => void;
  onEditProfile: () => void;
}

export function RecommendationsScreen({
  catalog,
  profile,
  onSelect,
  onEditProfile,
}: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [target, setTarget] = useState<Concern | null>(null);

  const results = useMemo(
    () =>
      profile
        ? recommend(catalog, profile, {
            category: 'leave_on_face',
            ...(target ? { targetConcern: target } : {}),
          })
        : [],
    [catalog, profile, target],
  );

  // Sans profil, aucune recommandation n'a de sens : on explique et on oriente
  // plutot que d'afficher une liste vide (`empty-states`).
  if (!profile) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: palette.background, paddingTop: insets.top + space.xxxl },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: palette.primarySoft }]}>
          <UserCog size={28} color={palette.primary} strokeWidth={1.75} />
        </View>
        <Text style={[type.title, { color: palette.text, textAlign: 'center' }]}>
          Renseignez votre profil
        </Text>
        <Text style={[type.body, { color: palette.textMuted, textAlign: 'center' }]}>
          Les recommandations dépendent de votre type de peau et de vos besoins. Trois
          questions suffisent.
        </Text>
        <Pressable
          onPress={onEditProfile}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: palette.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[type.bodyMedium, { color: palette.onPrimary }]}>
            Renseigner mon profil
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <FlatList
        data={results}
        keyExtractor={(item) => item.product.barcode ?? item.product.name}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[type.display, { color: palette.text }]}>Pour vous</Text>
            <Text style={[type.body, { color: palette.textMuted }]}>
              Classé selon votre profil. Les produits contenant un ingrédient que vous ne
              tolérez pas sont écartés.
            </Text>

            {profile.concerns.length > 0 ? (
              <View style={styles.filters}>
                <Text style={[type.label, { color: palette.textSubtle }]}>
                  CIBLER UNE PRÉOCCUPATION
                </Text>
                <ChipGroup>
                  {profile.concerns.map((concern) => (
                    <Chip
                      key={concern}
                      label={CONCERN_LABELS[concern]}
                      selected={target === concern}
                      onPress={() => setTarget(target === concern ? null : concern)}
                    />
                  ))}
                </ChipGroup>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: palette.surfaceMuted }]}>
            <Text style={[type.bodyMedium, { color: palette.text }]}>
              Aucun produit ne correspond
            </Text>
            <Text style={[type.small, { color: palette.textMuted }]}>
              Vos critères d'exclusion ecartent tout le catalogue disponible. Retirez un
              ingrédient de votre liste pour élargir les résultats.
            </Text>
            <Pressable
              onPress={onEditProfile}
              accessibilityRole="button"
              style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
            >
              <Text style={[type.smallMedium, { color: palette.primary }]}>
                Modifier mon profil
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => (
          <RecommendationCard recommendation={item} rank={index + 1} onPress={onSelect} />
        )}
      />
    </View>
  );
}

function RecommendationCard({
  recommendation,
  rank,
  onPress,
}: {
  recommendation: Recommendation;
  rank: number;
  onPress: (recommendation: Recommendation) => void;
}) {
  const palette = usePalette();
  const { product, assessment, highlights } = recommendation;
  const fitValue = assessment.personalized?.value ?? assessment.skin.value;
  const dark = useIsDark();
  const fit = presentScore('fit', fitValue, dark);

  return (
    <Pressable
      onPress={() => onPress(recommendation)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name} de ${product.brand}. ${fit.accessibilityLabel}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardHead}>
        <Text style={[type.caption, { color: palette.textSubtle }]}>{rank}</Text>
        <ProductImage barcode={product.barcode} />
        <View style={styles.cardTitle}>
          <Text style={[type.bodyMedium, { color: palette.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={[type.caption, { color: palette.textMuted }]}>{product.brand}</Text>
        </View>
        <ChevronRight size={20} color={palette.textSubtle} strokeWidth={2} />
      </View>

      {/* Les trois scores restent visibles des la liste : un classement sur le
          seul score d'adéquation masquerait un produit adapté mais lourd pour
          l'environnement. */}
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
              <Text
                style={[styles.scoreLabel, { color: palette.textMuted }]}
                numberOfLines={1}
              >
                {AXIS_TITLES_SHORT[axis]}
              </Text>
              <Text style={[type.smallMedium, styles.scoreValue, { color: score.color }]}>
                {value}
              </Text>
            </View>
          );
        })}
      </View>

      {highlights.length > 0 ? (
        <View style={[styles.reason, { borderTopColor: palette.border }]}>
          <Sparkles size={14} color={palette.primary} strokeWidth={2} />
          <Text style={[type.caption, { color: palette.textMuted, flex: 1 }]}>
            {highlights[0]}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: space.lg, gap: space.md },
  header: { gap: space.sm, marginBottom: space.md },
  filters: { gap: space.sm, marginTop: space.md },

  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardTitle: { flex: 1, gap: 2 },

  scores: { flexDirection: 'row', gap: space.sm },
  scorePill: {
    flex: 1,
    gap: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  scoreLabel: { fontSize: 11, lineHeight: 15, fontFamily: font.body },
  scoreValue: { fontVariant: ['tabular-nums'], fontSize: 17 },

  reason: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: 1, paddingTop: space.md },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    minHeight: TOUCH_MIN + 4,
    paddingHorizontal: space.xxl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: space.xl, borderRadius: radius.lg, gap: space.sm },
  textButton: { minHeight: TOUCH_MIN, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});

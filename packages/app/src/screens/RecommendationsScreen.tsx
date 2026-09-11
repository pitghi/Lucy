import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, UserCog } from 'lucide-react-native';
import type { Concern, Product, SkinProfile } from '@lucy/engine';
import { recommend, type Recommendation } from '@lucy/engine';
import { CONCERN_LABELS } from '../data/labels';
import { radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';
import { Chip, ChipGroup } from '../components/Chip';
import { ProductCard } from '../components/ProductCard';

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

  return (
    <ProductCard
      product={product}
      assessment={assessment}
      rank={rank}
      onPress={() => onPress(recommendation)}
      note={
        highlights.length > 0 ? (
          <View style={styles.reason}>
            <Sparkles size={14} color={palette.primary} strokeWidth={2} />
            <Text style={[type.caption, { color: palette.textMuted, flex: 1 }]}>
              {highlights[0]}
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: space.lg, gap: space.md },
  header: { gap: space.sm, marginBottom: space.md },
  filters: { gap: space.sm, marginTop: space.md },



  reason: { flexDirection: 'row', alignItems: 'center', gap: space.sm },

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

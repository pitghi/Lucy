import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Check, Search, UserCog } from 'lucide-react-native';
import {
  search,
  type MatchedCriterion,
  type Product,
  type SearchOutcome,
  type SkinProfile,
  type UnmetCriterion,
} from '@lucy/engine';
import { CONCERN_LABELS } from '../data/labels';
import { translateQuery, type SearchFailure } from '../data/searchClient';
import { radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';
import { ProductCard } from '../components/ProductCard';

/**
 * Recherche en langage libre.
 *
 * L'ecran affiche toujours **ce qu'il a compris** de la demande, avant les
 * resultats. Sans cela, l'utilisateur ne peut pas distinguer une reponse juste
 * d'un classement par defaut, et une recherche qui ignore silencieusement la
 * moitie d'une phrase est pire qu'une recherche vide.
 *
 * Le profil ne quitte pas l'appareil : seule la phrase est envoyee pour etre
 * traduite en criteres, puis le moteur local filtre, classe et justifie.
 */

interface Props {
  catalog: Product[];
  profile: SkinProfile | null;
  onSelect: (product: Product) => void;
  onEditProfile: () => void;
}

type State =
  | { phase: 'repos' }
  | { phase: 'recherche' }
  | { phase: 'echec'; reason: SearchFailure }
  | { phase: 'resultats'; outcome: SearchOutcome; comprises: string[] };

const EXEMPLES = [
  'Une crème hydratante avec maximum 9 ingrédients, bonne pour ma peau et la planète',
  'Un sérum éclat sans parfum',
];

const ECHECS: Record<SearchFailure, { titre: string; detail: string }> = {
  reseau: {
    titre: 'Recherche indisponible',
    detail:
      "La recherche en langage libre demande une connexion. Vos recommandations et le scan fonctionnent hors ligne.",
  },
  service: {
    titre: 'Recherche indisponible',
    detail: 'Le service de recherche ne répond pas. Réessayez dans un instant.',
  },
  trop_de_demandes: {
    titre: 'Trop de recherches',
    detail: 'Patientez quelques instants avant de relancer une recherche.',
  },
  demande_vide: {
    titre: "Je n'ai pas compris cette demande",
    detail:
      "Précisez le type de produit et ce que vous en attendez. Une texture ou une odeur ne se déduit pas d'une liste d'ingrédients.",
  },
};

export function SearchScreen({ catalog, profile, onSelect, onEditProfile }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [state, setState] = useState<State>({ phase: 'repos' });

  const run = useCallback(
    async (phrase: string) => {
      if (!profile || phrase.trim().length === 0) return;
      setState({ phase: 'recherche' });

      const outcome = await translateQuery(phrase);
      if (!outcome.ok) {
        setState({ phase: 'echec', reason: outcome.reason });
        return;
      }

      const { query } = outcome;
      const comprises: string[] = [];
      if (query.category) comprises.push(CATEGORY_LABELS[query.category]);
      if (query.targetConcern) comprises.push(CONCERN_LABELS[query.targetConcern]);
      if (query.maxIngredients !== undefined) {
        comprises.push(`${query.maxIngredients} ingrédients au plus`);
      }
      for (const axis of query.axes ?? []) comprises.push(AXIS_LABELS[axis]);
      if (query.avoidFragrance) comprises.push('Sans parfum');
      for (const inci of query.excludeInci ?? []) comprises.push(`Sans ${inci}`);

      setState({ phase: 'resultats', outcome: search(catalog, profile, query), comprises });
    },
    [catalog, profile],
  );

  if (!profile) {
    return (
      <View
        style={[
          styles.empty,
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
          La recherche tient compte de votre peau et de ce que vous ne tolérez pas. Sans
          profil, elle ne saurait pas quoi écarter.
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={state.phase === 'resultats' ? state.outcome.results : []}
        keyExtractor={(item) => item.product.barcode ?? item.product.name}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[type.display, { color: palette.text }]}>Rechercher</Text>
            <Text style={[type.body, { color: palette.textMuted }]}>
              Décrivez ce que vous cherchez. Votre profil reste sur votre téléphone : seule
              votre phrase est envoyée pour être comprise.
            </Text>

            <View
              style={[
                styles.field,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Une crème hydratante avec maximum 9 ingrédients…"
                placeholderTextColor={palette.textSubtle}
                multiline
                returnKeyType="search"
                onSubmitEditing={() => void run(text)}
                accessibilityLabel="Votre demande"
                style={[type.body, styles.input, { color: palette.text }]}
              />
            </View>

            <Pressable
              onPress={() => void run(text)}
              disabled={text.trim().length === 0 || state.phase === 'recherche'}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor:
                    text.trim().length === 0 ? palette.surfaceMuted : palette.primary,
                },
                pressed && styles.pressed,
              ]}
            >
              {state.phase === 'recherche' ? (
                <ActivityIndicator color={palette.onPrimary} />
              ) : (
                <>
                  <Search
                    size={18}
                    color={text.trim().length === 0 ? palette.textSubtle : palette.onPrimary}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      type.bodyMedium,
                      {
                        color:
                          text.trim().length === 0 ? palette.textSubtle : palette.onPrimary,
                      },
                    ]}
                  >
                    Rechercher
                  </Text>
                </>
              )}
            </Pressable>

            {state.phase === 'repos' ? (
              <View style={styles.exemples}>
                <Text style={[type.label, { color: palette.textSubtle }]}>EXEMPLES</Text>
                {EXEMPLES.map((exemple) => (
                  <Pressable
                    key={exemple}
                    onPress={() => {
                      setText(exemple);
                      void run(exemple);
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.exemple,
                      { borderColor: palette.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[type.small, { color: palette.textMuted }]}>{exemple}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {state.phase === 'echec' ? (
              <View
                style={[
                  styles.notice,
                  { backgroundColor: palette.warningSoft, borderColor: palette.warning },
                ]}
              >
                <AlertTriangle size={18} color={palette.warning} strokeWidth={2} />
                <View style={styles.noticeText}>
                  <Text style={[type.smallMedium, { color: palette.text }]}>
                    {ECHECS[state.reason].titre}
                  </Text>
                  <Text style={[type.caption, { color: palette.textMuted }]}>
                    {ECHECS[state.reason].detail}
                  </Text>
                </View>
              </View>
            ) : null}

            {state.phase === 'resultats' ? (
              <View style={styles.comprises}>
                <Text style={[type.label, { color: palette.textSubtle }]}>
                  CE QUE J'AI COMPRIS
                </Text>
                <View style={styles.comprisesRow}>
                  {state.comprises.map((critere) => (
                    <View
                      key={critere}
                      style={[
                        styles.critere,
                        { backgroundColor: palette.primarySoft, borderColor: palette.border },
                      ]}
                    >
                      <Check size={13} color={palette.primary} strokeWidth={2.5} />
                      <Text style={[type.caption, { color: palette.text }]}>{critere}</Text>
                    </View>
                  ))}
                </View>

                {state.outcome.unmet.length > 0 ? (
                  <View
                    style={[
                      styles.notice,
                      { backgroundColor: palette.warningSoft, borderColor: palette.warning },
                    ]}
                  >
                    <AlertTriangle size={18} color={palette.warning} strokeWidth={2} />
                    <View style={styles.noticeText}>
                      <Text style={[type.smallMedium, { color: palette.text }]}>
                        Critère non tenu
                      </Text>
                      {state.outcome.unmet.map((raison) => (
                        <Text
                          key={`${raison.kind}-${'axis' in raison ? raison.axis : ''}`}
                          style={[type.caption, { color: palette.textMuted }]}
                        >
                          {formulateUnmet(raison)}
                        </Text>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item.product}
            assessment={item.assessment}
            onPress={() => onSelect(item.product)}
            note={
              <View style={styles.matched}>
                {item.matched.map((critere) => (
                  <Text
                    key={`${critere.kind}-${'axis' in critere ? critere.axis : ''}`}
                    style={[type.caption, { color: palette.textMuted }]}
                  >
                    {formulate(critere)}
                  </Text>
                ))}
              </View>
            }
          />
        )}
      />
    </KeyboardAvoidingView>
  );
}

const CATEGORY_LABELS = {
  leave_on_face: 'Soin visage',
  rinse_off_face: 'Nettoyant visage',
  leave_on_body: 'Soin corps',
} as const;

const AXIS_LABELS = {
  skin: 'Tolérance cutanée',
  env: 'Environnement',
} as const;

/** Met en mots le fait constaté par le moteur pour un critère. */
function formulate(critere: MatchedCriterion): string {
  switch (critere.kind) {
    case 'category':
      return CATEGORY_LABELS[critere.category];
    case 'maxIngredients':
      return `${critere.actual} ingrédients, ${critere.requested} demandés au plus`;
    case 'axis':
      return `${AXIS_LABELS[critere.axis]} : ${critere.score} sur 100`;
    case 'concern':
      return `${CONCERN_LABELS[critere.concern]} : adéquation ${critere.score} sur 100`;
    case 'avoidFragrance':
      return 'Aucun parfum déclaré';
  }
}

/** Met en mots un critère que le catalogue ne peut pas satisfaire. */
function formulateUnmet(critere: UnmetCriterion): string {
  switch (critere.kind) {
    case 'axis':
      return `Aucun produit au-dessus de ${critere.floor} sur 100 en ${AXIS_LABELS[
        critere.axis
      ].toLowerCase()}.`;
    case 'maxIngredients':
      return `Aucun produit avec ${critere.requested} ingrédients ou moins.`;
    case 'category':
      return `Aucun produit dans la catégorie « ${CATEGORY_LABELS[critere.category]} ».`;
    case 'aucun':
      return 'Aucun produit du catalogue ne répond à cette demande.';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: space.lg, gap: space.md },
  header: { gap: space.sm, marginBottom: space.md },

  field: { borderWidth: 1, borderRadius: radius.md, marginTop: space.md },
  input: { minHeight: 88, padding: space.md, textAlignVertical: 'top' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: TOUCH_MIN,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    marginTop: space.sm,
  },
  pressed: { opacity: 0.85 },

  exemples: { gap: space.sm, marginTop: space.lg },
  exemple: { borderWidth: 1, borderRadius: radius.md, padding: space.md },

  comprises: { gap: space.sm, marginTop: space.lg },
  comprisesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  critere: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },

  notice: {
    flexDirection: 'row',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
  },
  noticeText: { flex: 1, gap: 2 },

  matched: { gap: 2 },

  empty: { flex: 1, alignItems: 'center', gap: space.md, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

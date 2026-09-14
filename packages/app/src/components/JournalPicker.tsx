import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Heart, HeartCrack, Search, X } from 'lucide-react-native';
import type { Product, ToleranceEntry } from '@lucy/engine';
import { radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';
import { ProductImage } from './ProductImage';

/**
 * Recherche d'un produit du catalogue, pour le journal de tolerance.
 *
 * Le journal ne se remplissait que depuis la fiche produit (decision 4.3), ce
 * qui suppose d'avoir sous la main l'emballage de ce qu'on a deja essaye. Or
 * ce qu'on a essaye est justement ce qu'on n'a plus : le flacon est fini,
 * jete, ou range ailleurs. Le profil restait donc vide au moment ou il aurait
 * le plus servi — a la premiere serie de recommandations.
 *
 * C'est une recherche par nom, pas la recherche en langage libre de l'onglet
 * dedie : ici l'utilisateur sait quel produit il cherche, il n'attend pas un
 * classement. Le rapprochement se fait donc localement, sans appel reseau et
 * sans qu'aucune phrase ne quitte l'appareil.
 *
 * Le verdict se pose directement depuis la liste, sans passer par la fiche :
 * ouvrir une fiche pour repondre a une question qu'on vient de poser
 * rallongerait un parcours dont tout l'interet est d'etre bref.
 */

interface Props {
  visible: boolean;
  catalog: Product[];
  /** Journal courant, pour afficher le verdict deja pose sur un produit. */
  journal: ToleranceEntry[];
  onRecord: (product: Product, verdict: ToleranceEntry['verdict']) => void;
  /** Retire le produit du journal, quand on repose le verdict deja actif. */
  onClear: (product: Product) => void;
  onClose: () => void;
}

/** Au-dela, la liste cesse d'aider a retrouver un produit precis. */
const MAX_RESULTATS = 30;

/**
 * Forme comparable d'un libelle : sans accent, sans casse, sans ponctuation.
 * « Crème » et « creme » designent le meme produit, et personne ne tape les
 * accents dans un champ de recherche.
 */
function normalise(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Verdict deja porte sur ce produit, s'il y en a un. */
function verdictPose(
  journal: ToleranceEntry[],
  product: Product,
): ToleranceEntry['verdict'] | null {
  const entry = journal.find((item) =>
    product.barcode ? item.barcode === product.barcode : item.name === product.name,
  );
  return entry?.verdict ?? null;
}

export function JournalPicker({
  visible,
  catalog,
  journal,
  onRecord,
  onClear,
  onClose,
}: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const index = useMemo(
    () =>
      catalog.map((product) => ({
        product,
        haystack: normalise(`${product.brand} ${product.name}`),
      })),
    [catalog],
  );

  const requete = normalise(text);

  // Chaque mot doit se retrouver, dans n'importe quel ordre : on tape aussi
  // bien « avene creme » que « creme avene ».
  const resultats = useMemo(() => {
    const mots = requete.split(' ').filter(Boolean);
    if (mots.length === 0) return [];
    return index
      .filter(({ haystack }) => mots.every((mot) => haystack.includes(mot)))
      .slice(0, MAX_RESULTATS)
      .map(({ product }) => product);
  }, [index, requete]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: palette.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.head,
            {
              paddingTop: insets.top + space.md,
              backgroundColor: palette.card,
              borderBottomColor: palette.border,
            },
          ]}
        >
          <View style={styles.headRow}>
            <Text style={[type.title, { color: palette.text, flex: 1 }]}>
              Rechercher un produit
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer la recherche"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <X size={22} color={palette.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <Text style={[type.small, { color: palette.textMuted }]}>
            Cherchez par marque ou par nom, puis dites si le produit vous a convenu. Ce qui
            ne vous a pas convenu n'est plus proposé.
          </Text>

          <View
            style={[styles.field, { backgroundColor: palette.background, borderColor: palette.border }]}
          >
            <Search size={18} color={palette.textSubtle} strokeWidth={2} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Avène, crème hydratante…"
              placeholderTextColor={palette.textSubtle}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Nom ou marque du produit"
              style={[type.body, styles.input, { color: palette.text }]}
            />
            {text.length > 0 ? (
              <Pressable
                onPress={() => setText('')}
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
              >
                <Text style={[type.caption, { color: palette.primary }]}>Effacer</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={resultats}
          keyExtractor={(item) => item.barcode ?? item.name}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + space.xxxl },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              {requete.length === 0 ? (
                <>
                  <Text style={[type.body, { color: palette.textMuted }]}>
                    Tapez les premières lettres d'une marque ou d'un produit.
                  </Text>
                  <Text style={[type.caption, { color: palette.textSubtle }]}>
                    {catalog.length} produits au catalogue. Un produit absent se renseigne en
                    scannant son code-barres.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[type.body, { color: palette.textMuted }]}>
                    Aucun produit du catalogue ne correspond à « {text.trim()} ».
                  </Text>
                  <Text style={[type.caption, { color: palette.textSubtle }]}>
                    Le catalogue ne couvre pas encore tout le marché. Scannez le produit pour
                    l'ajouter.
                  </Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Ligne
              product={item}
              verdict={verdictPose(journal, item)}
              onRecord={onRecord}
              onClear={onClear}
            />
          )}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Une ligne de resultat, avec ses deux verdicts.
 *
 * Le verdict actif est marque par le fond, la bordure, la graisse du texte
 * **et** une coche — jamais par la couleur seule (regle `5.5`).
 */
function Ligne({
  product,
  verdict,
  onRecord,
  onClear,
}: {
  product: Product;
  verdict: ToleranceEntry['verdict'] | null;
  onRecord: Props['onRecord'];
  onClear: Props['onClear'];
}) {
  const palette = usePalette();

  const verdicts = [
    {
      value: 'suited' as const,
      Icon: Heart,
      libelle: "M'a convenu",
      teinte: palette.primary,
      fond: palette.primarySoft,
    },
    {
      value: 'unsuited' as const,
      Icon: HeartCrack,
      libelle: "Ne m'a pas convenu",
      teinte: palette.danger,
      fond: palette.dangerSoft,
    },
  ];

  return (
    <View style={[styles.row, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.rowHead}>
        <ProductImage {...(product.barcode ? { barcode: product.barcode } : {})} />
        <View style={styles.rowText}>
          <Text style={[type.caption, { color: palette.textSubtle }]}>{product.brand}</Text>
          <Text style={[type.bodyMedium, { color: palette.text }]} numberOfLines={2}>
            {product.name}
          </Text>
        </View>
      </View>

      <View style={styles.verdicts}>
        {verdicts.map(({ value, Icon, libelle, teinte, fond }) => {
          const actif = verdict === value;
          return (
            <Pressable
              key={value}
              // Reposer le verdict actif le retire : c'est le seul moyen de
              // corriger une erreur de frappe sans quitter la recherche.
              onPress={() => (actif ? onClear(product) : onRecord(product, value))}
              accessibilityRole="button"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={`${product.name} de ${product.brand} : ${libelle}`}
              {...(actif ? { accessibilityHint: 'Appuyez de nouveau pour retirer ce verdict' } : {})}
              style={({ pressed }) => [
                styles.verdict,
                {
                  backgroundColor: actif ? fond : 'transparent',
                  borderColor: actif ? teinte : palette.border,
                },
                pressed && styles.pressed,
              ]}
            >
              {actif ? (
                <Check size={15} color={teinte} strokeWidth={2.5} />
              ) : (
                <Icon size={16} color={palette.textSubtle} strokeWidth={2} />
              )}
              <Text
                style={[
                  actif ? type.smallMedium : type.small,
                  { color: actif ? teinte : palette.textMuted },
                ]}
                numberOfLines={1}
              >
                {libelle}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  head: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomWidth: 1,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  close: {
    width: TOUCH_MIN,
    height: TOUCH_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    marginTop: space.xs,
  },
  input: { flex: 1, minHeight: TOUCH_MIN, paddingVertical: space.sm },
  clear: { minHeight: TOUCH_MIN, justifyContent: 'center', paddingLeft: space.sm },

  list: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md },
  row: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.md },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: 2 },

  verdicts: { flexDirection: 'row', gap: space.sm },
  verdict: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: TOUCH_MIN,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
  },

  empty: { gap: space.sm, paddingTop: space.xl },
  pressed: { opacity: 0.7 },
});

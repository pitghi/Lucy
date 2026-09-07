import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Info } from 'lucide-react-native';
import type { Concern, SkinProfile, SkinType } from '@lucy/engine';
import { radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';
import { Chip, ChipGroup } from '../components/Chip';

/**
 * Profil utilisateur.
 *
 * Volontairement court : l'objectif est quatre-vingt-dix secondes. Un
 * questionnaire long est abandonne, et un profil abandonne ne produit aucune
 * recommandation. Le profil s'affine ensuite tout seul, par le journal de
 * tolérance de la fiche produit, plutot que par un formulaire exhaustif.
 */

const SKIN_TYPES: Array<{ value: SkinType; label: string; hint: string }> = [
  { value: 'normal', label: 'Normale', hint: 'Ni tiraillements ni brillance' },
  { value: 'dry', label: 'Sèche', hint: 'Tiraillements, sensation de rugosité' },
  { value: 'oily', label: 'Grasse', hint: 'Brillance, pores marqués' },
  { value: 'combination', label: 'Mixte', hint: 'Zone T grasse, joues normales à sèches' },
  { value: 'sensitive', label: 'Sensible', hint: 'Rougeurs, réactions fréquentes' },
];

const CONCERNS: Array<{ value: Concern; label: string }> = [
  { value: 'acne', label: 'Imperfections' },
  { value: 'redness', label: 'Rougeurs' },
  { value: 'dryness', label: 'Sécheresse' },
  { value: 'barrier', label: 'Barrière cutanée' },
  { value: 'aging', label: "Signes de l'âge" },
  { value: 'pigmentation', label: 'Taches pigmentaires' },
  { value: 'dullness', label: 'Teint terne' },
];

/** Ingrédients les plus souvent cites comme mal toleres. */
const COMMON_INTOLERANCES = [
  'parfum',
  'alcohol denat',
  'limonene',
  'linalool',
  'phenoxyethanol',
  'sodium lauryl sulfate',
  'propylene glycol',
  'cocamidopropyl betaine',
];

interface Props {
  initial?: Partial<SkinProfile>;
  onSave: (profile: SkinProfile) => void;
}

export function ProfileScreen({ initial, onSave }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const [skinType, setSkinType] = useState<SkinType | null>(initial?.skinType ?? null);
  const [concerns, setConcerns] = useState<Concern[]>(initial?.concerns ?? []);
  const [notTolerated, setNotTolerated] = useState<string[]>(initial?.notTolerated ?? []);
  const [avoidFragrance, setAvoidFragrance] = useState(initial?.avoidFragrance ?? false);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  // Le type de peau est la seule reponse indispensable : sans elle, aucun
  // effet propre a un type de peau ne peut etre retenu ni écarté.
  const canSave = skinType !== null;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space.xl,
            paddingBottom: insets.bottom + space.xxxl + TOUCH_MIN,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={[type.display, { color: palette.text }]}>Votre profil</Text>
          <Text style={[type.body, { color: palette.textMuted }]}>
            Trois questions suffisent pour personnaliser les scores. Il s'affinera ensuite
            selon les produits que vous déclarez bien ou mal tolérer.
          </Text>
        </View>

        {/* Etape 1 — obligatoire */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[type.title, { color: palette.text }]}>Type de peau</Text>
            <Text style={[type.caption, { color: palette.danger }]}>Requis</Text>
          </View>

          <View style={styles.typeList}>
            {SKIN_TYPES.map((option) => {
              const selected = skinType === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSkinType(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={`${option.label}. ${option.hint}`}
                  style={({ pressed }) => [
                    styles.typeCard,
                    {
                      backgroundColor: selected ? palette.primarySoft : palette.card,
                      borderColor: selected ? palette.primary : palette.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.typeText}>
                    <Text
                      style={[
                        type.bodyMedium,
                        { color: selected ? palette.primary : palette.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {/* La description evite l'auto-diagnostic errone, premiere
                        cause de profil inexact. */}
                    <Text style={[type.caption, { color: palette.textMuted }]}>
                      {option.hint}
                    </Text>
                  </View>
                  {selected ? (
                    <Check size={20} color={palette.primary} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Etape 2 */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[type.title, { color: palette.text }]}>Vos préoccupations</Text>
            <Text style={[type.caption, { color: palette.textSubtle }]}>Optionnel</Text>
          </View>
          <Text style={[type.small, { color: palette.textMuted }]}>
            Un actif ne rapporte de points que s'il répond à l'une de vos préoccupations, et
            seulement s'il est dose à sa concentration efficace.
          </Text>
          <ChipGroup>
            {CONCERNS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={concerns.includes(option.value)}
                onPress={() => setConcerns(toggle(concerns, option.value))}
              />
            ))}
          </ChipGroup>
        </View>

        {/* Etape 3 */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[type.title, { color: palette.text }]}>Ce que vous ne tolérez pas</Text>
            <Text style={[type.caption, { color: palette.textSubtle }]}>Optionnel</Text>
          </View>
          <Text style={[type.small, { color: palette.textMuted }]}>
            Un produit contenant l'un de ces ingrédients sera écarté, quelle que soit la
            qualité du reste de sa formule.
          </Text>
          <ChipGroup>
            {COMMON_INTOLERANCES.map((inci) => (
              <Chip
                key={inci}
                label={inci}
                tone="exclude"
                selected={notTolerated.includes(inci)}
                onPress={() => setNotTolerated(toggle(notTolerated, inci))}
              />
            ))}
          </ChipGroup>

          <Pressable
            onPress={() => setAvoidFragrance(!avoidFragrance)}
            accessibilityRole="switch"
            accessibilityState={{ checked: avoidFragrance }}
            accessibilityLabel="Éviter tous les produits parfumés"
            style={({ pressed }) => [
              styles.switchRow,
              { backgroundColor: palette.card, borderColor: palette.border },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.typeText}>
              <Text style={[type.bodyMedium, { color: palette.text }]}>
                Éviter tous les produits parfumés
              </Text>
              <Text style={[type.caption, { color: palette.textMuted }]}>
                Le parfum est la premiere cause d'allergie de contact cosmétique
              </Text>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: avoidFragrance ? palette.primary : 'transparent',
                  borderColor: avoidFragrance ? palette.primary : palette.borderStrong,
                },
              ]}
            >
              {avoidFragrance ? <Check size={16} color={palette.onPrimary} strokeWidth={3} /> : null}
            </View>
          </Pressable>
        </View>

        <View style={[styles.disclaimer, { backgroundColor: palette.surfaceMuted }]}>
          <Info size={16} color={palette.textMuted} strokeWidth={2} />
          <Text style={[type.caption, { color: palette.textMuted, flex: 1 }]}>
            Lucy ne délivre pas de conseil médical. Une reaction cutanée persistante relève
            d'un avis dermatologique.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + space.md,
            backgroundColor: palette.card,
            borderTopColor: palette.border,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            skinType &&
            onSave({
              skinType,
              concerns,
              tolerated: initial?.tolerated ?? [],
              notTolerated,
              avoidFragrance,
            })
          }
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer mon profil"
          accessibilityState={{ disabled: !canSave }}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: palette.primary },
            // Etat desactive explicite : opacite reduite et action inerte.
            !canSave && styles.disabled,
            pressed && canSave && styles.pressed,
          ]}
        >
          <Text style={[type.bodyMedium, { color: palette.onPrimary }]}>
            {canSave ? 'Enregistrer mon profil' : 'Choisissez un type de peau'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: space.lg, gap: space.xxl },
  heading: { gap: space.sm },
  section: { gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },

  typeList: { gap: space.sm },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: TOUCH_MIN + 16,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  typeText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH_MIN + 16,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: space.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disclaimer: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
  },
  saveButton: {
    minHeight: TOUCH_MIN + 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

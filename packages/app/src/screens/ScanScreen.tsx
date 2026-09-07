import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, Keyboard, ScanLine, Type } from 'lucide-react-native';
import { radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';

/**
 * Ecran de scan.
 *
 * L'audit de couverture a montre que quatre produits sur dix n'ont pas de
 * liste d'ingrédients exploitable dans les bases ouvertes. La saisie manuelle
 * de la liste INCI n'est donc pas un repli a dissimuler mais une voie
 * d'entree de premier plan : elle est presentee des l'ecran de scan, avant
 * tout echec, et non apres.
 */

interface Props {
  onBarcode: (barcode: string) => void;
  onManualEntry: () => void;
  /** Vrai pendant la recherche du produit scanne. */
  searching?: boolean;
}

export function ScanScreen({ onBarcode, onManualEntry, searching = false }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  // Un code-barres reste dans le champ plusieurs images de suite : sans ce
  // verrou, la meme lecture declencherait plusieurs recherches.
  const handled = useRef(false);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      if (handled.current || searching) return;
      handled.current = true;
      setLastCode(data);
      onBarcode(data);
      // Reouverture apres un delai, pour permettre un nouveau scan.
      setTimeout(() => {
        handled.current = false;
      }, 1500);
    },
    [onBarcode, searching],
  );

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: palette.background, paddingTop: insets.top + space.xxl },
        ]}
      >
        <View style={[styles.permissionIcon, { backgroundColor: palette.primarySoft }]}>
          <Camera size={28} color={palette.primary} strokeWidth={1.75} />
        </View>
        <Text style={[type.title, { color: palette.text, textAlign: 'center' }]}>
          Autoriser l'appareil photo
        </Text>
        {/* L'explication precede la demande : un refus vient le plus souvent
            d'une permission demandee sans motif. */}
        <Text style={[type.body, { color: palette.textMuted, textAlign: 'center' }]}>
          Lucy lit le code-barres du produit pour retrouver sa composition.
          Aucune image n'est conservée ni transmise.
        </Text>

        <Pressable
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Autoriser l'accès à l'appareil photo"
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: palette.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[type.bodyMedium, { color: palette.onPrimary }]}>Autoriser</Text>
        </Pressable>

        {/* Chemin alternatif toujours disponible : l'application reste
            utilisable sans appareil photo. */}
        <Pressable
          onPress={onManualEntry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
        >
          <Keyboard size={16} color={palette.primary} strokeWidth={2} />
          <Text style={[type.smallMedium, { color: palette.primary }]}>
            Saisir la liste d'ingrédients
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={handleScan}
      />

      {/* Voile sombre : la zone de visee reste claire, le reste est assombri
          pour diriger le regard sans masquer le cadrage. */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.reticleRow}>
          <View style={styles.overlaySide} />
          <View style={styles.reticle}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <View key={corner} style={[styles.corner, styles[corner]]} />
            ))}
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      <View style={[styles.header, { top: insets.top + space.lg }]} pointerEvents="none">
        <View style={styles.headerBadge}>
          <ScanLine size={16} color="#FFFFFF" strokeWidth={2} />
          <Text style={[type.smallMedium, styles.headerText]}>
            {searching ? 'Recherche du produit...' : 'Cadrez le code-barres'}
          </Text>
        </View>
        {lastCode && searching ? (
          <Text style={[type.caption, styles.codeText]}>{lastCode}</Text>
        ) : null}
      </View>

      {/* Barre d'action ancree au-dessus de la zone de geste systeme. */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + space.lg }]}>
        <Pressable
          onPress={onManualEntry}
          accessibilityRole="button"
          accessibilityLabel="Saisir ou photographier la liste d'ingrédients"
          accessibilityHint="À utiliser quand le produit n'est pas reconnu ou sans code-barres"
          style={({ pressed }) => [
            styles.manualButton,
            pressed && styles.pressed,
          ]}
        >
          <Type size={18} color="#FFFFFF" strokeWidth={2} />
          <View style={styles.manualText}>
            <Text style={[type.smallMedium, styles.headerText]}>
              Saisir la liste d'ingrédients
            </Text>
            <Text style={[type.caption, styles.manualHint]}>
              Produit absent de la base ou sans code-barres
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const RETICLE_SIZE = 260;
const CORNER = 28;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: TOUCH_MIN + 4,
    paddingHorizontal: space.xxl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH_MIN,
  },
  pressed: { opacity: 0.7 },

  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.55)' },
  overlayBottom: { flex: 1.3, backgroundColor: 'rgba(2, 6, 23, 0.55)' },
  reticleRow: { flexDirection: 'row', height: RETICLE_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.55)' },
  reticle: { width: RETICLE_SIZE, height: RETICLE_SIZE },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#FFFFFF',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.md },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.md },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.md,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.md,
  },

  header: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: space.sm },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
  },
  headerText: { color: '#FFFFFF' },
  codeText: { color: 'rgba(255, 255, 255, 0.75)' },

  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH_MIN + 12,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  manualText: { flex: 1, gap: 2 },
  manualHint: { color: 'rgba(255, 255, 255, 0.65)' },
});

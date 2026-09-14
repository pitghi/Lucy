import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { Camera, PackageSearch, ScanLine, WifiOff } from 'lucide-react-native';
import { radius, space, TOUCH_MIN, type } from '../theme/index';
import { usePalette } from '../theme/usePalette';
import type { LookupOutcome } from '../data/productLookup';

/**
 * Ecran de scan.
 *
 * L'ecran ne fait qu'une chose : lire un code-barres et dire ce qu'il en est.
 * Il ne proposait rien de tel jusqu'ici — un scan qui n'aboutissait pas ne
 * changeait rien a l'affichage, de sorte qu'un code lu mais introuvable et un
 * code jamais lu se ressemblaient, et c'est la lecture optique qu'on accusait.
 *
 * La saisie manuelle de la liste INCI y figurait, alors que l'ecran de saisie
 * n'existe pas : le bouton ouvrait un produit de demonstration. Un chemin qui
 * ne mene pas ou il annonce coute plus cher que son absence, il est retire en
 * attendant l'ecran reel (decision 5.7).
 */

interface Props {
  onBarcode: (barcode: string) => void;
  /** Vrai pendant la recherche du produit scanne. */
  searching?: boolean;
  /** Code-barres en cours de recherche, affiché pour confirmer la lecture. */
  pendingCode?: string | null;
  /** Issue de la derniere recherche, quand elle n'a pas ouvert de fiche. */
  failure?: Exclude<LookupOutcome, { statut: 'trouve' }> | null;
  /** Ecarte le message d'echec et reprend la lecture. */
  onDismiss?: () => void;
  /** Relance la recherche du meme code, apres une coupure de reseau. */
  onRetryLookup?: () => void;
}

/**
 * Symbologies lues : celles des emballages de grande consommation.
 *
 * Les quatre valent sur les deux plateformes — iOS ramene `upc_a` a un EAN-13
 * en interne. Ce qu'il fait ensuite du code lu demande en revanche un
 * traitement cote application, voir `barcodeVariants`.
 */
const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e'];

/** Le message d'echec dit ce qui s'est passe et ce qu'il reste a faire. */
function describeFailure(failure: Exclude<LookupOutcome, { statut: 'trouve' }>): {
  Icon: typeof PackageSearch;
  title: string;
  detail: string;
  retry: string;
} {
  if (failure.statut === 'reseau') {
    return {
      Icon: WifiOff,
      title: 'Recherche impossible',
      detail:
        'Le code ' +
        failure.barcode +
        ' a bien été lu, mais la base de produits est injoignable. Sans réseau, seuls les produits déjà consultés sont disponibles.',
      retry: 'Réessayer',
    };
  }

  if (failure.statut === 'sans_composition') {
    // Les fiches mal renseignees repetent souvent la marque dans le nom : on
    // n'affiche pas « mixa mixa » sur l'ecran d'echec.
    const parts = failure.brand === failure.name ? [failure.name] : [failure.brand, failure.name];
    const produit = parts.filter(Boolean).join(' ');
    return {
      Icon: PackageSearch,
      title: produit ? produit : 'Composition absente',
      detail:
        'Ce produit est référencé, mais sa liste d’ingrédients est absente ou trop courte pour être analysée. Sans composition, aucun score ne peut être calculé.',
      retry: 'Scanner un autre produit',
    };
  }

  return {
    Icon: PackageSearch,
    title: 'Produit non référencé',
    detail:
      'Le code ' +
      failure.barcode +
      ' a bien été lu, mais il ne figure dans aucune base ouverte.',
    retry: 'Scanner un autre produit',
  };
}

export function ScanScreen({
  onBarcode,
  searching = false,
  pendingCode = null,
  failure = null,
  onDismiss,
  onRetryLookup,
}: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  // Un code-barres reste dans le champ plusieurs images de suite : sans ce
  // verrou, la meme lecture declencherait plusieurs recherches.
  const handled = useRef(false);

  // Le verrou ne se leve pas apres un delai fixe mais quand la recherche est
  // close : sur un delai, un echec affiche se faisait aussitot recouvrir par
  // une relecture du meme code, et le message disparaissait avant d'etre lu.
  useEffect(() => {
    if (!searching && !failure) handled.current = false;
  }, [searching, failure]);

  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      if (handled.current) return;
      handled.current = true;
      onBarcode(data);
    },
    [onBarcode],
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
      </View>
    );
  }

  // La lecture est suspendue pendant la recherche et tant qu'un echec est
  // affiche : sinon le meme code repartirait en boucle sous le message.
  const reading = !searching && !failure;

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={reading ? handleScan : undefined}
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
          {searching ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ScanLine size={16} color="#FFFFFF" strokeWidth={2} />
          )}
          <Text style={[type.smallMedium, styles.headerText]}>
            {searching ? 'Recherche du produit...' : 'Cadrez le code-barres'}
          </Text>
        </View>
        {/* Le code lu s'affiche des la lecture : il confirme que la camera a
            fait son travail, meme quand la recherche n'aboutit pas. */}
        {pendingCode ? (
          <Text style={[type.caption, styles.codeText]}>{pendingCode}</Text>
        ) : null}
      </View>

      {/* Le compte rendu d'echec est la seule chose qui s'ancre en bas, et il
          n'y est que le temps d'etre lu : le reste du temps rien ne couvre le
          cadrage. */}
      {failure ? (
        <View style={[styles.actions, { paddingBottom: insets.bottom + space.lg }]}>
          <Failure failure={failure} onDismiss={onDismiss} onRetryLookup={onRetryLookup} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Compte rendu d'un scan qui n'a pas ouvert de fiche.
 *
 * Il nomme le cas — code inconnu, composition absente, reseau — parce que les
 * trois ne disent pas la meme chose : les deux premiers portent sur le produit
 * et le troisieme sur la connexion, et seul le troisieme vaut d'etre rejoue.
 * Aucun n'est presente comme une panne de l'application.
 */
function Failure({
  failure,
  onDismiss,
  onRetryLookup,
}: {
  failure: Exclude<LookupOutcome, { statut: 'trouve' }>;
  onDismiss?: () => void;
  onRetryLookup?: () => void;
}) {
  const palette = usePalette();
  const { Icon, title, detail, retry } = describeFailure(failure);

  return (
    <View
      style={[styles.failure, { backgroundColor: palette.card, borderColor: palette.border }]}
      accessibilityRole="alert"
    >
      <View style={styles.failureHead}>
        <View style={[styles.failureIcon, { backgroundColor: palette.warningSoft }]}>
          <Icon size={18} color={palette.warning} strokeWidth={2} />
        </View>
        <Text style={[type.subtitle, { color: palette.text, flex: 1 }]}>{title}</Text>
      </View>

      <Text style={[type.small, { color: palette.textMuted }]}>{detail}</Text>

      {/* Une seule suite possible tant que la saisie manuelle n'existe pas :
          reprendre la lecture. Le reseau fait exception — le meme code vaut
          la peine d'etre rejoue, et on peut aussi renoncer. */}
      <View style={styles.failureActions}>
        <Pressable
          onPress={failure.statut === 'reseau' ? onRetryLookup : onDismiss}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.failurePrimary,
            { backgroundColor: palette.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[type.smallMedium, { color: palette.onPrimary }]}>{retry}</Text>
        </Pressable>

        {failure.statut === 'reseau' ? (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.failureSecondary,
              { borderColor: palette.borderStrong },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[type.smallMedium, { color: palette.text }]}>Fermer</Text>
          </Pressable>
        ) : null}
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
    gap: space.md,
  },

  failure: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  failureHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  failureIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failureActions: { flexDirection: 'row', gap: space.sm },
  failurePrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: TOUCH_MIN,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  failureSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_MIN,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },

});

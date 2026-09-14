import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ScanLine, Search, Sparkles, UserCog } from 'lucide-react-native';
import {
  assessProduct,
  type Product,
  type SkinProfile,
  type ToleranceEntry,
} from '@lucy/engine';
import { radius, space, TOUCH_MIN, type } from './src/theme/index';
import { usePalette } from './src/theme/usePalette';
import { ScanScreen } from './src/screens/ScanScreen';
import { ProductScreen } from './src/screens/ProductScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RecommendationsScreen } from './src/screens/RecommendationsScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { DEMO_CATALOG } from './src/data/catalog';
import { lookupBarcode, type LookupOutcome } from './src/data/productLookup';

/**
 * Racine de l'application.
 *
 * La navigation est ici un simple etat local, suffisant pour ce premier jet
 * visuel. Elle devra passer a React Navigation avant toute mise en ligne :
 * la regle `deep-linking` imposé que chaque fiche produit soit atteignable par
 * une URL, ce qu'un etat local ne permet pas.
 */

type Tab = 'scan' | 'search' | 'reco' | 'profile';

export default function App() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [tab, setTab] = useState<Tab>('scan');
  const [profile, setProfile] = useState<SkinProfile | null>({
    skinType: 'sensitive',
    concerns: ['redness', 'barrier'],
    tolerated: [],
    notTolerated: [],
  });
  const [selected, setSelected] = useState<Product | null>(null);

  /**
   * Etat de la lecture en cours.
   *
   * Un scan a trois issues et non deux : la fiche s'ouvre, la recherche
   * echoue, ou elle est en cours. La derniere n'etait pas representee et la
   * deuxieme ne l'etait pas du tout — le code partait en recherche et, s'il
   * ne donnait rien, l'ecran ne bougeait pas.
   */
  const [scan, setScan] = useState<{
    searching: boolean;
    code: string | null;
    failure: Exclude<LookupOutcome, { statut: 'trouve' }> | null;
  }>({ searching: false, code: null, failure: null });

  /**
   * Delai de garde apres la fermeture d'une fiche.
   *
   * L'emballage est encore devant l'objectif quand on revient au scan : sans
   * ce delai, le meme code repart aussitot et rouvre la fiche qu'on vient de
   * quitter — l'ecran de scan devient alors inatteignable.
   */
  const lastScanned = useRef<string | null>(null);
  const reopenBlockedUntil = useRef(0);

  const closeProduct = useCallback(() => {
    reopenBlockedUntil.current = Date.now() + 2500;
    setSelected(null);
  }, []);

  /**
   * Enregistre un verdict dans le journal de tolerance.
   *
   * Le produit juge non convenable disparait des propositions ; c'est la seule
   * consequence immediate. Aucun ingredient n'est condamne pour autant : un
   * produit en porte quinze, et rien ne dit lequel a pose probleme. Le profil
   * propose une intolerance seulement quand plusieurs rejets se recoupent, et
   * c'est l'utilisateur qui tranche.
   */
  const recordTolerance = useCallback(
    (product: Product, suited: boolean) => {
      setProfile((current) => {
        if (!current) return current;
        const entry: ToleranceEntry = {
          ...(product.barcode ? { barcode: product.barcode } : {}),
          name: product.name,
          verdict: suited ? 'suited' : 'unsuited',
          date: new Date().toISOString().slice(0, 10),
        };
        // Un nouveau verdict remplace le precedent : l'utilisateur a le droit
        // de changer d'avis, et deux verdicts opposes sur le meme produit
        // rendraient le journal inexploitable.
        const journal = (current.journal ?? []).filter(
          (item) => item.barcode !== entry.barcode || item.name !== entry.name,
        );
        return { ...current, journal: [entry, ...journal] };
      });
      closeProduct();
    },
    [closeProduct],
  );

  const assessment = useMemo(
    () => (selected ? assessProduct(selected, profile ?? undefined) : null),
    [selected, profile],
  );

  /**
   * Cherche le produit derriere un code-barres lu.
   *
   * La recherche interroge le catalogue local puis Open Beauty Facts. Elle
   * n'echoue jamais en silence : chaque issue negative remonte a l'ecran de
   * scan, qui la nomme et propose la suite.
   */
  const handleBarcode = useCallback((barcode: string) => {
    if (barcode === lastScanned.current && Date.now() < reopenBlockedUntil.current) {
      return;
    }
    lastScanned.current = barcode;
    setScan({ searching: true, code: barcode, failure: null });

    lookupBarcode(barcode).then((outcome) => {
      if (outcome.statut === 'trouve') {
        setScan({ searching: false, code: null, failure: null });
        setSelected(outcome.product);
        return;
      }
      setScan({ searching: false, code: barcode, failure: outcome });
    });
  }, []);

  /** Ecarte le message d'echec et rouvre la lecture. */
  const dismissScan = useCallback(() => {
    setScan({ searching: false, code: null, failure: null });
  }, []);

  /** Relance la recherche du meme code apres une coupure de reseau. */
  const retryLookup = useCallback(() => {
    if (scan.code) handleBarcode(scan.code);
  }, [scan.code, handleBarcode]);

  if (!fontsLoaded) return null;

  if (selected && assessment) {
    return (
      <SafeAreaProvider>
        <ProductScreen
          product={selected}
          assessment={assessment}
          onBack={closeProduct}
          onToleranceFeedback={(suited) => recordTolerance(selected, suited)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.screen}>
          {tab === 'scan' ? (
            <ScanScreen
              onBarcode={handleBarcode}
              searching={scan.searching}
              pendingCode={scan.code}
              failure={scan.failure}
              onDismiss={dismissScan}
              onRetryLookup={retryLookup}
            />
          ) : null}
          {tab === 'search' ? (
            <SearchScreen
              catalog={DEMO_CATALOG}
              profile={profile}
              onSelect={setSelected}
              onEditProfile={() => setTab('profile')}
            />
          ) : null}
          {tab === 'reco' ? (
            <RecommendationsScreen
              catalog={DEMO_CATALOG}
              profile={profile}
              onSelect={(recommendation) => setSelected(recommendation.product)}
              onEditProfile={() => setTab('profile')}
            />
          ) : null}
          {tab === 'profile' ? (
            <ProfileScreen
              initial={profile ?? undefined}
              catalog={DEMO_CATALOG}
              onSave={(next) => {
                setProfile(next);
                setTab('reco');
              }}
            />
          ) : null}
        </View>

        <TabBar current={tab} onChange={setTab} />
        <StatusBar barStyle={tab === 'scan' ? 'light-content' : 'dark-content'} />
      </View>
    </SafeAreaProvider>
  );
}

/**
 * Barre d'onglets.
 *
 * Quatre destinations de premier niveau, sous la limite de cinq
 * (`bottom-nav-limit`), chacune avec icone et libelle (`nav-label-icon`).
 * L'onglet actif est signale par la couleur, le poids du texte et un
 * indicateur, jamais par la couleur seule.
 */
function TabBar({ current, onChange }: { current: Tab; onChange: (tab: Tab) => void }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();

  const tabs = [
    { key: 'scan' as const, label: 'Scanner', Icon: ScanLine },
    { key: 'search' as const, label: 'Rechercher', Icon: Search },
    { key: 'reco' as const, label: 'Pour vous', Icon: Sparkles },
    { key: 'profile' as const, label: 'Profil', Icon: UserCog },
  ];

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, space.sm),
          backgroundColor: palette.card,
          borderTopColor: palette.border,
        },
      ]}
    >
      {tabs.map(({ key, label, Icon }) => {
        const active = current === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
          >
            <View
              style={[
                styles.tabIndicator,
                { backgroundColor: active ? palette.primary : 'transparent' },
              ]}
            />
            <Icon
              size={22}
              color={active ? palette.primary : palette.textSubtle}
              strokeWidth={active ? 2.25 : 1.75}
            />
            <Text
              style={[
                active ? type.label : type.caption,
                { color: active ? palette.primary : palette.textSubtle },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: space.sm,
    ...(Platform.OS === 'web' ? {} : {}),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    minHeight: TOUCH_MIN,
    paddingBottom: space.xs,
  },
  tabIndicator: {
    width: 24,
    height: 3,
    borderRadius: radius.pill,
    marginBottom: space.xs,
  },
});

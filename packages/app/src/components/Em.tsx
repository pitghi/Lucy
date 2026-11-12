import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { font } from '../theme/index';

/**
 * Accent italique dans un titre : « Pour *vous* », « Votre *profil* ».
 *
 * C'est la signature typographique de la direction artistique : un serif
 * droit, dont un mot passe en italique. Le mot herite de la taille et de la
 * couleur du titre qui l'entoure ; seule la famille change.
 *
 * Reserve aux titres ecrits par l'application. Un nom de produit reste en
 * romain : le couper a un endroit arbitraire lui preterait une emphase que la
 * marque n'a pas choisie.
 */
export function Em({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: font.headingItalic }}>{children}</Text>;
}

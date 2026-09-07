import type { Product } from '@lucy/engine';

/**
 * Catalogue de demonstration.
 *
 * Compositions representatives du marche, volontairement non attribuees a des
 * marques reelles : une note publiée sur un produit identifiable engage, et
 * cette question se traite avec la methodologie et le droit de reponse, pas
 * dans un jeu de donnees de developpement.
 */
export const DEMO_CATALOG: Product[] = [
  {
    barcode: '3401599486042',
    name: 'Crème hydratante minimaliste',
    brand: 'Exemple A',
    category: 'leave_on_face',
    inciList:
      'Aqua, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, ' +
      'Squalane, Panthenol, Xanthan Gum, Tocopherol, Citric Acid, Phenoxyethanol, Ethylhexylglycerin',
  },
  {
    barcode: '3600542525701',
    name: 'Crème nutritive parfumée',
    brand: 'Exemple B',
    category: 'leave_on_face',
    inciList:
      'Aqua, Paraffinum Liquidum, Glycerin, Alcohol Denat, Cetearyl Alcohol, Dimethicone, ' +
      'Parfum, Linalool, Limonene, Geraniol, Disodium EDTA, Phenoxyethanol',
  },
  {
    barcode: '8436097096367',
    name: 'Sérum niacinamide 10 %',
    brand: 'Exemple C',
    category: 'leave_on_face',
    inciList:
      'Aqua, Niacinamide, Glycerin, Pentylene Glycol, Zinc PCA, Xanthan Gum, ' +
      'Allantoin, Phenoxyethanol, Ethylhexylglycerin',
    claims: [{ inci: 'niacinamide', percent: 10 }],
  },
  {
    barcode: '5060489794208',
    name: 'Sérum éclat à la niacinamide',
    brand: 'Exemple D',
    category: 'leave_on_face',
    inciList:
      'Aqua, Glycerin, Butylene Glycol, Xanthan Gum, Phenoxyethanol, ' +
      'Ethylhexylglycerin, Niacinamide, Centella Asiatica Extract',
  },
  {
    barcode: '3337875598033',
    name: 'Soin apaisant peaux réactives',
    brand: 'Exemple E',
    category: 'leave_on_face',
    inciList:
      'Aqua, Glycerin, Squalane, Butyrospermum Parkii Butter, Panthenol, Bisabolol, ' +
      'Centella Asiatica Extract, Allantoin, Ceramide NP, Xanthan Gum, Tocopherol, ' +
      'Sodium Levulinate, Sodium Phytate',
  },
  {
    barcode: '3282770100846',
    name: 'Fluide matifiant peaux grasses',
    brand: 'Exemple F',
    category: 'leave_on_face',
    inciList:
      'Aqua, Niacinamide, Propanediol, Silica, Sodium Hyaluronate, Zinc PCA, ' +
      'Salicylic Acid, Tapioca Starch, Sodium Polyacrylate, Hydroxyacetophenone, Phenoxyethanol',
    claims: [{ inci: 'niacinamide', percent: 5 }],
  },
];

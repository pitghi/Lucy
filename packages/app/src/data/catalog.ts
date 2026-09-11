import type { Product } from '@lucy/engine';

/**
 * Catalogue de demonstration.
 *
 * Produits reels, issus d'Open Beauty Facts : nom, marque, code-barres et
 * liste INCI viennent tous de la meme fiche. La photo affichee correspond donc
 * au produit decrit — ce qui n'etait pas le cas tant que le catalogue etait
 * anonymise avec de vrais codes-barres tires au hasard.
 *
 * Genere par `packages/engine/scripts/build-catalog.ts`. Ne pas modifier a la
 * main : relancer le script, dont les criteres de selection sont documentes.
 *
 * Ce que ce choix engage (decision 6.1) : une note portee sur un produit
 * identifiable ouvre le droit de reponse de la marque. Acceptable sur un jeu
 * de developpement ; a ne pas publier tel quel avant que la methodologie et la
 * procedure de contestation soient en place.
 *
 * Donnees sous licence ODbL (Open Beauty Facts), base contributive : une
 * liste peut etre incomplete ou datee par rapport a l'emballage actuel.
 */
export const DEMO_CATALOG: Product[] = [
  {
    barcode: '3282779348850',
    name: 'Crème peaux intolérantes',
    brand: 'Avène',
    category: 'leave_on_face',
    // 12 ingredients, 83 % resolus par le referentiel
    inciList:
      'AVENE THERMAL SPRING WATER (AVENE AQUA), MINERAL OIL (PARAFFINUM LIQUIDUM), GLYCERIN, GLYCERYL STEARATE, SQUALANE, CYCLOPENTASILOXANE, CYCLOHEXASILOXANE, SERINE, CARBOMER, TETRASODIUM EDTA, TRIETHANOLAMINE, WATER (AQUA).',
  },
  {
    barcode: '3662217004867',
    name: 'Crème visage et corps',
    brand: 'avril',
    category: 'leave_on_face',
    // 19 ingredients, 84 % resolus par le referentiel
    inciList:
      'AQUA (WATER), CAPRYLIC/CAPRIC TRIGLYCERIDE, CETYL LACTATE COCO-CAPRYLATE/CAPRATE, CETEARYL ALCOHOL, GLYCERYL STEARATE SE, GLYCERYL CAPRYLATE, BUTYROSPERMUM PARKII (SHEA) BUTTER*, ALOE BARBADENSIS LEAF JUICE POWDER*, GLYCERIN, CETEARYL GLUCOSIDE, XANTHAN GUM, TOCOPHEROL, LEVULINIC ACID, SODIUM LEVULINATE, LACTIC ACID, SODIUM CITRATE, SODIUM BENZOATE, PARFUM (FRAGRANCE). *Ingrédients issus de l\'Agriculture Biologique 99% du total est d\'origine naturelle 21% du total des ingrédients sont issus de l\'Agriculture Biologique',
  },
  {
    barcode: '26023717',
    name: 'Anti-âge Soin de jour Q10 Active',
    brand: 'Biocura',
    category: 'leave_on_face',
    // 48 ingredients, 83 % resolus par le referentiel
    inciList:
      'AQUA, ALOE BARBADENSIS LEAF JUICE, GLYCERIN, ETHYLHEXYL SALICYLATE, DICAPRYLYL CARBONATE, CETEARYL ALCOHOL, SUCROSE POLYSTEARATE, DIETHYLHEXYL ADIPATE, SORBITOL, TOCOPHERYL ACETATE, CYCLOPENTASILOXANE, PANTHENOL, NIACINAMIDE, BUTYL METHOXYDIBENZOYLMETHANE, MYRISTYL MYRISTATE, SIMMONDSIA CHINENSIS SEED OIL, GLYCERYL STEARATE, CYCLOHEXASILOXANE, SODIUM STEAROYL GLUTAMATE, C12-15 ALKYL BENZOATE, AVENAS STRIGOSA SEED EXTRACT, HYDROLYZED SOY PROTEIN, HYDROLYZED WHEAT PROTEIN, TRIPEPTIDE-1, GLYCERYL OLEATE, LECITHIN, BUTYLENE GLYCOL, SODIUM HYALURONATE, PROPANEDIOL, TETRASODIUM EDTA, ASCORBYL PALMITATE, DIMETHYLMETHOXY CHROMANOL, TOCOPHEROL, UBIQUINONE, ALCOHOL DENAT., CAPRYLYL GLYCOL, XANTHAN GUM, CARBOMER, SODIUM HYDROXIDE, CITRIC ACID, PARFUM, CITRONELLOL, LINALOOL, GERANIOL, HYDROXYCITRONELLAL, PHENOXYETHANOL, BENZYL ALCOHOL, POTASSIUM SORBATE',
  },
  {
    barcode: '20283131',
    name: 'Crème de jour anti-rides Q10',
    brand: 'Cien',
    category: 'leave_on_face',
    // 47 ingredients, 89 % resolus par le referentiel
    inciList:
      'Aqua, Glycerin, Dibutyl Adipate, Cetearyl Alcohol, Propylheptyl Caprylate, Dicaprylyl Carbonate, Titanium Dioxide (Nano), Sodium Acrylate/ Sodium Acryloyldimethyl Taurate Copolymer, Phenoxyethanol, Dimethicone, Polyisobutene, Panthenol, Butyrospermum Parkii Butter, Palmitic Acid, Parfum, Stearic Acid, Tocopheryl Acetate, Disodium EDTA, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Ethylhexyl Triazone, Sodium Hydroxide, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Sodium Anisate, Sodium Levulinate, Allantoin, Ethylparaben, Methylparaben, Silica, Benzoic Acid, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Caffeine, Dehydroacetic Acid, Caprylyl/Capryl Glucoside, Ubiquinone, Sodium Hyaluronate, Panicum Miliaceum Extract, Limonene, Linalool, Chlorella Vulgaris/Lupinus Albus Protein Ferment, Alcohol Denat, Benzyl Benzoate, Geraniol, Citronellol, Tocopherol, Tannic Acid, Coleus Forskohlii Root Extract, Potassium Sorbate',
  },
  {
    barcode: '20057060',
    name: 'Crème pour la peau Classic',
    brand: 'Cien',
    category: 'leave_on_face',
    // 23 ingredients, 83 % resolus par le referentiel
    inciList:
      'Aqua, Isopropyl Palmitate, Glycerin, Glycine Soja Oil, Polyglyceryl-3 Polyricinoleate, Cera Alba, Zinc Stearate, Polyglyceryl-3 Diisostearate, Phenoxyethanol, Magnesium Sulfate, Parfum, Prunus Amygdalus Dulcis Oil, Sodium Benzoate, Tocopheryl Acetate, Potassium Sorbate, Benzoic Acid, Dehydroacetic Acid, Limonene, Linalool, Citric Acid, Benzyl Benzoate, Geraniol, Citronellol',
  },
  {
    barcode: '3511720118915',
    name: 'Ayana crème nuit parfum fleur de cerisier',
    brand: 'Du monde à la provence',
    category: 'leave_on_face',
    // 28 ingredients, 89 % resolus par le referentiel
    inciList:
      'aqua, vitis vinifera seed oil, butyrospermum parkii butter, isopropyl myristate, cetyl alcohol, glyceryl stearate, PEG-100 stearate, oenothera biennis oil, cocos nucifera oil, sodium PCA, sorbitol, helianthus annuus seed oil, rosmarinus officinalis leaf extract, tocopheryl acetate, helichrysum angustifolium flower oil, benzyl alcohol, cetearyl alcohol, parfum, polyacrylamide, xanthan gum, C13-14 isoparaffin, ceteareth-33, ethylhexylglycerin, laureth-7, hexyl cinnamal, butylphenyl methylproponal, citric acid, limonene.',
  },
  {
    barcode: '5900525062789',
    name: 'Hada Labo Tokyo Super Moisturizer Sun Lotion SPF50',
    brand: 'Hada Labo Tokyo',
    category: 'leave_on_face',
    // 26 ingredients, 88 % resolus par le referentiel
    inciList:
      'Aqua, Ethylhexyl Methoxycinnamate, Butylene Glycol, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol (nano), Diethylamino Hydroxybenzoyl Hexyl Benzoate, Triethylhexanoin, Glycerin, Hydroxyethyl Acrylate/Sodium Acryloyldimethyl Taurate Copolymer, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sorbitan Sesquioleate, Panthenol, Xanthan Gum, Sodium Acetylated Hyaluronate, Alcohol, Decyl Glucoside, Propylene Glycol, Squalane, Polysorbate 60, Sorbitan Isostearate, Disodium EDTA, Propanediol, Caprylhydroxamic Acid, BHT, Phenoxyethanol, Ethylhexylglycerin',
  },
  {
    barcode: '3600551156699',
    name: 'Crème anti-taches - vitamine c + niacinamide',
    brand: 'LASCAD',
    category: 'leave_on_face',
    // 43 ingredients, 79 % resolus par le referentiel
    inciList:
      'AQUA / WATER, GLYCERIN, ETHYLHEXYL SALICYLATE, NIACINAMIDE, DIMETHICONE, ISOPROPYL MYRISTATE, PENTYLENE GLYCOL, C12-15 ALKYL BENZOATE, OCTYLDODECANOL, ISOPROPYL ISOSTEARATE, SQUALANE, BEHENYL ALCOHOL, PHENYLBENZIMIDAZOLE SULFONIC ACID, AMMONIUM POLYACRYLOYLDIMETHYL TAURATE, ETHYLHEXYL TRIAZONE, BUTYL METHOXYDIBENZOYLMETHANE, STEARIC ACID, TITANIUM DIOXIDE [NANO] / TITANIUM DIOXIDE, CARBOMER, DIMETHICONOL, CETEARYL ALCOHOL, CETEARYL, GLUCOSIDE, PEG-100 STEARATE, SODIUM HYDROXIDE, MYRISTIC ACID, PALMITIC ACID, ALUMINA, ASCORBYL GLUCOSIDE, AMMONIUM ACRYLOYLDIMETHYLTAURATE/STEARETH-25 METHACRYLATE, CROSSPOLYMER, BORON NITRIDE, DISODIUM STEAROYL GLUTAMATE, HYDROXYACETOPHENONE, CAPRYLOYL SALICYLIC ACID, CAPRYLYL GLYCOL, CITRIC ACID, BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE, TRISODIUM ETHYLENEDIAMINE DISUCCINATE, PANTHENOL, CETYL ALCOHOL, TOCOPHERYL ACETATE, PARFUM',
  },
  {
    barcode: '3600551020419',
    name: 'La Crème des peaux extra-sèches',
    brand: 'Mixa',
    category: 'leave_on_face',
    // 19 ingredients, 79 % resolus par le referentiel
    inciList:
      'Eau, glycérine, palmitate d\'isopropyle (isopropyl palmitate), alcool cétéarylique (cetearyl alcohol), propanediol, glyceril stearate, diméthicone, esters de cétyle, huile d\'amande douce (Prunus amygdalus dulcis), huile de noyau d\'abricot (Prunus armeniaca), beurre de karité (Butyrospermum parkii), allantoïne, PEG-100 stearate, ammonium polyacryloyldimethyl taurate, hydroxyacetophenone, caprylyl glycol, acide citrique, gomme xanthane, parfum (FIL Z280662/1).',
  },
  {
    barcode: '3574661287201',
    name: 'Hydro Boost Aqua-Gel',
    brand: 'Neutrogena',
    category: 'leave_on_face',
    // 21 ingredients, 95 % resolus par le referentiel
    inciList:
      'Aqua, Dimethicone, Glycerin, Dimethicone/Vinyl Dimethicone Crosspolymer, Sodium Hyaluronate, Ethylhexylglycerin, Dimethiconol, Cetearyl Olivate, Sorbitan Olivate, Laureth-7, C12-14 Pareth-12 Polyacrylamide, Dimethicone Crosspolymer, Carbomer, C13-14 Isoparaffin, Sodium Hydroxide, Phenoxyethanol, Chlorphenesin, Methylparaben, Benzoic Acid, Parfum, CI 42090',
  },
  {
    barcode: '4005900419453',
    name: 'Q10 plus C Anti-rides + Energie',
    brand: 'Nivea',
    category: 'leave_on_face',
    // 33 ingredients, 91 % resolus par le referentiel
    inciList:
      'Aqua, Glycerin, Butyrospermum Parkii Butter, Methylpropanediol, Ascorbic Acid, Cetearyl Alcohol, Dicaprylyl Ether, C12-15 Alkyl Benzoate, Tapioca Starch, Glyceryl Stearate, Panthenol, Ubiquinone, Creatine, 1-Methylhydantoin-2-Imide, Caprylic/Capric Triglyceride, Sodium Stearoyl Glutamate, Dimethicone, Xanthan Gum, Carbomer, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Potassium Phosphate, Sodium Chloride, Diethylhexyl Syringylidenemalonate, Trisodium EDTA, Sodium Hydroxide, Phenoxyethanol, Linalool, Limonene, Benzyl Alcohol, Citronellol, Alpha-Isomethyl lonone, Geraniol, Parfum',
  },
  {
    barcode: '4005900525017',
    name: 'NIVEA Anti-Wrinkle + Firming Day Cream 45+',
    brand: 'Nivea',
    category: 'leave_on_face',
    // 24 ingredients, 96 % resolus par le referentiel
    inciList:
      'Aqua, Glycerin, Butyrospermum Parkii Butter, Cetearyl Alcohol, Ethylhexyl Salicylate, Methylpropanediol, Alcohol Denat., Glyceryl Stearate SE, Butyl Methoxydibenzoylmethane, Octocrylene, C12-15 Alkyl Benzoate, Caprylic/Capric Triglyceride, Hydrogenated Coco-Glycerides, Phenylbenzimidazole Sulfonic Acid, Prunus Armeniaca Kernel Oil, Tocopheryl Acetate, Ubiquinone, Carbomer, Xanthan Gum, Trisodium EDTA, Ethylhexylglycerin, Sodium Hydroxide, Phenoxyethanol, Parfum',
  },
  {
    barcode: '4743318143293',
    name: 'Sunscreen peach + antioxidant day face cream SPF 30 for oily skin',
    brand: 'Organic shop',
    category: 'leave_on_face',
    // 29 ingredients, 86 % resolus par le referentiel
    inciList:
      'Aqua, Coco-Caprylate/Caprate, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Ethylhexyl Salicylate, C12-15 Alkyl Benzoate, Ethylhexyl Triazone, Glyceryl Stearate, Cetearyl Alcohol, Bis-Ethylhexyloxyphenol Glucoside, Cetearyl Methoxyphenyl Triazine, Glycerin, Sodium Stearoyl Glutamate, Prunus Persica Fruit Extract*, Zinc PCA, Panthenol, Bisabolol, Tocopherol, Retinyl Palmitate, Niacinamide, Lactic Acid, Xanthan Gum, Citric Acid, Ethylhexylglycerin, Benzyl Alcohol, Dehydroacetic Acid, Sodium Benzoate, Potassium Sorbate, Parfum. (*) - Ingredients from organic farming.',
  },
  {
    barcode: '5060879821989',
    name: 'Vitamin B, C and E moisturizer',
    brand: 'The Inkey List',
    category: 'leave_on_face',
    // 23 ingredients, 100 % resolus par le referentiel
    inciList:
      'Water, Glycerin, Glyceryl Stearate SE, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Cocos Nucifera (Coconut) Oil, Stearic Acid, Phenoxyethanol, Benzyl Alcohol, Carbomer, Sodium Hydroxide, Niacinamide, Panthenol, Sodium Ascorbyl Phosphate, Sodium Hyaluronate, Tocopheryl Acetate, Ethylhexylglycerin, Dehydroacetic Acid, Lecithin, Trisodium Ethylenediamine Disuccinate, Ascorbyl Palmitate, Tocopherol, Helianthus Annuus (Sunflower) Seed Oil',
  },
];

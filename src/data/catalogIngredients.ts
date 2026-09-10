// Catálogo completo de ingredientes importados de la tabla proporcionada
export interface CatalogItem {
  nameES: string;
  purchasePrice: number;
  costPerUnit: number;
  wastePercentage: number;
  unit: 'kg' | 'L' | 'g' | 'ud';
  purchaseFormat?: string;
  provider?: string;
  category: string;
  allergens: string[];
}

export const CATALOG_INGREDIENTS: CatalogItem[] = [
  {
    "nameES": "Acelgas",
    "purchasePrice": 0.7,
    "costPerUnit": 0.7,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Miel de abeja",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Botes",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Aguacates",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Ajos",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Achicoria",
    "purchasePrice": 2.06,
    "costPerUnit": 2.06,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Chipirones",
    "purchasePrice": 25,
    "costPerUnit": 25,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Millo dulce lata 3 Kg",
    "purchasePrice": 1.4,
    "costPerUnit": 1.4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Ajetes tiernos",
    "purchasePrice": 7.7,
    "costPerUnit": 7.7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Albahaca",
    "purchasePrice": 4.5,
    "costPerUnit": 4.5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Alcachofas",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Apio",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Azafrán",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Batata amarilla",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Batata blanca",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Berenjenas",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Berros",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Beterrada",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Bolsa de canónigos",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Bolsa mezclum",
    "purchasePrice": 1.4,
    "costPerUnit": 1.4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Brocoli",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Calabacín",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Calabaza",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Cardos",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Castañas",
    "purchasePrice": 1,
    "costPerUnit": 1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Cebolla",
    "purchasePrice": 4.6,
    "costPerUnit": 4.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Cebolla roja",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Cebolleta",
    "purchasePrice": 1.6,
    "costPerUnit": 1.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Cebollino",
    "purchasePrice": 1.2,
    "costPerUnit": 1.2,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Chalotas",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Champiñon laminado",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bandeja",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Champiñones enteros",
    "purchasePrice": 1.6,
    "costPerUnit": 1.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Cilantro",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Cogollos tudela",
    "purchasePrice": 0.4,
    "costPerUnit": 0.4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Col blanca",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Col roja",
    "purchasePrice": 1.4,
    "costPerUnit": 1.4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Coliflor",
    "purchasePrice": 1.7,
    "costPerUnit": 1.7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Dátiles",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Endivias",
    "purchasePrice": 1.6,
    "costPerUnit": 1.6,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bandeja",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Eneldo",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Escarola",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Escarola rizada",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Espárragos",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Espárragos trigueros",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Espinacas",
    "purchasePrice": 0.4,
    "costPerUnit": 0.4,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Estragón",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Frambuesas",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Fresas",
    "purchasePrice": 0.3,
    "costPerUnit": 0.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Fresones",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Granadas",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Grosellas",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Guayabos",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Guindilla fresca",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Guisantes",
    "purchasePrice": 0.5,
    "costPerUnit": 0.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Habichuelas",
    "purchasePrice": 4.5,
    "costPerUnit": 4.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Hierbahuerto",
    "purchasePrice": 5.2,
    "costPerUnit": 5.2,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Higos",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Higos secos",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Hinojo",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Hoja de roble",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Jengibre",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Judias pintas",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Kiwis",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Lechuga iceberg",
    "purchasePrice": 1,
    "costPerUnit": 1,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Lechuga lollo rosso",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Lechuga romana",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Limas",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Limones",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Maíz dulce",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Mandarinas",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Manga/o",
    "purchasePrice": 1.6,
    "costPerUnit": 1.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Manzanas golden",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Manzanas reineta",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Manzanas Royal Gala",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Melon amarillo",
    "purchasePrice": 1.6,
    "costPerUnit": 1.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Melon cantaloup",
    "purchasePrice": 1.2,
    "costPerUnit": 1.2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Melon verde",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Menta fresca",
    "purchasePrice": 1,
    "costPerUnit": 1,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Moras",
    "purchasePrice": 1.3,
    "costPerUnit": 1.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Nabos",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Nabos Chinos",
    "purchasePrice": 0.4,
    "costPerUnit": 0.4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Naranjas",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Ñame",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Ñoras",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bolsa",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Papas arrugar",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Papas normales",
    "purchasePrice": 2.7,
    "costPerUnit": 2.7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Papaya",
    "purchasePrice": 0.75,
    "costPerUnit": 0.75,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Pepinos",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Peras",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Perejil",
    "purchasePrice": 1.1,
    "costPerUnit": 1.1,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Perejil rizado",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Pies de apio",
    "purchasePrice": 1.64,
    "costPerUnit": 1.64,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Pimienta",
    "purchasePrice": 1.3,
    "costPerUnit": 1.3,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bolsa",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Pimiento amarillo",
    "purchasePrice": 0.4,
    "costPerUnit": 0.4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Pimiento rojo",
    "purchasePrice": 0.6,
    "costPerUnit": 0.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Pimiento verde",
    "purchasePrice": 0.3,
    "costPerUnit": 0.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Piña millo",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Piña tropical madura",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Plátanos",
    "purchasePrice": 1.56,
    "costPerUnit": 1.56,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Pomelos",
    "purchasePrice": 2.4,
    "costPerUnit": 2.4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Puerros",
    "purchasePrice": 1.6,
    "costPerUnit": 1.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Rábanos",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Radicchio",
    "purchasePrice": 1,
    "costPerUnit": 1,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Remolacha cocida",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Remolacha cruda",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Romero",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Rúcula",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Salvia",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Sandía",
    "purchasePrice": 1.1,
    "costPerUnit": 1.1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Setas granel en cajas",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Tomate Cherry",
    "purchasePrice": 1.52,
    "costPerUnit": 1.52,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Tomate ensalada",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Tomate salsa",
    "purchasePrice": 1.3,
    "costPerUnit": 1.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Tomillo fresco",
    "purchasePrice": 1.1,
    "costPerUnit": 1.1,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Manojos",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Tunos indios",
    "purchasePrice": 1.6,
    "costPerUnit": 1.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Uva blanca",
    "purchasePrice": 1.1,
    "costPerUnit": 1.1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Uva roja",
    "purchasePrice": 1.1,
    "costPerUnit": 1.1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Zanahoria",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Verduras",
    "category": "Verduras",
    "allergens": []
  },
  {
    "nameES": "Bacón Barra",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Bondiola",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Carne cerdo molida",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Carne molida mixta",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Carrillera cerdo ibérico",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Carrilleras de vaca",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Chorizo asturiano",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Chorizo de teror \"los nueces\"",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Chorizo pequeños comida",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Chorizo revilla",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Chuletas cerdo",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Chuletas cordero",
    "purchasePrice": 5.5,
    "costPerUnit": 5.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Codorniz",
    "purchasePrice": 4.5,
    "costPerUnit": 4.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Conejos",
    "purchasePrice": 13.9,
    "costPerUnit": 13.9,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Cordero",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Cordero Paletilla",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Cordero Pierna",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Costillar de cerdo",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Costillas saladas de cerdo",
    "purchasePrice": 7,
    "costPerUnit": 7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Cuadril",
    "purchasePrice": 6.5,
    "costPerUnit": 6.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Entrecot Congelado",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Falda de Ternera",
    "purchasePrice": 1,
    "costPerUnit": 1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Garrón",
    "purchasePrice": 4.5,
    "costPerUnit": 4.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Hígado de cerdo",
    "purchasePrice": 7,
    "costPerUnit": 7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Hígado de pollo congelado",
    "purchasePrice": 2.6,
    "costPerUnit": 2.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Hígado de vaca",
    "purchasePrice": 4.5,
    "costPerUnit": 4.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Huesos ternera",
    "purchasePrice": 7,
    "costPerUnit": 7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Jamón cocido (barra)",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Jamón serrano",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Lomo de cerdo",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Magret de pato",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Manitas de cerdo",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Morcilla asturiana",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Morcilla de burgos",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Morcillas dulces",
    "purchasePrice": 4.5,
    "costPerUnit": 4.5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Muslo de pollo",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Muslo de pollo deshuesado",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Osso-buco",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Palomita",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Pechuga de pollo",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Picantón",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Pollo entero",
    "purchasePrice": 1.2,
    "costPerUnit": 1.2,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Redondo de ternera",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Sobrasada",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Solomillo cerdo",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Solomillo res",
    "purchasePrice": 3.5,
    "costPerUnit": 3.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Carnes",
    "category": "Carnes",
    "allergens": []
  },
  {
    "nameES": "Almeja fresca",
    "purchasePrice": 5.5,
    "costPerUnit": 5.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Atún",
    "purchasePrice": 5.5,
    "costPerUnit": 5.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Bacalao",
    "purchasePrice": 5.5,
    "costPerUnit": 5.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Bonito",
    "purchasePrice": 5.5,
    "costPerUnit": 5.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Caballas",
    "purchasePrice": 5.5,
    "costPerUnit": 5.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Calamares",
    "purchasePrice": 5.5,
    "costPerUnit": 5.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Cherne",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Cherne salado",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Choco sucio",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Doradas",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Espinas, cabezas",
    "purchasePrice": 7,
    "costPerUnit": 7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Filete Fogonero",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Gambón L2",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Langostinos nº 4",
    "purchasePrice": 3.5,
    "costPerUnit": 3.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Lenguado",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Lubina",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Mejillónes",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Merluza",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Palitos cangrejo",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Pulpo",
    "purchasePrice": 4.25,
    "costPerUnit": 4.25,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Rape",
    "purchasePrice": 7,
    "costPerUnit": 7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Salmón ahumado",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Samas",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Sardinas",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Tollos",
    "purchasePrice": 3.5,
    "costPerUnit": 3.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Ventresca de atún",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pescados",
    "category": "Pescados",
    "allergens": []
  },
  {
    "nameES": "Aceite de coco",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Aceite de oliva",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Aceite de oliva virgen extra",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Aceite de semillas",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Aceitunas negras 2.5 Kg",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Aceitunas verdes",
    "purchasePrice": 3.5,
    "costPerUnit": 3.5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Alcachofas TROCEADAS 3 Kg",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Alcaparras",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Amaretto",
    "purchasePrice": 0.15,
    "costPerUnit": 0.15,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Anchoas",
    "purchasePrice": 0.15,
    "costPerUnit": 0.15,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Anchoas lata pequeña",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Anís (botella)",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Arroz basmati",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Arroz bomba",
    "purchasePrice": 6.7,
    "costPerUnit": 6.7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Arroz grano corto",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Arroz grano largo",
    "purchasePrice": 1.55,
    "costPerUnit": 1.55,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Arroz grano redondo",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Arroz integral",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Atún en lata grandes",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Avellanas",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Azafran en hebras",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Azúcar",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Azúcar moreno",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Cachaza (aguardiente de caña)",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Café en grano Natural",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Canelones",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Cebollita francesa",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Cerveza de lata",
    "purchasePrice": 31,
    "costPerUnit": 31,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Champiñones laminados lata grande",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Coditos de pasta",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Coñac",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Botella",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Brandy",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Botella",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Cous cous",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Cuña parmesano",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Espaguettis",
    "purchasePrice": 1.1,
    "costPerUnit": 1.1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Esparragos blancos",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Lata",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Fideos gruesos para fideua",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Galletas María paq. 1,8 kg",
    "purchasePrice": 1.2,
    "costPerUnit": 1.2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Garbanzos",
    "purchasePrice": 8.5,
    "costPerUnit": 8.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Gofio de millo ( la piña amarilla)",
    "purchasePrice": 1.2,
    "costPerUnit": 1.2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Gofio de Trigo",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Harina",
    "purchasePrice": 1,
    "costPerUnit": 1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Harina de arepas",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Huevos",
    "purchasePrice": 1.4,
    "costPerUnit": 1.4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Huevos de codorniz",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Judiones de la granja",
    "purchasePrice": 1.4,
    "costPerUnit": 1.4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Lasaña",
    "purchasePrice": 30,
    "costPerUnit": 30,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Lata de piquillo pequeña",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Lata pimientos morrones",
    "purchasePrice": 1.8,
    "costPerUnit": 1.8,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Leche",
    "purchasePrice": 1.2,
    "costPerUnit": 1.2,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Leche de coco",
    "purchasePrice": 1.2,
    "costPerUnit": 1.2,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Lentejas",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Macarrones / plumas",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Mahonesa",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Mantequilla pascual o similar",
    "purchasePrice": 0.4,
    "costPerUnit": 0.4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Melocotón en almibar 3Kg",
    "purchasePrice": 0.4,
    "costPerUnit": 0.4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Mostaza Antigua (bote pequeño)",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Mostaza Dijon (bote pequeño)",
    "purchasePrice": 1.4,
    "costPerUnit": 1.4,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Mostaza dulce (bote pequeño)",
    "purchasePrice": 1.4,
    "costPerUnit": 1.4,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Nata para cocinar",
    "purchasePrice": 1.4,
    "costPerUnit": 1.4,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Oporto",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pan de molde grande",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pan rallado",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pasta Brick",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pepinillos",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pera en Almíbar",
    "purchasePrice": 2.4,
    "costPerUnit": 2.4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pernod",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pimentón dulce",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pimienta cayena bote",
    "purchasePrice": 7.5,
    "costPerUnit": 7.5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bote",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Piña en su jugo 1 Kg",
    "purchasePrice": 6.93,
    "costPerUnit": 6.93,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pulco",
    "purchasePrice": 6.09,
    "costPerUnit": 6.09,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso ahumado",
    "purchasePrice": 3.65,
    "costPerUnit": 3.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso Camembert",
    "purchasePrice": 3.7,
    "costPerUnit": 3.7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso crema natural cubo 5kg",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso de barra",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso Edam Barra",
    "purchasePrice": 2.3,
    "costPerUnit": 2.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso Feta",
    "purchasePrice": 2.1,
    "costPerUnit": 2.1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso Mascarpone",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso philadelfia",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso rulo cabra",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso semi",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Queso tierno",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Ron blanco",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Ron dorado",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Sal fina",
    "purchasePrice": 1.2,
    "costPerUnit": 1.2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Sal gruesa",
    "purchasePrice": 4,
    "costPerUnit": 4,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Salsa de ostras",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Salsa HP",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Salsa perrins",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Salsa soja Kikoman",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Salsa teriyaki",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Sémola de trigo",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Soda ( La Casera)",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Tabasco",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Tinta Calamar 20 Paquetitos",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Tomate frito lata 3 kg",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Tomate Ketchup",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Tomate triturado 5Kg",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Ventresca de atún lata",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Vinagre corriente",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Vinagre de estragón (500 ml)",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Vinagre de modena pequeña",
    "purchasePrice": 1,
    "costPerUnit": 1,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Vinagre de vino tinto reserva",
    "purchasePrice": 0.7,
    "costPerUnit": 0.7,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Vino blanco (tetra brick)",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Vino dulce",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Vino tinto tetra brik",
    "purchasePrice": 0.8,
    "costPerUnit": 0.8,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Zumo de piña",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Zumo de pomelo",
    "purchasePrice": 0.9,
    "costPerUnit": 0.9,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Arándanos congelados (125 gr)",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Brócoli congelado",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Cerezas congeladas",
    "purchasePrice": 3.1,
    "costPerUnit": 3.1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Espinacas congeladas",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Frambuesas congeladas",
    "purchasePrice": 4.2,
    "costPerUnit": 4.2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Fresas congeladas",
    "purchasePrice": 3.1,
    "costPerUnit": 3.1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Frutas del bosque congeladas",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Frutos exóticos congelados",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Grosellas congelados (125gr)",
    "purchasePrice": 3.3,
    "costPerUnit": 3.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Guisantes congelados",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Habichuelas congeladas",
    "purchasePrice": 0.95,
    "costPerUnit": 0.95,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Maíz congelado",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Mango congelado",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Menestra verduras congelada",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Moras congeladas",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Obleas para empanadillas",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Piña congelada",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pulpa de fresa",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Pulpa de maracuyá",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de albaricoque",
    "purchasePrice": 6.63,
    "costPerUnit": 6.63,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de calabaza",
    "purchasePrice": 2.65,
    "costPerUnit": 2.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de castaña vainilla",
    "purchasePrice": 1.9,
    "costPerUnit": 1.9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de cereza negra",
    "purchasePrice": 2.7,
    "costPerUnit": 2.7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de coco",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de frutos rojos",
    "purchasePrice": 2.6,
    "costPerUnit": 2.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de grosella negra",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de guayaba",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de higo chumbo",
    "purchasePrice": 9.6,
    "costPerUnit": 9.6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de jengibre",
    "purchasePrice": 1.5,
    "costPerUnit": 1.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de kiwi",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de lichi",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de limón",
    "purchasePrice": 1,
    "costPerUnit": 1,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de mandarina",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de mango",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de melocotón",
    "purchasePrice": 7,
    "costPerUnit": 7,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de melón",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de mora",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de papaya",
    "purchasePrice": 3.3,
    "costPerUnit": 3.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de pera",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de plátano",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de sandía",
    "purchasePrice": 11,
    "costPerUnit": 11,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Puré de yuzu",
    "purchasePrice": 15,
    "costPerUnit": 15,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Zanahorias congeladas",
    "purchasePrice": 5.2,
    "costPerUnit": 5.2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Economato",
    "category": "Economato",
    "allergens": []
  },
  {
    "nameES": "Agua",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Agua de azahar",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Almendra entera pelada",
    "purchasePrice": 7.21,
    "costPerUnit": 7.21,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Almendra fileteada",
    "purchasePrice": 4.3,
    "costPerUnit": 4.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Almendra granillo",
    "purchasePrice": 4.3,
    "costPerUnit": 4.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Almidón de Maíz",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Amapola",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Avellanas peladas",
    "purchasePrice": 3.5,
    "costPerUnit": 3.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Azúcar glass",
    "purchasePrice": 4.3,
    "costPerUnit": 4.3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Azúcar glass antihumedad",
    "purchasePrice": 3.5,
    "costPerUnit": 3.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Azúcar invertido",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Bicarbonato",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Blondas y bandejas",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Brillo neutro",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Cacao en polvo",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Canela en polvo",
    "purchasePrice": 30,
    "costPerUnit": 30,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Canela en rama",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Cereales tipo corn flakes",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Ciruelas pasas",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Cobertura blanca",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Cobertura con leche",
    "purchasePrice": 3.5,
    "costPerUnit": 3.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Cobertura negra",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Coco rallado",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Dulce de leche",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Esencia de vainilla",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Fruta escarchada picada",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Gel de manzana",
    "purchasePrice": 8,
    "costPerUnit": 8,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Gel neutro",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Gelatina \"calidad oro\"",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Glucosa",
    "purchasePrice": 5.2,
    "costPerUnit": 5.2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Gotas chocolate esp. Horno",
    "purchasePrice": 10,
    "costPerUnit": 10,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Guindas rojas confitadas",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Guindas verdes confitadas",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina gran fuerza",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina integral",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina de Almendra",
    "purchasePrice": 6,
    "costPerUnit": 6,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina de arroz",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina de centeno",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina de Espelta",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina de malta",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina floja",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina fuerte",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina panificable",
    "purchasePrice": 2.5,
    "costPerUnit": 2.5,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Harina sin gluten",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Helado de fresa",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Helado de vainilla",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Hielo en cubitos",
    "purchasePrice": 12,
    "costPerUnit": 12,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Huevo Clara Pasteurizada",
    "purchasePrice": 1.89,
    "costPerUnit": 1.89,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Huevo Entero Pasteurizado",
    "purchasePrice": 0.76,
    "costPerUnit": 0.76,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Huevo Yema Pasteurizada",
    "purchasePrice": 5,
    "costPerUnit": 5,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Impulsor Químico",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Leche condensada",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Leche en polvo La irlandesa",
    "purchasePrice": 0.2,
    "costPerUnit": 0.2,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Levadura prensada panaderia",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Levadura seca panaderia",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Licor de anís",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Maicena",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Mangas desechables",
    "purchasePrice": 2,
    "costPerUnit": 2,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Manteca de cerdo",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Mantequilla",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Margarina",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Margarina de hojaldre",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Matalauva",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Mejorante panario",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Mermelada albaricoque",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Mermelada arandanos",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Miel de palma",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Nata Animal 35%",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Nata mix",
    "purchasePrice": 0,
    "costPerUnit": 0,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Nata vegetal 35%",
    "purchasePrice": 3,
    "costPerUnit": 3,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Nueces macadamia",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Nueces peladas",
    "purchasePrice": 9,
    "costPerUnit": 9,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Orejones",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Papel sulfurizado",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Pasas sin semillas",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Pasta turrón líquido",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Pastelería",
    "category": "Pastelería",
    "allergens": []
  },
  {
    "nameES": "Piñones",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Pistachos pelados",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Platos y rodales",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Queso parmesano",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Semilla girasol",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "L",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Sesamo crudo",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Sesamo negro",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Suspiros Moya",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Te rojo paquete pequeño",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "25 Ud.",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Te verde paquete pequeño",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "25 Ud.",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Uvas Pasas sin semillas",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "g",
    "purchaseFormat": "Gramos",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Vainilla",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Vainilla líquida",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Vainillina molida bote 1 Kg",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Yogur Natural sin azúcar",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "kg",
    "provider": "Frutas",
    "category": "Frutas",
    "allergens": []
  },
  {
    "nameES": "Abrillantador automáticas",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Biberones",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "3 Ud.",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Bobina de Papel 1500 usos",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bobina",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Bobina de papel 400 usos",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Bobina",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Bolsas basura grandes",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Rollo",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Capsulas Para Magdalenas",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "purchaseFormat": "Paquete",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Desengrasante",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Detergente vajillas manual",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Film Transparente 60 cm. Largo",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Lavavajillas automáticas",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Lejía",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Lejía alimentaria",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Papel antigrasa para envolver",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Sosa cáustica",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  },
  {
    "nameES": "Tuppers desechables",
    "purchasePrice": 1.65,
    "costPerUnit": 1.65,
    "wastePercentage": 0,
    "unit": "ud",
    "provider": "Varios",
    "category": "Varios",
    "allergens": []
  }
];

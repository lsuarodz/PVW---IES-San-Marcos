export interface Ingredient {
  id: string;
  nameES: string;
  nameEN: string;
  provider: string;
  purchaseFormat?: string;
  weightPerUnit?: number;
  formatPrice?: number;
  costPerUnit: number;
  purchasePrice?: number;
  unit: string;
  wastePercentage: number;
  allergens: string[];
  createdBy: string;
  createdAt: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  nameES: string;
  nameEN: string;
  descriptionES: string;
  descriptionEN: string;
  portions?: number | null;
  steps: string[];
  stepsEN?: string[];
  equipment?: string[];
  miseEnPlace?: string;
  sustainabilityTips?: string[];
  ingredients: RecipeIngredient[];
  totalCost: number;
  imageUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface Menu {
  id: string;
  nameES: string;
  nameEN: string;
  eventDate?: string;
  eventPlace?: string;
  type: 'brunch' | 'cocktail' | 'navidad' | 'coffee' | 'cafeteria' | 'pedagogico';
  clientId?: string;
  location?: 'centro' | 'fuera';
  occasion?: string;
  diners?: number | null;
  recipes: string[];
  totalCost: number;
  price: number;
  createdBy: string;
  createdAt: string;
}

export interface ProductionIdea {
  id: string;
  menuId: string;
  idea: string;
  referenceLink?: string;
  createdBy: string;
  createdAt: string;
}

export interface AppUser {
  uid: string;
  email: string;
  role: 'admin' | 'student' | 'docente';
  name: string;
  group?: string;
}

export interface BenchmarkingCompany {
  id: string;
  type: 'coffee' | 'brunch';
  group: string;
  name: string;
  companyType: string;
  hasWebAndPrices: string;
  clearPlates: string;
  variety: string;
  travels: string;
  flexibleHours: string;
  hasPhotos: string;
  quality: string;
  priceRange: string;
  reviews: string;
  bestPlate: string;
  coffeeType: string;
  sustainability: string;
  createdAt: string;
}

export interface BenchmarkingIdea {
  id: string;
  type: 'coffee' | 'brunch' | 'general';
  group: string;
  idea: string;
  referenceLink?: string;
  status?: 'pending' | 'discarded' | 'approved';
  menuType?: 'coffee' | 'brunch';
  createdAt: string;
}

export interface BenchmarkingSource {
  id: string;
  group: string;
  url: string;
  strengths: string;
  weaknesses: string;
  description: string;
  createdAt: string;
}

export interface IdeaVote {
  id: string;
  ideaId: string;
  userId: string;
  userName: string;
  score: number;
  reason: string;
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  goodsType?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface StandardWaste {
  id: string;
  item: string;
  percentage: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  clientId: string;
  date: string;
  eventDate?: string;
  eventType?: string;
  guests?: number;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdAt: string;
  createdBy: string;
}

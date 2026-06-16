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
  usePortions?: boolean;
  itemType?: 'ingredient' | 'elaborado';
  preparation?: string;
}

export interface Recipe {
  id: string;
  type?: 'elaborado' | 'plato';
  nameES: string;
  nameEN: string;
  descriptionES: string;
  descriptionEN: string;
  portions?: number | null;
  yieldQuantity?: number | null;
  yieldUnit?: string;
  steps: string[];
  stepsEN?: string[];
  equipment?: string[];
  miseEnPlace?: string;
  sustainabilityTips?: string[];
  ingredients: RecipeIngredient[];
  totalCost: number;
  imageUrl?: string;
  createdBy: string;
  group?: string;
  score?: number;
  feedback?: string;
  workListTasks?: { id: string; process: string; element: string; }[];
  createdAt: string;
}

export interface ExtraConcept {
  name: string;
  cost: number;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fill?: string;
  src?: string;
}

export interface Menu {
  id: string;
  nameES: string;
  nameEN: string;
  eventDate?: string;
  eventTime?: string;
  eventPlace?: string;
  type: 'brunch' | 'cocktail' | 'navidad' | 'coffee' | 'cafeteria' | 'pedagogico';
  clientId?: string;
  location?: 'centro' | 'fuera';
  occasion?: string;
  diners?: number | null;
  recipes: string[];
  extraConcepts?: ExtraConcept[];
  totalCost: number;
  price: number;
  createdBy: string;
  group?: string;
  score?: number;
  feedback?: string;
  createdAt: string;
  marketingDescription?: string;
  marketingImageUrl?: string;
  marketingStatus?: 'boceto' | 'publicado';
  marketingCanvasElements?: CanvasElement[];
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
  commission?: string;
  course?: '1ºCOCINA' | '1ºPANADERÍA' | '2ºPANADERÍA' | '2ºCOCINA' | '2ºSUPERIOR COCINA';
}

export interface CommissionTask {
  id: string;
  commission: string;
  idea: string;
  createdBy: string;
  createdAt: string;
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
  menuId?: string;
}

export interface Quote {
  id: string;
  reference?: string;
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

export interface WorkListTask {
  id: string;
  process: string;
  element: string;
  plato?: string;
  priority: string;
  professor: string;
  completed: boolean;
  student: string;
  elaborations: string;
  order: number;
}

export interface WorkList {
  id: string;
  title: string;
  date: string;
  pax: number;
  tasks: WorkListTask[];
  createdBy: string;
  createdAt: string;
}

export interface AppSettings {
  id?: string;
  logoUrl?: string;
  processes?: string[];
}

export interface IdeasBoardItem {
  id: string;
  text: string;
  completed?: boolean;
}

export interface IdeasBoardNote {
  id: string;
  title: string;
  color?: string;
  items: IdeasBoardItem[];
  createdBy: string;
  group?: string;
  createdAt: string;
}

export interface Dossier {
  id: string;
  title: string;
  description: string;
  clientId?: string;
  clientName?: string;
  menuIds: string[];
  recipeIds: string[];
  theme: 'gold-minimal' | 'dark-slate' | 'editorial' | 'rustic-green';
  selectedMenuId?: string | null;
  clientFeedback?: string;
  status: 'draft' | 'presented' | 'approved' | 'rejected';
  createdBy: string;
  group?: string;
  createdAt: string;
}


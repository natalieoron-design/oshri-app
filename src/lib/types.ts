export type Role = 'therapist' | 'patient'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  avatar_url: string | null
  phone: string | null
  created_at: string
}

export interface PatientDetails {
  id: string
  patient_id: string
  therapist_id: string | null
  goal_weight: number | null
  weigh_in_day: number | null
  daily_water_goal: number
  daily_calorie_goal: number
  notes: string | null
  phone: string | null
  date_of_birth: string | null
  treatment_goals: string | null
}

export interface FoodEntry {
  id: string
  patient_id: string
  logged_at: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  description: string
  input_type: 'text' | 'photo' | 'voice'
  photo_url: string | null
  voice_url: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  ai_analysis: Record<string, unknown> | null
}

export interface WaterIntake {
  id: string
  patient_id: string
  date: string
  cups: number
}

export interface WeightLog {
  id: string
  patient_id: string
  weight: number
  logged_at: string
  notes: string | null
}

export interface Recommendation {
  id: string
  patient_id: string
  therapist_id: string
  type: 'nutrition' | 'supplement' | 'exercise' | 'general'
  title: string
  content: string
  is_active: boolean
  created_at: string
}

export interface AiInsight {
  id: string
  patient_id: string
  content: string
  insight_type: 'nutrition' | 'menu' | 'recipe' | 'general'
  status: 'pending' | 'approved' | 'rejected'
  therapist_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  generated_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  is_read: boolean
  message_type: 'manual' | 'auto_missed_weigh' | 'auto_encouragement'
  created_at: string
}

export interface Product {
  id: string
  name: string
  name_he: string
  description: string | null
  description_he: string | null
  price: number
  image_url: string | null
  is_active: boolean
  stock: number
}

export interface Order {
  id: string
  patient_id: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  total_amount: number | null
  notes: string | null
  created_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  product?: Product
}

export const MEAL_TYPES = {
  breakfast: 'ארוחת בוקר',
  lunch: 'ארוחת צהריים',
  dinner: 'ארוחת ערב',
  snack: 'חטיף',
} as const

export const RECOMMENDATION_TYPES = {
  nutrition: 'תזונה',
  supplement: 'תוספי תזונה',
  exercise: 'פעילות גופנית',
  general: 'כללי',
} as const

export interface TreatmentGoal {
  id: string
  patient_id: string
  goal_text: string
  category: string
  created_at: string
}

export const GOAL_CATEGORIES = [
  'תזונה',
  'משקל',
  'אנרגיה',
  'עיכול',
  'כוח ושרירים',
  'שינה',
  'רגשי ונפשי',
  'כללי',
] as const

export const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

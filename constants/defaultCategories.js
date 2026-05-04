// Default categories use FIXED UUIDs so they map to a single shared row in
// the cloud (user_id IS NULL). All users see the same defaults; only their
// custom categories carry their own user_id and stay private.

export const DEFAULT_EXPENSE_CATEGORIES = [
  { id: '00000000-0000-0000-0001-000000000001', name: 'Food & Drinks', icon: 'fast-food-outline', color: '#EF4444', is_default: true, type: 'expense' },
  { id: '00000000-0000-0000-0001-000000000002', name: 'Groceries',     icon: 'cart-outline',      color: '#F59E0B', is_default: true, type: 'expense' },
  { id: '00000000-0000-0000-0001-000000000003', name: 'Transport',     icon: 'car-outline',       color: '#3B82F6', is_default: true, type: 'expense' },
  { id: '00000000-0000-0000-0001-000000000004', name: 'Shopping',      icon: 'bag-handle-outline', color: '#EC4899', is_default: true, type: 'expense' },
  { id: '00000000-0000-0000-0001-000000000005', name: 'Bills',         icon: 'flash-outline',     color: '#F59E0B', is_default: true, type: 'expense' },
  { id: '00000000-0000-0000-0001-000000000006', name: 'Entertainment', icon: 'film-outline',      color: '#8B5CF6', is_default: true, type: 'expense' },
  { id: '00000000-0000-0000-0001-000000000007', name: 'Health',        icon: 'medkit-outline',    color: '#2CB67D', is_default: true, type: 'expense' },
  { id: '00000000-0000-0000-0001-000000000008', name: 'Education',     icon: 'school-outline',    color: '#06B6D4', is_default: true, type: 'expense' },
  { id: '00000000-0000-0000-0001-000000000009', name: 'Other',         icon: 'pricetag-outline',  color: '#6B7280', is_default: true, type: 'expense' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { id: '00000000-0000-0000-0002-000000000001', name: 'Salary',     icon: 'briefcase-outline',     color: '#2CB67D', is_default: true, type: 'income' },
  { id: '00000000-0000-0000-0002-000000000002', name: 'Freelance',  icon: 'construct-outline',     color: '#7F5AF0', is_default: true, type: 'income' },
  { id: '00000000-0000-0000-0002-000000000003', name: 'Investment', icon: 'trending-up-outline',   color: '#06B6D4', is_default: true, type: 'income' },
  { id: '00000000-0000-0000-0002-000000000004', name: 'Gift',       icon: 'gift-outline',          color: '#EC4899', is_default: true, type: 'income' },
  { id: '00000000-0000-0000-0002-000000000005', name: 'Business',   icon: 'business-outline',      color: '#F59E0B', is_default: true, type: 'income' },
  { id: '00000000-0000-0000-0002-000000000006', name: 'Other',      icon: 'cash-outline',          color: '#6B7280', is_default: true, type: 'income' },
];

export const DEFAULT_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

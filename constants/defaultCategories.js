export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Drinks', icon: 'fast-food-outline', color: '#EF4444', is_default: true, type: 'expense' },
  { name: 'Groceries', icon: 'cart-outline', color: '#F59E0B', is_default: true, type: 'expense' },
  { name: 'Transport', icon: 'car-outline', color: '#3B82F6', is_default: true, type: 'expense' },
  { name: 'Shopping', icon: 'bag-handle-outline', color: '#EC4899', is_default: true, type: 'expense' },
  { name: 'Bills', icon: 'flash-outline', color: '#F59E0B', is_default: true, type: 'expense' },
  { name: 'Entertainment', icon: 'film-outline', color: '#8B5CF6', is_default: true, type: 'expense' },
  { name: 'Health', icon: 'medkit-outline', color: '#2CB67D', is_default: true, type: 'expense' },
  { name: 'Education', icon: 'school-outline', color: '#06B6D4', is_default: true, type: 'expense' },
  { name: 'Other', icon: 'pricetag-outline', color: '#6B7280', is_default: true, type: 'expense' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'briefcase-outline', color: '#2CB67D', is_default: true, type: 'income' },
  { name: 'Freelance', icon: 'construct-outline', color: '#7F5AF0', is_default: true, type: 'income' },
  { name: 'Investment', icon: 'trending-up-outline', color: '#06B6D4', is_default: true, type: 'income' },
  { name: 'Gift', icon: 'gift-outline', color: '#EC4899', is_default: true, type: 'income' },
  { name: 'Business', icon: 'business-outline', color: '#F59E0B', is_default: true, type: 'income' },
  { name: 'Other', icon: 'cash-outline', color: '#6B7280', is_default: true, type: 'income' },
];

export const DEFAULT_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

// Application configuration and constants

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Feature Flags
export const FEATURES = {
  ENABLE_RECOMMENDATIONS: true,
  ENABLE_WISHLIST: true,
  ENABLE_REVIEWS: true,
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};

// Product Categories
export const PRODUCT_CATEGORIES = [
  'T-Shirt',
  'Shorts',
  'Hoodie',
  'Jacket',
  'Accessories',
];

// Price Range
export const PRICE_RANGE = {
  MIN: 0,
  MAX: 10000,
};

// Theme Colors
export const THEME = {
  PRIMARY: '#FF6B35', // Orange
  SECONDARY: '#000000', // Black
  SUCCESS: '#4CAF50',
  ERROR: '#F44336',
  WARNING: '#FFC107',
  INFO: '#2196F3',
};

// Utility functions for the application
// Add common helper functions here like:
// - Date formatting
// - Number formatting
// - Validation functions
// - String manipulation
// - etc.

export const formatPrice = (price) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(price);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-PH').format(new Date(date));
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const truncateText = (text, length) => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

import api from "./axios";

// Discount codes (/v1/discounts/validate, Bearer-auth). This is a quote, never a
// promise: the server re-resolves and re-prices the code when the order is posted,
// so a code can still be refused there if it expires or hits its cap in between.
// { data: { code, type, value, description, subtotal, discount_amount,
//           discount_amount_formatted, total_preview } }
// A 422 means the code is unusable — unknown, expired, spent, minimum not met —
// and err.message is already written for the shopper.
export const discountApi = {
  validate: async (code) => (await api.post("/v1/discounts/validate", { code })).data,
};

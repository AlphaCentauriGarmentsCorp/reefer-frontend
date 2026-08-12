import api from "./axios";

// Server cart (/v1/cart*, Bearer-auth). Each method returns the fresh cart object.
//
// Lines carry a `selected` flag: the cart reports BOTH totals — subtotal (the whole
// cart, for the nav badge) and selected_subtotal (only the ticked lines, which is
// what checkout actually charges).
//
// Every route here is behind auth. A signed-out cart is served by utils/guestCart
// out of localStorage in the same shape, and folded in here by /v1/cart/merge at
// sign-in — CartContext picks the branch, so nothing downstream chooses.
export const cartApi = {
  get: async () => (await api.get("/v1/cart")).data.data,
  addItem: async (slug, size, qty = 1) => (await api.post("/v1/cart/items", { slug, size, qty })).data.data,
  updateItem: async (id, qty) => (await api.patch(`/v1/cart/items/${id}`, { qty })).data.data,
  // qty:0 is how the server deletes a line, but removeItem is the explicit route.
  removeItem: async (id) => (await api.delete(`/v1/cart/items/${id}`)).data.data,
  clear: async () => (await api.delete("/v1/cart")).data.data,

  // Tick/untick one line.
  selectItem: async (id, selected) => (await api.patch(`/v1/cart/items/${id}`, { selected })).data.data,
  // Tick/untick every line at once (the "select all" checkbox).
  selectAll: async (selected) => (await api.post("/v1/cart/select", { selected })).data.data,
};

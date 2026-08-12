import api from "./axios";

// Wishlist (/v1/favorites, Bearer-auth). Every response has the same shape:
// { data: [products], slugs: [...], count } — plus `favorited` on the writes.
// `slugs` is what a heart button needs to know its own state without asking
// per product.
export const favoriteApi = {
  list: async () => (await api.get("/v1/favorites")).data,
  toggle: async (slug) => (await api.post("/v1/favorites/toggle", { slug })).data,
  remove: async (slug) => (await api.delete(`/v1/favorites/${slug}`)).data,
};

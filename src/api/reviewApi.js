import api from "./axios";

// Product ratings (/v1/products/{slug}/reviews).
//   list   — public; signed-out visitors still get the ratings.
//   create — signed in AND must have bought the product (server returns 403 if not).
//            Posting again replaces your existing rating rather than adding a second.
// Every response has the same shape, so the page can adopt whatever comes back:
// { summary: {count, average, breakdown}, reviews: [...], viewer: {signed_in, purchased, can_review, my_review} }
export const reviewApi = {
  list: async (slug) => (await api.get(`/v1/products/${slug}/reviews`)).data,
  create: async (slug, { rating, body }) => (await api.post(`/v1/products/${slug}/reviews`, { rating, body })).data,
  removeMine: async (slug) => (await api.delete(`/v1/products/${slug}/reviews/mine`)).data,
};

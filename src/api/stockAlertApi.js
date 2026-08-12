import api from "./axios";

// Back-in-stock alerts (/v1/stock-alerts, Bearer-auth). One pending alert per
// account per variant, so `create` answers 409 when the shopper already asked —
// callers treat that as confirmed, not as an error.
export const stockAlertApi = {
  // Unwraps to the array. Two copies of this module briefly disagreed on whether
  // list() returned the envelope or its contents; every caller renders a list, so
  // the array is the useful shape and the single one.
  list: async () => (await api.get("/v1/stock-alerts")).data.data ?? [],
  create: async (slug, size) => (await api.post("/v1/stock-alerts", { slug, size })).data,
  remove: async (id) => (await api.delete(`/v1/stock-alerts/${id}`)).data,
};

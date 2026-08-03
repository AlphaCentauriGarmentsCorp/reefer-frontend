import api from "./axios";

// Address book (/v1/addresses, Bearer-auth). Ownership is enforced server-side —
// another account's address 404s rather than 403s, so its id stays unconfirmable.
// Setting is_default_shipping/is_default_billing takes that flag off whichever
// address held it before, so "default" always means exactly one.
export const addressApi = {
  list: async () => (await api.get("/v1/addresses")).data.data,
  create: async (payload) => (await api.post("/v1/addresses", payload)).data.data,
  update: async (id, payload) => (await api.patch(`/v1/addresses/${id}`, payload)).data.data,
  remove: async (id) => (await api.delete(`/v1/addresses/${id}`)).data,
};

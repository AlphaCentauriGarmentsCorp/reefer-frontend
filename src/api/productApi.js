import api from "./axios";

export const productApi = {
  list: async (params = {}) => (await api.get("/v1/products", { params })).data,
  get: async (slug) => (await api.get(`/v1/products/${encodeURIComponent(slug)}`)).data,
};

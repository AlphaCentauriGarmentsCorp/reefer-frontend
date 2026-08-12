import api from "./axios";

// Returns (/v1/returns, Bearer-auth). A return is opened against one of your own
// delivered orders inside the shop's window, and can be cancelled only while it is
// still 'requested' — every later transition is the shop's side of the conversation,
// so there is no update call here. Money is the server's: a line is addressed the way
// the order hands it out ({slug, size, qty}), and the refund comes back priced.
export const returnApi = {
  // The whole body, not just .data — the index is a paginated collection, and the
  // caller is the one that decides what to do with the rest of it.
  list: async () => (await api.get("/v1/returns")).data,
  show: async (reference) => (await api.get(`/v1/returns/${reference}`)).data.data,
  create: async (orderNumber, payload) => (await api.post(`/v1/orders/${orderNumber}/returns`, payload)).data,
  cancel: async (reference) => (await api.post(`/v1/returns/${reference}/cancel`)).data,
};

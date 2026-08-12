import api from "./axios";

// Orders (/v1/orders, Bearer-auth). The server re-prices every line from the
// catalog — the client only ever sends slug/size/qty, never prices.
export const orderApi = {
  list: async () => (await api.get("/v1/orders")).data, // { data: [...], links, meta }
  create: async (payload) => (await api.post("/v1/orders", payload)).data, // { message, data: order }

  // Demo-only: walk a simulated order down the tracker. The server enforces that a
  // stage can only move FORWARD and that the order belongs to the caller, so this
  // cannot be talked into rewinding one by posting an earlier stage.
  advance: async (orderNumber, stage) =>
    (await api.post(`/v1/orders/${orderNumber}/advance`, { stage })).data,
};

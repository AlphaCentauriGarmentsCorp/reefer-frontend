import api from "./axios";

// My Account dashboard (/v1/account, Bearer-auth). One call returns everything
// the page renders: the user, their saved addresses, and recent orders.
export const accountApi = {
  dashboard: async () => (await api.get("/v1/account")).data, // { user, addresses, orders }
  update: async (payload) => (await api.patch("/v1/account", payload)).data, // { message, user, token? }
};

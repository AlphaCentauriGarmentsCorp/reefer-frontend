import api from "./axios";

// Public runtime front-end config (/v1/config). Read at boot by anything that has
// to know whether an integration is wired up on THIS deployment — a build-time env
// var would mean rebuilding the bundle to add credentials. `google_client_id` is
// null when there are none, and the caller renders nothing rather than a button
// that cannot possibly work.
export const configApi = {
  get: async () => (await api.get("/v1/config")).data?.data ?? {},
};

import api from "./axios";

// Public runtime front-end config (/v1/config). Read at boot by anything that has
// to know whether an integration is wired up on THIS deployment — a build-time env
// var would mean rebuilding the bundle to add credentials. A key is null when the
// deployment has no credentials for it, and the caller renders nothing rather than
// a control that cannot possibly work. (The original example was `google_client_id`;
// Google sign-in is out of this integration, so treat that key as always null here.)
export const configApi = {
  get: async () => (await api.get("/v1/config")).data?.data ?? {},
};

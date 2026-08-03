# REEFER — Storefront

The public shop for **REEFER** clothing: a React + Vite single-page app, deployed as
static files to **https://reeferclothing.com**. It holds no data of its own — the
catalogue, cart, orders, favourites and account all come from the REST API over the
wire.

This repo *is* the storefront. There is no other app in it.

## Stack

- React 19 + React Router 7
- Vite 7 (dev server and build)
- axios 0.27, one shared instance with a Bearer-token interceptor
- React Context for auth / cart / favourites; styling is inline, not Tailwind

```
src/
  api/          axios instance + one thin service module per domain
  hooks/        useAuth · useCart · useFavorites · useProducts
  context/      AuthContext · CartContext · FavoritesContext
  components/   layout/ (Nav, Footer) · product/ (tile, favourite, reviews)
  pages/        Home, Shop, ProductDetail, Cart, Checkout, Account, …
  utils/        guestCart (signed-out cart in localStorage), product helpers
  App.jsx       router + providers    main.jsx  entry    index.css  global styles
```

## The backend it talks to

One shared Laravel app, **ash-ai-backend**, hosts two separate APIs:

| API | Prefix | Who uses it |
|---|---|---|
| ERP | `/api/v2/*` | the internal ERP app |
| **Storefront** | **`/api/storefront/v1/*`** | **this SPA** |

`VITE_API_URL` supplies the `…/api/storefront` root; every module in `src/api/`
requests `"/v1/..."` on top of it, so a call lands on
`https://<api-host>/api/storefront/v1/products`. `src/api/axios.js` also accepts a
URL ending at plain `/api` and appends `/storefront` itself (never twice), so a
slightly-wrong deploy config still works instead of 404ing every call.

**Auth is a Bearer token, not a cookie.** Sign-in stores the token in
`localStorage` under the key `token`; the axios request interceptor attaches it as
`Authorization: Bearer …`. Because nothing depends on cookies, the instance sets
`withCredentials: false` — the SPA and the API are different origins and stay that
way. Signing out clears the key.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
```

You also need the backend running:

```bash
# in the ash-ai-backend repo
php artisan serve    # http://127.0.0.1:8000
```

Requests are cross-origin (`:5173` → `:8000`), so the backend must allow this
origin. `http://localhost:5173` is already in its CORS allowlist, so normally there
is nothing to configure; if you change ports, add the new origin to
`STOREFRONT_ALLOWED_ORIGINS` in the backend's `.env`.

Other scripts: `npm run lint`, `npm run build`, `npm run preview` (serves the built
`dist/` locally).

## Environment

Two files, one variable. Vite inlines `VITE_*` **at build time**, so changing it
means a rebuild (or a dev-server restart) — editing it on a deployed server does
nothing.

| File | Used by | Value |
|---|---|---|
| `.env` | `npm run dev` | `VITE_API_URL=http://127.0.0.1:8000/api/storefront` |
| `.env.production` | `npm run build` (i.e. CI) | the deployed backend origin + `/api/storefront` |

`.env.production` currently holds a **placeholder host**. Before the next production
deploy it must be pointed at the deployed ash-ai-backend, and that backend's
`STOREFRONT_ALLOWED_ORIGINS` must list `https://reeferclothing.com` — otherwise the
browser blocks every API call and the site looks broken while the API is perfectly
healthy. Both details are spelled out in the file itself.

## Deployment

Push to `main` and it ships. `.github/workflows/deploy.yml` runs `npm ci`, then
`npm run build`, then rsyncs `dist/` to Hostinger over SSH.

Things worth knowing before touching anything in that path:

- **`npm ci` fails if `package.json` and `package-lock.json` disagree.** Never edit
  a dependency version by hand — use `npm install <pkg>` so both files move
  together, and commit the lockfile.
- **`public/.htaccess` must ship with the build.** Vite copies `public/` into
  `dist/` verbatim, so it lands next to `index.html` in `public_html`, which is
  where Apache/LiteSpeed needs it. It provides the SPA fallback (any unknown path
  serves `index.html`, so refreshing `/shop` does not 404) and the cache policy
  (hashed assets immutable for a year, `index.html` always revalidated so a
  redeploy is picked up immediately). Deleting it breaks deep links and pins users
  to a stale bundle. `public/_redirects` and `vercel.json` are the same fallback for
  Netlify and Vercel.
- Tailwind is still in `devDependencies` and `postcss.config.cjs`. The storefront
  styles inline and does not use it; it is left in place deliberately, because
  removing it would desync the lockfile and break the deploy. Harmless no-op.

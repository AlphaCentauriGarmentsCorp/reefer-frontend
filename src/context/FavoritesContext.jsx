import { createContext, useState, useEffect, useCallback } from "react";
import { favoriteApi } from "../api/favoriteApi";
import { useAuth } from "../hooks/useAuth";

// eslint-disable-next-line react-refresh/only-export-components
export const FavoritesContext = createContext(null);

const EMPTY = { products: [], slugs: [], count: 0 };

// Server-backed wishlist. Favorites are account-tied — there is no signed-out
// favorite — so this stays empty until there's a user. The `slugs` set is what
// lets every heart across the catalog light up from one request.
export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const authed = !!user;
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const adopt = (payload) =>
    setState({
      products: payload.data || [],
      slugs: payload.slugs || [],
      count: payload.count ?? (payload.slugs || []).length,
    });

  const refresh = useCallback(async () => {
    if (!authed) {
      setState(EMPTY);
      return;
    }
    setLoading(true);
    try {
      adopt(await favoriteApi.list());
    } catch {
      setState(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [authed]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorite = (slug) => state.slugs.includes(slug);

  // Returns the new state so a caller can react to it (e.g. animate the heart).
  const toggle = async (slug) => {
    const payload = await favoriteApi.toggle(slug);
    adopt(payload);
    return payload.favorited;
  };

  const remove = async (slug) => adopt(await favoriteApi.remove(slug));

  return (
    <FavoritesContext.Provider value={{ ...state, loading, authed, isFavorite, toggle, remove, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}

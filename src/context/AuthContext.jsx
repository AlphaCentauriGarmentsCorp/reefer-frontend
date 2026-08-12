import { createContext, useState, useEffect } from "react";
import { authApi } from "../api/authApi";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Loading only while a stored token is being verified, so protected UI doesn't flash.
  const [loading, setLoading] = useState(() => !!localStorage.getItem("token"));

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    authApi
      .meApi()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      // Anything cart-shaped left in localStorage would be merged into whoever
      // signs in on this browser next, so it goes out with the session.
      localStorage.removeItem("reefer-cart");
      localStorage.removeItem("reefer-pending-add");
      setUser(null);
    }
  };

  return <AuthContext.Provider value={{ user, setUser, loading, logout }}>{children}</AuthContext.Provider>;
}

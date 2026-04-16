// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // Changed to false to skip auth check for now

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Skip auth check for now - just set loading to false
    setLoading(false);
    
    // Uncomment this when you have the meApi endpoint working
    /*
    meApi()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
    */
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

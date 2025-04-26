// === File: client/src/context/AuthContext.jsx ===

import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (email, password) => {
    // 🔐 Replace this with real login logic later
    console.log("Attempting login with:", { email, password });
    setUser({ email });
  };

  const logout = () => {
    console.log("Logging out");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

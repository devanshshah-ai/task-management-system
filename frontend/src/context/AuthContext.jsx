import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  loginUser,
  registerUser,
  getCurrentUser,
} from "../api/authApi";

const AuthContext = createContext(null);

const TOKEN_KEY = "token";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY)
  );

  const [loading, setLoading] = useState(true);

  // LOGIN
  const login = useCallback(async (credentials) => {
    const response = await loginUser(credentials);

    const { token, user } = response.data;

    localStorage.setItem(TOKEN_KEY, token);

    setToken(token);
    setUser(user);

    return user;
  }, []);

  // SIGNUP
  const signup = useCallback(async (userData) => {
    const response = await registerUser(userData);

    const { token, user } = response.data;

    // User is already authenticated after registration
    localStorage.setItem(TOKEN_KEY, token);

    setToken(token);
    setUser(user);

    return user;
  }, []);

  // LOGOUT
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setUser(null);
  }, []);

  // RESTORE SESSION
  const restoreSession = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await getCurrentUser();

      setToken(storedToken);
      setUser(response.data.user);
    } catch {
      localStorage.removeItem(TOKEN_KEY);

      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
};
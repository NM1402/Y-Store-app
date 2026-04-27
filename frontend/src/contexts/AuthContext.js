import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authAPI } from "../utils/api";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth status via V2 /me endpoint (session cookies)
  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }

    try {
      // Try V2 auth first (session cookie)
      const response = await axios.get(`${API_URL}/api/v2/auth/me`, {
        withCredentials: true,
        headers: {
          // Also send session_token from localStorage as backup
          Authorization: localStorage.getItem("session_token")
            ? `Bearer ${localStorage.getItem("session_token")}`
            : "",
        },
      });

      if (response.data) {
        setUser(response.data);
        setToken("session"); // Indicate session-based auth
        localStorage.setItem("user", JSON.stringify(response.data));
      }
    } catch (error) {
      // Fallback to legacy token auth
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Clear stale data
        localStorage.removeItem("session_token");
        localStorage.removeItem("user");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { access_token, user } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      setToken(access_token);
      setUser(user);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || "Помилка входу. Перевірте дані.";
      return { success: false, error: errorMessage };
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { access_token, user } = response.data;

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      setToken(access_token);
      setUser(user);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail || "Помилка реєстрації. Спробуйте ще раз.";
      return { success: false, error: errorMessage };
    }
  };

  // Set user after Google OAuth callback
  const setGoogleUser = (userData) => {
    setUser(userData);
    setToken("session");
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      // Call V2 logout to clear session cookie
      await axios.post(
        `${API_URL}/api/v2/auth/logout`,
        {},
        {
          withCredentials: true,
        },
      );
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("session_token");
    setToken(null);
    setUser(null);
  };

  // Google login redirect
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const googleLogin = () => {
    const redirectUrl = window.location.origin + "/auth-callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    googleLogin,
    setGoogleUser,
    checkAuth,
    loading,
    isAuthenticated: !!token || !!user,
    isSeller: user?.role === "seller" || user?.role === "admin",
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

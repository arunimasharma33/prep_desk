import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAuthToken, loadStoredToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = loadStoredToken();
    if (!token) {
      setReady(true);
      return;
    }
    api.me()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    // Does NOT log the user in - an OTP must be verified first.
    return api.register({ name, email, password });
  }, []);

  const verifyOtp = useCallback(async (email, otp) => {
    const data = await api.verifyOtp({ email, otp });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const resendOtp = useCallback(async (email, purpose = "register") => {
    return api.resendOtp({ email, purpose });
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return api.forgotPassword({ email });
  }, []);

  const resetPassword = useCallback(async (email, otp, newPassword) => {
    const data = await api.resetPassword({ email, otp, new_password: newPassword });
    setAuthToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, verifyOtp, resendOtp, forgotPassword, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

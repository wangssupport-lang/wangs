import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mfgProfile, setMfgProfile] = useState(null);
  const [platformSettings, setPlatformSettings] = useState({ allow_seller_registration: false });
  const [loading, setLoading] = useState(true);

  // Initialize session key for guests if not exists
  useEffect(() => {
    let sessionKey = localStorage.getItem('wangs_session_key');
    if (!sessionKey) {
      sessionKey = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('wangs_session_key', sessionKey);
    }
  }, []);

  const loadPlatformSettings = async () => {
    try {
      const s = await api.getPlatformSettings();
      if (s) setPlatformSettings(s);
    } catch (err) {
      // offline / default
    }
  };

  const loadCurrentUser = async () => {
    const token = localStorage.getItem('wangs_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
      setMfgProfile(data.manufacturer_profile);
    } catch (err) {
      console.error('Failed to load user session', err);
      localStorage.removeItem('wangs_token');
      setUser(null);
      setMfgProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
    loadPlatformSettings();
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    localStorage.setItem('wangs_token', res.token);
    setUser(res.user);
    setMfgProfile(res.manufacturer_profile);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('wangs_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const loginWithOtp = async (email, otpCode) => {
    const res = await api.verifyOtp(email, otpCode, 'LOGIN');
    if (res.token) {
      localStorage.setItem('wangs_token', res.token);
      setUser(res.user);
      setMfgProfile(res.manufacturer_profile);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('wangs_token');
    setUser(null);
    setMfgProfile(null);
  };

  const isAdmin = user && (user.role === 'ADMIN' || user.is_staff === true);
  const isManufacturer = user && user.role === 'MANUFACTURER';
  const isAuthorizedToSell = Boolean(
    user && (user.is_authorized_to_sell || user.can_sell || user.role === 'MANUFACTURER' || user.role === 'ADMIN' || user.is_staff)
  );

  return (
    <AuthContext.Provider value={{
      user,
      mfgProfile,
      loading,
      login,
      loginWithOtp,
      register,
      logout,
      isAdmin,
      isManufacturer,
      isAuthorizedToSell,
      allowSellerRegistration: Boolean(platformSettings?.allow_seller_registration),
      isMaintenanceMode: Boolean(platformSettings?.is_maintenance_mode),
      maintenanceMessage: platformSettings?.maintenance_message || "We're currently undergoing scheduled maintenance & pantry inventory updates. We'll be back shortly!",
      platformSettings,
      refreshPlatformSettings: loadPlatformSettings,
      refreshUser: loadCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

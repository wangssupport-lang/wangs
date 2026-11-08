import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mfgProfile, setMfgProfile] = useState(null);
  const [platformSettings, setPlatformSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('wangs_platform_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return { allow_seller_registration: false };
  });
  const [loading, setLoading] = useState(true);

  // Initialize session key for guests if not exists
  useEffect(() => {
    let sessionKey = localStorage.getItem('wangs_session_key');
    if (!sessionKey) {
      sessionKey = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('wangs_session_key', sessionKey);
    }
  }, []);

  const loadPlatformSettings = async (overrideSettings = null) => {
    if (overrideSettings && typeof overrideSettings === 'object') {
      setPlatformSettings((prev) => {
        const next = { ...(prev || {}), ...overrideSettings };
        try {
          localStorage.setItem('wangs_platform_settings', JSON.stringify(next));
        } catch {}
        return next;
      });
      return;
    }
    try {
      const s = await api.getPlatformSettings();
      if (s) {
        setPlatformSettings(s);
        try {
          localStorage.setItem('wangs_platform_settings', JSON.stringify(s));
        } catch {}
      }
    } catch (err) {
      // offline / default
    }
  };

  const updateSellerRegistrationState = (userData, mfgData) => {
    try {
      const isSeller = Boolean(
        mfgData ||
        userData?.role === 'MANUFACTURER' ||
        userData?.can_sell
      );
      if (isSeller) {
        localStorage.setItem('wangs_is_registered_seller', 'true');
        window.dispatchEvent(new Event('wangs_seller_status_changed'));
      } else if (userData && userData.role === 'CUSTOMER' && !userData.can_sell && !mfgData) {
        localStorage.removeItem('wangs_is_registered_seller');
        window.dispatchEvent(new Event('wangs_seller_status_changed'));
      }
    } catch {
      // ignore
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
      updateSellerRegistrationState(data.user, data.manufacturer_profile);
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
    if (res.refresh) localStorage.setItem('wangs_refresh_token', res.refresh);
    setUser(res.user);
    setMfgProfile(res.manufacturer_profile);
    updateSellerRegistrationState(res.user, res.manufacturer_profile);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    localStorage.setItem('wangs_token', res.token);
    if (res.refresh) localStorage.setItem('wangs_refresh_token', res.refresh);
    setUser(res.user);
    updateSellerRegistrationState(res.user, null);
    return res.user;
  };

  const loginWithOtp = async (email, otpCode) => {
    const res = await api.verifyOtp(email, otpCode, 'LOGIN');
    if (res.token) {
      localStorage.setItem('wangs_token', res.token);
      if (res.refresh) localStorage.setItem('wangs_refresh_token', res.refresh);
      setUser(res.user);
      setMfgProfile(res.manufacturer_profile);
      updateSellerRegistrationState(res.user, res.manufacturer_profile);
    }
    return res;
  };

  const resetPassword = async (payload) => {
    const res = await api.resetPassword(payload);
    if (res.token) {
      localStorage.setItem('wangs_token', res.token);
      if (res.refresh) localStorage.setItem('wangs_refresh_token', res.refresh);
      setUser(res.user);
      setMfgProfile(res.manufacturer_profile);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('wangs_token');
    localStorage.removeItem('wangs_refresh_token');
    localStorage.removeItem('wangs_is_registered_seller');
    setUser(null);
    setMfgProfile(null);
  };

  const [authModalConfig, setAuthModalConfig] = useState(null);

  const openAuthModal = ({ actionText = 'proceed', initialTab = 'login', onAuthenticated = null } = {}) => {
    setAuthModalConfig({
      actionText,
      initialTab,
      onAuthenticated,
    });
  };

  const closeAuthModal = () => {
    setAuthModalConfig(null);
  };

  const requireAuth = (callback, actionText = 'proceed') => {
    if (user) {
      if (typeof callback === 'function') callback(user);
      return true;
    }
    openAuthModal({
      actionText,
      onAuthenticated: (loggedInUser) => {
        if (typeof callback === 'function') callback(loggedInUser);
      },
    });
    return false;
  };

  const isAdmin = Boolean(user && (user.role === 'ADMIN' || user.is_staff === true || user.is_superuser === true));
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
      resetPassword,
      logout,
      isAdmin,
      isManufacturer,
      isAuthorizedToSell,
      authModalConfig,
      openAuthModal,
      closeAuthModal,
      requireAuth,
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

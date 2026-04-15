// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadUser = useCallback(async () => {
    console.log('[Auth] loadUser() start');
    const safetyTimer = setTimeout(() => {
      console.log('[Auth] loadUser() safety timeout fired — forcing isLoading=false');
      setIsLoading(false);
    }, 5000);
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('[Auth] token exists:', !!token);
      if (!token) { setIsLoading(false); clearTimeout(safetyTimer); return; }
      const { data } = await userAPI.getProfile();
      console.log('[Auth] profile loaded:', data?.email);
      setUser(data);
      setIsAuthenticated(true);
    } catch (e) {
      console.log('[Auth] loadUser error:', e?.message);
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    } finally {
      clearTimeout(safetyTimer);
      setIsLoading(false);
      console.log('[Auth] loadUser() done');
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await authAPI.login(email, password);
    await AsyncStorage.setItem('access_token', data.access);
    await AsyncStorage.setItem('refresh_token', data.refresh);
    const profile = await userAPI.getProfile();
    setUser(profile.data);
    setIsAuthenticated(true);
    return profile.data;
  };

  const register = async (payload) => {
    const { data } = await authAPI.register(payload);
    await AsyncStorage.setItem('access_token', data.access);
    await AsyncStorage.setItem('refresh_token', data.refresh);
    const profile = await userAPI.getProfile();
    setUser(profile.data);
    setIsAuthenticated(true);
    return profile.data;
  };

  const logout = async () => {
    console.log('[Auth] logout() called');
    let refresh = null;
    try {
      // Read token before wiping storage
      refresh = await AsyncStorage.getItem('refresh_token');
      console.log('[Auth] refresh token read:', !!refresh);
    } catch (e) {
      console.log('[Auth] getItem error:', e);
    }

    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      console.log('[Auth] storage cleared');
    } catch (e) {
      console.log('[Auth] multiRemove error:', e);
    } finally {
      // ALWAYS clear React state — this is what triggers navigation to Login
      setUser(null);
      setIsAuthenticated(false);
      console.log('[Auth] state reset — isAuthenticated = false');
    }

    // Background: notify server to blacklist the token (non-blocking, failure is OK)
    if (refresh) {
      authAPI.logout(refresh)
        .then(() => console.log('[Auth] server logout success'))
        .catch((e) => console.log('[Auth] server logout failed (non-fatal):', e?.message));
    }
  };

  const updateUser = (data) => setUser((prev) => ({ ...prev, ...data }));

  const refreshUser = async () => {
    try {
      const { data } = await userAPI.getProfile();
      setUser(data);
    } catch (_) {}
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

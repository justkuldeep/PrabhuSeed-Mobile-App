/**
 * Auth state management using React Context + SecureStore
 * Mirrors the web frontend's authStore pattern
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from './api';
import { STORAGE_KEYS } from '../constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session

  // Restore session on app start
  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        // Normalize role to uppercase in case it was stored lowercase
        if (userData?.role) userData.role = userData.role.toUpperCase();
        setToken(storedToken);
        setUser(userData);
      }
    } catch (err) {
      console.warn('Session restore failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(tokenData) {
    // tokenData shape: { token, access_token, user: { id, role, name, mobile } }
    const jwt = tokenData.token || tokenData.access_token;
    // Normalize role to uppercase so all role checks work consistently
    const userData = {
      ...tokenData.user,
      role: tokenData.user?.role?.toUpperCase() || tokenData.user?.role,
    };
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, jwt);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    setToken(null);
    setUser(null);
  }

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

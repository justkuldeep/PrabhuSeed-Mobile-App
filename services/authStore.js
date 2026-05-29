/**
 * Auth state management using React Context + SecureStore
 *
 * AuthProvider is implemented as a CLASS component intentionally.
 * On Android 16 (API 36) with New Architecture (Bridgeless Fabric), Expo Router wraps
 * root layouts in a Suspense boundary. During concurrent-mode Suspense retries,
 * React's ReactCurrentDispatcher.current can be null, causing all hooks
 * (useState, useEffect, useContext) to throw "Cannot read property 'X' of null".
 * Class components use this.state / componentDidMount instead of hooks and are
 * completely unaffected by the null dispatcher — they bypass it entirely.
 */
import React, { createContext, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

export const AuthContext = createContext(null);

export class AuthProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      token: null,
      loading: true,
    };
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
  }

  componentDidMount() {
    this.restoreSession();
  }

  async restoreSession() {
    try {
      const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData?.role) userData.role = userData.role.toUpperCase();
        this.setState({ token: storedToken, user: userData });
      }
    } catch (err) {
      console.warn('Session restore failed:', err);
    } finally {
      this.setState({ loading: false });
    }
  }

  async login(tokenData) {
    const jwt = tokenData.token || tokenData.access_token;
    const userData = {
      ...tokenData.user,
      role: tokenData.user?.role?.toUpperCase() || tokenData.user?.role,
    };
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, jwt);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    this.setState({ token: jwt, user: userData });
  }

  async logout() {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    this.setState({ token: null, user: null });
  }

  render() {
    const { user, token, loading } = this.state;
    const isAuthenticated = !!token && !!user;
    const value = {
      user,
      token,
      loading,
      isAuthenticated,
      login: this.login,
      logout: this.logout,
    };
    return (
      <AuthContext.Provider value={value}>
        {this.props.children}
      </AuthContext.Provider>
    );
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

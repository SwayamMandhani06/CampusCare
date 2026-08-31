import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('campuscare_token'));
  const [loading, setLoading] = useState(true);

  // Initialize and verify user on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('campuscare_token');
      const storedUser = localStorage.getItem('campuscare_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Verify with backend /api/auth/me
          const res = await api.get('/auth/me');
          if (res.data && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('campuscare_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('[AuthContext] Session expired or invalid, logging out.');
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data && res.data.token) {
      const authToken = res.data.token;
      const authUser = res.data.user;

      setToken(authToken);
      setUser(authUser);

      localStorage.setItem('campuscare_token', authToken);
      localStorage.setItem('campuscare_user', JSON.stringify(authUser));

      return authUser;
    }
    throw new Error('Authentication failed');
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data && res.data.token) {
      const authToken = res.data.token;
      const authUser = res.data.user;

      setToken(authToken);
      setUser(authUser);

      localStorage.setItem('campuscare_token', authToken);
      localStorage.setItem('campuscare_user', JSON.stringify(authUser));

      return authUser;
    }
    throw new Error('Registration failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('campuscare_token');
    localStorage.removeItem('campuscare_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        role: user ? user.role : null,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

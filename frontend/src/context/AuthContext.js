import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import mockClient from '../mocks/mockClient';
import { DEMO_USER } from '../mocks/mockData';

const AuthContext = createContext(null);

// Static demo mode (GitHub Pages build): no backend — serve in-memory mock data
// and auto-authenticate as the demo admin so every page is reachable.
const DEMO = process.env.REACT_APP_DEMO_MODE === 'true';
const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEMO ? DEMO_USER : null);
  const [token, setToken] = useState(DEMO ? 'demo-token' : localStorage.getItem('token'));
  const [loading, setLoading] = useState(!DEMO);

  const api = useCallback(() => {
    if (DEMO) return mockClient;
    return axios.create({
      baseURL: API_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token]);

  useEffect(() => {
    if (DEMO) return;
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await api().get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Auth error:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token, api]);

  const login = async (email, password) => {
    const response = await api().post('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role = 'compliance_officer') => {
    const response = await api().post('/auth/register', { email, password, name, role });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

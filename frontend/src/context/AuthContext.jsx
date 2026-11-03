import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('simatrix_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('simatrix_auth_token') || null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Verify session on mount (only if a saved token exists)
  useEffect(() => {
    async function verifySession() {
      const savedToken = localStorage.getItem('simatrix_auth_token');

      if (!savedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${savedToken}`,
            'Accept': 'application/json'
          },
          credentials: 'include'
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('simatrix_auth_user', JSON.stringify(data.user));
        } else {
          // Token expired or invalid
          setUser(null);
          setToken(null);
          localStorage.removeItem('simatrix_auth_token');
          localStorage.removeItem('simatrix_auth_user');
        }
      } catch (err) {
        console.warn('Session check warning:', err);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  const loginWithGoogle = async (payload = {}) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Sign-in failed. Please try again.');
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('simatrix_auth_token', data.token);
      localStorage.setItem('simatrix_auth_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      }).catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('simatrix_auth_token');
      localStorage.removeItem('simatrix_auth_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Verify session on mount
  useEffect(() => {
    async function verifySession() {
      const savedToken = localStorage.getItem('simatrix_auth_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${savedToken}`
          }
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
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Google sign-in failed. Please try again.');
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
      await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
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

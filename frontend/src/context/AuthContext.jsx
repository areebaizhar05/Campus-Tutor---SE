import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('campustutor_token');
    const savedUser = localStorage.getItem('campustutor_user');
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (e) {
        localStorage.removeItem('campustutor_token');
        localStorage.removeItem('campustutor_user');
      }
    }
  }, []);

  const login = (newToken, newUser) => {
    localStorage.setItem('campustutor_token', newToken);
    localStorage.setItem('campustutor_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('campustutor_token');
    localStorage.removeItem('campustutor_user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem('campustutor_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, usersAPI } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({
    can_create: false,
    can_modify: false,
    can_delete: false,
    can_export: false,
    can_manage_users: false,
    role: 'invite'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Set permissions based on role
        updatePermissionsFromRole(parsedUser.role);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const updatePermissionsFromRole = (role) => {
    const perms = {
      can_create: role === 'admin' || role === 'technicien',
      can_modify: role === 'admin' || role === 'technicien',
      can_delete: role === 'admin',
      can_export: role === 'admin' || role === 'technicien',
      can_manage_users: role === 'admin',
      role: role
    };
    setPermissions(perms);
    return perms;
  };

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    updatePermissionsFromRole(userData.role);
    
    return userData;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    
    // Handle pending approval case
    if (response.data.pending_approval) {
      return { pending_approval: true, message: response.data.message };
    }
    
    const { access_token, user: newUser } = response.data;
    
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    updatePermissionsFromRole(newUser.role);
    
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPermissions({
      can_create: false,
      can_modify: false,
      can_delete: false,
      can_export: false,
      can_manage_users: false,
      role: 'invite'
    });
  };

  const isAdmin = () => user?.role === 'admin';
  const isTechnicien = () => user?.role === 'technicien';
  const isInvite = () => user?.role === 'invite';
  
  const canCreate = () => permissions.can_create;
  const canModify = () => permissions.can_modify;
  const canDelete = () => permissions.can_delete;
  const canExport = () => permissions.can_export;
  const canManageUsers = () => permissions.can_manage_users;

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrateur',
      technicien: 'Technicien',
      invite: 'Invité'
    };
    return labels[role] || role;
  };

  const value = {
    user,
    permissions,
    loading,
    login,
    register,
    logout,
    isAdmin,
    isTechnicien,
    isInvite,
    canCreate,
    canModify,
    canDelete,
    canExport,
    canManageUsers,
    getRoleLabel,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

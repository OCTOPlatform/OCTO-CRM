'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Workspace } from '@/types';
import { api } from './api';

export type UserRoleProfile = 'owner' | 'admin' | 'supervisor' | 'member' | 'sales' | 'support';

export const resolveRoleProfile = (ws: Workspace | null): UserRoleProfile => {
  if (!ws) return 'owner';
  const role = (ws.role || '').toLowerCase();
  const dept = (ws.department || '').toLowerCase();

  // Owner gets full executive access
  if (role === 'owner') {
    return 'owner';
  }
  // Admin / Supervisor gets lead management access
  if (role === 'admin' || role === 'supervisor') {
    return 'admin';
  }
  // CS / Support department
  if (dept === 'support') {
    return 'support';
  }
  // Sales department
  if (dept === 'sales') {
    return 'sales';
  }
  return 'member';
};

interface AuthContextType {
  user: User | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  activeRole: UserRoleProfile;
  setActiveRole: (role: UserRoleProfile) => void;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (fullName: string, email: string, pass: string, wsName: string) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeRole, setActiveRoleState] = useState<UserRoleProfile>('owner');
  const [loading, setLoading] = useState(true);

  const setActiveRole = (role: UserRoleProfile) => {
    setActiveRoleState(role);
    localStorage.setItem('octo_active_role', role);
  };

  useEffect(() => {
    // Restore from localStorage
    const savedToken = localStorage.getItem('octo_token');
    const savedUser = localStorage.getItem('octo_user');
    const savedWs = localStorage.getItem('octo_workspace');

    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        if (savedWs) {
          const parsedWs = JSON.parse(savedWs);
          setCurrentWorkspace(parsedWs);
          setActiveRoleState(resolveRoleProfile(parsedWs));
        }
        // Verify token with backend
        api.getMe()
          .then((res) => {
            setUser(res.user);
            setWorkspaces(res.workspaces);
            if (res.workspaces.length > 0) {
              const currentSavedId = localStorage.getItem('octo_workspace_id');
              const found = res.workspaces.find((w) => w.id === currentSavedId) || res.workspaces[0];
              setCurrentWorkspace(found);
              setActiveRoleState(resolveRoleProfile(found));
              localStorage.setItem('octo_workspace_id', found.id);
              localStorage.setItem('octo_workspace', JSON.stringify(found));
            }
          })
          .catch(() => {
            // Token might be invalid, logout
            logout();
          })
          .finally(() => setLoading(false));
      } catch {
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
    setWorkspaces(res.workspaces);
    if (res.workspaces.length > 0) {
      const firstWs = res.workspaces[0];
      setCurrentWorkspace(firstWs);
      setActiveRoleState(resolveRoleProfile(firstWs));
    }
  };

  const register = async (fullName: string, email: string, pass: string, wsName: string) => {
    const res = await api.register(fullName, email, pass, wsName);
    setUser(res.user);
    setWorkspaces(res.workspaces);
    if (res.workspaces.length > 0) {
      const firstWs = res.workspaces[0];
      setCurrentWorkspace(firstWs);
      setActiveRoleState('owner');
    }
  };

  const logout = () => {
    localStorage.removeItem('octo_token');
    localStorage.removeItem('octo_user');
    localStorage.removeItem('octo_workspace_id');
    localStorage.removeItem('octo_workspace');
    localStorage.removeItem('octo_active_role');
    setUser(null);
    setCurrentWorkspace(null);
    setWorkspaces([]);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const switchWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setActiveRoleState(resolveRoleProfile(workspace));
    localStorage.setItem('octo_workspace_id', workspace.id);
    localStorage.setItem('octo_workspace', JSON.stringify(workspace));
    // Refresh page or trigger state update
    window.location.reload();
  };

  const refreshWorkspaces = async () => {
    try {
      const res = await api.getMe();
      setWorkspaces(res.workspaces);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentWorkspace,
        workspaces,
        activeRole,
        setActiveRole,
        loading,
        login,
        register,
        logout,
        switchWorkspace,
        refreshWorkspaces,
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

// Helpers
export function formatCurrencyIDR(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTimeIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

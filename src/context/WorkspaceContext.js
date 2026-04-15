// src/context/WorkspaceContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { workspaceAPI } from '../api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      // Clear stale workspace state on logout
      setWorkspaces([]);
      setActiveWorkspace(null);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await workspaceAPI.list();
      const list = data.results || data;
      setWorkspaces(list);
      if (list.length > 0 && !activeWorkspace) setActiveWorkspace(list[0]);
    } catch (_) {}
    finally { setIsLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const createWorkspace = async (payload) => {
    const { data } = await workspaceAPI.create(payload);
    setWorkspaces((prev) => [...prev, data]);
    return data;
  };

  const switchWorkspace = (workspace) => setActiveWorkspace(workspace);

  return (
    <WorkspaceContext.Provider value={{
      workspaces, activeWorkspace, isLoading,
      fetchWorkspaces, createWorkspace, switchWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
};

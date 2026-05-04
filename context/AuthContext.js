import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { KEYS, getJSON, setJSON, remove, clearAllAppData, clearLocalDataTables } from '../lib/storage';
import { startAutoSync, stopAutoSync, fullSync } from '../lib/syncManager';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const offline = (await getJSON(KEYS.OFFLINE_MODE, false)) === true;
        if (mounted) setIsOfflineMode(offline);
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data?.session || null);
          setUser(data?.session?.user || null);
        }
      } finally {
        if (mounted) setBootstrapping(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess || null);
      setUser(sess?.user || null);
    });

    startAutoSync();

    return () => {
      mounted = false;
      try { sub?.subscription?.unsubscribe?.(); } catch {}
      stopAutoSync();
    };
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    // Account-switch protection: if previous local data belonged to a
    // different user, wipe it before pulling cloud — otherwise we'd try to
    // upsert the previous user's IDs and RLS would reject everything.
    const newUserId = data?.session?.user?.id;
    const lastUserId = await getJSON(KEYS.LAST_USER_ID, null);
    if (newUserId && lastUserId && lastUserId !== newUserId) {
      await clearLocalDataTables();
    }
    if (newUserId) await setJSON(KEYS.LAST_USER_ID, newUserId);

    setRestoring(true);
    try {
      await fullSync();
    } finally {
      setRestoring(false);
    }
    await remove(KEYS.OFFLINE_MODE);
    setIsOfflineMode(false);
    return { ok: true, data };
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch {}
    // Clear local cache so the next login starts fresh from cloud and we
    // never mix data across accounts.
    await clearLocalDataTables();
    await remove(KEYS.LAST_USER_ID);
    setSession(null);
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const continueOffline = useCallback(async () => {
    await setJSON(KEYS.OFFLINE_MODE, true);
    setIsOfflineMode(true);
  }, []);

  const exitOfflineMode = useCallback(async () => {
    await remove(KEYS.OFFLINE_MODE);
    setIsOfflineMode(false);
  }, []);

  const deleteAllLocalData = useCallback(async () => {
    await clearAllAppData();
  }, []);

  const value = {
    session,
    user,
    isOfflineMode,
    bootstrapping,
    restoring,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
    resetPassword,
    continueOffline,
    exitOfflineMode,
    deleteAllLocalData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

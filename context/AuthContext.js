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
    // Hard ceiling on the bootstrap wait. If AsyncStorage or the Supabase
    // session lock hangs after the user clears app data, the spinner would
    // otherwise stick forever and the user would never reach the welcome
    // screen. Better to fall through with no session and let the gate route
    // them to welcome.
    const BOOT_TIMEOUT_MS = 4000;

    const withTimeout = (promise, fallback) =>
      Promise.race([
        promise.catch(() => fallback),
        new Promise((resolve) => setTimeout(() => resolve(fallback), BOOT_TIMEOUT_MS)),
      ]);

    (async () => {
      try {
        const offline = (await withTimeout(getJSON(KEYS.OFFLINE_MODE, false), false)) === true;
        if (mounted) setIsOfflineMode(offline);

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          { data: { session: null } }
        );
        if (mounted) {
          setSession(data?.session || null);
          setUser(data?.session?.user || null);
        }
      } catch {
        if (mounted) {
          setSession(null);
          setUser(null);
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
    // IMPORTANT: flip `restoring` BEFORE signInWithPassword. Supabase's
    // auth listener fires synchronously when the session is set, which
    // triggers DataContext's effect via user.id change. If `restoring` is
    // still false at that moment, DataContext reads a half-cleared cache
    // (no cats yet) and seeds fresh UUIDs which then get pushed to cloud
    // alongside the cats that fullSync is about to pull — causing dupes.
    setRestoring(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };

      // Account-switch protection: if previous local data belonged to a
      // different user, wipe it before pulling cloud.
      const newUserId = data?.session?.user?.id;
      const lastUserId = await getJSON(KEYS.LAST_USER_ID, null);
      if (newUserId && lastUserId && lastUserId !== newUserId) {
        await clearLocalDataTables();
      }

      // Profile-duplication guard: when transitioning from offline mode (or
      // a fresh install) to logged-in, the local cache may already hold a
      // "Personal" profile that DataContext seeded during offline use. If
      // the cloud account already has profiles, blindly pushing the local
      // one creates a duplicate side-by-side with the cloud's existing
      // default. So: peek at cloud first; if profiles exist there, drop
      // local data and let pullFromCloud rehydrate from the canonical set.
      if (newUserId) {
        try {
          const { data: cloudProfiles } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', newUserId);

          if (cloudProfiles && cloudProfiles.length > 0) {
            // Cloud is the source of truth. Wipe local (offline-seeded)
            // tables so DataContext won't seed defaults again.
            await clearLocalDataTables();
            await setJSON(KEYS.PROFILES, cloudProfiles);
            // Mark this user as already cloud-pushed so the DataContext
            // push gate doesn't try to re-upload the now-empty local set.
            const pushedMap = (await getJSON(KEYS.CLOUD_PUSHED, {})) || {};
            pushedMap[newUserId] = true;
            await setJSON(KEYS.CLOUD_PUSHED, pushedMap);
          }
        } catch {
          // Network hiccup — fall through. fullSync below will still try
          // to reconcile, and the worst case is the legacy duplicate
          // behaviour (no regression vs. before this guard).
        }
      }

      if (newUserId) await setJSON(KEYS.LAST_USER_ID, newUserId);

      // Cap the post-login sync. Flaky networks were trapping users on the
      // "Restoring your data…" loader forever. fullSync continues in the
      // background via auto-sync; we just don't block the login UX on it.
      const FULL_SYNC_TIMEOUT_MS = 10000;
      try {
        await Promise.race([
          fullSync(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('sync_timeout')), FULL_SYNC_TIMEOUT_MS)),
        ]);
      } catch {
        // ignore — auto-sync will retry
      }

      // Always reset offline-mode flag, even if the sync above timed out or
      // the user is on a flaky network. They've successfully signed in.
      await remove(KEYS.OFFLINE_MODE);
      setIsOfflineMode(false);
      return { ok: true, data };
    } finally {
      setRestoring(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch {}
    // Clear local cache so the next login starts fresh from cloud and we
    // never mix data across accounts. Also drop the OFFLINE_MODE flag so the
    // post-sign-out state is unambiguous — without this, a stale flag from a
    // previous session could keep the gate redirecting to /(tabs) and trap
    // the user on a half-empty dashboard.
    await clearLocalDataTables();
    await remove(KEYS.LAST_USER_ID);
    await remove(KEYS.OFFLINE_MODE);
    setIsOfflineMode(false);
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

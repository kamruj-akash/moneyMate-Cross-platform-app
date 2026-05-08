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

        // Restore the cached auth user FIRST. Supabase will clear its own
        // session when a refresh fails (e.g. user opens the app after weeks
        // offline, refresh token still valid but no network), and we don't
        // want that to look like a logout. AUTH_USER is our shadow identity
        // — only an explicit signOut() call removes it.
        const cachedUser = await withTimeout(getJSON(KEYS.AUTH_USER, null), null);
        if (mounted && cachedUser) {
          setUser(cachedUser);
        }

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          { data: { session: null } }
        );
        if (mounted) {
          setSession(data?.session || null);
          if (data?.session?.user) {
            // Real session — overlay the user info and refresh the cache so
            // it stays in sync with the latest server-provided fields.
            setUser(data.session.user);
            setJSON(KEYS.AUTH_USER, {
              id: data.session.user.id,
              email: data.session.user.email,
            }).catch(() => {});
          }
          // If getSession returned null but we already restored from cache
          // above, leave `user` set. Sync stays paused (gated on `session`)
          // until the network returns and supabase emits SIGNED_IN.
        }
      } catch {
        // Fall through; bootstrapping ends in finally.
      } finally {
        if (mounted) setBootstrapping(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      // Real session present — adopt it, refresh cache.
      if (sess) {
        setSession(sess);
        setUser(sess.user || null);
        if (sess.user) {
          setJSON(KEYS.AUTH_USER, { id: sess.user.id, email: sess.user.email }).catch(() => {});
        }
        return;
      }
      // No session. Drop session state but DO NOT clear `user` yet —
      // supabase fires SIGNED_OUT both for explicit logouts and for
      // automatic refresh failures (e.g. offline). Re-check the cache:
      // if AUTH_USER was removed, the user explicitly signed out, so
      // mirror that. Otherwise keep the shadow user.
      setSession(null);
      getJSON(KEYS.AUTH_USER, null).then((cached) => {
        if (!cached) setUser(null);
      }).catch(() => {});
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

      // Persist minimal user info so the UI stays "logged in" even if the
      // session is later cleared due to an offline refresh failure.
      if (data?.session?.user) {
        await setJSON(KEYS.AUTH_USER, {
          id: data.session.user.id,
          email: data.session.user.email,
        });
      }
      return { ok: true, data };
    } finally {
      setRestoring(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    // Drop AUTH_USER FIRST so the onAuthStateChange listener (which fires
    // synchronously when supabase signs out) can tell this is an explicit
    // logout rather than a refresh failure, and won't preserve the shadow
    // user state.
    await remove(KEYS.AUTH_USER);
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

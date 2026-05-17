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

    // Bootstrap is LOCAL-ONLY by design. No supabase calls, no network.
    //
    // Architecture rule: token refresh + cloud sync only happen AFTER the
    // app is open and the network listener says we're online. App-open
    // itself should never reach for the server — that was the root cause
    // of the "open after 2 days offline → spinner → welcome screen" bug.
    //
    // The Supabase session is mirrored into our state by the
    // onAuthStateChange listener below, which fires INITIAL_SESSION with
    // whatever's already in supabase's storage. Our AUTH_USER cache is the
    // durable identity that survives offline refresh failures.
    (async () => {
      try {
        const offline = await getJSON(KEYS.OFFLINE_MODE, false);
        const cachedUser = await getJSON(KEYS.AUTH_USER, null);

        if (!mounted) return;
        setIsOfflineMode(offline === true);
        if (cachedUser) setUser(cachedUser);
      } catch {
        // Local read failed — fall through. Worst case the user lands on
        // welcome; they can sign in again.
      } finally {
        if (mounted) setBootstrapping(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      // Real session present — adopt it, refresh the AUTH_USER cache so
      // future cold starts have the latest email/id.
      if (sess) {
        setSession(sess);
        setUser(sess.user || null);
        if (sess.user) {
          setJSON(KEYS.AUTH_USER, { id: sess.user.id, email: sess.user.email }).catch(() => {});
        }
        return;
      }
      // No session. Drop session state but DO NOT clear `user` — supabase
      // fires SIGNED_OUT both for explicit logouts and for transient
      // refresh failures. Only an explicit signOut() removes AUTH_USER.
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
    // "Logged in" from the user's perspective is governed by the cached
    // user identity, not the (volatile) Supabase session — sessions are
    // wiped by the supabase SDK on any refresh failure, including transient
    // ones like "offline for 2 days". The cached user only goes away when
    // signOut() is explicitly called. Cloud writes are still gated on a
    // real session via syncManager, so this stays safe.
    isAuthenticated: !!user,
    // Surfaces whether we have a real, server-validated session right now.
    // Use this when you specifically need to know if cloud calls are
    // possible (sync UI hints, for example).
    hasActiveSession: !!session,
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

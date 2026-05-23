import { createContext, useContext, useEffect, useState } from 'react';

import {
  checkApiReachable,
  enterPreviewMode,
  enterProviderPreviewMode,
  getApiBaseLabel,
  hasLiveApi,
  hydrateSession,
  registerLive,
  signInLive,
  signOut,
  updateProfile,
} from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    ready: false,
    mode: 'guest',
    user: null,
  });
  const [apiReachable, setApiReachable] = useState(null);

  useEffect(() => {
    let active = true;
    const apiConfigured = hasLiveApi();

    setApiReachable(apiConfigured ? null : false);

    hydrateSession()
      .then((nextSession) => {
        if (!active) return;
        setSession({ ready: true, ...nextSession });
      })
      .catch(() => {
        if (!active) return;
        setSession({ ready: true, mode: 'guest', user: null });
      });

    if (apiConfigured) {
      checkApiReachable().then((reachable) => {
        if (!active) return;
        setApiReachable(reachable);
      });
    }

    return () => {
      active = false;
    };
  }, []);

  async function signIn(email, password) {
    const user = await signInLive(email, password);
    setSession({ ready: true, mode: 'live', user });
    return user;
  }

  async function register(payload) {
    const user = await registerLive(payload);
    setSession({ ready: true, mode: 'live', user });
    return user;
  }

  async function preview() {
    const user = await enterPreviewMode();
    setSession({ ready: true, mode: 'demo', user });
    return user;
  }

  async function previewProvider() {
    const user = await enterProviderPreviewMode();
    setSession({ ready: true, mode: 'demo', user });
    return user;
  }

  async function logout() {
    await signOut();
    setSession({ ready: true, mode: 'guest', user: null });
  }

  async function saveProfile(payload) {
    const user = await updateProfile(session.mode, payload);
    setSession((current) => ({
      ...current,
      user: { ...current.user, ...user },
    }));
    return user;
  }

  const value = {
    ...session,
    apiConfigured: hasLiveApi(),
    apiLabel: getApiBaseLabel(),
    apiReachable,
    signIn,
    register,
    preview,
    previewProvider,
    logout,
    saveProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}

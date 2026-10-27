import { useSyncExternalStore } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { getProfile, type Profile, type Role } from './profiles';

export type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  // true until the saved session (and profile) has been checked
  loading: boolean;
};

let state: AuthState = {
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
};

const listeners = new Set<() => void>();

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

async function loadProfile(user: User | null) {
  if (!user) {
    setState({ profile: null, role: null, loading: false });
    return;
  }
  const profile = await getProfile(user.id);
  // Lowest privilege if the profile row cannot be read.
  setState({ profile, role: profile?.role ?? 'student', loading: false });
}

export async function refreshProfile() {
  await loadProfile(state.user);
}

let initialized = false;

// EVENT: Supabase emits auth events (INITIAL_SESSION, SIGNED_IN, SIGNED_OUT,
// TOKEN_REFRESHED, ...). This single subscription keeps the whole app in sync.
export function initAuth() {
  if (initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user ?? null;

    if (event === 'SIGNED_OUT' || !user) {
      setState({ session: null, user: null, profile: null, role: null, loading: false });
      return;
    }

    const sameUser = state.user?.id === user.id && state.profile !== null;
    setState({ session, user, loading: sameUser ? state.loading : true });

    // Token refreshes only need the new session, not a new profile fetch.
    if (event === 'TOKEN_REFRESHED' && sameUser) return;

    // Do not await Supabase calls inside this callback (can deadlock);
    // defer them to the next tick instead.
    setTimeout(() => {
      loadProfile(user);
    }, 0);
  });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export type SignUpProfile = {
  full_name: string;
  id_number?: string;
};

// The role is NOT sent. Every new account is a student; the database
// trigger forces this, and only an admin can promote someone.
export async function signUp(
  email: string,
  password: string,
  profile: SignUpProfile
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: profile.full_name,
        id_number: profile.id_number ?? '',
      },
    },
  });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  // Clear local state even if the network call failed.
  setState({ session: null, user: null, profile: null, role: null, loading: false });
  return { error: error?.message ?? null };
}

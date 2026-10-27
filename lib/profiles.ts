import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  id_number: string | null;
};

const PROFILE_COLUMNS = 'id, email, full_name, role, id_number';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

// Role is intentionally NOT editable here. Only an administrator can change
// roles (setUserRole) and the database enforces it with a trigger + RLS.
export async function updateProfile(
  userId: string,
  updates: { full_name?: string; id_number?: string | null }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error?.message ?? null };
}

// ----- Administrator only -----

export async function listProfiles(): Promise<{
  profiles: Profile[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('full_name', { ascending: true });

  if (error || !data) {
    return { profiles: [], error: error?.message ?? 'Could not load users.' };
  }
  return { profiles: data as Profile[], error: null };
}

export async function setUserRole(
  userId: string,
  role: Role
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  return { error: error?.message ?? null };
}

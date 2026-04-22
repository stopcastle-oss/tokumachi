import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/index";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => () => void;
  logout: () => Promise<void>;
}

const fetchProfile = async (userId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data as Profile | null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  initialize: () => {
    const supabase = createClient();

    // Set initial state immediately
    supabase.auth.getUser().then(async (res) => {
      const user: User | null = res.data.user;
      if (user) {
        set({ user, loading: false, initialized: true });
        const profile = await fetchProfile(user.id);
        if (profile) set({ profile });
      } else {
        set({ user: null, profile: null, loading: false, initialized: true });
      }
    });

    // Listen for future changes (login/logout after initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          set({ user: session.user, loading: false, initialized: true });
          const profile = await fetchProfile(session.user.id);
          if (profile) set({ profile });
        } else {
          set({ user: null, profile: null, loading: false, initialized: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  },

  logout: async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/sync', { method: 'DELETE' });
      set({ user: null, profile: null });
    } catch (error) {
      console.error("Logout error:", error);
    }
  },
}));

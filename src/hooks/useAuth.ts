'use client';

import { useAuthStore } from '@/store/auth';

export const useAuth = () => {
  const { user, profile, loading, initialized, setUser, setProfile, logout } = useAuthStore();

  return {
    user,
    profile,
    loading,
    initialized,
    isAuthenticated: !!user,
    setUser,
    setProfile,
    logout,
  };
};

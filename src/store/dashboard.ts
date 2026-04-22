import { create } from 'zustand';

interface DashboardState {
  todayCount: number;
  setTodayCount: (count: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  todayCount: 0,
  setTodayCount: (count) => set({ todayCount: count }),
}));

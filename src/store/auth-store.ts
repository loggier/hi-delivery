"use client";

import { create } from "zustand";
import Cookies from "js-cookie";
import { type User } from "@/types";

const AUTH_COOKIE_NAME = "hub_session";

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: (user) => {
    const userWithRole = { ...user, role: 'ADMIN' };
    Cookies.set(AUTH_COOKIE_NAME, JSON.stringify(userWithRole), { expires: 7 });
    set({ user: userWithRole, isAuthenticated: true });
  },
  logout: () => {
    Cookies.remove(AUTH_COOKIE_NAME);
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: () => {
    try {
      const cookie = Cookies.get(AUTH_COOKIE_NAME);
      if (cookie) {
        const user = JSON.parse(cookie);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Initialize auth check on client-side
if (typeof window !== "undefined") {
  useAuthStore.getState().checkAuth();
}

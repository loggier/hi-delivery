"use client";

import { create } from "zustand";
import { type User } from "@/types";

// The key for storing the session in localStorage.
export const AUTH_STORAGE_KEY = "supabase_session";

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as true to indicate we haven't checked auth yet.
  
  login: (user) => {
    const userWithRole = { ...user, role: 'ADMIN' };
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithRole));
      set({ user: userWithRole, isAuthenticated: true });
    } catch (e) {
      console.error("Failed to save session to localStorage", e);
    }
  },

  logout: () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear session from localStorage", e);
    }
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: () => {
    // This function should only run on the client-side.
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    try {
      const sessionUserString = localStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionUserString) {
        const user = JSON.parse(sessionUserString);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error("Failed to parse user session, logging out.", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Initialize auth check on client-side when the store is first imported.
if (typeof window !== "undefined") {
  useAuthStore.getState().checkAuth();
}

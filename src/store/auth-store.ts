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
    // In a real app, the user object would come from your API/Supabase response
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      set({ user: user, isAuthenticated: true });
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
      // On the server, we assume no user is logged in and we are not loading.
      // The middleware will handle server-side redirects.
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
// This ensures that any component using the store will have the correct initial auth state.
useAuthStore.getState().checkAuth();

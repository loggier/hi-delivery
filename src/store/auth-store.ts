
"use client";

import { create } from "zustand";
import { type User } from "@/types";

export const AUTH_STORAGE_KEY = "hid-session";

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => void;
};

type SessionData = {
    user: User;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, 
  
  login: (user) => {
    try {
      const sessionData: SessionData = { user };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
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
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    try {
      const sessionString = localStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionString) {
        const sessionData: SessionData = JSON.parse(sessionString);
        set({ user: sessionData.user, isAuthenticated: true, isLoading: false });
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

// Initialize auth state on load
if (typeof window !== 'undefined') {
    useAuthStore.getState().checkAuth();
}

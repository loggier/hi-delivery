"use client";

import { create } from "zustand";
import { type User } from "@/types";

export const AUTH_STORAGE_KEY = "supabase_session";

type AuthState = {
  user: User | null;
  riderId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, riderId?: string) => void;
  logout: () => void;
  checkAuth: () => void;
};

type SessionData = {
    user: User;
    riderId?: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  riderId: null,
  isAuthenticated: false,
  isLoading: true, 
  
  login: (user, riderId) => {
    try {
      const sessionData: SessionData = { user };
      if (riderId) {
        sessionData.riderId = riderId;
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      set({ user: user, riderId: riderId || null, isAuthenticated: true });
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
    set({ user: null, riderId: null, isAuthenticated: false });
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
        set({ user: sessionData.user, riderId: sessionData.riderId || null, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, riderId: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error("Failed to parse user session, logging out.", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      set({ user: null, riderId: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

useAuthStore.getState().checkAuth();

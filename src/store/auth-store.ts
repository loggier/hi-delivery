"use client";

import { create } from "zustand";
import { type User } from "@/types";

const AUTH_STORAGE_KEY = "supabase_session";

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
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithRole));
        set({ user: userWithRole, isAuthenticated: true });
    } catch (e) {
        console.error("Fallo al guardar la sesión en localStorage", e);
    }
  },
  logout: () => {
    try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
        console.error("Fallo al limpiar la sesión de localStorage", e);
    }
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: () => {
    try {
      const sessionUserString = localStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionUserString) {
        const user = JSON.parse(sessionUserString);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error("Fallo al parsear la sesión de usuario, cerrando sesión.", error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

// Initialize auth check on client-side
if (typeof window !== "undefined") {
  useAuthStore.getState().checkAuth();
}

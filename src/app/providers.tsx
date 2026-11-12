"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Se mueve la creación del cliente fuera del componente para asegurar que solo se cree una vez.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Un 401/403 no se reintenta: la sesión no cambia en segundos y los reintentos alargan la pantalla.
      retry: (failureCount, error) => {
        const status = (error as { status?: number } | null)?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 3;
      },
    },
  },
});

function BodyLockResetter() {
  React.useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const restoreBody = () => {
      const openModal = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      );

      if (!openModal) {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    };

    restoreBody();
    const observer = new MutationObserver(restoreBody);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["style", "class", "data-state", "aria-hidden"],
    });

    const interval = window.setInterval(restoreBody, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <BodyLockResetter />
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

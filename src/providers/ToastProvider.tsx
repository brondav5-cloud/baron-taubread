"use client";

import { Toaster } from "react-hot-toast";
import type { ReactNode } from "react";

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-left"
        reverseOrder={false}
        gutter={12}
        containerClassName=""
        containerStyle={{
          bottom: 24,
          left: 24,
          right: "auto",
        }}
        toastOptions={{
          // Default options for all toasts
          duration: 4000,
          style: {
            background: "#fff",
            color: "#1f2937",
            padding: "16px",
            borderRadius: "12px",
            boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.15)",
            fontSize: "14px",
            maxWidth: "400px",
            direction: "rtl",
          },
          // Custom options for specific types
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#22c55e",
              secondary: "#fff",
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
          loading: {
            iconTheme: {
              primary: "#3b82f6",
              secondary: "#fff",
            },
          },
        }}
      />
    </>
  );
}

// Re-export toast functions for convenience
export { toast } from "react-hot-toast";

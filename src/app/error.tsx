"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center p-8"
      dir="rtl"
    >
      <div className="max-w-md text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">אירעה שגיאה</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
        >
          נסה שוב
        </button>
      </div>
    </div>
  );
}

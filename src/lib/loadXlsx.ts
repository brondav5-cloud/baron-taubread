/**
 * Dynamic loader for xlsx (SheetJS) that bypasses webpack/SWC bundling.
 *
 * SWC minifier corrupts xlsx internal constants, causing "Unknown Namespace"
 * errors. Loading the pre-built minified version from /public avoids this.
 */

type XLSXModule = typeof import("xlsx");

let cached: XLSXModule | null = null;
let loading: Promise<XLSXModule> | null = null;

export async function loadXlsx(): Promise<XLSXModule> {
  if (cached) return cached;

  if (typeof window !== "undefined" && (window as any).XLSX) {
    cached = (window as any).XLSX;
    return cached!;
  }

  if (!loading) {
    loading = new Promise<XLSXModule>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/xlsx.full.min.js";
      script.onload = () => {
        cached = (window as any).XLSX;
        resolve(cached!);
      };
      script.onerror = () => {
        loading = null; // allow retry on next call
        reject(new Error("Failed to load xlsx library"));
      };
      document.head.appendChild(script);
    });
  }

  return loading;
}

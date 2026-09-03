"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

const SCROLL_STEP = 320;

function isRtl(el: HTMLElement) {
  return getComputedStyle(el).direction === "rtl";
}

/** Distance from inline-start (right in RTL), always 0..max. */
function scrollFromStart(el: HTMLElement) {
  const sl = el.scrollLeft;
  return sl < 0 ? -sl : sl;
}

function usesNegativeRtlScroll(el: HTMLElement) {
  if (el.scrollLeft < 0) return true;
  if (!isRtl(el) || el.scrollLeft > 0) return false;
  el.scrollLeft = 1;
  const wentPositive = el.scrollLeft > 0;
  el.scrollLeft = 0;
  return !wentPositive;
}

function setScrollFromStart(el: HTMLElement, value: number) {
  const max = Math.max(0, el.scrollWidth - el.clientWidth);
  const next = Math.max(0, Math.min(max, value));
  el.scrollTo({
    left: usesNegativeRtlScroll(el) ? -next : next,
    behavior: "smooth",
  });
}

interface HorizontalScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function HorizontalScrollArea({
  children,
  className,
}: HorizontalScrollAreaProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) {
      setHasOverflow(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const fromStart = scrollFromStart(el);
    const rtl = isRtl(el);
    setHasOverflow(true);
    if (rtl) {
      setCanScrollLeft(fromStart < max - 2);
      setCanScrollRight(fromStart > 2);
    } else {
      setCanScrollLeft(fromStart > 2);
      setCanScrollRight(fromStart < max - 2);
    }
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update, { passive: true });

    const ro = new ResizeObserver(update);
    ro.observe(el);
    const child = el.firstElementChild;
    if (child) ro.observe(child);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const scrollVisual = (visual: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const rtl = isRtl(el);
    const towardEnd = rtl ? visual === "left" : visual === "right";
    const delta = towardEnd ? SCROLL_STEP : -SCROLL_STEP;
    setScrollFromStart(el, scrollFromStart(el) + delta);
  };

  return (
    <div className={clsx("relative", className)}>
      {hasOverflow && (
        <>
          <div
            className={clsx(
              "pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-l from-transparent to-white transition-opacity",
              canScrollLeft ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            className={clsx(
              "pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-r from-transparent to-white transition-opacity",
              canScrollRight ? "opacity-100" : "opacity-0",
            )}
          />
          <button
            type="button"
            aria-label="גלול שמאלה"
            disabled={!canScrollLeft}
            onClick={() => scrollVisual("left")}
            className={clsx(
              "absolute left-2 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow-md transition-opacity",
              canScrollLeft
                ? "border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                : "pointer-events-none opacity-0",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="גלול ימינה"
            disabled={!canScrollRight}
            onClick={() => scrollVisual("right")}
            className={clsx(
              "absolute right-2 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow-md transition-opacity",
              canScrollRight
                ? "border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                : "pointer-events-none opacity-0",
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        ref={scrollerRef}
        className="overflow-x-auto overflow-y-visible scroll-smooth touch-pan-x [scrollbar-width:thin]"
      >
        {children}
      </div>
    </div>
  );
}

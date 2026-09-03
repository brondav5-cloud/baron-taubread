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
const HEADER_OFFSET = 80;
const BOTTOM_OFFSET = 88;

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [dock, setDock] = useState({
    visible: false,
    top: 0,
    left: 0,
    right: 0,
  });

  const updateOverflow = useCallback(() => {
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

  const updateDock = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const visibleTop = Math.max(rect.top, HEADER_OFFSET);
    const visibleBottom = Math.min(
      rect.bottom,
      window.innerHeight - BOTTOM_OFFSET,
    );
    const visibleHeight = visibleBottom - visibleTop;
    setDock({
      visible: visibleHeight > 64,
      top: visibleTop + visibleHeight / 2,
      left: rect.left + 8,
      right: window.innerWidth - rect.right + 8,
    });
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;

    const sync = () => {
      updateOverflow();
      updateDock();
    };
    sync();

    el.addEventListener("scroll", updateOverflow, { passive: true });
    document.addEventListener("scroll", updateDock, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", sync);

    const ro = new ResizeObserver(sync);
    ro.observe(el);
    ro.observe(wrap);
    const child = el.firstElementChild;
    if (child) ro.observe(child);

    return () => {
      el.removeEventListener("scroll", updateOverflow);
      document.removeEventListener("scroll", updateDock, { capture: true });
      window.removeEventListener("resize", sync);
      ro.disconnect();
    };
  }, [updateOverflow, updateDock]);

  const scrollVisual = (visual: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const rtl = isRtl(el);
    const towardEnd = rtl ? visual === "left" : visual === "right";
    const delta = towardEnd ? SCROLL_STEP : -SCROLL_STEP;
    setScrollFromStart(el, scrollFromStart(el) + delta);
  };

  const showArrows = hasOverflow && dock.visible;

  return (
    <div ref={wrapRef} className={clsx("relative", className)}>
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
        </>
      )}

      {showArrows && (
        <>
          <button
            type="button"
            aria-label="גלול שמאלה"
            disabled={!canScrollLeft}
            onClick={() => scrollVisual("left")}
            style={{ top: dock.top, left: dock.left }}
            className={clsx(
              "fixed z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-md transition-opacity",
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
            style={{ top: dock.top, right: dock.right }}
            className={clsx(
              "fixed z-40 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-md transition-opacity",
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

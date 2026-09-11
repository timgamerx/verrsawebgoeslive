import { useEffect, useCallback, useRef } from "react";

import { Platform } from '../lib/reactNativeShim';
interface UseWebRefreshOptions {
  onRefresh?: () => void;
  preserveScrollPosition?: boolean;
  screenName?: string;
}

/**
 * Custom hook for handling web browser refresh behavior
 * This ensures that refreshing the browser only refreshes the current screen
 * instead of resetting the entire app
 */
export const useWebRefresh = (options: UseWebRefreshOptions = {}) => {
  const { onRefresh, preserveScrollPosition = true, screenName } = options;

  // Handle screen focus for refresh detection
  useEffect(
    useCallback(() => {
      if (Platform.OS !== "web") return;

      // Store current screen info
      try {
        if (screenName) {
          sessionStorage.setItem("currentScreen", screenName);
        }

        // Store scroll position if needed
        if (preserveScrollPosition && typeof window !== "undefined") {
          const scrollY = window.scrollY;
          sessionStorage.setItem("scrollPosition", scrollY.toString());
        }
      } catch (e) {
        // Ignore storage errors
      }

      // Check if this is a refresh (not navigation)
      const checkRefresh = () => {
        try {
          const wasRefreshed = sessionStorage.getItem("wasRefreshed");
          if (wasRefreshed === "true") {
            sessionStorage.removeItem("wasRefreshed");

            // Restore scroll position
            if (preserveScrollPosition) {
              const savedScrollY = sessionStorage.getItem("scrollPosition");
              if (savedScrollY && typeof window !== "undefined") {
                setTimeout(() => {
                  window.scrollTo(0, parseInt(savedScrollY, 10));
                }, 100);
              }
            }

            // Call custom refresh handler
            if (onRefresh) {
              onRefresh();
            }
          }
        } catch (e) {
          // Ignore storage errors
        }
      };

      checkRefresh();

      // Set up beforeunload handler for this screen
      const handleBeforeUnload = () => {
        try {
          sessionStorage.setItem("wasRefreshed", "true");
        } catch (e) {
          // Ignore storage errors
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }, [onRefresh, preserveScrollPosition, screenName])
  );

  // Provide manual refresh function
  const manualRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  return { manualRefresh };
};

/**
 * Hook for web refresh - removed pull-to-refresh due to sensitivity issues
 * Use keyboard shortcuts or explicit refresh buttons instead
 */
export const useWebRefreshShortcuts = (onRefresh: () => void) => {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + R for refresh (let browser handle default)
      // F5 for refresh
      if (
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key === "r")
      ) {
        // Let the browser handle the refresh naturally
        return;
      }

      // Optional: Add Ctrl/Cmd + Shift + R for hard refresh with data reload
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "R"
      ) {
        event.preventDefault();
        onRefresh();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onRefresh]);
};

export const useTabPageRefresh = ({
  onRefresh,
  onBackgroundRefresh,
  scrollRef,
  refreshThreshold = 72,
}: {
  onRefresh?: () => Promise<void> | void;
  onBackgroundRefresh?: () => Promise<void> | void;
  scrollRef?: React.RefObject<HTMLElement | null>;
  refreshThreshold?: number;
}) => {
  const isRefreshingRef = useRef(false);

  const triggerRefresh = useCallback(
    async (background = false) => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        if (background) {
          await onBackgroundRefresh?.();
        } else {
          await onRefresh?.();
        }
      } finally {
        isRefreshingRef.current = false;
      }
    },
    [onBackgroundRefresh, onRefresh],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh(true);
      }
    };

    const handleWindowFocus = () => {
      triggerRefresh(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [triggerRefresh]);

  useEffect(() => {
    if (!scrollRef?.current || typeof window === "undefined") return;

    const element = scrollRef.current;
    let startY: number | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (element.scrollTop <= 0) {
        startY = event.touches[0]?.clientY ?? null;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (startY === null || element.scrollTop > 0) return;
      const deltaY = (event.touches[0]?.clientY ?? 0) - startY;
      if (deltaY > refreshThreshold) {
        triggerRefresh(false);
        startY = null;
      }
    };

    const handleTouchEnd = () => {
      startY = null;
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [refreshThreshold, scrollRef, triggerRefresh]);

  return { refresh: triggerRefresh };
};

/**
 * Hook for handling browser back/forward navigation
 */
export const useWebNavigation = () => {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      // React Navigation automatically handles this, but we can add custom logic
      console.log("Browser navigation detected");
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + R for refresh (default browser behavior)
      // Ctrl/Cmd + Left Arrow for back
      if ((event.ctrlKey || event.metaKey) && event.key === "ArrowLeft") {
        event.preventDefault();
        window.history.back();
      }

      // Ctrl/Cmd + Right Arrow for forward (if available)
      if ((event.ctrlKey || event.metaKey) && event.key === "ArrowRight") {
        event.preventDefault();
        // React Navigation doesn't have a built-in forward function
        // but browser's forward button will work with our linking setup
      }
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
};

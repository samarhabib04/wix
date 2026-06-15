// @ts-nocheck
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  saveScrollPosition,
  getSavedScrollPosition,
  getClickedItemId,
  clearClickedItemId,
  scrollToElement
} from '@/lib/utils/scroll-restoration';

/**
 * Enhanced scroll restoration hook that handles:
 * 1. Page-level scroll position restoration
 * 2. Item-level scroll restoration (scrolling to specific items)
 * 3. Smart scroll behavior based on navigation type
 * 
 * Note: Next.js handles scroll restoration automatically, but this hook provides
 * additional functionality for item-level scrolling and custom scroll behavior.
 */
export function useScrollRestoration() {
  const pathname = usePathname();
  const hasRestoredRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);

  // Set manual scroll restoration on mount
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Handle scroll restoration based on navigation
  useEffect(() => {
    const currentPath = pathname;
    const isNewPage = prevPathnameRef.current !== null && prevPathnameRef.current !== currentPath;
    prevPathnameRef.current = currentPath;

    // Reset restoration flag when pathname changes
    if (isNewPage) {
      hasRestoredRef.current = false;
    }

    // On new page navigation, check if we should scroll to a specific item
    if (isNewPage) {
      // Check if we should scroll to a specific item
      const clickedItemId = getClickedItemId(currentPath);
      
      if (clickedItemId) {
        // Scroll to the specific item that was clicked
        scrollToElement(clickedItemId);
        clearClickedItemId(currentPath);
        hasRestoredRef.current = true;
        return;
      }
      
      // For new pages, scroll to top (Next.js default behavior)
      // But allow item-level scrolling to override
      window.scrollTo(0, 0);
    } else {
      // On back/forward navigation, restore scroll position
      const clickedItemId = getClickedItemId(currentPath);
      
      if (clickedItemId) {
        scrollToElement(clickedItemId);
        clearClickedItemId(currentPath);
        hasRestoredRef.current = true;
      } else {
        // Restore general scroll position
        const savedScroll = getSavedScrollPosition(currentPath);
        if (savedScroll !== null) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              window.scrollTo(0, savedScroll);
              hasRestoredRef.current = true;
            }, 0);
          });
        }
      }
    }

    // Save scroll position periodically while on page
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!hasRestoredRef.current) return; // Don't save during restoration
        saveScrollPosition(currentPath);
      }, 150); // Debounce scroll saves
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Save scroll position before navigating away
    const handleBeforeUnload = () => {
      saveScrollPosition(currentPath);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(scrollTimeout);
      // Save final scroll position when unmounting
      saveScrollPosition(currentPath);
    };
  }, [pathname]);

  // Mark restoration as complete after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      hasRestoredRef.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, [pathname]);
}

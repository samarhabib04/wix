/**
 * Scroll Restoration Utilities
 * Provides utilities for saving and restoring scroll positions across navigation
 */

const SCROLL_POSITION_PREFIX = 'scroll_position_';
const SCROLL_ITEM_PREFIX = 'scroll_item_';

/**
 * Save current scroll position for a route
 */
export function saveScrollPosition(pathname: string): void {
  const scrollY = window.scrollY;
  sessionStorage.setItem(`${SCROLL_POSITION_PREFIX}${pathname}`, scrollY.toString());
}

/**
 * Get saved scroll position for a route
 */
export function getSavedScrollPosition(pathname: string): number | null {
  const saved = sessionStorage.getItem(`${SCROLL_POSITION_PREFIX}${pathname}`);
  return saved ? parseInt(saved, 10) : null;
}

/**
 * Save the ID of an item that was clicked (for restoring scroll to that item)
 */
export function saveClickedItemId(itemId: string, sourcePathname: string): void {
  sessionStorage.setItem(`${SCROLL_ITEM_PREFIX}${sourcePathname}`, itemId);
}

/**
 * Get the ID of the item that was clicked from this route
 */
export function getClickedItemId(pathname: string): string | null {
  return sessionStorage.getItem(`${SCROLL_ITEM_PREFIX}${pathname}`);
}

/**
 * Clear clicked item ID for a route
 */
export function clearClickedItemId(pathname: string): void {
  sessionStorage.removeItem(`${SCROLL_ITEM_PREFIX}${pathname}`);
}

/**
 * Scroll to an element by ID with retry logic
 */
export function scrollToElement(elementId: string, maxRetries = 10, delay = 100): void {
  let attempts = 0;
  
  const tryScroll = () => {
    const element = document.getElementById(elementId);
    
    if (element) {
      // Use smooth scroll with offset for better UX
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - 100; // 100px offset from top
      
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
      
      // Highlight the element briefly
      element.style.transition = 'background-color 0.5s ease';
      element.style.backgroundColor = 'rgba(var(--primary), 0.1)';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 1000);
      
      return true;
    }
    
    attempts++;
    if (attempts < maxRetries) {
      setTimeout(tryScroll, delay);
    }
    
    return false;
  };
  
  // Start trying after a short delay to allow content to render
  setTimeout(tryScroll, 50);
}

/**
 * Generate a unique scroll ID for an item
 */
export function generateScrollId(type: string, id: string): string {
  return `scroll-item-${type}-${id}`;
}

/**
 * Clear all scroll restoration data for a specific pathname
 */
export function clearScrollData(pathname: string): void {
  sessionStorage.removeItem(`${SCROLL_POSITION_PREFIX}${pathname}`);
  sessionStorage.removeItem(`${SCROLL_ITEM_PREFIX}${pathname}`);
}

/**
 * Clear all scroll restoration data
 */
export function clearAllScrollData(): void {
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith(SCROLL_POSITION_PREFIX) || key.startsWith(SCROLL_ITEM_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  });
}

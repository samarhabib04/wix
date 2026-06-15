'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { saveClickedItemId, generateScrollId } from '@/lib/utils/scroll-restoration';

/**
 * Hook to handle navigation with scroll restoration to specific items
 * Usage: const navigateWithScroll = useScrollToItem();
 * navigateWithScroll('/listings/123', 'listing', '123');
 */
export function useScrollToItem() {
  const pathname = usePathname();
  const router = useRouter();

  const navigateWithScroll = useCallback(
    (targetPath: string, itemType: string, itemId: string) => {
      // Generate unique scroll ID for this item
      const scrollId = generateScrollId(itemType, itemId);
      
      // Save the clicked item ID so we can scroll to it when coming back
      saveClickedItemId(scrollId, pathname);
      
      // Navigate to the target page
      router.push(targetPath);
    },
    [pathname, router]
  );

  return navigateWithScroll;
}

/**
 * Generate props for an item that should be scrollable to
 * Usage: <div {...getScrollableItemProps('listing', listingId)}>
 */
export function getScrollableItemProps(itemType: string, itemId: string) {
  return {
    id: generateScrollId(itemType, itemId),
    'data-scroll-item': itemType,
    'data-scroll-id': itemId,
  };
}

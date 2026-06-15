
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PaginatedGridProps<T> {
  items: T[];
  renderItem: (item: T, index?: number) => React.ReactNode;
  emptyState: React.ReactNode;
  itemsPerPage?: number;
  initialPage?: number;
}

export function PaginatedGrid<T>({
  items,
  renderItem,
  emptyState,
  itemsPerPage: propItemsPerPage,
  initialPage = 1
}: PaginatedGridProps<T>) {
  const isMobile = useIsMobile();
  
  // Adjust items per page based on screen size
  const getItemsPerPage = () => {
    // If itemsPerPage is explicitly provided, use it for all screen sizes
    if (propItemsPerPage) return propItemsPerPage;
    // Otherwise, adjust based on screen size
    if (isMobile) return 6;  // Less items for mobile
    return 9;  // Default for desktop
  };
  
  const itemsPerPage = getItemsPerPage();
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  // Calculate the total number of pages
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages, items.length]);
  
  // Get the current items to display
  const getCurrentItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top when changing page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);
  
  // If there are no items, render the empty state
  if (items.length === 0) {
    return <>{emptyState}</>;
  }
  
  const currentItems = getCurrentItems();
  
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Grid of items">
        {currentItems.map((item, index) => (
          <div key={index} className="flex-1">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      {/* Pagination Controls - Always show when there are items */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 pt-6 border-t-2 border-gray-300 bg-white sticky bottom-0 z-10 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="cursor-pointer disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(page)}
                    className={cn(
                      "min-w-[40px] cursor-pointer",
                      currentPage === page 
                        ? "bg-brand-dark-green hover:bg-brand-soft-green text-white" 
                        : ""
                    )}
                  >
                    {page}
                  </Button>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return (
                  <span key={page} className="px-2 text-gray-500">
                    ...
                  </span>
                );
              }
              return null;
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="cursor-pointer disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

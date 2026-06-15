
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ListingsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

const ListingsPagination = ({ 
  currentPage, 
  totalPages, 
  totalCount, 
  onPageChange 
}: ListingsPaginationProps) => {
  // Always show pagination if there are any listings
  if (totalCount === 0) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div 
      className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t bg-white shadow-sm rounded-lg"
      style={{ 
        width: '100%', 
        maxWidth: '100%',
        marginLeft: 0,
        marginRight: 0
      }}
    >
      <div className="text-sm text-gray-700 font-medium">
        Showing <span className="font-semibold text-gray-900">{Math.min((currentPage - 1) * 6 + 1, totalCount)}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * 6, totalCount)}</span> of <span className="font-semibold text-gray-900">{totalCount}</span> results
      </div>
      
      {totalPages > 1 ? (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
            className="cursor-pointer disabled:opacity-50"
        >
            <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {visiblePages.map((page, index) => (
          <Button
            key={index}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
              className={page === currentPage ? "bg-brand-dark-green hover:bg-brand-soft-green text-white" : "min-w-[40px] cursor-pointer"}
          >
            {page}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
            className="cursor-pointer disabled:opacity-50"
        >
          Next
            <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      ) : (
        <div className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </div>
      )}
    </div>
  );
};

export default ListingsPagination;

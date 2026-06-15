'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Filter, ChevronDown, ChevronUp, RotateCcw, ArrowUp, Star, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import NavigationSection from "@/components/NavigationSection";
import { useUserDirectory } from "@/hooks/useUserDirectory";
import { irishCounties } from "@/lib/utils/irish-data";

const UserDirectory = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(""); // What user types in input
  const [activeSearchQuery, setActiveSearchQuery] = useState(""); // What's actually searched
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [countyFilter, setCountyFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isMobile = useIsMobile();
  const usersPerPage = 8;

  // Use server-side pagination with search and filters
  const { data, isLoading, isFetching, error } = useUserDirectory({
    page: currentPage,
    limit: usersPerPage,
    searchQuery: activeSearchQuery,
    roleFilter,
    countyFilter
  });

  const users = data?.users || [];
  const totalPages = data?.totalPages || 0;

  // Handle search trigger
  const handleSearch = () => {
    setActiveSearchQuery(searchQuery);
    setCurrentPage(1);
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search input
  const clearSearch = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setCurrentPage(1);
  };

  // Reset all filters function
  const resetFilters = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setRoleFilter(undefined);
    setCountyFilter(undefined);
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchQuery, roleFilter, countyFilter]);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Handle profile view
  const viewProfile = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Show initial loading state only on first load
  if (isLoading) {
    return (
      <>
         <div className="w-full bg-[#d1e2c4] bg-opacity-20">
        <div className="container mx-auto px-4 py-8 pb-12">
            <h1 className="text-3xl font-berkshire mt-0 mb-8 text-center">Dog Quest User Directory</h1>
            <div className="text-center py-10 bg-white rounded-lg shadow-sm">
              <p className="text-gray-500">Loading user directory...</p>
            </div>
          </div>
        </div>
        <NavigationSection />
      </>
    );
  }

  if (error) {
    return (
      <>
            <div className="w-full bg-[#d1e2c4] bg-opacity-20">
        <div className="container mx-auto px-4 py-8 pb-12">
            <h1 className="text-3xl font-berkshire mt-0 mb-8 text-center">Dog Quest User Directory</h1>
            <div className="text-center py-10 bg-white rounded-lg shadow-sm">
              <p className="text-red-500">Error loading user directory. Please try again later.</p>
            </div>
          </div>
        </div>
        <NavigationSection />
      </>
    );
  }

  return (
    <>
      <div className="w-full bg-[#d1e2c4] bg-opacity-20">
        <div className="container mx-auto px-4 py-8 pb-12">
          <h1 className="text-4xl font-berkshire mt-0 mb-8 md:mb-12 text-center">Dog Quest User Directory</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-brand-soft-green">
           {/* Desktop layout - all filters in one row including search and reset button */}
{!isMobile ? (
  <div className="grid grid-cols-12 gap-4 items-end">
    {/* Search bar - takes up more space */}
    <div className="col-span-5">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input 
          type="text"
          placeholder="Search users by name, county, or role..."
          className="pl-10 pr-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleSearchKeyPress}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    </div>

    {/* Search Button - now smaller */}
    <div className="col-span-1">
      <Button 
        onClick={handleSearch}
        className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white px-2"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
    
    {/* Role filter */}
    <div className="col-span-2">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-brand-soft-green" />
        <Select value={roleFilter || "all"} onValueChange={value => setRoleFilter(value !== "all" ? value : undefined)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Buyer">Buyers</SelectItem>
            <SelectItem value="Seller">Sellers</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    
    {/* County filter */}
    <div className="col-span-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-brand-soft-green" />
        <Select value={countyFilter || "all"} onValueChange={value => setCountyFilter(value !== "all" ? value : undefined)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by county" />  
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counties</SelectItem>
            {irishCounties.map((county) => (
              <SelectItem key={county} value={county}>{county}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    
    {/* Reset Filters button */}
    <div className="col-span-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={resetFilters}
        className="flex items-center gap-2 w-full"
      >
        <RotateCcw className="h-4 w-4" />
        Reset Filters
      </Button>
    </div>
  </div>

            ) : (
              /* Mobile filters - collapsible */
              <Collapsible
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                className="space-y-4"
              >
                {/* Search bar for mobile */}
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input 
                      type="text"
                      placeholder="Search users by name, county, or role..."
                      className="pl-10 pr-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                    />
                    {searchQuery && (
                      <button
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                  
                  {/* Search Button for mobile */}
                  <Button 
                    onClick={handleSearch}
                    className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-brand-soft-green" />
                    Filters
                  </h3>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                      {isFilterOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="space-y-4">
                  <div className="flex items-center gap-2 w-full">
                    <Select value={roleFilter || "all"} onValueChange={value => setRoleFilter(value !== "all" ? value : undefined)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Buyer">Buyers</SelectItem>
                        <SelectItem value="Seller">Sellers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full">
                    <Select value={countyFilter || "all"} onValueChange={value => setCountyFilter(value !== "all" ? value : undefined)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filter by county" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Counties</SelectItem>
                        {irishCounties.map((county) => (
                          <SelectItem key={county} value={county}>{county}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end w-full">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetFilters}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Filters
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          
          {/* User grid with smooth loading transition */}
          <div className={`transition-opacity duration-200 ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
            {users.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {users.map((user) => (
                  <Card key={user.id} className="overflow-hidden border border-brand-soft-green hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-14 w-14 border-2 border-brand-soft-green">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback className="bg-brand-light-green text-brand-dark-green">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{user.name}</h3>
                            {user.reviewCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm font-medium">{user.averageRating}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={
                              user.role === "Seller" ? "bg-brand-soft-green" :
                              "bg-orange-500"
                            }>
                              {user.role}
                            </Badge>
                            {user.verified && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-500 mb-2">{user.county}</p>
                      {user.role === "Buyer" && (
                        <>
                          <p className="text-sm text-gray-500 mb-2">Member since {user.joinDate}</p>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-1">{user.bio}</p>
                        </>
                      )}
                      {user.role === "Seller" && (
                        <>
                          <p className="text-sm text-gray-500 mb-2">Member since {user.joinDate}</p>
                          <p className="text-sm text-gray-500 mb-4">
                            {user.activeListings} Active Listing{user.activeListings !== 1 ? 's' : ''}
                          </p>
                        </>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-brand-soft-green text-brand-dark-green hover:bg-brand-light-green"
                        onClick={() => viewProfile(user.id)}
                      >
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500">
                  No users found. Try adjusting your filters or search terms.
                </p>
              </div>
            )}
          </div>

          {/* Show subtle loading indicator during filter changes */}
          {isFetching && !isLoading && (
            <div className="fixed top-4 right-4 z-50">
              <div className="bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-brand-soft-green border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-600">Updating...</span>
              </div>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        isActive={pageNum === currentPage}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && (
                  <PaginationItem>
                    <span className="px-2">...</span>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          
          {/* Back to Top Button */}
          <div className="flex justify-center mt-8">
            <Button 
              onClick={scrollToTop}
              className="flex items-center gap-2 bg-brand-soft-green hover:bg-brand-dark-green text-white"
            >
              <ArrowUp className="h-4 w-4" />
              Back to Top
            </Button>
          </div>
        </div>
      </div>
      
      {/* Navigation help section */}
      <NavigationSection />
    </>
  );
};

export default UserDirectory;



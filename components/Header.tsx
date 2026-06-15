

'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, Heart, ShoppingCart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserMenu from "./UserMenu";
import CurrencySelector from "./CurrencySelector";
import GlobalSearchBar from "./GlobalSearchBar";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import CartDrawer from "./CartDrawer";

const Header = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { user, role } = useAuth();
  const { getCartCount } = useCart();

  // Ensure component only renders Radix UI components after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile nav when route changes (e.g. UserMenu → Dashboard does not use the panel links' onClick)
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  
  // Check if the user has a role that should see the wishlist icon
  const canSeeWishlist = Boolean(user && (role === 'buyer' || role === 'seller' || role === 'business'));

  // Get cart count for the badge
  const cartCount = getCartCount();

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-[9998] overflow-visible">
      <div className="container mx-auto px-2 sm:px-3 lg:px-4 max-w-full">
        <div className="flex items-center justify-between h-16 sm:h-20 lg:h-24 gap-1 sm:gap-3 lg:gap-4 min-w-0 overflow-visible">
          {/* Logo - moved to left */}
          <Link href="/" className="flex items-center flex-shrink-0 min-w-0" onClick={closeMenu}>
            <div className="relative h-10 sm:h-14 lg:h-20 w-auto">
              <Image 
                src="https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/logos/Dog-Quest-Logo-Updated.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZDM1YWQwOS05Mjk3LTRlZTktYjM2Yi1hZDUyMmE1YmRhNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9Eb2ctUXVlc3QtTG9nby1VcGRhdGVkLmpwZyIsImlhdCI6MTc1MjU5ODU2NywiZXhwIjoyMzgzMzE4NTY3fQ.upUy9t4WgBoLH4HrpFWzg93p2zWFVAt1qkXGQaMG0YA" 
                alt="Dog Quest Logo"
                width={200}
                height={80}
                className="h-10 sm:h-14 lg:h-20 w-auto object-contain"
                priority
                quality={75}
              />
            </div>
          </Link>

          {/* Desktop/tablet navigation with search */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-4 flex-1 justify-center min-w-0">
            {/* Global Search Bar */}
            <div className="w-full max-w-md xl:max-w-2xl">
              <GlobalSearchBar onExpandChange={setIsSearchExpanded} />
            </div>
          </nav>
          
          <nav className="hidden lg:flex items-center gap-2 xl:gap-4 flex-shrink-0 text-[15px] xl:text-base">
            <Link
              href="/listings"
              id="nav-listings"
              data-restore-target
              className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
            >
              For Sale
            </Link>
            <Link
              href="/stud"
              id="nav-stud"
              data-restore-target
              className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
            >
              Studs
            </Link>
            <Link
              href="/showcase"
              id="nav-showcase"
              data-restore-target
              className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
            >
              Showcase
            </Link>
            <Link
              href="/breeds"
              id="nav-breeds"
              data-restore-target
              className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
            >
              Breeds
            </Link>
            <Link
              href="/shop"
              id="nav-shop"
              data-restore-target
              className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
            >
              Shop
            </Link>
            <Link
              href="/puppy-names"
              id="nav-puppy-names"
              data-restore-target
              className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
            >
              Names
            </Link>
            <Link
              href="/services"
              id="nav-services"
              data-restore-target
              className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
            >
              Dog Services
            </Link>
            {user && (
              <Link
                href="/directory"
                id="nav-directory"
                data-restore-target
                className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
              >
                Accounts
              </Link>
            )}
            <Link
              href="/blog"
              id="nav-blog"
              data-restore-target
              className="text-gray-700 hover:text-brand-dark-green whitespace-nowrap"
            >
              Blog
            </Link>
            
            {/* More dropdown menu with hover functionality */}
            {mounted && (
            <div className="relative">
              <DropdownMenu 
                open={isMoreDropdownOpen} 
                onOpenChange={setIsMoreDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <button 
                    className="text-gray-700 hover:text-brand-dark-green flex items-center focus:outline-none cursor-pointer"
                    onMouseEnter={() => setIsMoreDropdownOpen(true)}
                  >
                    More
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                    className="w-56 bg-white border shadow-lg max-h-[85vh] overflow-y-auto overscroll-contain z-[10000]"
                  onMouseLeave={() => setIsMoreDropdownOpen(false)}
                    sideOffset={5}
                    align="end"
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href="/faq"
                      id="nav-faq"
                      data-restore-target
                      className="w-full text-gray-700 hover:text-brand-dark-green cursor-pointer"
                    >
                      FAQs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/about"
                      id="nav-about"
                      data-restore-target
                      className="w-full text-gray-700 hover:text-brand-dark-green cursor-pointer"
                    >
                      About the Founders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/vet-partners"
                      id="nav-vet-partners"
                      data-restore-target
                      className="w-full text-gray-700 hover:text-brand-dark-green cursor-pointer"
                    >
                      Find a Vet Partner
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/affiliated-vet"
                      id="nav-affiliated-vet"
                      data-restore-target
                      className="w-full text-gray-700 hover:text-brand-dark-green cursor-pointer"
                    >
                      Become an Affiliated Vet
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/trust"
                      id="nav-trust"
                      data-restore-target
                      className="w-full text-gray-700 hover:text-brand-dark-green cursor-pointer"
                    >
                      Why Trust Dog Quest
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/quiz"
                      id="nav-quiz"
                      data-restore-target
                      className="w-full text-gray-700 hover:text-brand-dark-green cursor-pointer"
                    >
                      Quiz
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/contact"
                      id="nav-contact"
                      data-restore-target
                      className="w-full text-gray-700 hover:text-brand-dark-green cursor-pointer"
                    >
                      Contact
                    </Link>
                  </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/terms"
                        id="nav-terms"
                        data-restore-target
                        className="w-full text-gray-700 hover:text-brand-dark-green cursor-pointer"
                      >
                        Terms & Conditions
                      </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            )}
            {!mounted && (
              <button 
                className="text-gray-700 hover:text-brand-dark-green flex items-center focus:outline-none cursor-pointer"
              >
                More
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>
            )}
          </nav>

          {/* Icons and user menu - keep compact on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 lg:gap-2 relative z-[9999] flex-shrink-0 overflow-visible">
            {/* Currency Selector - visible on mobile + desktop */}
            {mounted && (
              <div className="[&_button]:px-1.5 sm:[&_button]:px-2 [&_button]:h-8 sm:[&_button]:h-9 lg:[&_button]:h-10">
                <CurrencySelector />
              </div>
            )}
            
            {/* Only show wishlist icon for appropriate user roles - hide on very small screens */}
            {canSeeWishlist && (() => {
              // Determine wishlist path based on user role - check business first as it's most specific
              let wishlistPath = "/my-buyer-dashboard/wishlist"; // default fallback
              
              if (role === "business") {
                wishlistPath = "/my-business-dashboard/wishlist";
              } else if (role === "seller") {
                wishlistPath = "/my-seller-dashboard/wishlist";
              } else if (role === "buyer") {
                wishlistPath = "/my-buyer-dashboard/wishlist";
              }
              
              return (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="My Wishlist"
                  className="text-gray-700 hover:text-gray-900 hidden lg:flex"
                  asChild
                >
                  <Link 
                    href={wishlistPath}
                    id="nav-wishlist"
                    data-restore-target
                  >
                    <Heart size={20} />
                  </Link>
                </Button>
              );
            })()}
            
            {/* Cart icon with badge - smaller on mobile */}
            {mounted ? (
            <CartDrawer>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Shopping Cart"
                  className="text-gray-700 hover:text-gray-900 relative h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10"
                >
                  <ShoppingCart size={17} className="sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-soft-green text-white rounded-full w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5 flex items-center justify-center text-[10px] lg:text-xs font-bold">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Button>
              </CartDrawer>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Shopping Cart"
                className="text-gray-700 hover:text-gray-900 relative h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10"
              >
                <ShoppingCart size={17} className="sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-soft-green text-white rounded-full w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-5 lg:h-5 flex items-center justify-center text-[10px] lg:text-xs font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Button>
            )}
            
            {/* User menu - smaller on mobile */}
            {mounted && <UserMenu />}
            {/* SSR / first paint: guests had no Log in until hydration — Brian-style "stuck" outside login */}
            {!mounted && !user && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="hidden sm:flex"
                >
                  <Link href="/auth/role-selection">Sign up</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="bg-brand-dark-green hover:bg-brand-dark-green/90"
                >
                  <Link href="/auth/login">Log in</Link>
                </Button>
              </div>
            )}
            {!mounted && user && (
              <Button variant="ghost" size="sm" className="relative rounded-full h-8 w-8 sm:h-9 sm:w-9">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-brand-soft-green flex items-center justify-center text-white text-[10px] sm:text-xs">
                  {user.email?.substring(0, 2).toUpperCase() || '??'}
                </div>
              </Button>
            )}
            
            {/* Mobile menu button - always visible on mobile, positioned after icons */}
            <button
              className="lg:hidden text-gray-700 hover:text-gray-900 focus:outline-none flex-shrink-0 ml-0.5 sm:ml-1 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={20} className="sm:w-6 sm:h-6" /> : <Menu size={20} className="sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsed menu for mobile */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 max-h-[85vh] overflow-y-auto overscroll-contain">
          <div className="container mx-auto px-4 py-3 space-y-1 pb-6">
            {/* Mobile Search Bar */}
            <div className="mb-4">
              <GlobalSearchBar />
            </div>
            <Link
              href="/listings"
              className="block py-2 text-gray-700 hover:text-brand-dark-green"
              onClick={closeMenu}
            >
              Dogs for Sale
            </Link>
            <Link
              href="/stud"
              className="block py-2 text-gray-700 hover:text-brand-dark-green"
              onClick={closeMenu}
            >
              Stud Dogs
            </Link>
            <Link
              href="/showcase"
              className="block py-2 text-gray-700 hover:text-brand-dark-green"
              onClick={closeMenu}
            >
              Showcase
            </Link>
            <Link
              href="/breeds"
              className="block py-2 text-gray-700 hover:text-brand-dark-green"
              onClick={closeMenu}
            >
              Breeds
            </Link>
            <Link
              href="/shop"
              className="block py-2 text-gray-700 hover:text-brand-dark-green"
              onClick={closeMenu}
            >
              Dog Quest Shop
            </Link>
            <Link
              href="/puppy-names"
              className="block py-2 text-gray-700 hover:text-brand-dark-green"
              onClick={closeMenu}
            >
              Puppy Name Archive
            </Link>
            <Link
              href="/services"
              className="block py-2 text-gray-700 hover:text-brand-dark-green"
              onClick={closeMenu}
            >
              Dog Services
            </Link>
            {user && (
              <Link
                href="/directory"
                className="block py-2 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                Accounts
              </Link>
            )}
            {/* More menu items - expanded for mobile */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="text-sm font-medium text-gray-500 mb-2">More</div>
              <Link
                href="/faq"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                FAQs
              </Link>
              <Link
                href="/about"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                About the Founders
              </Link>
              <Link
                href="/vet-partners"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                Find a Vet Partner
              </Link>
              <Link
                href="/affiliated-vet"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                Become an Affiliated Vet
              </Link>
              <Link
                href="/trust"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                Why Trust Dog Quest
              </Link>
              <Link
                href="/quiz"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                Quiz
              </Link>
              <Link
                href="/blog"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                Blog
              </Link>
              <Link
                href="/contact"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                Contact
              </Link>
              <Link
                href="/terms"
                className="block py-2 pl-4 text-gray-700 hover:text-brand-dark-green"
                onClick={closeMenu}
              >
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;


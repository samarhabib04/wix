import { Phone, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface NavigationProps {
  showBg: boolean;
}

export default function Navigation({ showBg }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        showBg
          ? 'bg-white shadow-lg'
          : 'bg-gradient-to-b from-black/20 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center min-h-10">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                scrollToTop();
              }}
              className="flex items-center gap-2.5 sm:gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
              aria-label="JM Heating Services — Home"
            >
              <BrandLogo
                className={
                  showBg
                    ? 'shrink-0'
                    : 'shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] sm:drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]'
                }
              />
              <span className="text-lg sm:text-2xl font-bold leading-tight">
                <span
                  className={
                    showBg
                      ? 'text-purple-700'
                      : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                  }
                >
                  JM
                </span>
                <span
                  className={showBg ? 'text-pink-500' : 'text-pink-400'}
                >
                  {' '}
                  Heating Services
                </span>
              </span>
            </a>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('services')}
              className={`transition font-medium ${
                showBg ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className={`transition font-medium ${
                showBg ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className={`transition font-medium ${
                showBg ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className={`transition font-medium ${
                showBg ? 'text-gray-700 hover:text-purple-700' : 'text-white hover:text-purple-200'
              }`}
            >
              Contact
            </button>
            <a
              href="tel:07707080781"
              className="flex items-center space-x-2 bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition font-semibold"
            >
              <Phone size={18} />
              <span>07707 080 781</span>
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-1 rounded-md ${showBg ? 'text-gray-700' : 'text-white'}`}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3 bg-white/95 backdrop-blur rounded-b-lg">
            <button
              onClick={() => scrollToSection('services')}
              className="block w-full text-left text-gray-700 hover:text-purple-700 py-2 px-2"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="block w-full text-left text-gray-700 hover:text-purple-700 py-2 px-2"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="block w-full text-left text-gray-700 hover:text-purple-700 py-2 px-2"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left text-gray-700 hover:text-purple-700 py-2 px-2"
            >
              Contact
            </button>
            <a
              href="tel:07707080781"
              className="flex items-center space-x-2 bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition w-full justify-center font-semibold"
            >
              <Phone size={18} />
              <span>07707 080 781</span>
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}

import { Phone, Mail, MapPin, Facebook } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="mb-4">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex max-w-full flex-wrap items-center gap-3 sm:gap-4 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                aria-label="JM Heating Services — Home"
              >
                <BrandLogo
                  size="footer"
                  className="max-w-[180px] sm:max-w-[200px] shrink-0"
                />
                <span className="text-2xl font-bold text-white">
                  <span className="text-purple-200">JM</span>
                  <span className="text-pink-400"> Heating Services</span>
                </span>
              </a>
            </div>
            <p className="text-gray-400 mb-4">
              Serving South Cheshire, Staffordshire & Shropshire since 1990.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="hover:text-pink-500 transition"
                title="Facebook"
              >
                <Facebook size={24} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-pink-500 transition"
                >
                  Home
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-pink-500 transition">
                  Services
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-pink-500 transition">
                  About
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-pink-500 transition">
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="mailto:jmheatingservices@hotmail.com"
                  className="hover:text-pink-500 transition"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Contact Info</h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Phone size={20} className="text-pink-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">07707 080 781</p>
                  <p className="text-sm">24/7 Available</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Mail size={20} className="text-pink-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">
                    jmheatingservices@hotmail.com
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin size={20} className="text-pink-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">South Cheshire,</p>
                  <p className="font-semibold text-white">Staffordshire &</p>
                  <p className="font-semibold text-white">Shropshire</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="bg-pink-500/10 px-3 py-2 rounded text-sm text-pink-400 font-semibold">
                Gas Safe Registered
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-green-500/10 px-3 py-2 rounded text-sm text-green-400 font-semibold">
                Insurance Backed Guarantee
              </div>
            </div>
          </div>

          <div className="text-center text-gray-400 text-sm">
            <p className="mb-2">
              &copy; 2024 JM Heating Services. All Rights Reserved. | Gas Safe No: [XXXXX]
            </p>
            <p className="text-gray-500">
              Built with care by JM Heating Services
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

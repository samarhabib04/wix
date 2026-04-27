import { Phone, FileText } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="py-24 bg-gradient-to-r from-purple-900 to-purple-800 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8">
          <div>
            <h2 className="text-5xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-purple-100">
              Whether it's an emergency or planned work, we're here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button className="flex items-center justify-center space-x-3 bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-8 rounded-lg transition transform hover:scale-105">
              <FileText size={24} />
              <span>Get Free Quote</span>
            </button>

            <a
              href="tel:07707080781"
              className="flex items-center justify-center space-x-3 bg-white text-purple-900 hover:bg-purple-50 font-bold py-4 px-8 rounded-lg transition transform hover:scale-105"
            >
              <Phone size={24} />
              <span>Call 07707 080 781</span>
            </a>
          </div>

          <p className="text-purple-200 text-lg">
            Or email: <span className="font-semibold text-white">jmheatingservices@hotmail.com</span>
          </p>
        </div>
      </div>
    </section>
  );
}

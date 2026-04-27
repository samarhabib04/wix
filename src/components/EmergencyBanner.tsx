import { AlertCircle, Phone } from 'lucide-react';

export default function EmergencyBanner() {
  return (
    <section className="bg-pink-600 text-white py-6 relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="animate-bounce">
              <AlertCircle size={32} className="text-yellow-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">EMERGENCY? We're Available 24/7!</h3>
              <p className="text-pink-100">Average response time: Under 2 hours</p>
            </div>
          </div>
          <a
            href="tel:07707080781"
            className="flex items-center space-x-2 bg-white text-pink-600 font-bold px-8 py-3 rounded-lg hover:bg-pink-50 transition whitespace-nowrap"
          >
            <Phone size={24} />
            <div className="flex flex-col items-start">
              <span className="text-xs">Call Now</span>
              <span className="text-lg">07707 080 781</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

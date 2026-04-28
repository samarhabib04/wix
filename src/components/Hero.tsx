import { Phone, Shield, Award, Clock } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <p className="text-lg sm:text-xl font-semibold text-pink-300 mb-3 tracking-wide">
                JM Heating Services
              </p>
              <h1 className="text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                South Cheshire's Most Trusted Heating & Plumbing Experts
              </h1>
              <p className="text-xl text-purple-100">
                30+ Years Experience | Gas Safe Registered | British Gas Trained | Available 24/7
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 px-8 rounded-lg transition transform hover:scale-105 text-lg">
                Get Free Quote
              </button>
              <a
                href="tel:07707080781"
                className="flex items-center justify-center space-x-2 border-2 border-pink-400 text-pink-200 hover:bg-pink-500/10 font-bold py-4 px-8 rounded-lg transition"
              >
                <Phone size={20} />
                <span>Call Now: 07707 080 781</span>
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="flex items-start space-x-3">
                <Shield className="text-pink-400 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold">Gas Safe Registered</p>
                  <p className="text-sm text-purple-200">Full certification & insurance</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Award className="text-pink-400 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold">30+ Years</p>
                  <p className="text-sm text-purple-200">Since 1990</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="text-pink-400 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold">24/7 Emergency</p>
                  <p className="text-sm text-purple-200">Always available</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="text-pink-400 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold">5-Star Rated</p>
                  <p className="text-sm text-purple-200">Trusted by customers</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-96 lg:h-full min-h-[500px]">
            <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Professional plumber working"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/30 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

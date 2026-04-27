import { useState } from 'react';
import { Wrench, Flame, Zap, Check } from 'lucide-react';

export default function Services() {
  const [activeTab, setActiveTab] = useState('plumbing');

  const services = {
    plumbing: {
      title: 'Plumbing Services',
      subtitle: 'From a dripping tap to complete bathroom transformations',
      image: 'https://images.pexels.com/photos/3862619/pexels-photo-3862619.jpeg?auto=compress&cs=tinysrgb&w=800',
      items: [
        'Complete Bathroom Design & Installation',
        'Shower & Bath Installations',
        'Tap Repairs & Replacements',
        'Toilet Repairs & New Installations',
        'Basin & Sink Installations',
        'Leak Detection & Emergency Repairs',
        'Pipe Installations & Repairs',
        'Water Pressure Solutions',
        'Drain Unblocking & Cleaning',
        'Outside Taps & Garden Plumbing',
        'Washing Machine & Dishwasher Connections',
      ],
    },
    heating: {
      title: 'Heating Services',
      subtitle: 'Keeping your home warm and efficient all year round',
      image: 'https://images.pexels.com/photos/4275888/pexels-photo-4275888.jpeg?auto=compress&cs=tinysrgb&w=800',
      items: [
        'Central Heating Installation',
        'Boiler Repairs & Servicing',
        'New Boiler Installations (All Brands)',
        'Radiator Installation & Replacement',
        'Thermostatic Radiator Valve Upgrades',
        'Power Flushing (System Cleaning)',
        'Designer Towel Rails',
        'Underfloor Heating',
        'Heating System Upgrades',
        'Smart Thermostat Installation',
        'Energy Efficiency Improvements',
        'Emergency Heating Repairs',
      ],
    },
    gas: {
      title: 'Gas Services',
      subtitle: 'Gas Safe registered for your complete peace of mind',
      image: 'https://images.pexels.com/photos/3638872/pexels-photo-3638872.jpeg?auto=compress&cs=tinysrgb&w=800',
      items: [
        'Gas Safe Inspections & Certificates',
        'Gas Boiler Installations',
        'Gas Cooker & Hob Installations',
        'Gas Fire Installation & Servicing',
        'Gas Leak Detection & Repairs',
        'Annual Gas Safety Checks (Landlords)',
        'Gas Pipe Installation & Repairs',
        'Carbon Monoxide Testing',
        'Gas Appliance Servicing (All Types)',
        'Emergency Gas Work 24/7',
        'British Gas Trained Engineers',
      ],
    },
  };

  const current = services[activeTab as keyof typeof services];

  return (
    <section id="services" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold mb-4 text-gray-900">Our Services</h2>
        <p className="text-gray-600 mb-12 text-lg">
          Comprehensive plumbing, heating, and gas solutions for your home
        </p>

        <div className="flex gap-4 mb-12 border-b border-gray-200">
          {['plumbing', 'heating', 'gas'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center space-x-2 px-6 py-4 font-bold transition-all ${
                activeTab === tab
                  ? 'text-pink-600 border-b-2 border-pink-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'plumbing' && <Wrench size={20} />}
              {tab === 'heating' && <Flame size={20} />}
              {tab === 'gas' && <Zap size={20} />}
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="rounded-xl overflow-hidden shadow-lg">
            <img
              src={current.image}
              alt={current.title}
              className="w-full h-96 object-cover hover:scale-105 transition duration-300"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {current.title}
              </h3>
              <p className="text-gray-600 text-lg">{current.subtitle}</p>
            </div>

            <div className="space-y-3">
              {current.items.map((item, idx) => (
                <div key={idx} className="flex items-start space-x-3 group">
                  <Check className="text-purple-500 flex-shrink-0 mt-1" size={20} />
                  <p className="text-gray-700 group-hover:text-purple-700 transition">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <button className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-8 rounded-lg transition transform hover:scale-105 w-full">
              Request Service Quote
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

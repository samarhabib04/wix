import { useState } from 'react';
import { Wrench, Flame, Zap, Wind, Check } from 'lucide-react';

type ServiceKey = 'plumbing' | 'heating' | 'gas' | 'renewable';

export default function Services() {
  const [activeTab, setActiveTab] = useState<ServiceKey>('plumbing');

  const tabs: { id: ServiceKey; label: string; icon: typeof Wrench }[] = [
    { id: 'plumbing', label: 'Plumbing', icon: Wrench },
    { id: 'heating', label: 'Heating', icon: Flame },
    { id: 'gas', label: 'Gas', icon: Zap },
    { id: 'renewable', label: 'Renewable Heating', icon: Wind },
  ];

  const services: Record<ServiceKey, { title: string; subtitle: string; image: string; items: string[] }> = {
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
    renewable: {
      title: 'Renewable Heating',
      subtitle: 'Low-carbon comfort with heat pumps and air conditioning',
      image:
        'https://images.pexels.com/photos/4236023/pexels-photo-4236023.jpeg?auto=compress&cs=tinysrgb&w=800',
      items: [
        'Air Source Heat Pump Installation & Replacement',
        'Ground Source Heat Pump Systems',
        'Heat Pump Servicing, Repairs & Diagnostics',
        'Heat Pump Upgrades & System Optimisation',
        'Domestic Air Conditioning Installation',
        'Air Conditioning Servicing & Repairs',
        'Multi-Split & Single-Split Systems',
        'Climate Control & Cooling Solutions',
        'Renewable Heating Design & Sizing Advice',
        'Hybrid Systems (Heat Pump + Boiler Integration)',
      ],
    },
  };

  const current = services[activeTab];

  return (
    <section id="services" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold mb-4 text-gray-900">Our Services</h2>
        <p className="text-gray-600 mb-12 text-lg">
          Comprehensive plumbing, heating, gas, and renewable solutions for your home
        </p>

        <div className="flex flex-wrap gap-2 sm:gap-4 mb-12 border-b border-gray-200">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-4 sm:px-6 py-4 font-bold transition-all text-left ${
                activeTab === id
                  ? 'text-pink-600 border-b-2 border-pink-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span>{label}</span>
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

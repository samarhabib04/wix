import { Shield, Award, Calendar } from 'lucide-react';

export default function About() {
  const stats = [
    { value: '30+', label: 'Years Experience' },
    { value: '500+', label: 'Happy Customers' },
    { value: '5', label: 'Star Rating' },
    { value: '24/7', label: 'Available' },
  ];

  return (
    <section id="about" className="py-24 bg-gradient-to-br from-purple-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="rounded-xl overflow-hidden shadow-xl">
            <img
              src="https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="Jason - JM Heating Services"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                Meet Jason - Your Local Expert
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-4">
                At JM Heating Services, I've been serving the South Cheshire, Staffordshire and Shropshire
                communities
                since 1990. What started as an apprenticeship with British Gas has
                grown into a passion for delivering exceptional plumbing and heating
                services.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                Every home I visit, I treat as if it were my own. That's why I take
                the time to explain every issue, provide honest advice, and never
                recommend unnecessary work.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6">
              <div className="flex items-start space-x-3">
                <Shield className="text-purple-700 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-gray-900">Gas Safe Registered</p>
                  <p className="text-sm text-gray-600">Full Certification</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Award className="text-purple-700 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-gray-900">British Gas Trained</p>
                  <p className="text-sm text-gray-600">Expert Level</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Shield className="text-purple-700 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-gray-900">Insurance Backed</p>
                  <p className="text-sm text-gray-600">Complete Protection</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="text-purple-700 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-gray-900">30+ Years</p>
                  <p className="text-sm text-gray-600">Since 1990</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition"
            >
              <div className="text-4xl font-bold text-pink-500 mb-2">
                {stat.value}
              </div>
              <p className="text-gray-600 font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

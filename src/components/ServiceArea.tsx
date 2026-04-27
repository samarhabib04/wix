import { MapPin } from 'lucide-react';

export default function ServiceArea() {
  const areas = [
    'Crewe',
    'Nantwich',
    'Sandbach',
    'Alsager',
    'Congleton',
    'Kidsgrove',
    'Newcastle under Lyme',
    'Shropshire',
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold mb-4 text-gray-900 text-center">
          Proudly Serving South Cheshire, Staffordshire & Shropshire
        </h2>
        <p className="text-center text-gray-600 mb-16 text-lg">
          Over 30 years serving our local communities
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl overflow-hidden shadow-xl h-96">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d151839.51446242648!2d-2.5!3d53.1!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487b6d2e8e5f4f0d%3A0x40c6b3150e2540!2sCrewe%2C%20England!5e0!3m2!1sen!2suk!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Areas We Cover
              </h3>
              <p className="text-gray-600 mb-6">
                We proudly serve South Cheshire, Staffordshire and Shropshire. Our
                extensive coverage area includes:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {areas.map((area, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-gray-700">
                  <MapPin size={20} className="text-pink-500 flex-shrink-0" />
                  <span className="font-semibold">{area}</span>
                </div>
              ))}
            </div>

            <div className="bg-purple-50 border-l-4 border-pink-500 p-6 rounded">
              <p className="text-gray-700">
                <span className="font-bold">Not sure if we cover your area?</span>
                <br />
                Give us a call: <span className="text-pink-600 font-bold">07707 080 781</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

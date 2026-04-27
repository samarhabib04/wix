import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const testimonials = [
    {
      name: 'Debbie S.',
      rating: 5,
      text: 'Highly recommended would definitely use again. Jason was professional, tidy, and explained everything clearly.',
      verified: true,
    },
    {
      name: 'Sam',
      rating: 5,
      text: 'Amazing job as always definitely recommend thank you.',
      verified: true,
    },
    {
      name: 'Jenny',
      rating: 5,
      text: 'Fully recommend Jason for professional service. I have at last found a reliable plumber I will keep returning to.',
      verified: true,
    },
    {
      name: 'Andrew',
      rating: 5,
      text: 'Had Jason install 3 radiators downstairs in my new house, very neat job and would definitely recommend cheers.',
      verified: true,
    },
    {
      name: 'Chris',
      rating: 5,
      text: "Had a new boiler fitted by another company and they had left the system noisy and not working. A quick call to Jason and he quickly fixed the issues - it's running quiet and smooth, thanks.",
      verified: true,
    },
  ];

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay, testimonials.length]);

  const next = () => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
    setAutoPlay(false);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setAutoPlay(false);
  };

  return (
    <section className="py-24 bg-gradient-to-br from-white via-purple-50/30 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
          What Our Customers Say
        </h2>
        <p className="text-center text-gray-600 mb-16 text-lg">
          Real testimonials from satisfied customers
        </p>

        <div
          className="relative bg-white rounded-2xl shadow-xl p-8 md:p-12 min-h-[400px] flex flex-col justify-between"
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
        >
          <div className="space-y-6">
            <div className="flex space-x-1">
              {[...Array(testimonials[current].rating)].map((_, i) => (
                <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>

            <p className="text-xl text-gray-700 leading-relaxed italic">
              "{testimonials[current].text}"
            </p>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {testimonials[current].name}
                </p>
                {testimonials[current].verified && (
                  <p className="text-sm text-green-600 font-semibold">
                    Verified Customer
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={prev}
              className="bg-purple-700 hover:bg-purple-800 text-white p-2 rounded-full transition"
            >
              <ChevronLeft size={24} />
            </button>

            <div className="flex space-x-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrent(idx);
                    setAutoPlay(false);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === current ? 'bg-pink-500 w-8' : 'bg-gray-300 w-2'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="bg-purple-700 hover:bg-purple-800 text-white p-2 rounded-full transition"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

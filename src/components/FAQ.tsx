import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: 'Are you Gas Safe registered?',
      a: 'Yes, we are fully Gas Safe registered and all gas work is certificated and insurance backed for your peace of mind.',
    },
    {
      q: 'Do you offer emergency call-outs?',
      a: 'Yes, we provide 24/7 emergency services for urgent plumbing, heating and gas issues throughout South Cheshire, Staffordshire and Shropshire.',
    },
    {
      q: 'What areas do you cover?',
      a: 'We serve South Cheshire, Staffordshire and Shropshire, including Crewe, Nantwich, Sandbach, Alsager, Congleton, and other towns in the three counties. Call to confirm coverage.',
    },
    {
      q: 'Do you provide free quotes?',
      a: 'Yes, we provide free, no-obligation quotes for all non-emergency work. Emergency call-outs have a standard call-out fee.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept cash, bank transfer, and card payments for your convenience.',
    },
    {
      q: 'Are you insured?',
      a: 'Yes, we carry full public liability insurance and all our work is insurance backed and guaranteed.',
    },
    {
      q: 'How quickly can you respond?',
      a: 'For emergencies, we aim to respond within 2 hours. For scheduled work, we can usually accommodate within 2-3 days.',
    },
    {
      q: 'Do you install all boiler brands?',
      a: 'Yes, we are experienced with all major boiler brands including Worcester Bosch, Vaillant, Ideal, Baxi, and more.',
    },
    {
      q: 'Can you help with landlord gas safety certificates?',
      a: 'Yes, we provide comprehensive landlord gas safety checks and certificates as required by law.',
    },
    {
      q: 'Do you clean up after the work is done?',
      a: 'Absolutely! We treat your home with respect and always clean up thoroughly after completing any work.',
    },
  ];

  return (
    <section id="faq" className="py-24 bg-gradient-to-b from-white to-purple-50/20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
          Frequently Asked Questions
        </h2>
        <p className="text-center text-gray-600 mb-16 text-lg">
          Find answers to common questions about our services
        </p>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-purple-50/50 transition"
              >
                <h3 className="text-lg font-bold text-gray-900 text-left">
                  {faq.q}
                </h3>
                <ChevronDown
                  size={24}
                  className={`flex-shrink-0 text-pink-500 transition ${
                    openIdx === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openIdx === idx && (
                <div className="px-6 py-4 bg-purple-50/30 border-t border-purple-100 text-gray-700 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

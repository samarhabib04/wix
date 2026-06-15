
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Home, Mail, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CONTACT_EMAIL, CONTACT_MAILTO_HREF } from '@/lib/config/contact';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  hasLink?: boolean;
  linkText?: string;
  linkUrl?: string;
}

const FAQ: React.FC = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQContent();
  }, []);

  const loadFAQContent = async () => {
    try {
      const { data, error } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_id', 'faq')
        .single();

      if (data && !error) {
        const content = data.content as { sections?: Array<{ question: string; answer: string; hasLink?: boolean; linkText?: string; linkUrl?: string }> };
        const sections = content?.sections || [];
        setFaqItems(sections.map((item, index) => ({
          id: `item-${index + 1}`,
          ...item
        })));
      }
    } catch (error) {
      console.error('Error loading FAQ:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return faqItems;
    
    return faqItems.filter(item => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, faqItems]);

  const handleContactSupport = () => {
    router.push('/contact');
  };
  return (
    <>

      <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
        {/* Hero Header Section */}
        <header className="text-center space-y-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-berkshire text-brand-dark-green">
            🦴 Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Got questions? We've got answers. Here's everything you need to know about buying, selling, and joining the Dog Quest community.
          </p>
        </header>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-8">
          <div className="flex items-center border rounded-full overflow-hidden bg-white shadow-sm">
            <div className="pl-4">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search questions..."
              className="w-full p-3 focus:outline-none text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-[#E1E8E0] p-6 rounded-lg shadow-sm">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No questions found matching your search.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {filteredItems.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="bg-white rounded-md overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline font-medium text-brand-dark-green">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 text-gray-700">
                    {item.id === "item-3" ? (
                      <>
                        <p>The Gold Star means a dog has been health checked by a licensed vet.</p>
                        <p>The Green Tick confirms that vaccinations have been completed and verified.</p>
                        <Link href="/trust" className="text-brand-soft-green hover:text-brand-dark-green mt-2 inline-block">
                          Click here for full details about our verification system.
                        </Link>
                      </>
                    ) : (
                      item.answer
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
        
        {/* Contact Support Section */}
        <div className="bg-[#F1F0FB] p-6 rounded-lg mt-8 text-center">
          <h2 className="text-xl font-medium text-brand-dark-green mb-3">
            Didn't find what you're looking for?
          </h2>
          <Button 
            onClick={handleContactSupport}
            className="bg-brand-dark-green hover:bg-brand-soft-green"
          >
            <Mail className="mr-2 h-4 w-4" /> Contact Support
          </Button>
          <div className="mt-2 text-sm text-gray-500">
            Or email us at{' '}
            <a href={CONTACT_MAILTO_HREF} className="text-brand-soft-green hover:underline">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        
        <Separator className="my-8" />
        
      </div>
      <section className="w-full bg-[#E1E8E0] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-berkshire text-brand-dark-green mb-3">
                Continue Your Journey
              </h2>
              <p className="text-gray-700 mb-6 max-w-xl">
                Discover more ways to find your perfect dog companion or learn about our services.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-brand-dark-green hover:bg-brand-soft-green px-6">
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Return Home
                </Link>
              </Button>
              <Button 
                onClick={() => router.push('/quiz')} 
                className="bg-brand-soft-green hover:bg-brand-dark-green px-6 flex items-center gap-2"
              >
                Take the Quiz
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQ;

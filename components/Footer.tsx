'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Facebook, Instagram } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to subscribe.",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubscribing(true);
    try {
      // Save newsletter preference to database if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update user profile with newsletter preference
        const { error } = await supabase
          .from('user_profiles')
          .update({
            newsletter_opt_in: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating newsletter preference:', error);
        }
      }

      toast({
        title: "Successfully subscribed!",
        description: "Thank you for subscribing to our newsletter. You'll receive updates about new puppies and dog care tips."
      });
      setEmail('');
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: "Subscription failed",
        description: "An error occurred while subscribing. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubscribing(false);
    }
  };
  return (
    <>
      {/* Top Wave */}
      <div className="footer-wave-container w-full overflow-hidden bg-[#E1E8E0] leading-[0]" style={{ marginBottom: '-2px' }}>
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-[60px] md:h-[80px] block">
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-brand-dark-green"></path>
        </svg>
      </div>
      <footer className="bg-brand-dark-green text-white">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand and tagline */}
            <div className="space-y-4">
              <Link href="/" className="flex items-center">
                <div className="relative h-20 w-auto -ml-2">
                  <Image 
                    src="https://sehzakutrlropprdcewu.supabase.co/storage/v1/object/sign/logos/Dog-Quest-Logo-Green-Updated.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80ZDM1YWQwOS05Mjk3LTRlZTktYjM2Yi1hZDUyMmE1YmRhNmEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvcy9Eb2ctUXVlc3QtTG9nby1HcmVlbi1VcGRhdGVkLmpwZyIsImlhdCI6MTc1MjU5ODY0MCwiZXhwIjoyMzgzMzE4NjQwfQ.94j0CDJO0Dmy44eTdUs02RK8_psLc39SGQ8r7_O2j0o" 
                    alt="Dog Quest Logo" 
                    width={200}
                    height={80}
                    className="h-20 w-auto object-contain"
                    loading="lazy"
                    quality={75}
                  />
                </div>
              </Link>
              
              <p className="text-brand-light-green text-sm">
                A trusted space to start your puppy journey - with guidance, love and community.
              </p>
              
              <div className="flex space-x-4 pt-4">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <Facebook className="h-5 w-5 text-brand-light-green hover:text-white transition-colors" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <Instagram className="h-5 w-5 text-brand-light-green hover:text-white transition-colors" />
                </a>
              </div>
            </div>
            
            {/* Quick links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-brand-light-green">Quick Links</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-brand-light-green">Dogs</p>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link 
                        href="/listings"
                        id="footer-listings"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Listings
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/stud"
                        id="footer-studs"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Studs
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/showcase"
                        id="footer-showcase"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Showcase
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/quiz"
                        id="footer-quiz"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Quiz
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/breeds"
                        id="footer-breeds"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Breeds
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/services"
                        id="footer-services"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Services
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/shop"
                        id="footer-shop"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Shop
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/blog"
                        id="footer-blog"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Blog
                      </Link>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-brand-light-green">Help & Info</p>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link 
                        href="/faq"
                        id="footer-faq"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        FAQs
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/vet-partners"
                        id="footer-vet-partners"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Find a Vet Partner
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/affiliated-vet"
                        id="footer-affiliated-vet"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Become an Affiliated Vet
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/trust"
                        id="footer-trust"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Why Trust Dog Quest
                      </Link>
                    </li>
                    <li>
                      <Link 
                        href="/puppy-names"
                        id="footer-puppy-names"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        Puppy Name Archive
                      </Link>
                    </li>
                     <li>
                      <Link 
                        href="/about"
                        id="footer-about"
                        data-restore-target
                        className="text-white hover:text-brand-light-green transition-colors"
                      >
                        About the Founders
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Legal and contact */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-brand-light-green">Legal & Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link 
                    href="/contact"
                    id="footer-contact"
                    data-restore-target
                    className="text-white hover:text-brand-light-green transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="text-white hover:text-brand-light-green transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-white hover:text-brand-light-green transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="text-white hover:text-brand-light-green transition-colors">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/sellers/info" className="text-white hover:text-brand-light-green transition-colors">
                    Seller Information
                  </Link>
                </li>
              </ul>
              
              {/* Newsletter subscription */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-brand-light-green mb-2">Subscribe to our newsletter</h4>
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <div className="relative flex-grow">
                    <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white h-4 w-4" />
                    <Input 
                      type="email" 
                      placeholder="Type your email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      disabled={isSubscribing} 
                      className="pl-8 bg-white/10 border-white/20 text-white placeholder:text-white/70 h-9 text-sm focus-visible:ring-brand-light-green" 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={isSubscribing} 
                    className="bg-brand-light-green hover:bg-brand-soft-green text-brand-dark-green whitespace-nowrap"
                  >
                    {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                  </Button>
                </form>
              </div>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-brand-light-green/70">
            <p>&copy; {new Date().getFullYear()} Dog Quest. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
};
export default Footer;

import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import EmergencyBanner from './components/EmergencyBanner';
import ValueProps from './components/ValueProps';
import Services from './components/Services';
import About from './components/About';
import Testimonials from './components/Testimonials';
import ServiceArea from './components/ServiceArea';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

/** When true, the home page only shows content up to and including About (nothing below Testimonials). */
const HOME_END_BEFORE_TESTIMONIALS = true;

function App() {
  const [navBg, setNavBg] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavBg(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (HOME_END_BEFORE_TESTIMONIALS) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation showBg={navBg} />
        <Hero />
        <EmergencyBanner />
        <ValueProps />
        <Services />
        <About />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation showBg={navBg} />
      <Hero />
      <EmergencyBanner />
      <ValueProps />
      <Services />
      <About />
      <Testimonials />
      <ServiceArea />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

export default App;

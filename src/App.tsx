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

function App() {
  const [navBg, setNavBg] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavBg(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

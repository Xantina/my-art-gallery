import { useState } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { PricingSection } from '@/components/PricingSection';
import { CallToAction } from '@/components/CallToAction';
import { Footer } from '@/components/Footer';
import { IntroAnimation } from '@/components/IntroAnimation';
import { PaintingBackground } from '@/components/PaintingBackground';
import { PageTransition } from '@/components/PageTransition';
import xantinaLogo from '@/assets/Xantina Logo.png';

// Module-level flag - resets on page refresh, persists during SPA navigation
let introShownThisPageLoad = false;

const Home = () => {
  const [showIntro, setShowIntro] = useState(() => {
    if (introShownThisPageLoad) return false;
    introShownThisPageLoad = true;
    return true;
  });

  return (
    <>
      {showIntro && (
        <IntroAnimation onComplete={() => setShowIntro(false)} />
      )}
      <PageTransition>
        <div className={`min-h-screen relative overflow-hidden ${showIntro ? 'opacity-0' : ''}`}>
          <PaintingBackground />

<div
  aria-hidden="true"
  className="absolute inset-0 z-10 pointer-events-none"
>
  <img
    src={xantinaLogo}
    alt=""
    className="absolute top-20 left-1/2 -translate-x-1/2 w-[80%] max-w-3xl h-auto opacity-30"
  />
</div>

          <Header />
          <main>
            <Hero />
            <PricingSection />
            <CallToAction />
          </main>
          <Footer />
        </div>
      </PageTransition>
    </>
  );
};

export default Home;

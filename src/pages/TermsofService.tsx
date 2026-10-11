import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PageTransition } from '@/components/PageTransition';
import { TermsofService } from '@/components/TermsofService';

const TermsofServicePage = () => {
  return (
    <PageTransition>
      <div className="min-h-screen relative overflow-hidden">
        <Header />
        <main className="pt-20 relative z-10">
          <TermsofService></TermsofService>
        </main>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default TermsofServicePage;

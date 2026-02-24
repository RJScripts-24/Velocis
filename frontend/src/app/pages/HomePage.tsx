import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { ProofMetricsBand } from '../components/ProofMetricsBand';
import { WhyVelocisSection } from '../components/WhyVelocisSection';
import { TriAgentSection } from '../components/TriAgentSection';
import { ProductDeepDiveSection } from '../components/ProductDeepDiveSection';
import { DarkBreakSection } from '../components/DarkBreakSection';
import { VibeCodingSection } from '../components/VibeCodingSection';
import { ServerlessEconomicsSection } from '../components/ServerlessEconomicsSection';
import { TrustEcosystemSection } from '../components/TrustEcosystemSection';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { FinalCTA } from '../components/FinalCTA';
import { Footer } from '../components/Footer';

export function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ProofMetricsBand />
      <WhyVelocisSection />
      <TriAgentSection />
      <ProductDeepDiveSection />
      <DarkBreakSection />
      <VibeCodingSection />
      <ServerlessEconomicsSection />
      <TrustEcosystemSection />
      <TestimonialsSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

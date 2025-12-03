import { Hero } from "./(site)/_components/hero";
import { Benefits } from "./(site)/_components/benefits";
import { HowItWorks } from "./(site)/_components/how-it-works";
import { Requirements } from "./(site)/_components/requirements";
import { ForBusinesses } from "./(site)/_components/for-businesses";
import { Testimonials } from "./(site)/_components/testimonials";
import { Faq } from "./(site)/_components/faq";

export default function SitePage() {
  return (
    <>
      <Hero />
      <Benefits />
      <HowItWorks />
      <Requirements />
      <ForBusinesses />
      <Testimonials />
      <Faq />
    </>
  );
}

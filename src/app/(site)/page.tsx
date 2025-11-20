import { Hero } from "./_components/hero";
import { Benefits } from "./_components/benefits";
import { HowItWorks } from "./_components/how-it-works";
import { Requirements } from "./_components/requirements";
import { ForBusinesses } from "./_components/for-businesses";
import { Testimonials } from "./_components/testimonials";
import { Faq } from "./_components/faq";

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

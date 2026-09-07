import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { Hero } from "./sections/Hero";
import { Flow, Features } from "./sections/Features";
import { Problem, HowItWorks, Vision } from "./sections/Story";
import { FaqSection, Cta } from "./sections/Close";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Flow />
        <Features />
        <Problem />
        <HowItWorks />
        <Vision />
        <FaqSection />
        <Cta />
      </main>
      <Footer />
    </>
  );
}

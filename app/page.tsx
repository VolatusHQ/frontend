import { Nav } from "./components/Nav";
import { Hero } from "./sections/Hero";
import { Flow, Features } from "./sections/Features";
import { Problem, HowItWorks, Vision } from "./sections/Story";

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
      </main>
    </>
  );
}

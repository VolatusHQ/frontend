import { Nav } from "./components/Nav";
import { Hero } from "./sections/Hero";
import { Flow, Features } from "./sections/Features";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Flow />
        <Features />
      </main>
    </>
  );
}

import { Nav } from "./components/Nav";
import { Hero } from "./sections/Hero";
import { Flow } from "./sections/Features";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Flow />
      </main>
    </>
  );
}

import { Pipeline } from "../components/Pipeline";
import { Reveal } from "../components/Reveal";

export function Flow() {
  return (
    <section className="section section--tight">
      <div className="container">
        <Reveal>
          <Pipeline />
        </Reveal>
      </div>
    </section>
  );
}

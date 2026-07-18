type PortfolioContentProps = {
  eyebrow: string;
  title: string;
  body: string;
};

export function PortfolioContent({ eyebrow, title, body }: PortfolioContentProps) {
  return (
    <article className="content-card">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lead">{body}</p>

      <section className="learning-card">
        <h2>What React Is Driving Here</h2>
        <p>
          React is rendering the shared shell, choosing the active route, and updating the page without
          manually rebuilding HTML strings. Bootstrap still provides the visual vocabulary.
        </p>
      </section>
    </article>
  );
}

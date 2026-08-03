const foundations = [
  ['Identity boundary', 'Supabase-issued identity; CineWrapped-owned authorization'],
  ['API contract', 'Versioned REST contract at /api/v1'],
  ['Operational safety', 'Scoped roles and append-only administrative audits'],
] as const;

export default function AdminFoundationPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-12 text-[var(--text-primary)]">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">CineWrapped operations</p>
        <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-4xl font-bold tracking-tight sm:text-5xl">
          Admin foundation is ready.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
          Authentication, moderation workflows, and operational dashboards will be added in their
          scheduled phases. This shell already uses the production routing and deployment model.
        </p>

        <section aria-labelledby="foundation-heading" className="mt-12">
          <h2 id="foundation-heading" className="text-xl font-semibold">
            Foundation contracts
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {foundations.map(([title, description]) => (
              <article className="foundation-card" key={title}>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="eyebrow">Not found</p>
        <h1 className="mt-3 font-[var(--font-display)] text-4xl font-bold">
          That page is unavailable.
        </h1>
        <p className="mt-4 text-[var(--text-secondary)]">
          It may not exist, or your role may not have access.
        </p>
        <Link className="primary-link mt-8 inline-flex" href="/">
          Return to admin home
        </Link>
      </div>
    </main>
  );
}

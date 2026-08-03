export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading admin workspace" className="min-h-screen p-12">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-5 h-12 max-w-2xl" />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <div className="skeleton h-36" />
        <div className="skeleton h-36" />
        <div className="skeleton h-36" />
      </div>
    </main>
  );
}

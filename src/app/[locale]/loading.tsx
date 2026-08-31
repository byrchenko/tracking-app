export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      {/* Reserve the same shape as the loaded page so there is no layout jump. */}
      <div className="mb-6 h-8 w-2/3 animate-pulse rounded bg-border" />
      <div className="mb-4 h-40 animate-pulse rounded-xl bg-border" />
      <div className="h-40 animate-pulse rounded-xl bg-border" />
      <span className="sr-only">Loading</span>
    </main>
  );
}

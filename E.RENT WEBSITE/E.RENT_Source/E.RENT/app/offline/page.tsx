export const metadata = { title: "You are offline" };
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">You are offline</h1>
      <p className="mt-3 text-muted">Check your connection and try again. Pages you saved will still open.</p>
    </div>
  );
}

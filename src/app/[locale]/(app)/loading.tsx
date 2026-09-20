export default function AppLoading() {
  return (
    <div
      className="mx-auto w-full max-w-content space-y-4 py-4 sm:py-6"
      style={{
        paddingInlineStart: "max(1rem, env(safe-area-inset-left, 0px))",
        paddingInlineEnd: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-8 w-40 animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="min-h-touch animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

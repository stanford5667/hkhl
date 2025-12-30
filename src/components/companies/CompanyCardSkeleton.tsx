export function CompanyCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      {/* Header */}
      <div className="flex gap-3 mb-4">
        <div className="skeleton h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
        <div className="skeleton h-3 w-3 rounded-full" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-4 py-3 border-y border-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-2">
            <div className="skeleton h-3 w-12 mx-auto rounded" />
            <div className="skeleton h-5 w-16 mx-auto rounded" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-8 w-16 rounded" />
      </div>
    </div>
  );
}
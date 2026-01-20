/**
 * Skeleton Loading Components
 * 
 * Display loading states while data is being fetched.
 * Uses pulse animation for visual feedback.
 */

/**
 * Skeleton for offers grid
 */
export function OffersGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={i} 
          className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 animate-pulse"
        >
          {/* Merchant name */}
          <div className="h-5 bg-gray-700/50 rounded w-3/4 mb-3" />
          
          {/* Offer value */}
          <div className="h-8 bg-indigo-500/20 rounded w-1/2 mb-4" />
          
          {/* Card info */}
          <div className="flex gap-2">
            <div className="h-6 bg-gray-700/30 rounded-full w-16" />
            <div className="h-6 bg-gray-700/30 rounded-full w-24" />
          </div>
          
          {/* Score badge */}
          <div className="mt-4">
            <div className="h-6 bg-gray-700/20 rounded-full w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for featured deals
 */
export function FeaturedDealsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div 
          key={i}
          className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-2xl p-6 animate-pulse"
        >
          {/* Title */}
          <div className="h-6 bg-indigo-500/30 rounded w-3/4 mb-3" />
          
          {/* Description */}
          <div className="h-4 bg-gray-700/30 rounded w-full mb-2" />
          <div className="h-4 bg-gray-700/30 rounded w-2/3 mb-4" />
          
          {/* Value badge */}
          <div className="h-10 bg-emerald-500/20 rounded-lg w-1/3 mb-4" />
          
          {/* Tags */}
          <div className="flex gap-2">
            <div className="h-6 bg-gray-700/30 rounded-full w-16" />
            <div className="h-6 bg-gray-700/30 rounded-full w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for stats bar
 */
export function StatsBarSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 animate-pulse"
        >
          <div className="h-3 bg-gray-700/30 rounded w-16 mb-2" />
          <div className="h-6 bg-gray-700/50 rounded w-8" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="bg-[var(--card)] border-b border-[var(--border)] p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="h-8 bg-gray-700/50 rounded w-32 animate-pulse" />
          <div className="flex gap-3">
            <div className="h-8 bg-gray-700/30 rounded w-20 animate-pulse" />
            <div className="h-8 bg-indigo-500/30 rounded w-24 animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="h-10 bg-gray-700/50 rounded w-48 mx-auto mb-3 animate-pulse" />
          <div className="h-4 bg-gray-700/30 rounded w-80 mx-auto animate-pulse" />
        </div>
        
        {/* Featured */}
        <div className="mb-8">
          <FeaturedDealsSkeleton />
        </div>
        
        {/* Stats */}
        <div className="mb-6">
          <StatsBarSkeleton />
        </div>
        
        {/* Offers */}
        <OffersGridSkeleton />
      </main>
    </div>
  );
}

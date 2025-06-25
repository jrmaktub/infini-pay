
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw } from 'lucide-react';

const SwapLoadingSkeleton = () => {
  return (
    <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <RefreshCw className="text-blue-400 animate-spin" size={24} />
        <Skeleton className="h-6 w-32 bg-white/20" />
        <Skeleton className="h-4 w-24 bg-white/10" />
      </div>

      {/* Loading status */}
      <div className="bg-blue-500/20 rounded-xl p-4 mb-4 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
          <Skeleton className="h-4 w-40 bg-blue-300/30" />
        </div>
        <Skeleton className="h-3 w-64 bg-blue-300/20" />
      </div>

      {/* Form skeleton */}
      <div className="space-y-4">
        <div className="bg-white/10 rounded-xl p-4">
          <Skeleton className="h-4 w-12 bg-white/20 mb-2" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-20 bg-white/20 rounded-lg" />
            <Skeleton className="h-10 flex-1 bg-white/20 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-32 bg-white/10 mt-1" />
        </div>

        <div className="flex justify-center">
          <Skeleton className="h-10 w-10 bg-white/20 rounded-full" />
        </div>

        <div className="bg-white/10 rounded-xl p-4">
          <Skeleton className="h-4 w-8 bg-white/20 mb-2" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-20 bg-white/20 rounded-lg" />
            <Skeleton className="h-10 flex-1 bg-white/20 rounded-lg" />
          </div>
        </div>

        <div className="text-center">
          <Skeleton className="h-4 w-48 bg-white/10 mx-auto mb-1" />
          <Skeleton className="h-3 w-32 bg-white/10 mx-auto" />
        </div>

        <Skeleton className="h-12 w-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-xl" />
      </div>
    </div>
  );
};

export default SwapLoadingSkeleton;

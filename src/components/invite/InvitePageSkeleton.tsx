import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/skeleton";

export function InvitePageSkeleton() {
  return (
    <Container>
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>

        {/* Progress indicator skeleton */}
        <div className="flex justify-center">
          <div className="flex space-x-2">
            <Skeleton className="h-2 w-16 rounded-full" />
            <Skeleton className="h-2 w-16 rounded-full" />
            <Skeleton className="h-2 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </Container>
  );
}

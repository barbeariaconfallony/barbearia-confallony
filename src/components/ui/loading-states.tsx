import { Skeleton } from "./skeleton-loader";
import { Card, CardContent } from "./card";

export function LoadingProfile() {
  return (
    <div className="space-y-4 p-4 animate-fade-in">
      <div className="flex items-center justify-center mb-6">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
      <Skeleton className="h-8 w-48 mx-auto mb-2" />
      <Skeleton className="h-4 w-64 mx-auto mb-6" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card/50">
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-8 rounded-full mb-3" />
              <Skeleton className="h-6 w-20 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="bg-card/50">
          <CardContent className="pt-6 pb-6">
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4 animate-fade-in">
      {[...Array(rows)].map((_, i) => (
        <Card key={i} className="bg-card/50">
          <CardContent className="pt-6 pb-6">
            <div className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

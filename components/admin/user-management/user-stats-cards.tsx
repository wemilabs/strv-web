import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface UserStatsCardsProps {
  stats: { total: number; active: number; inactive: number; newToday: number };
}

interface AdminDataCardProps {
  title: string;
  icon: React.ReactNode;
  qty: number;
  description: string;
  className?: string;
}

export function UserStatsCards({ stats }: UserStatsCardsProps) {
  const adminDataCardsContent: AdminDataCardProps[] = [
    {
      title: "Total Users",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="m22 21-3-3 3-3" />
        </svg>
      ),
      qty: stats.total,
      description: "All registered users",
    },
    {
      title: "Active Users",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="size-4 text-green-600"
          aria-hidden="true"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      qty: stats.active,
      description: "Email verified users",
      className: "text-green-600",
    },
    {
      title: "Inactive Users",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="size-4 text-yellow-600"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      qty: stats.inactive,
      description: "Pending email verification",
      className: "text-yellow-600",
    },
    {
      title: "New Today",
      icon: (
        <Badge variant="secondary" className="text-xs">
          +{stats.newToday}
        </Badge>
      ),
      qty: stats.newToday,
      description: "Registered in last 24h",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {adminDataCardsContent.map(
        ({ title, icon, qty, description, className }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold font-mono tracking-tighter",
                  className,
                )}
              >
                {qty}
              </div>
              <p className="text-xs text-muted-foreground font-mono tracking-tighter">
                {description}
              </p>
            </CardContent>
          </Card>
        ),
      )}
    </div>
  );
}

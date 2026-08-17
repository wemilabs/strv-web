import { CheckCircle2, Clock, ShoppingCart, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceInRWF } from "@/lib/utils";

interface OrderStatsProps {
  stats: {
    status: string;
    count: number;
    totalRevenue: string | null;
  }[];
}

export function OrderStats({ stats }: OrderStatsProps) {
  const totalOrders = stats.reduce((sum, stat) => sum + stat.count, 0);
  const totalRevenue = stats
    .filter(stat => stat.status !== "cancelled" && stat.status !== "pending")
    .reduce((sum, stat) => sum + parseFloat(stat.totalRevenue || "0"), 0);
  const pendingOrders = stats.find(s => s.status === "pending")?.count || 0;
  const deliveredOrders = stats.find(s => s.status === "delivered")?.count || 0;

  const cardData = [
    {
      title: "Total Orders",
      count: totalOrders,
      icon: <ShoppingCart className="size-4 text-muted-foreground" />,
    },
    {
      title: "Pending",
      count: pendingOrders,
      icon: <Clock className="size-4 text-yellow-600" />,
    },
    {
      title: "Delivered",
      count: deliveredOrders,
      icon: <CheckCircle2 className="size-4 text-green-600" />,
    },
    {
      title: "Total Revenue",
      count: formatPriceInRWF(totalRevenue),
      icon: <Wallet className="size-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cardData.map(({ title, icon, count }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">{count}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { Target, TrendingUp, DollarSign } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ActionItemsCard } from "@/components/dashboard/ActionItemsCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PortfolioChart } from "@/components/dashboard/PortfolioChart";

export default function Dashboard() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="h1">{getGreeting()}, Chris</h1>
          <p className="text-muted-foreground mt-1">
            3 deals require attention • Portfolio up{" "}
            <span className="text-success font-medium">12.4%</span> YTD
          </p>
        </div>
        <div className="text-sm text-muted-foreground">{currentDate}</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
        <MetricCard
          title="Active Pipeline"
          value="12 Deals"
          subtitle="$2.4B Total Value"
          icon={<Target className="h-5 w-5" />}
        />
        <MetricCard
          title="Portfolio Value"
          value="$847.2M"
          change={12.4}
          subtitle="YTD"
          icon={<TrendingUp className="h-5 w-5" />}
          variant="success"
        />
        <MetricCard
          title="Dry Powder"
          value="$125.0M"
          subtitle="3 deals in DD"
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Action Items & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionItemsCard />
        <ActivityFeed />
      </div>

      {/* Portfolio Chart */}
      <PortfolioChart />
    </div>
  );
}

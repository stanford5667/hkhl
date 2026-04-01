import { SmartMoneySidebar } from "./SmartMoneySidebar";
import { SmartMoneyDashboard } from "./tabs/SmartMoneyDashboard";
import { InsiderTracker } from "./tabs/InsiderTracker";
import { OptionsFlowDashboard } from "./tabs/OptionsFlowDashboard";
import { BlockTradesFeed } from "./tabs/BlockTradesFeed";
import { InstitutionalHoldings } from "./tabs/InstitutionalHoldings";
import { SmartMoneyAIChat } from "./tabs/SmartMoneyAIChat";
import { SmartMoneyLeaderboards } from "./tabs/SmartMoneyLeaderboards";
import { SmartMoneyAlerts } from "./tabs/SmartMoneyAlerts";
import { useSmartMoneyStore } from "@/stores/smartMoneyStore";
import { cn } from "@/lib/utils";

export function SmartMoneyLayout() {
  const { activeTab, sidebarCollapsed } = useSmartMoneyStore();

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <SmartMoneyDashboard />;
      case 'insiders': return <InsiderTracker />;
      case 'options-flow': return <OptionsFlowDashboard />;
      case 'block-trades': return <BlockTradesFeed />;
      case 'institutional': return <InstitutionalHoldings />;
      case 'ai-chat': return <SmartMoneyAIChat />;
      case 'leaderboards': return <SmartMoneyLeaderboards />;
      case 'alerts': return <SmartMoneyAlerts />;
      default: return <SmartMoneyDashboard />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden -mx-4 -mt-4 sm:-mx-6 lg:-mx-8">
      <SmartMoneySidebar />
      <main className={cn(
        "flex-1 overflow-y-auto p-4 sm:p-6 transition-all duration-200",
        sidebarCollapsed ? "ml-0" : "ml-0"
      )}>
        {renderTab()}
      </main>
    </div>
  );
}

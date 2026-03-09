import Dashboard from "./Dashboard";
import { useAuth } from "@/contexts/AuthContext";
import { MarketingLandingPage } from "@/components/landing/MarketingLandingPage";

const Index = () => {
  const { user } = useAuth();

  return (
    <>
      <div className="min-h-screen">
        <Dashboard />
      </div>
      {!user && <MarketingLandingPage />}
    </>
  );
};

export default Index;

import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";
import { useNavigate } from "react-router-dom";
import { MembershipStep } from "@/components/onboarding/MembershipStep";
import { useEffect } from "react";

export default function Upgrade() {
  const { user } = useAuth();
  const { isPro } = useUsage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth", { state: { from: "/upgrade" } });
    } else if (isPro) {
      navigate("/settings");
    }
  }, [user, isPro, navigate]);

  if (!user || isPro) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <MembershipStep
          onComplete={() => navigate("/")}
          onBack={() => navigate(-1)}
        />
      </div>
    </div>
  );
}

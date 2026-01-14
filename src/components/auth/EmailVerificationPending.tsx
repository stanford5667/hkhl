import { Mail, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";

interface EmailVerificationPendingProps {
  email: string;
  onBack?: () => void;
  className?: string;
}

export function EmailVerificationPending({ 
  email, 
  onBack,
  className 
}: EmailVerificationPendingProps) {
  return (
    <div className={cn("flex flex-col items-center text-center space-y-4 py-6", className)}>
      <AssetLabsLogo size="md" />
      
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <Mail className="h-7 w-7 text-primary" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Check your email</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          We've sent a verification link to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Click the link in the email to verify your account</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Didn't receive an email? Check your spam folder or try again.
      </p>

      {onBack && (
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to sign in
        </Button>
      )}
    </div>
  );
}

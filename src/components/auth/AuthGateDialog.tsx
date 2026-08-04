import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";
import { AuthForm, type AuthMode } from "./AuthForm";
import { EmailVerificationPending } from "./EmailVerificationPending";
import { FeatureComparisonPanel } from "./FeatureComparisonPanel";
import { AUTH_COPY } from "@/lib/authCopy";

interface AuthGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function AuthGateDialog({
  open,
  onOpenChange,
  title,
  description,
}: AuthGateDialogProps) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const heading =
    title ??
    (mode === "signin"
      ? AUTH_COPY.signInTitle
      : mode === "signup"
        ? AUTH_COPY.signUpTitle
        : AUTH_COPY.resetTitle);
  const sub =
    description ??
    (mode === "signin"
      ? AUTH_COPY.signInSubtitle
      : mode === "signup"
        ? AUTH_COPY.signUpSubtitle
        : AUTH_COPY.resetSubtitle);

  const form = (
    <div className="space-y-3 px-1">
      <div className="flex flex-col items-center justify-center">
        <AssetLabsLogo size="sm" showText={false} className="sm:hidden" />
        <AssetLabsLogo size="lg" showText={false} className="hidden sm:flex" />
      </div>
      <AuthForm
        mode={mode}
        onModeChange={setMode}
        density="compact"
        autoFocus={open}
        onSignedIn={() => onOpenChange(false)}
        onSignedUp={(payload) => {
          setPendingEmail(payload.userId ? null : payload.email);
          if (payload.userId) onOpenChange(false);
        }}
      />
    </div>
  );

  const body = pendingEmail ? (
    <EmailVerificationPending
      email={pendingEmail}
      onBack={() => {
        setPendingEmail(null);
        setMode("signin");
      }}
    />
  ) : (
    form
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[820px] p-0 overflow-hidden">
          {pendingEmail ? (
            <div className="p-6">{body}</div>
          ) : (
            <div className="flex">
              <div className="w-[360px] border-r border-border bg-muted/30 p-6 flex flex-col justify-center">
                <FeatureComparisonPanel />
              </div>
              <div className="flex-1 p-6">
                <DialogHeader className="text-center pb-2">
                  <DialogTitle className="text-xl font-bold">{heading}</DialogTitle>
                  <DialogDescription className="text-sm">{sub}</DialogDescription>
                </DialogHeader>
                {body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly modal repositionInputs={false}>
      <DrawerContent className="max-h-[85dvh]">
        {pendingEmail ? (
          <div className="px-3 pb-4 safe-area-bottom">{body}</div>
        ) : (
          <>
            <DrawerHeader className="text-center py-1.5">
              <DrawerTitle className="text-base font-bold">{heading}</DrawerTitle>
              <DrawerDescription className="text-[11px]">{sub}</DrawerDescription>
            </DrawerHeader>
            <div className="px-3 pb-4 safe-area-bottom overflow-y-auto">{body}</div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

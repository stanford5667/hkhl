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
import { AUTH_COPY } from "@/lib/authCopy";

interface MobileAuthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  showPremiumBranding?: boolean;
  onSuccess?: () => void;
}

/**
 * Compact auth sheet (mobile drawer / desktop dialog).
 * Shares the exact same form, copy and CTA hierarchy as AuthGateDialog
 * and the /auth page via <AuthForm />.
 */
export function MobileAuthSheet({
  open,
  onOpenChange,
  title,
  description,
  onSuccess,
}: MobileAuthSheetProps) {
  const [mode, setMode] = useState<AuthMode>("signup");
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

  const handleDone = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  const body = (
    <div className="space-y-3 px-1">
      <div className="flex items-center justify-center">
        <AssetLabsLogo size="sm" />
      </div>
      <AuthForm
        mode={mode}
        onModeChange={setMode}
        density="compact"
        autoFocus={open}
        onSignedIn={handleDone}
        onSignedUp={handleDone}
      />
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-xl font-bold">{heading}</DialogTitle>
            <DialogDescription className="text-sm">{sub}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} handleOnly modal>
      <DrawerContent className="max-h-[95dvh]">
        <DrawerHeader className="text-center py-1.5">
          <DrawerTitle className="text-base font-bold">{heading}</DrawerTitle>
          <DrawerDescription className="text-[11px]">{sub}</DrawerDescription>
        </DrawerHeader>
        <div className="px-3 pb-4 safe-area-bottom overflow-y-auto">{body}</div>
      </DrawerContent>
    </Drawer>
  );
}

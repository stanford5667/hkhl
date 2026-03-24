import { MessageSquare, CheckCircle, XCircle, Shield, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const SmsConsent = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Asset Labs — SMS Notifications</h1>
              <p className="text-sm text-muted-foreground">Consent &amp; Opt-In Disclosure</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Overview */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What is this service?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Asset Labs offers optional SMS text message notifications to platform members. When enabled, users receive alerts for new messages posted in community chat rooms they have subscribed to. These notifications are sent to the mobile phone number provided by the user in their account settings.
          </p>
        </section>

        {/* How users opt in */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">How Users Opt In</h2>
          <p className="text-muted-foreground leading-relaxed">
            SMS notifications are <strong>off by default</strong>. Users must take two explicit actions to receive text messages:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-2">
            <li>Navigate to <strong>Settings → Notification Preferences</strong> within their authenticated account.</li>
            <li>Enter their mobile phone number and check the SMS opt-in checkbox shown below.</li>
          </ol>

          {/* Mock opt-in UI */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mock Opt-In UI (as seen by users)</p>

            <div className="space-y-3">
              <label className="text-sm font-medium">Phone Number</label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 555-0100</span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <Checkbox checked disabled className="mt-0.5" />
              <p className="text-sm leading-relaxed">
                I agree to receive SMS text message notifications from Asset Labs for community chat alerts.
                Message frequency varies. Msg &amp; data rates may apply.
                Reply <strong>STOP</strong> to unsubscribe at any time.
                Reply <strong>HELP</strong> for help.
                See our{" "}
                <a href="/privacy" className="text-primary underline">Privacy Policy</a>{" "}
                and{" "}
                <a href="/terms" className="text-primary underline">Terms of Service</a>.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Consent is not a condition of purchase. You can use Asset Labs without enabling SMS.</span>
            </div>
          </div>
        </section>

        {/* Message details */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Message Details</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
              <span><strong>Content:</strong> Notifications about new messages in subscribed community chat rooms.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
              <span><strong>Frequency:</strong> Message frequency varies based on chat activity. Typically 0–10 messages per day.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
              <span><strong>Costs:</strong> Message and data rates may apply depending on your carrier and plan.</span>
            </li>
          </ul>
        </section>

        {/* Opt out */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">How to Opt Out</h2>
          <p className="text-muted-foreground leading-relaxed">
            You can stop receiving SMS notifications at any time by:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive mt-1 shrink-0" />
              <span>Replying <strong>STOP</strong> to any message you receive from us.</span>
            </li>
            <li className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive mt-1 shrink-0" />
              <span>Unchecking the SMS notification option in <strong>Settings → Notification Preferences</strong>.</span>
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            After opting out, you will receive one final confirmation message. No further messages will be sent unless you re-enable the service.
          </p>
        </section>

        {/* Help */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Need Help?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Reply <strong>HELP</strong> to any SMS for assistance, or contact us at{" "}
            <a href="mailto:support@assetlabs.ai" className="text-primary underline">support@assetlabs.ai</a>.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 text-xs text-muted-foreground space-y-1">
          <p>© {new Date().getFullYear()} Asset Labs. All rights reserved.</p>
          <p>
            <a href="/privacy" className="text-primary underline">Privacy Policy</a>
            {" · "}
            <a href="/terms" className="text-primary underline">Terms of Service</a>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default SmsConsent;

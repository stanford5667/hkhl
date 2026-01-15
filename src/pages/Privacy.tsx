/**
 * Privacy Policy Page
 * 
 * Essential legal page for compliance.
 */

import { SITE_NAME, FooterDisclaimer } from '@/components/legal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Database, 
  Lock,
  Eye,
  UserCheck,
  Globe,
  Bell,
  Mail,
  Cookie,
  FileText,
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  const lastUpdated = 'January 2025';
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-4xl py-12 flex-1">
        {/* Header */}
        <div className="mb-8">
          <Badge variant="outline" className="mb-4">
            <Shield className="h-3 w-3 mr-1" />
            Legal
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Introduction Card */}
        <Card className="mb-8 border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Lock className="h-6 w-6 text-blue-400 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-400 mb-2">
                  Your Privacy Matters
                </h3>
                <p className="text-sm text-muted-foreground">
                  {SITE_NAME} is committed to protecting your privacy. This policy explains 
                  how we collect, use, and safeguard your information when you use our 
                  educational platform.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          
          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-semibold m-0">1. Information We Collect</h2>
            </div>
            <p>
              We collect information to provide and improve our educational services:
            </p>
            <h3 className="text-lg font-medium mt-4">Information You Provide</h3>
            <ul>
              <li>
                <strong>Account Information:</strong> When you create an account, we collect 
                your email address and any profile information you choose to provide.
              </li>
              <li>
                <strong>Educational Preferences:</strong> Information about your learning 
                goals, risk tolerance questionnaire responses, and portfolio preferences 
                for educational purposes.
              </li>
              <li>
                <strong>Communications:</strong> If you contact us for support, we collect 
                the information you provide in your messages.
              </li>
            </ul>
            <h3 className="text-lg font-medium mt-4">Information Collected Automatically</h3>
            <ul>
              <li>
                <strong>Usage Data:</strong> How you interact with our educational tools, 
                features you use, and content you view.
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating system, and 
                device identifiers.
              </li>
              <li>
                <strong>Log Data:</strong> IP address, access times, pages viewed, and 
                referring URLs.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-violet-400" />
              <h2 className="text-xl font-semibold m-0">2. How We Use Your Information</h2>
            </div>
            <p>We use your information for the following purposes:</p>
            <ul>
              <li>
                <strong>Provide Educational Services:</strong> To deliver our educational 
                content, tools, and features.
              </li>
              <li>
                <strong>Personalize Learning:</strong> To customize educational content 
                and examples based on your stated preferences and learning goals.
              </li>
              <li>
                <strong>Improve Our Platform:</strong> To understand how users interact 
                with our tools and improve our educational offerings.
              </li>
              <li>
                <strong>Communications:</strong> To send you important updates about the 
                service, respond to your inquiries, and provide customer support.
              </li>
              <li>
                <strong>Security:</strong> To protect against fraud, abuse, and unauthorized 
                access.
              </li>
              <li>
                <strong>Legal Compliance:</strong> To comply with applicable laws and 
                regulations.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold m-0">3. Information Sharing</h2>
            </div>
            <p>
              We do not sell your personal information. We may share information in 
              limited circumstances:
            </p>
            <ul>
              <li>
                <strong>Service Providers:</strong> With trusted third-party service 
                providers who assist in operating our platform (hosting, analytics, 
                customer support).
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, subpoena, or 
                other legal process.
              </li>
              <li>
                <strong>Protection of Rights:</strong> To protect the rights, property, 
                or safety of {SITE_NAME}, our users, or others.
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, 
                acquisition, or sale of assets.
              </li>
              <li>
                <strong>With Your Consent:</strong> When you have given us explicit 
                permission to share your information.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Cookie className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-semibold m-0">4. Cookies and Tracking</h2>
            </div>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li>Keep you logged in to your account</li>
              <li>Remember your preferences and settings</li>
              <li>Understand how you use our platform</li>
              <li>Improve our educational services</li>
            </ul>
            <p>
              You can control cookies through your browser settings. Disabling cookies 
              may affect the functionality of certain features.
            </p>
          </section>

          <Separator />

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-rose-400" />
              <h2 className="text-xl font-semibold m-0">5. Data Security</h2>
            </div>
            <Card className="border-rose-500/30 bg-rose-500/5 mb-4">
              <CardContent className="p-4">
                <p className="m-0 text-sm">
                  We implement industry-standard security measures to protect your 
                  information, including encryption, secure servers, and access controls. 
                  However, no method of transmission over the internet is 100% secure.
                </p>
              </CardContent>
            </Card>
            <p>
              We regularly review and update our security practices to help ensure 
              the safety of your information. In the event of a data breach that 
              affects your personal information, we will notify you as required by 
              applicable law.
            </p>
          </section>

          <Separator />

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-semibold m-0">6. Your Rights and Choices</h2>
            </div>
            <p>You have the following rights regarding your information:</p>
            <ul>
              <li>
                <strong>Access:</strong> Request a copy of the personal information 
                we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> Request that we correct inaccurate 
                information about you.
              </li>
              <li>
                <strong>Deletion:</strong> Request that we delete your personal 
                information, subject to certain exceptions.
              </li>
              <li>
                <strong>Portability:</strong> Request a copy of your data in a 
                portable format.
              </li>
              <li>
                <strong>Opt-Out:</strong> Unsubscribe from marketing communications 
                at any time.
              </li>
              <li>
                <strong>Account Deletion:</strong> Delete your account through your 
                account settings or by contacting us.
              </li>
            </ul>
            <p>
              To exercise these rights, please contact us using the information 
              provided below.
            </p>
          </section>

          <Separator />

          {/* Section 7 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-semibold m-0">7. Data Retention</h2>
            </div>
            <p>
              We retain your information for as long as your account is active or as 
              needed to provide you with our services. We may also retain and use 
              your information as necessary to:
            </p>
            <ul>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce our agreements</li>
              <li>Protect our legal rights</li>
            </ul>
            <p>
              When we no longer need your information, we will securely delete or 
              anonymize it.
            </p>
          </section>

          <Separator />

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold">8. Children's Privacy</h2>
            <p>
              {SITE_NAME} is not intended for users under 18 years of age. We do not 
              knowingly collect personal information from children. If we learn that 
              we have collected information from a child under 18, we will delete 
              that information promptly.
            </p>
          </section>

          <Separator />

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold">9. International Users</h2>
            <p>
              If you are accessing {SITE_NAME} from outside the United States, please 
              be aware that your information may be transferred to, stored, and 
              processed in the United States where our servers are located. By using 
              our service, you consent to such transfer and processing.
            </p>
          </section>

          <Separator />

          {/* Section 10 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-violet-400" />
              <h2 className="text-xl font-semibold m-0">10. Changes to This Policy</h2>
            </div>
            <p>
              We may update this Privacy Policy from time to time. We will notify you 
              of any material changes by posting the new policy on this page with an 
              updated "Last Updated" date. We encourage you to review this policy 
              periodically.
            </p>
          </section>

          <Separator />

          {/* Section 11 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold m-0">11. Contact Us</h2>
            </div>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <p className="mb-2">
                  If you have any questions about this Privacy Policy or our data 
                  practices, please contact us:
                </p>
                <ul className="m-0">
                  <li>Through our Support Center within the application</li>
                  <li>By using the feedback form in the app</li>
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <FooterDisclaimer />
    </div>
  );
}

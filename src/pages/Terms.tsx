/**
 * Terms of Service Page
 * 
 * Essential legal page for compliance.
 */

import { SITE_NAME, FooterDisclaimer } from '@/components/legal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  AlertTriangle, 
  Scale, 
  Shield, 
  BookOpen,
  Sparkles,
  Database,
  Gavel,
} from 'lucide-react';

export default function TermsOfServicePage() {
  const lastUpdated = 'January 2025';
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-4xl py-12 flex-1">
        {/* Header */}
        <div className="mb-8">
          <Badge variant="outline" className="mb-4">
            <FileText className="h-3 w-3 mr-1" />
            Legal
          </Badge>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Important Notice Card */}
        <Card className="mb-8 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-400 mb-2">
                  Important: Please Read Carefully
                </h3>
                <p className="text-sm text-muted-foreground">
                  By using {SITE_NAME}, you agree to these Terms of Service. This is a 
                  legally binding agreement. If you do not agree with any part of these 
                  terms, you should not use the Service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          
          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold m-0">1. Educational Purpose</h2>
            </div>
            <p>
              {SITE_NAME} ("the Service," "we," "us," or "our") is an educational platform 
              designed to help users learn about investing concepts, portfolio construction, 
              asset allocation, and financial markets. The Service is provided for 
              <strong> informational and educational purposes only</strong>.
            </p>
            <p>
              Our mission is to democratize financial education by providing tools and 
              information that help users understand complex investment concepts. All 
              content, including portfolios, simulations, analyses, and examples, is 
              created solely for educational purposes.
            </p>
          </section>

          <Separator />

          {/* Section 2 - Most Important */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-rose-400" />
              <h2 className="text-xl font-semibold m-0">2. Not Investment Advice</h2>
            </div>
            <Card className="border-rose-500/30 bg-rose-500/5 mb-4">
              <CardContent className="p-4">
                <p className="font-semibold text-rose-400 m-0">
                  THE SERVICE DOES NOT PROVIDE INVESTMENT ADVICE, FINANCIAL ADVICE, 
                  TAX ADVICE, OR LEGAL ADVICE.
                </p>
              </CardContent>
            </Card>
            <ul>
              <li>
                Nothing on this website constitutes personalized investment advice, a 
                recommendation to buy or sell any security, or an offer of any kind.
              </li>
              <li>
                {SITE_NAME} is <strong>not</strong> a registered investment adviser, 
                broker-dealer, financial planner, or fiduciary.
              </li>
              <li>
                Any portfolios, asset allocations, analyses, or examples shown are for 
                <strong> educational purposes only</strong> and should not be construed as 
                recommendations for your specific situation.
              </li>
              <li>
                We do not know your financial situation, goals, risk tolerance, or 
                investment experience. Our educational content cannot account for your 
                individual circumstances.
              </li>
              <li>
                The fact that certain portfolios or allocations are displayed does not 
                mean they are suitable for any particular investor.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-semibold m-0">3. No Guarantees; Risk Disclosure</h2>
            </div>
            <ul>
              <li>
                <strong>Past performance does not guarantee future results.</strong> Historical 
                data shown is for educational purposes and may not be indicative of future 
                performance.
              </li>
              <li>
                <strong>All investments involve risk</strong>, including the possible loss of 
                all money invested. Different types of investments involve varying degrees 
                of risk.
              </li>
              <li>
                <strong>Simulated or hypothetical performance has inherent limitations.</strong> Unlike 
                actual performance records, simulated results do not represent actual trading 
                and may not reflect the impact of material economic and market factors.
              </li>
              <li>
                There is no guarantee that any investment strategy, portfolio, or approach 
                will be successful or achieve any particular level of results.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-semibold m-0">4. User Responsibility</h2>
            </div>
            <p>
              <strong>You are solely responsible for your own investment decisions.</strong>
            </p>
            <ul>
              <li>
                Before making any investment decision, you should consult with qualified 
                financial, tax, and legal professionals who understand your specific 
                circumstances, goals, and risk tolerance.
              </li>
              <li>
                You should conduct your own research and due diligence before making any 
                investment.
              </li>
              <li>
                You should never invest money you cannot afford to lose.
              </li>
              <li>
                Any reliance you place on information obtained from the Service is strictly 
                at your own risk.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <h2 className="text-xl font-semibold m-0">5. AI-Generated Content</h2>
            </div>
            <p>
              Some content on this Service is generated by artificial intelligence ("AI").
            </p>
            <ul>
              <li>
                AI-generated content is for <strong>educational purposes only</strong> and 
                does not constitute personalized advice.
              </li>
              <li>
                AI may produce inaccurate, incomplete, or misleading information. You should 
                not rely solely on AI-generated content for any important decisions.
              </li>
              <li>
                AI-generated analyses reflect general patterns and historical data, not 
                predictions of future performance or recommendations for your situation.
              </li>
              <li>
                We are not responsible for any errors, omissions, or inaccuracies in 
                AI-generated content.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold m-0">6. Data and Information</h2>
            </div>
            <ul>
              <li>
                Market data, quotes, and other information are obtained from third-party 
                sources believed to be reliable. However, we do not guarantee the accuracy, 
                completeness, or timeliness of any data.
              </li>
              <li>
                Data may be delayed, contain errors, or be incomplete. Real-time data should 
                be obtained from qualified sources before making any decisions.
              </li>
              <li>
                We are not responsible for any losses arising from errors in third-party data.
              </li>
            </ul>
          </section>

          <Separator />

          {/* Section 7 - Limitation of Liability */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Gavel className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-semibold m-0">7. Limitation of Liability</h2>
            </div>
            <Card className="border-slate-500/30 bg-slate-500/5 mb-4">
              <CardContent className="p-4 text-sm">
                <p className="m-0">
                  TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {SITE_NAME.toUpperCase()}, 
                  ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS 
                  SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, 
                  CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED 
                  TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE 
                  LOSSES, ARISING OUT OF OR RELATING TO:
                </p>
                <ul className="mt-2 mb-0">
                  <li>Your use of or inability to use the Service</li>
                  <li>Any investment decisions made based on information from the Service</li>
                  <li>Any errors, omissions, or inaccuracies in content</li>
                  <li>Any unauthorized access to or use of our servers</li>
                  <li>Any third-party content or conduct</li>
                </ul>
              </CardContent>
            </Card>
            <p>
              Some jurisdictions do not allow the exclusion of certain warranties or 
              limitation of liability for certain damages. In such jurisdictions, our 
              liability shall be limited to the maximum extent permitted by law.
            </p>
          </section>

          <Separator />

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold">8. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless {SITE_NAME} and its 
              affiliates, officers, directors, employees, and agents from and against 
              any claims, liabilities, damages, losses, and expenses, including reasonable 
              attorneys' fees, arising out of or relating to your use of the Service or 
              your violation of these Terms.
            </p>
          </section>

          <Separator />

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold">9. Modifications</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users 
              of material changes by posting the updated Terms on the Service with a new 
              "Last Updated" date. Your continued use of the Service after any changes 
              constitutes your acceptance of the modified Terms.
            </p>
          </section>

          <Separator />

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-semibold">10. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws 
              of the State of Delaware, without regard to its conflict of law provisions. 
              Any disputes arising from these Terms or the Service shall be resolved in 
              the state or federal courts located in Delaware.
            </p>
          </section>

          <Separator />

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-semibold">11. Acknowledgment</h2>
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <p className="m-0">
                  By using this Service, you acknowledge that you have read, understood, 
                  and agree to be bound by these Terms of Service. You understand that 
                  {SITE_NAME} is an <strong>educational platform</strong> that does not 
                  provide personalized investment advice, and you will consult qualified 
                  professionals before making any investment decisions.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <FooterDisclaimer />
    </div>
  );
}

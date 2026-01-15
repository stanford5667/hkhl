/**
 * Disclosures Page
 * 
 * Comprehensive disclosure page with all required legal disclaimers.
 */

import { SITE_NAME, FooterDisclaimer } from '@/components/legal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Database,
  Globe,
  Shield,
  Scale,
  Calculator,
  Clock,
} from 'lucide-react';

export default function DisclosuresPage() {
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
          <h1 className="text-3xl font-bold mb-2">Important Disclosures</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Quick Summary */}
        <Card className="mb-8 border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-400 mb-3">Summary</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• {SITE_NAME} is an educational platform, not an investment adviser</li>
              <li>• Nothing on this site is personalized investment advice</li>
              <li>• Past performance does not guarantee future results</li>
              <li>• All simulations are hypothetical</li>
              <li>• Consult qualified professionals before investing</li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-8">
          
          {/* Section 1: General Disclosure */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold">General Disclosure</h2>
            </div>
            <div className="prose prose-sm dark:prose-invert">
              <p>
                {SITE_NAME} is an educational platform that provides tools, information, and 
                content to help users learn about investing concepts, portfolio construction, 
                and financial markets. <strong>We are not a registered investment adviser, 
                broker-dealer, or financial planner.</strong>
              </p>
              <p>
                Nothing on this website constitutes:
              </p>
              <ul>
                <li>Investment advice or recommendations</li>
                <li>Financial planning or tax advice</li>
                <li>An offer to buy or sell securities</li>
                <li>Personalized advice for your specific situation</li>
              </ul>
              <p>
                All content is for educational and informational purposes only. The portfolios, 
                analyses, and examples shown are illustrative and should not be construed as 
                recommendations.
              </p>
            </div>
          </section>

          <Separator />

          {/* Section 2: Hypothetical Performance */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="text-xl font-semibold">Hypothetical Performance Disclosure</h2>
            </div>
            
            <Card className="border-amber-500/30 bg-amber-500/5 mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-400 text-base">
                  IMPORTANT: HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-4">
                <p>
                  <strong>HYPOTHETICAL OR SIMULATED PERFORMANCE RESULTS HAVE CERTAIN INHERENT 
                  LIMITATIONS.</strong> UNLIKE AN ACTUAL PERFORMANCE RECORD, SIMULATED RESULTS 
                  DO NOT REPRESENT ACTUAL TRADING. ALSO, SINCE THE TRADES HAVE NOT ACTUALLY 
                  BEEN EXECUTED, THE RESULTS MAY HAVE UNDER- OR OVER-COMPENSATED FOR THE IMPACT, 
                  IF ANY, OF CERTAIN MARKET FACTORS, SUCH AS LACK OF LIQUIDITY.
                </p>
                <p>
                  SIMULATED TRADING PROGRAMS IN GENERAL ARE ALSO SUBJECT TO THE FACT THAT THEY 
                  ARE DESIGNED WITH THE BENEFIT OF HINDSIGHT. NO REPRESENTATION IS BEING MADE 
                  THAT ANY ACCOUNT WILL OR IS LIKELY TO ACHIEVE PROFITS OR LOSSES SIMILAR TO 
                  THOSE SHOWN.
                </p>
                <p>
                  IN ADDITION, HYPOTHETICAL TRADING DOES NOT INVOLVE FINANCIAL RISK, AND NO 
                  HYPOTHETICAL TRADING RECORD CAN COMPLETELY ACCOUNT FOR THE IMPACT OF FINANCIAL 
                  RISK IN ACTUAL TRADING. FOR EXAMPLE, THE ABILITY TO WITHSTAND LOSSES OR TO 
                  ADHERE TO A PARTICULAR TRADING PROGRAM IN SPITE OF TRADING LOSSES ARE MATERIAL 
                  POINTS WHICH CAN ALSO ADVERSELY AFFECT ACTUAL TRADING RESULTS.
                </p>
                <p>
                  THERE ARE NUMEROUS OTHER FACTORS RELATED TO THE MARKETS IN GENERAL OR TO THE 
                  IMPLEMENTATION OF ANY SPECIFIC TRADING PROGRAM WHICH CANNOT BE FULLY ACCOUNTED 
                  FOR IN THE PREPARATION OF HYPOTHETICAL PERFORMANCE RESULTS AND ALL OF WHICH 
                  CAN ADVERSELY AFFECT ACTUAL TRADING RESULTS.
                </p>
              </CardContent>
            </Card>

            <div className="prose prose-sm dark:prose-invert">
              <p>All performance figures shown on {SITE_NAME} are:</p>
              <ul>
                <li>
                  <strong>Hypothetical:</strong> Based on historical data and backtesting, 
                  not actual trading
                </li>
                <li>
                  <strong>Not predictive:</strong> Past performance does not guarantee or 
                  indicate future results
                </li>
                <li>
                  <strong>Simplified:</strong> May not account for fees, taxes, slippage, 
                  or other real-world costs
                </li>
                <li>
                  <strong>Subject to survivorship bias:</strong> Historical data may 
                  exclude securities that no longer exist
                </li>
              </ul>
            </div>
          </section>

          <Separator />

          {/* Section 3: Risk Disclosure */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-rose-400" />
              <h2 className="text-xl font-semibold">Risk Disclosure</h2>
            </div>
            <div className="prose prose-sm dark:prose-invert">
              <p><strong>All investments involve risk, including the possible loss of principal.</strong></p>
              
              <h4>General Investment Risks</h4>
              <ul>
                <li>Market risk: The value of investments may decline due to market conditions</li>
                <li>Inflation risk: Returns may not keep pace with inflation</li>
                <li>Interest rate risk: Bond values typically fall when interest rates rise</li>
                <li>Currency risk: International investments are subject to exchange rate fluctuations</li>
                <li>Liquidity risk: Some investments may be difficult to sell quickly</li>
                <li>Concentration risk: Focused portfolios have higher volatility</li>
              </ul>

              <h4>Asset Class Specific Risks</h4>
              <ul>
                <li><strong>Equities:</strong> Can be highly volatile; may lose significant value</li>
                <li><strong>Bonds:</strong> Subject to credit and interest rate risk</li>
                <li><strong>International:</strong> Additional risks from currency, political instability</li>
                <li><strong>Emerging Markets:</strong> Higher volatility and political risk</li>
                <li><strong>Real Estate:</strong> Illiquidity, interest rate sensitivity</li>
                <li><strong>Alternatives:</strong> Complex, may be illiquid, higher fees</li>
              </ul>
            </div>
          </section>

          <Separator />

          {/* Section 4: AI Content */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <h2 className="text-xl font-semibold">AI-Generated Content</h2>
            </div>
            <div className="prose prose-sm dark:prose-invert">
              <p>
                {SITE_NAME} uses artificial intelligence to generate educational content, 
                analyses, and explanations.
              </p>
              <ul>
                <li>AI content is for <strong>educational purposes only</strong></li>
                <li>AI may produce inaccurate, incomplete, or outdated information</li>
                <li>AI analyses are based on historical patterns, not predictions</li>
                <li>AI cannot account for your personal situation</li>
                <li>Always verify important information from qualified sources</li>
              </ul>
              <p>
                We are not responsible for any errors or omissions in AI-generated content 
                or any decisions made based on such content.
              </p>
            </div>
          </section>

          <Separator />

          {/* Section 5: Data Sources */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold">Data Sources and Accuracy</h2>
            </div>
            <div className="prose prose-sm dark:prose-invert">
              <p>
                Market data, financial information, and other content are obtained from 
                third-party sources including:
              </p>
              <ul>
                <li>Financial data providers</li>
                <li>Government sources (Federal Reserve, SEC, etc.)</li>
                <li>Academic research</li>
                <li>Public company filings</li>
              </ul>
              <p>
                While we strive to use reliable sources, <strong>we do not guarantee the 
                accuracy, completeness, or timeliness of any data</strong>. Data may be:
              </p>
              <ul>
                <li>Delayed (not real-time)</li>
                <li>Subject to revision</li>
                <li>Incomplete or contain errors</li>
                <li>Historical and may not reflect current conditions</li>
              </ul>
              <p>
                Always verify critical information from official sources before making 
                any decisions.
              </p>
            </div>
          </section>

          <Separator />

          {/* Section 6: Third Party */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-semibold">Third-Party Content and Links</h2>
            </div>
            <div className="prose prose-sm dark:prose-invert">
              <p>
                {SITE_NAME} may contain links to third-party websites or reference 
                third-party content. We are not responsible for:
              </p>
              <ul>
                <li>The accuracy of third-party content</li>
                <li>The privacy practices of other websites</li>
                <li>Any products or services offered by third parties</li>
              </ul>
              <p>
                The inclusion of any link or reference does not imply endorsement.
              </p>
            </div>
          </section>

          <Separator />

          {/* Section 7: User Responsibility */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold">Your Responsibility</h2>
            </div>
            <div className="prose prose-sm dark:prose-invert">
              <p><strong>You are solely responsible for your investment decisions.</strong></p>
              <p>Before making any investment:</p>
              <ul>
                <li>Consult with a qualified financial professional</li>
                <li>Consider your personal financial situation and goals</li>
                <li>Understand the risks involved</li>
                <li>Conduct your own research and due diligence</li>
                <li>Never invest money you cannot afford to lose</li>
              </ul>
              <p>
                Any reliance you place on information from {SITE_NAME} is strictly at 
                your own risk.
              </p>
            </div>
          </section>

          <Separator />

          {/* Section 8: Performance Metrics */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-semibold">Performance Metrics Explained</h2>
            </div>
            <div className="prose prose-sm dark:prose-invert">
              <p>
                Performance metrics shown on {SITE_NAME} are calculated using standard 
                industry methodologies:
              </p>
              <ul>
                <li>
                  <strong>Returns:</strong> Time-weighted returns assuming reinvestment 
                  of dividends. May not account for taxes.
                </li>
                <li>
                  <strong>Volatility:</strong> Standard deviation of returns, typically 
                  annualized.
                </li>
                <li>
                  <strong>Sharpe Ratio:</strong> Excess return per unit of risk. Uses 
                  risk-free rate approximation.
                </li>
                <li>
                  <strong>Max Drawdown:</strong> Largest peak-to-trough decline in value.
                </li>
              </ul>
              <p>
                Actual results will vary due to fees, taxes, timing, and other factors 
                not captured in these calculations.
              </p>
            </div>
          </section>

          <Separator />

          {/* Section 9: Updates */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-orange-400" />
              <h2 className="text-xl font-semibold">Updates to These Disclosures</h2>
            </div>
            <div className="prose prose-sm dark:prose-invert">
              <p>
                We may update these disclosures from time to time. Material changes will 
                be noted by updating the "Last Updated" date. Your continued use of 
                {SITE_NAME} constitutes acceptance of any updated disclosures.
              </p>
            </div>
          </section>

        </div>
      </div>

      <FooterDisclaimer expanded />
    </div>
  );
}

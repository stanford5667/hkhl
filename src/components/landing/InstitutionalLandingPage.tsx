import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Search, Menu, X, ChartNoAxesCombined, Layers3, SlidersHorizontal, Globe2, FlaskConical, MessagesSquare, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetLabsMark } from '@/components/brand/AssetLabsMark';
import { useAuth } from '@/contexts/AuthContext';
import { CTA_COPY } from '@/lib/authCopy';
import { cn } from '@/lib/utils';
import academyImage from '@/assets/landing/research-academy.jpg';
import { LandingSearch } from './LandingSearch';
import { ResearchTerminalPreview } from './ResearchTerminalPreview';
import { LANDING_SYMBOLS, useLandingQuotes } from './useLandingMarketData';

const NAV = [['Research', '/research'], ['Portfolios', '/portfolio-visualizer'], ['Options', '/options-analyzer'], ['Academy', '/academy'], ['Pricing', '/upgrade']];
const CAPABILITIES = [
  { icon: ChartNoAxesCombined, title: 'Ticker research', text: 'Charts, fundamentals, filings, and news. A complete view of the assets that matter.', href: '/stock/AAPL', label: 'Explore research' },
  { icon: Layers3, title: 'AI Portfolio Builder', text: 'Turn your objectives into a diversified portfolio, with allocation and risk in view.', href: '/portfolio-visualizer', label: 'Build a portfolio' },
  { icon: SlidersHorizontal, title: 'Options Analyzer', text: 'Explore options strategies, evaluate the Greeks, and understand your exposure.', href: '/options-analyzer', label: 'Analyze options' },
  { icon: Globe2, title: 'Themes Map', text: 'Connect the macro picture to sectors, investment themes, and individual assets.', href: '/investment-heatmap', label: 'Explore themes' },
  { icon: FlaskConical, title: 'Sim Trading', text: 'Put your thesis to work in a paper portfolio. Learn from every decision without risking capital.', href: '/sim-trading', label: 'Test your ideas' },
  { icon: MessagesSquare, title: 'Community Chat Room', text: 'Follow investment ideas and discuss markets with a community of thoughtful investors.', href: '/community', label: 'Join the conversation' },
];

function Wordmark() {
  return <Link to="/" aria-label="Asset Labs home" className="flex shrink-0 items-center gap-2 text-primary"><AssetLabsMark className="h-7 w-7" strokeWidth={1.6} /><span className="landing-serif text-[25px]">Asset Labs<span className="ml-1.5 align-top font-sans text-[9px] font-medium">AI</span></span></Link>;
}

export function InstitutionalLandingPage() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const quotes = useLandingQuotes();
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const start = () => {
    if (user) { navigate('/research'); return; }
    sessionStorage.setItem('post_auth_redirect', '/research');
    navigate('/auth', { state: { mode: 'signup', from: '/research' } });
  };
  const platform = () => document.getElementById('platform')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  return <div className="institutional-landing min-h-screen bg-background text-foreground">
    <a href="#main-content" className="sr-only z-[60] bg-background px-4 py-2 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="landing-container flex h-[76px] items-center justify-between gap-4">
        <Wordmark />
        <nav className="hidden items-center gap-6 xl:flex" aria-label="Main navigation">{NAV.map(([label, href]) => <Link key={label} to={href} className="text-[12px] text-muted-foreground transition-colors hover:text-primary">{label}</Link>)}</nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" onClick={() => setSearchOpen(true)} className="hidden h-8 gap-3 rounded-sm px-3 text-xs text-muted-foreground md:flex"><Search className="h-3.5 w-3.5" /><span>Search markets</span><kbd className="font-mono text-[10px]">⌘K</kbd></Button>
          <Button variant="ghost" size="icon" aria-label="Search markets" onClick={() => setSearchOpen(true)} className="md:hidden"><Search /></Button>
          <Button variant="link" className="hidden h-9 p-0 text-xs sm:inline-flex" onClick={() => navigate(user ? '/research' : '/auth', { state: { mode: 'signin' } })}>{user ? 'Workspace' : 'Log in'}</Button>
          <Button onClick={start} className="hidden h-9 rounded-sm px-4 text-xs shadow-none sm:inline-flex">{user ? 'Open platform' : 'Get started'}<ArrowUpRight className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="landing-mobile-nav" aria-label={menuOpen ? 'Close menu' : 'Open menu'} className="xl:hidden">{menuOpen ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {menuOpen && <nav id="landing-mobile-nav" aria-label="Mobile navigation" className="grid gap-1 border-t border-border px-6 py-4 xl:hidden">{NAV.map(([label, href]) => <Button key={label} asChild variant="ghost" className="justify-start"><Link to={href} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight className="ml-auto" /></Link></Button>)}<div className="mt-3 flex gap-3"><Button variant="outline" onClick={() => navigate('/auth', { state: { mode: 'signin' } })}>Log in</Button><Button onClick={start}>{CTA_COPY.getStarted}</Button></div></nav>}
    </header>

    <div className="border-b border-border" aria-label="Market snapshot">
      <div className="landing-container grid grid-cols-3 sm:grid-cols-6">
        {LANDING_SYMBOLS.map((symbol, i) => {
          const quote = quotes.data?.find(q => q.ticker === symbol);
          return <Link key={symbol} to={`/stock/${symbol}`} className={cn('flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2 py-3 font-mono text-[10px] hover:bg-accent', i !== 0 && 'border-l border-border', i > 2 && 'border-t sm:border-t-0', i === 3 && 'max-sm:border-l-0')}>
            <span className="font-medium">{symbol}</span><span className="text-muted-foreground">{quote?.last_close != null ? quote.last_close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>{quote?.change_percent_1d != null && <span className={quote.change_percent_1d >= 0 ? 'text-success' : 'text-destructive'}>{quote.change_percent_1d >= 0 ? '+' : ''}{quote.change_percent_1d.toFixed(2)}%</span>}
          </Link>;
        })}
      </div>
    </div>

    <main id="main-content">
      <section className="landing-container pb-10 pt-14 text-center sm:pb-12 sm:pt-20">
        <p className="landing-eyebrow mb-6 flex items-center justify-center gap-2"><span className="h-1 w-1 bg-primary" />PUBLIC MARKETS. A CLEARER PERSPECTIVE.</p>
        <h1 className="landing-serif mx-auto max-w-[880px] text-[38px] font-normal leading-[1.08] sm:text-[54px] lg:text-[66px]">Institutional-grade research<br className="hidden sm:block" /> for public markets.</h1>
        <p className="mx-auto mt-6 max-w-[650px] text-sm leading-7 text-muted-foreground sm:text-base">AI-powered research, backtesting, and portfolio construction.<br className="hidden sm:block" /> Across equities, ETFs, and options. All in one workspace.</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 min-[380px]:flex-row min-[380px]:items-center"><Button onClick={start} size="lg" className="rounded-sm px-6 text-xs shadow-none">{user ? 'Open your workspace' : 'Get started — free'}<ArrowUpRight /></Button><Button variant="outline" size="lg" onClick={platform} className="rounded-sm px-6 text-xs">See the platform <ArrowRight /></Button></div>
        <p className="mt-4 text-[10px] text-muted-foreground">No credit card required.</p>
      </section>

      <section id="platform" aria-labelledby="platform-title" className="landing-container scroll-mt-24 pb-16 sm:pb-24">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 id="platform-title" className="landing-eyebrow">YOUR RESEARCH DESK, REIMAGINED</h2><span className="font-mono text-[9px] text-muted-foreground">PUBLIC MARKET DATA · HISTORICAL SNAPSHOT</span></div>
        <ResearchTerminalPreview onSearch={() => setSearchOpen(true)} />
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[11px] text-muted-foreground">{['Equities & ETFs', 'Options & derivatives', 'Indices & commodities'].map(label => <span key={label} className="flex items-center gap-2"><Check className="h-3 w-3 text-primary" />{label}</span>)}</div>
      </section>

      <section className="border-y border-border bg-secondary/50 py-16 sm:py-20" aria-labelledby="workflow-heading">
        <div className="landing-container">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="landing-eyebrow mb-4">FROM UNDERSTANDING TO EXECUTION</p><h2 id="workflow-heading" className="landing-serif text-3xl font-normal sm:text-[40px]">A better process. Better decisions.</h2></div><p className="max-w-[300px] text-xs leading-6 text-muted-foreground">Build conviction with research.<br />Pressure-test it. Keep your portfolio in view.</p></div>
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            <article className="min-w-0"><div className="mb-5 flex items-baseline gap-4 border-t border-border pt-5"><span className="font-mono text-xs text-muted-foreground">01</span><h3 className="landing-serif text-2xl">Learn</h3></div><p className="mb-6 min-h-[60px] text-xs leading-6 text-muted-foreground">Learn how top fund managers approach markets. Connect macro themes, company fundamentals, and risk.</p><Link to="/academy" className="group relative block aspect-[16/9] overflow-hidden rounded-sm"><img src={academyImage} width={1024} height={576} loading="lazy" alt="Illustration of a fund manager discussing research with analysts" className="h-full w-full object-cover" /><span className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-sm bg-card text-primary"><Play className="h-3.5 w-3.5" /></span><span className="absolute bottom-3 right-3 rounded-sm bg-card px-2 py-1 font-mono text-[9px] text-muted-foreground">ACADEMY</span></Link><Button asChild variant="link" className="mt-4 h-auto p-0 text-xs"><Link to="/academy">Explore the Academy <ArrowUpRight /></Link></Button></article>
            <article className="min-w-0"><div className="mb-5 flex items-baseline gap-4 border-t border-border pt-5"><span className="font-mono text-xs text-muted-foreground">02</span><h3 className="landing-serif text-2xl">Test</h3></div><p className="mb-6 min-h-[60px] text-xs leading-6 text-muted-foreground">Go beyond a good story. Backtest your strategy against historical data, then practice with Sim Trading.</p><div className="flex aspect-[16/9] flex-col justify-between rounded-sm border border-border bg-card p-5"><div className="flex items-center justify-between text-[10px]"><span className="font-medium">Strategy workspace</span><FlaskConical className="h-4 w-4 text-muted-foreground" /></div><div className="flex items-center justify-between gap-2">{['Select asset', 'Set rules', 'Backtest'].map((label, i) => <div key={label} className="flex flex-1 items-center gap-2"><div className="flex h-9 flex-1 items-center justify-center rounded-sm border border-border bg-secondary px-1 text-center text-[9px]">{label}</div>{i < 2 && <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />}</div>)}</div><div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[9px] text-muted-foreground"><span>HISTORICAL DATA</span><span>NO CODE REQUIRED</span></div></div><Button asChild variant="link" className="mt-4 h-auto p-0 text-xs"><Link to="/backtester">Put an idea to the test <ArrowUpRight /></Link></Button></article>
            <article className="min-w-0"><div className="mb-5 flex items-baseline gap-4 border-t border-border pt-5"><span className="font-mono text-xs text-muted-foreground">03</span><h3 className="landing-serif text-2xl">Track</h3></div><p className="mb-6 min-h-[60px] text-xs leading-6 text-muted-foreground">Construct a portfolio with AI. Monitor performance, diversification, and exposure as your thesis evolves.</p><div className="flex aspect-[16/9] flex-col justify-between rounded-sm border border-border bg-card p-5"><div className="flex justify-between text-[10px]"><span className="font-medium">Portfolio intelligence</span><Layers3 className="h-4 w-4 text-muted-foreground" /></div><div className="space-y-3">{[['Allocation', 'Across asset classes'], ['Risk', 'Exposure & diversification'], ['Performance', 'Your portfolio in context']].map(([label, text]) => <div key={label} className="flex justify-between gap-2 border-b border-border pb-2 text-[9px]"><span className="font-medium">{label}</span><span className="text-muted-foreground">{text}</span></div>)}</div><span className="font-mono text-[9px] text-muted-foreground">THE WHOLE PICTURE. NOT JUST A POSITION.</span></div><Button asChild variant="link" className="mt-4 h-auto p-0 text-xs"><Link to="/portfolio-visualizer">Build your portfolio <ArrowUpRight /></Link></Button></article>
          </div>
        </div>
      </section>

      <section className="landing-container py-16 sm:py-24" aria-labelledby="capabilities-heading">
        <p className="landing-eyebrow mb-4">CONNECTED INTELLIGENCE</p><div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><h2 id="capabilities-heading" className="landing-serif max-w-lg text-3xl font-normal leading-tight sm:text-[40px]">Everything your investment<br className="hidden sm:block" /> process needs.</h2><p className="max-w-[300px] text-xs leading-6 text-muted-foreground">Less switching between tools.<br />More time developing your next idea.</p></div>
        <div className="grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-3">{CAPABILITIES.map(({ icon: Icon, title, text, href, label }) => <article key={title} className="flex flex-col border-b border-r border-border px-7 py-8"><Icon strokeWidth={1.3} className="mb-6 h-6 w-6 text-primary" /><h3 className="terminal-heading text-base font-medium">{title}</h3><p className="mb-6 mt-3 flex-1 text-xs leading-6 text-muted-foreground">{text}</p><Button asChild variant="link" className="h-auto justify-start p-0 text-[11px]"><Link to={href}>{label}<ArrowUpRight className="ml-auto h-3.5 w-3.5" /></Link></Button></article>)}</div>
      </section>

      <section aria-label="Platform coverage" className="border-t border-border"><div className="landing-container grid gap-7 py-10 sm:grid-cols-3 sm:gap-8 sm:py-12">{[['12,000+', 'Tickers to research', 'Public equities, ETFs, and more.'], ['Decades', 'Of historical market data', 'Context for your investment thesis.'], ['One', 'Connected workspace', 'Research. Learn. Test. Track.']].map(([value, label, detail]) => <div key={label} className="sm:border-l sm:border-border sm:pl-8 first:sm:border-l-0 first:sm:pl-0"><p className="font-mono text-[32px] font-normal text-primary">{value}</p><p className="mt-2 text-xs font-medium">{label}</p><p className="mt-2 text-[11px] text-muted-foreground">{detail}</p></div>)}</div></section>

      <section className="landing-cta bg-primary py-16 text-primary-foreground sm:py-20"><div className="landing-container flex flex-col items-start justify-between gap-8 md:flex-row md:items-center"><div><p className="landing-eyebrow mb-5 text-primary-foreground/60">YOUR NEXT IDEA DESERVES A BETTER PROCESS.</p><h2 className="landing-serif text-[36px] font-normal leading-tight sm:text-[44px]">See the market more clearly.</h2><p className="mt-4 text-sm text-primary-foreground/70">Research with depth. Invest with intention.</p></div><div><Button onClick={start} variant="secondary" size="lg" className="rounded-sm bg-background px-7 text-xs text-primary hover:bg-background/90">{user ? 'Open the platform' : 'Get started — free'}<ArrowUpRight /></Button><p className="mt-3 text-[10px] text-primary-foreground/60">No credit card required.</p></div></div></section>
    </main>

    <footer className="landing-container pb-7 pt-14"><div className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]"><div><Wordmark /><p className="mt-4 max-w-[240px] text-xs leading-6 text-muted-foreground">Research and portfolio intelligence<br />for the public markets.</p></div>{[
      { title: 'Product', links: [['Research', '/research'], ['Portfolio Builder', '/portfolio-visualizer'], ['Options Analyzer', '/options-analyzer'], ['Sim Trading', '/sim-trading']] },
      { title: 'Learn', links: [['Academy', '/academy'], ['Backtesting', '/backtester'], ['Themes Map', '/investment-heatmap']] },
      { title: 'Company', links: [['Community', '/community'], ['Pricing', '/upgrade'], ['Support', '/support']] },
      { title: 'Legal', links: [['Privacy policy', '/privacy'], ['Terms of service', '/terms'], ['Disclosures', '/disclosures']] },
    ].map(group => <div key={group.title}><h3 className="terminal-heading mb-5 text-xs font-medium">{group.title}</h3><ul className="space-y-3">{group.links.map(([label, href]) => <li key={label}><Link to={href} className="text-[11px] text-muted-foreground hover:text-primary">{label}</Link></li>)}</ul></div>)}</div><div className="flex flex-col justify-between gap-4 border-t border-border pt-6 sm:flex-row"><p className="shrink-0 text-[10px] text-muted-foreground">© {new Date().getFullYear()} Asset Labs AI</p><p className="max-w-[660px] text-[9px] leading-5 text-muted-foreground">For informational and educational purposes only. Not investment advice. Investing involves risk, including loss of principal. Historical and simulated results do not guarantee future performance.</p></div></footer>
    <LandingSearch open={searchOpen} onOpenChange={setSearchOpen} />
  </div>;
}
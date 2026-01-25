import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, Sparkles, Zap, Leaf, ArrowRight, Plus, 
  Cpu, Heart, ShoppingCart, Factory, Landmark, Building2,
  Globe, Shield, Wifi, Car, Plane, Home, Coffee, Pill,
  Smartphone, Cloud, Database, Lock, Truck, Package,
  Banknote, CreditCard, Coins, BarChart3, LineChart,
  Megaphone, Users, GraduationCap, Gamepad2, Music,
  Camera, Tv, Radio, Newspaper, BookOpen, Microscope,
  Atom, Beaker, Dna, Brain, Eye, Ear, Bone,
  Wheat, Droplets, Sun, Moon, Wind, Thermometer,
  Mountain, TreePine, Fish, Beef, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ThemeTicker {
  symbol: string;
  name: string;
  change: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  themeRelevance?: string;
}

interface ThemeNews {
  title: string;
  source: string;
  time: string;
  url?: string;
}

interface MarketTheme {
  id: string;
  title: string;
  summary: string;
  detailedSummary: string;
  impactPercent: number;
  sentimentScore: number;
  icon: React.ElementType;
  category: string;
  tickers: ThemeTicker[];
  headlines: ThemeNews[];
}

const MARKET_THEMES: MarketTheme[] = [
  {
    id: 'ai-infrastructure',
    title: 'AI Infrastructure Surge',
    summary: 'Data center buildout accelerating as hyperscalers race to meet compute demand.',
    detailedSummary: 'The artificial intelligence revolution is driving unprecedented demand for computing infrastructure. Major cloud providers including Microsoft, Google, and Amazon are committing tens of billions of dollars to expand their data center footprints. This theme encompasses not just chip manufacturers, but the entire ecosystem including power infrastructure, cooling systems, networking equipment, and real estate. The buildout is expected to continue for years as AI workloads grow exponentially. Companies providing liquid cooling solutions, power management systems, and high-density rack infrastructure are seeing particularly strong order growth. The theme extends to utilities serving data center-heavy regions and companies providing the rare earth materials needed for chip manufacturing.',
    impactPercent: 12.4,
    sentimentScore: 0.85,
    icon: Sparkles,
    category: 'Technology',
    tickers: [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', change: 4.2, sentiment: 'bullish', themeRelevance: 'Dominant GPU supplier powering AI training and inference workloads across all major hyperscalers.' },
      { symbol: 'VRT', name: 'Vertiv Holdings', change: 8.1, sentiment: 'bullish', themeRelevance: 'Leading provider of liquid cooling and power management solutions for high-density AI data centers.' },
      { symbol: 'ETN', name: 'Eaton Corporation', change: 3.5, sentiment: 'bullish', themeRelevance: 'Critical electrical infrastructure supplier for data center power distribution and backup systems.' },
      { symbol: 'DELL', name: 'Dell Technologies', change: 2.1, sentiment: 'neutral', themeRelevance: 'Major server manufacturer benefiting from AI server demand, though facing margin pressure.' },
      { symbol: 'SMCI', name: 'Super Micro Computer', change: -1.2, sentiment: 'bearish', themeRelevance: 'High-performance server specialist, though recent accounting concerns weigh on sentiment.' },
      { symbol: 'AMD', name: 'Advanced Micro Devices', change: 3.8, sentiment: 'bullish', themeRelevance: 'Growing challenger in AI accelerators with MI300 series, gaining enterprise adoption.' },
    ],
    headlines: [
      { title: 'NVIDIA announces next-gen Blackwell architecture with 4x performance gains', source: 'Reuters', time: '2h ago' },
      { title: 'Microsoft to spend $80B on AI data centers in 2025', source: 'Bloomberg', time: '4h ago' },
      { title: 'Vertiv sees 30% YoY growth in liquid cooling orders', source: 'WSJ', time: '6h ago' },
      { title: 'Data center power consumption to double by 2028', source: 'Financial Times', time: '8h ago' },
    ],
  },
  {
    id: 'energy-transition',
    title: 'Clean Energy Transition',
    summary: 'Renewable infrastructure spending accelerating globally with grid modernization.',
    detailedSummary: 'The global transition from fossil fuels to renewable energy sources represents one of the largest capital reallocation events in history. Governments worldwide are implementing aggressive clean energy mandates, driving massive investment in solar, wind, and battery storage infrastructure. The Inflation Reduction Act in the US alone is expected to mobilize over $1 trillion in clean energy investment. This theme captures the entire value chain from raw materials (lithium, copper, rare earths) to manufacturers of solar panels, wind turbines, and batteries, to utilities transitioning their generation portfolios. Grid modernization is a critical sub-theme as existing infrastructure struggles to handle the intermittency of renewable sources.',
    impactPercent: 7.8,
    sentimentScore: 0.72,
    icon: Leaf,
    category: 'Energy',
    tickers: [
      { symbol: 'ENPH', name: 'Enphase Energy', change: 5.3, sentiment: 'bullish', themeRelevance: 'Market leader in residential solar microinverters with strong recurring software revenue.' },
      { symbol: 'FSLR', name: 'First Solar', change: 3.9, sentiment: 'bullish', themeRelevance: 'Only US-based utility-scale solar manufacturer, benefiting from IRA domestic content provisions.' },
      { symbol: 'NEE', name: 'NextEra Energy', change: 1.2, sentiment: 'neutral', themeRelevance: 'Largest renewable energy generator in North America with diversified wind and solar portfolio.' },
      { symbol: 'PLUG', name: 'Plug Power', change: -2.4, sentiment: 'bearish', themeRelevance: 'Green hydrogen fuel cell provider facing profitability challenges despite growing demand.' },
      { symbol: 'RUN', name: 'Sunrun Inc', change: 4.1, sentiment: 'bullish', themeRelevance: 'Leading residential solar installer with expanding battery storage and virtual power plant capabilities.' },
    ],
    headlines: [
      { title: 'US solar installations hit record high in Q4 2025', source: 'CNBC', time: '3h ago' },
      { title: 'EU approves €50B green energy infrastructure package', source: 'Financial Times', time: '5h ago' },
      { title: 'Battery storage costs fall 15% as manufacturing scales', source: 'Bloomberg', time: '7h ago' },
    ],
  },
  {
    id: 'rate-pivot',
    title: 'Fed Rate Pivot Trade',
    summary: 'Markets pricing in rate cuts with duration-sensitive assets seeing flows.',
    detailedSummary: 'After an aggressive tightening cycle that saw the Federal Reserve raise rates at the fastest pace in decades, markets are now anticipating a pivot toward monetary easing. This theme captures the repositioning occurring across asset classes as investors prepare for lower rates. Duration-sensitive assets like long-dated bonds and growth stocks tend to benefit from falling rates, while banks may see margin compression. The timing and magnitude of rate cuts remain uncertain, creating volatility around Fed communications. Real estate investment trusts and utilities, which had been pressured by high rates, are seeing renewed interest. The trade extends globally as other central banks coordinate their policy trajectories.',
    impactPercent: -3.2,
    sentimentScore: 0.45,
    icon: TrendingUp,
    category: 'Macro',
    tickers: [
      { symbol: 'TLT', name: 'iShares 20+ Year Treasury', change: 1.8, sentiment: 'bullish', themeRelevance: 'Long-duration bond ETF that benefits most from falling interest rates due to high duration sensitivity.' },
      { symbol: 'XLF', name: 'Financial Select Sector', change: 2.1, sentiment: 'bullish', themeRelevance: 'Broad financial sector exposure, positioned for improved loan demand as rates normalize.' },
      { symbol: 'KRE', name: 'SPDR Regional Banking', change: 3.4, sentiment: 'bullish', themeRelevance: 'Regional banks see deposit stabilization and improved net interest margins with rate cuts.' },
      { symbol: 'JPM', name: 'JPMorgan Chase', change: 1.1, sentiment: 'neutral', themeRelevance: 'Diversified banking leader with strong trading revenue partially offsetting NIM compression.' },
    ],
    headlines: [
      { title: 'Fed signals openness to rate cuts if inflation continues cooling', source: 'WSJ', time: '1h ago' },
      { title: 'Regional banks rally on improved net interest margin outlook', source: 'Bloomberg', time: '4h ago' },
      { title: 'Bond funds see largest inflows in 18 months', source: 'Reuters', time: '6h ago' },
    ],
  },
  {
    id: 'defense-modernization',
    title: 'Defense Modernization',
    summary: 'Geopolitical tensions driving sustained defense budget increases globally.',
    detailedSummary: 'Heightened geopolitical tensions across multiple theaters are driving a sustained increase in global defense spending. NATO allies are accelerating efforts to meet the 2% GDP spending target, while Asian nations are expanding military capabilities amid regional tensions. This theme captures traditional defense contractors benefiting from increased procurement, as well as emerging players in cybersecurity, space systems, and autonomous warfare. The shift toward modern warfare is favoring companies with advanced capabilities in AI, drones, and electronic warfare. Supply chain reshoring is also benefiting domestic manufacturers as nations prioritize security of supply for critical defense components.',
    impactPercent: 5.6,
    sentimentScore: 0.68,
    icon: Shield,
    category: 'Industrials',
    tickers: [
      { symbol: 'LMT', name: 'Lockheed Martin', change: 2.8, sentiment: 'bullish', themeRelevance: 'F-35 program leader with strong backlog and growing hypersonics development contracts.' },
      { symbol: 'RTX', name: 'RTX Corporation', change: 1.9, sentiment: 'bullish', themeRelevance: 'Diversified defense and aerospace with Patriot missile systems seeing unprecedented demand.' },
      { symbol: 'NOC', name: 'Northrop Grumman', change: 2.2, sentiment: 'bullish', themeRelevance: 'B-21 bomber and nuclear modernization programs driving multi-decade revenue visibility.' },
      { symbol: 'PLTR', name: 'Palantir Technologies', change: 4.5, sentiment: 'bullish', themeRelevance: 'AI-powered defense analytics platform with expanding DOD adoption and AIP momentum.' },
      { symbol: 'GD', name: 'General Dynamics', change: 1.5, sentiment: 'neutral', themeRelevance: 'Gulfstream business jets offset defense segment, nuclear submarine backlog remains strong.' },
    ],
    headlines: [
      { title: 'Pentagon awards $15B in new defense contracts', source: 'Defense News', time: '2h ago' },
      { title: 'NATO allies commit to 2.5% GDP defense spending target', source: 'Reuters', time: '6h ago' },
      { title: 'Autonomous drone market projected to reach $100B by 2030', source: 'Jane\'s', time: '8h ago' },
    ],
  },
  {
    id: 'obesity-drugs',
    title: 'GLP-1 Revolution',
    summary: 'Weight loss drugs reshaping healthcare with massive demand growth.',
    detailedSummary: 'The development of GLP-1 receptor agonist drugs like Ozempic, Wegovy, and Mounjaro represents a paradigm shift in treating obesity and related conditions. These drugs are demonstrating efficacy beyond weight loss, showing benefits for cardiovascular disease, sleep apnea, and potentially addiction. The market is projected to exceed $100 billion annually by the end of the decade. This theme captures both the drug manufacturers and the ripple effects across healthcare and consumer industries. Bariatric surgery volumes are declining, snack food and beverage companies are reassessing their portfolios, and medical device companies focused on obesity-related conditions face headwinds. The supply chain for these complex peptide drugs is also a focus area.',
    impactPercent: 15.2,
    sentimentScore: 0.91,
    icon: Pill,
    category: 'Healthcare',
    tickers: [
      { symbol: 'LLY', name: 'Eli Lilly', change: 6.2, sentiment: 'bullish', themeRelevance: 'Mounjaro/Zepbound leader with superior efficacy data and rapidly expanding manufacturing capacity.' },
      { symbol: 'NVO', name: 'Novo Nordisk', change: 4.8, sentiment: 'bullish', themeRelevance: 'First-mover with Wegovy/Ozempic, dominating global GLP-1 market with proven cardiovascular benefits.' },
      { symbol: 'VKTX', name: 'Viking Therapeutics', change: 12.3, sentiment: 'bullish', themeRelevance: 'Promising Phase 2 oral GLP-1 candidate with potential best-in-class efficacy profile.' },
      { symbol: 'AMGN', name: 'Amgen', change: 2.1, sentiment: 'neutral', themeRelevance: 'Late entrant developing MariTide with potential for monthly dosing convenience advantage.' },
    ],
    headlines: [
      { title: 'Eli Lilly weight loss drug shows 25% reduction in cardiovascular events', source: 'NEJM', time: '1h ago' },
      { title: 'GLP-1 market to reach $130B by 2030, analysts project', source: 'Bloomberg', time: '3h ago' },
      { title: 'Novo Nordisk expands manufacturing capacity by 50%', source: 'Reuters', time: '5h ago' },
    ],
  },
  {
    id: 'ev-supply-chain',
    title: 'EV Battery Supply Chain',
    summary: 'Electric vehicle adoption driving massive investment in battery materials.',
    detailedSummary: 'The electrification of transportation is creating unprecedented demand for battery materials including lithium, cobalt, nickel, and graphite. Auto manufacturers are racing to secure long-term supply agreements and are increasingly investing directly in mining and processing operations. The geographic concentration of these materials, particularly in regions with geopolitical risk, is driving efforts to develop alternative sources and recycling capabilities. Battery technology is evolving rapidly with solid-state batteries promising improved safety and energy density. The charging infrastructure buildout is a parallel theme, with utilities and infrastructure companies positioning for the expected surge in electricity demand from EVs.',
    impactPercent: 4.3,
    sentimentScore: 0.62,
    icon: Car,
    category: 'Automotive',
    tickers: [
      { symbol: 'TSLA', name: 'Tesla Inc', change: 3.1, sentiment: 'bullish', themeRelevance: 'Vertically integrated EV leader with in-house battery production and massive charging network.' },
      { symbol: 'ALB', name: 'Albemarle Corporation', change: -2.5, sentiment: 'bearish', themeRelevance: 'Leading lithium producer facing price pressure from oversupply despite long-term demand growth.' },
      { symbol: 'RIVN', name: 'Rivian Automotive', change: 5.2, sentiment: 'bullish', themeRelevance: 'Premium EV truck maker with Amazon delivery van partnership providing production visibility.' },
      { symbol: 'QS', name: 'QuantumScape', change: 8.4, sentiment: 'bullish', themeRelevance: 'Solid-state battery pioneer with VW partnership, targeting superior energy density and safety.' },
      { symbol: 'CHPT', name: 'ChargePoint Holdings', change: 2.1, sentiment: 'neutral', themeRelevance: 'Largest EV charging network operator in North America with growing commercial fleet focus.' },
    ],
    headlines: [
      { title: 'Tesla battery day reveals 30% cost reduction pathway', source: 'Electrek', time: '2h ago' },
      { title: 'US secures critical minerals agreement with Australia', source: 'WSJ', time: '4h ago' },
      { title: 'Solid-state battery commercialization timeline accelerates', source: 'Bloomberg', time: '6h ago' },
    ],
  },
  {
    id: 'cloud-migration',
    title: 'Enterprise Cloud Migration',
    summary: 'Enterprises accelerating shift to cloud infrastructure and SaaS platforms.',
    detailedSummary: 'The migration of enterprise workloads from on-premises data centers to cloud infrastructure continues to accelerate. Organizations are increasingly adopting multi-cloud strategies to avoid vendor lock-in and optimize for specific workload requirements. The shift is driving demand for cloud infrastructure providers, cloud-native software vendors, and systems integrators specializing in migration services. Cybersecurity spending is growing in parallel as organizations seek to protect increasingly distributed architectures. Edge computing is emerging as a complement to centralized cloud, enabling low-latency applications and addressing data sovereignty requirements.',
    impactPercent: 6.1,
    sentimentScore: 0.74,
    icon: Cloud,
    category: 'Technology',
    tickers: [
      { symbol: 'MSFT', name: 'Microsoft', change: 2.3, sentiment: 'bullish', themeRelevance: 'Azure cloud platform gaining enterprise market share with strong AI services integration.' },
      { symbol: 'AMZN', name: 'Amazon', change: 1.8, sentiment: 'bullish', themeRelevance: 'AWS remains cloud market leader with expanding suite of enterprise services and custom chips.' },
      { symbol: 'GOOGL', name: 'Alphabet', change: 1.5, sentiment: 'neutral', themeRelevance: 'Google Cloud gaining ground in data analytics and AI workloads, improving profitability.' },
      { symbol: 'SNOW', name: 'Snowflake', change: 4.2, sentiment: 'bullish', themeRelevance: 'Cloud data platform enabling enterprises to unify and analyze data across multiple clouds.' },
      { symbol: 'NET', name: 'Cloudflare', change: 3.8, sentiment: 'bullish', themeRelevance: 'Edge computing leader with expanding security and developer platform capabilities.' },
    ],
    headlines: [
      { title: 'Microsoft Azure revenue grows 29% as enterprise adoption accelerates', source: 'CNBC', time: '3h ago' },
      { title: 'Gartner: Cloud spending to exceed $700B in 2025', source: 'TechCrunch', time: '5h ago' },
      { title: 'Multi-cloud adoption reaches 85% among large enterprises', source: 'Forbes', time: '7h ago' },
    ],
  },
  {
    id: 'cybersecurity',
    title: 'Zero Trust Security',
    summary: 'Cybersecurity spending surges as threats multiply and regulations tighten.',
    detailedSummary: 'The frequency and sophistication of cyberattacks continue to escalate, driving increased spending on security solutions across all sectors. The shift to remote and hybrid work has expanded attack surfaces, while AI is being weaponized by threat actors to create more convincing phishing attacks and discover vulnerabilities faster. Organizations are adopting zero-trust architectures that require verification for every user and device. Regulatory requirements including SEC disclosure rules and industry-specific mandates are driving security investment. The cybersecurity workforce shortage is creating opportunities for managed security service providers and security automation platforms.',
    impactPercent: 8.7,
    sentimentScore: 0.79,
    icon: Lock,
    category: 'Technology',
    tickers: [
      { symbol: 'CRWD', name: 'CrowdStrike', change: 5.4, sentiment: 'bullish', themeRelevance: 'Leading cloud-native endpoint security platform with AI-powered threat detection.' },
      { symbol: 'PANW', name: 'Palo Alto Networks', change: 3.9, sentiment: 'bullish', themeRelevance: 'Comprehensive cybersecurity platform consolidating point solutions for enterprises.' },
      { symbol: 'ZS', name: 'Zscaler', change: 4.1, sentiment: 'bullish', themeRelevance: 'Pioneer in zero-trust network access, replacing legacy VPN and firewall architectures.' },
      { symbol: 'FTNT', name: 'Fortinet', change: 2.2, sentiment: 'neutral', themeRelevance: 'Integrated security appliance leader with strong mid-market and SD-WAN presence.' },
      { symbol: 'OKTA', name: 'Okta', change: 3.5, sentiment: 'bullish', themeRelevance: 'Identity and access management leader enabling secure zero-trust authentication.' },
    ],
    headlines: [
      { title: 'CrowdStrike reports 40% growth in enterprise subscriptions', source: 'Bloomberg', time: '2h ago' },
      { title: 'AI-powered cyberattacks surge 300% in 2025', source: 'Wired', time: '4h ago' },
      { title: 'SEC finalizes new cybersecurity disclosure requirements', source: 'Reuters', time: '6h ago' },
    ],
  },
  {
    id: 'reshoring',
    title: 'Manufacturing Reshoring',
    summary: 'Supply chain security concerns driving manufacturing back to developed markets.',
    detailedSummary: 'The pandemic exposed vulnerabilities in global supply chains, accelerating a trend toward reshoring and nearshoring of manufacturing operations. Government incentives including the CHIPS Act and Inflation Reduction Act are providing significant subsidies for domestic production. Companies are prioritizing supply chain resilience over pure cost optimization. This theme benefits industrial automation companies as labor costs drive investment in robotics and AI. Real estate demand for manufacturing facilities is increasing, particularly in regions with favorable tax treatment and proximity to customers. The transition requires significant capital investment and is expected to play out over a decade or more.',
    impactPercent: 4.8,
    sentimentScore: 0.65,
    icon: Factory,
    category: 'Industrials',
    tickers: [
      { symbol: 'ROK', name: 'Rockwell Automation', change: 3.2, sentiment: 'bullish', themeRelevance: 'Industrial automation leader benefiting from reshoring manufacturing investment.' },
      { symbol: 'EMR', name: 'Emerson Electric', change: 2.1, sentiment: 'neutral', themeRelevance: 'Automation and software provider serving industrial manufacturing modernization.' },
      { symbol: 'CAT', name: 'Caterpillar', change: 1.8, sentiment: 'neutral', themeRelevance: 'Heavy equipment manufacturer supporting manufacturing facility construction.' },
      { symbol: 'FANUY', name: 'Fanuc Corporation', change: 4.5, sentiment: 'bullish', themeRelevance: 'Global robotics leader with expanding presence in US manufacturing automation.' },
    ],
    headlines: [
      { title: 'CHIPS Act drives $200B in semiconductor fab investments', source: 'WSJ', time: '3h ago' },
      { title: 'Industrial automation spending hits record as reshoring accelerates', source: 'Reuters', time: '5h ago' },
      { title: 'Mexico manufacturing sector booms on nearshoring trend', source: 'Financial Times', time: '8h ago' },
    ],
  },
  {
    id: 'quantum-computing',
    title: 'Quantum Computing Race',
    summary: 'Major tech companies racing toward quantum advantage with accelerating progress.',
    detailedSummary: 'Quantum computing is progressing from laboratory curiosity toward commercial viability faster than many expected. Google, IBM, and startups are achieving milestones in qubit count and error correction. While general-purpose quantum computers remain years away, near-term applications in optimization, drug discovery, and cryptography are emerging. Financial institutions are exploring quantum algorithms for portfolio optimization and risk modeling. The threat to current encryption standards is driving investment in post-quantum cryptography. The technology requires exotic materials and extreme cooling, creating opportunities for specialized suppliers. Quantum sensing and communication represent parallel opportunities.',
    impactPercent: 9.3,
    sentimentScore: 0.81,
    icon: Atom,
    category: 'Technology',
    tickers: [
      { symbol: 'IBM', name: 'IBM', change: 2.8, sentiment: 'bullish', themeRelevance: 'Quantum computing leader with most qubits deployed and strong enterprise partnerships.' },
      { symbol: 'GOOGL', name: 'Alphabet', change: 1.9, sentiment: 'neutral', themeRelevance: 'Sycamore quantum processor achieved quantum supremacy, advancing error correction.' },
      { symbol: 'IONQ', name: 'IonQ', change: 15.2, sentiment: 'bullish', themeRelevance: 'Trapped-ion quantum computing pioneer with cloud-accessible quantum systems.' },
      { symbol: 'RGTI', name: 'Rigetti Computing', change: 12.1, sentiment: 'bullish', themeRelevance: 'Full-stack quantum computing company with hybrid classical-quantum approach.' },
    ],
    headlines: [
      { title: 'Google achieves quantum error correction breakthrough', source: 'Nature', time: '1h ago' },
      { title: 'IBM unveils 1,000+ qubit processor ahead of schedule', source: 'TechCrunch', time: '4h ago' },
      { title: 'Quantum computing market projected at $125B by 2030', source: 'McKinsey', time: '6h ago' },
    ],
  },
  {
    id: 'biotech-ai',
    title: 'AI-Powered Drug Discovery',
    summary: 'Machine learning transforming pharmaceutical R&D with faster, cheaper discovery.',
    detailedSummary: 'Artificial intelligence is revolutionizing the drug discovery process, dramatically reducing the time and cost to identify promising drug candidates. Machine learning models can now predict molecular structures, simulate protein folding, and identify potential drug targets with unprecedented accuracy. This is enabling exploration of previously intractable disease targets and accelerating clinical development timelines. Big pharma companies are acquiring AI-native biotech startups and forming extensive partnerships. The convergence of AI, biology, and chemistry is creating a new paradigm for pharmaceutical research that could cure diseases previously considered untreatable.',
    impactPercent: 11.2,
    sentimentScore: 0.86,
    icon: Dna,
    category: 'Healthcare',
    tickers: [
      { symbol: 'RXRX', name: 'Recursion Pharmaceuticals', change: 8.4, sentiment: 'bullish', themeRelevance: 'AI-native drug discovery platform using machine learning and robotics for rapid compound screening.' },
      { symbol: 'EXAI', name: 'Exscientia', change: 6.2, sentiment: 'bullish', themeRelevance: 'Pioneer in AI-designed drugs with multiple candidates in clinical trials.' },
      { symbol: 'DNA', name: 'Ginkgo Bioworks', change: 5.1, sentiment: 'bullish', themeRelevance: 'Synthetic biology platform enabling engineered cells for pharmaceutical production.' },
      { symbol: 'SDGR', name: 'Schrodinger', change: 4.3, sentiment: 'bullish', themeRelevance: 'Physics-based molecular simulation software used by major pharma for drug design.' },
    ],
    headlines: [
      { title: 'AI-designed drug enters Phase 3 trials in record time', source: 'STAT News', time: '2h ago' },
      { title: 'Novo Nordisk acquires AI drug discovery startup for $2B', source: 'Reuters', time: '4h ago' },
      { title: 'AlphaFold 3 predicts all molecular interactions in life', source: 'Nature', time: '6h ago' },
    ],
  },
  {
    id: 'space-economy',
    title: 'Commercial Space Boom',
    summary: 'Private space companies driving new era of commercial space activities.',
    detailedSummary: 'The commercial space industry is experiencing exponential growth driven by declining launch costs and new applications. SpaceX has revolutionized launch economics, enabling a surge in satellite deployments for communications, Earth observation, and navigation. Satellite internet services are connecting remote regions and serving as backup for terrestrial networks. Space tourism is emerging as a viable market with multiple providers. The extraction of resources from asteroids and the Moon, while still early stage, is attracting serious investment. Defense applications continue to grow as space becomes increasingly contested. The supporting infrastructure including ground stations and space traffic management is a parallel opportunity.',
    impactPercent: 7.1,
    sentimentScore: 0.73,
    icon: Globe,
    category: 'Aerospace',
    tickers: [
      { symbol: 'RKLB', name: 'Rocket Lab', change: 9.2, sentiment: 'bullish', themeRelevance: 'Leading small launch provider expanding into satellite manufacturing and space systems.' },
      { symbol: 'ASTS', name: 'AST SpaceMobile', change: 14.5, sentiment: 'bullish', themeRelevance: 'Building first space-based cellular broadband network for direct-to-smartphone connectivity.' },
      { symbol: 'SPCE', name: 'Virgin Galactic', change: 3.2, sentiment: 'neutral', themeRelevance: 'Space tourism pioneer with suborbital flights, facing execution challenges.' },
      { symbol: 'LUNR', name: 'Intuitive Machines', change: 11.3, sentiment: 'bullish', themeRelevance: 'NASA contractor for lunar lander missions, first private company to land on Moon.' },
    ],
    headlines: [
      { title: 'SpaceX Starship achieves full orbital flight success', source: 'SpaceNews', time: '1h ago' },
      { title: 'AST SpaceMobile completes first satellite-to-phone call', source: 'CNBC', time: '3h ago' },
      { title: 'NASA awards $5B in commercial lunar contracts', source: 'Reuters', time: '5h ago' },
    ],
  },
  {
    id: 'nuclear-renaissance',
    title: 'Nuclear Energy Renaissance',
    summary: 'Nuclear power gaining support as clean baseload energy source for data centers.',
    detailedSummary: 'Nuclear energy is experiencing a renaissance driven by climate concerns, energy security considerations, and the need for reliable baseload power for data centers. Small modular reactors (SMRs) promise to address many of the cost and safety concerns that have hindered traditional nuclear development. Tech giants including Microsoft, Google, and Amazon are signing agreements to power their data centers with nuclear energy. Existing nuclear plants are receiving life extensions as their value as carbon-free baseload generation is recognized. The uranium supply chain is attracting increased investment after years of underinvestment. Advanced reactor designs using alternative fuels and cooling methods are progressing toward deployment.',
    impactPercent: 8.9,
    sentimentScore: 0.77,
    icon: Zap,
    category: 'Energy',
    tickers: [
      { symbol: 'CCJ', name: 'Cameco Corporation', change: 6.8, sentiment: 'bullish', themeRelevance: 'World\'s largest publicly traded uranium producer with long-term supply contracts.' },
      { symbol: 'LEU', name: 'Centrus Energy', change: 12.4, sentiment: 'bullish', themeRelevance: 'Only US-licensed producer of high-assay low-enriched uranium for advanced reactors.' },
      { symbol: 'NNE', name: 'Nano Nuclear Energy', change: 18.2, sentiment: 'bullish', themeRelevance: 'Developing portable micro-reactors for remote power and disaster response.' },
      { symbol: 'CEG', name: 'Constellation Energy', change: 4.5, sentiment: 'bullish', themeRelevance: 'Largest US nuclear fleet operator with tech company power purchase agreements.' },
    ],
    headlines: [
      { title: 'Microsoft signs 20-year nuclear power agreement for AI data centers', source: 'Bloomberg', time: '1h ago' },
      { title: 'NRC approves first small modular reactor design', source: 'WSJ', time: '4h ago' },
      { title: 'Uranium prices hit 15-year high on supply concerns', source: 'Reuters', time: '6h ago' },
    ],
  },
  {
    id: 'india-growth',
    title: 'India Growth Story',
    summary: 'India emerging as fastest-growing major economy with structural tailwinds.',
    detailedSummary: 'India is positioned to become the world\'s third-largest economy driven by favorable demographics, rising middle class consumption, and manufacturing diversification away from China. The government\'s production-linked incentive schemes are attracting manufacturing investment from Apple, Samsung, and other major companies. Digital infrastructure including the Unified Payments Interface is driving financial inclusion and e-commerce growth. Infrastructure spending on roads, railways, and airports is addressing long-standing bottlenecks. The Indian equity market is attracting record foreign investment as global allocators increase exposure. Risks include currency volatility, current account deficits, and political uncertainty.',
    impactPercent: 5.4,
    sentimentScore: 0.71,
    icon: Building2,
    category: 'Emerging Markets',
    tickers: [
      { symbol: 'INDA', name: 'iShares MSCI India', change: 2.3, sentiment: 'bullish', themeRelevance: 'Broad India equity exposure capturing the full economic growth story.' },
      { symbol: 'INFY', name: 'Infosys', change: 1.8, sentiment: 'neutral', themeRelevance: 'IT services leader benefiting from global digital transformation spending.' },
      { symbol: 'HDB', name: 'HDFC Bank', change: 3.1, sentiment: 'bullish', themeRelevance: 'Premier Indian bank with strong retail franchise and credit quality.' },
      { symbol: 'WIT', name: 'Wipro Limited', change: 2.5, sentiment: 'bullish', themeRelevance: 'Global IT consulting and services firm with expanding AI capabilities.' },
    ],
    headlines: [
      { title: 'India GDP growth accelerates to 7.5% in Q4', source: 'Bloomberg', time: '2h ago' },
      { title: 'Apple shifts 25% of iPhone production to India', source: 'Financial Times', time: '5h ago' },
      { title: 'Indian equity funds see record $15B inflows', source: 'Reuters', time: '7h ago' },
    ],
  },
  {
    id: 'longevity-tech',
    title: 'Longevity & Anti-Aging',
    summary: 'Breakthrough research in aging science attracting significant capital.',
    detailedSummary: 'The science of aging is advancing rapidly with potential treatments that could extend healthy lifespan by decades. Senolytics that clear damaged cells, NAD+ boosters that restore cellular energy, and epigenetic reprogramming are showing promising results. Billionaire investors including Jeff Bezos and Sam Altman are funding longevity research companies. The market extends beyond therapeutics to diagnostics that measure biological age and lifestyle interventions. If successful, these technologies could have profound implications for healthcare costs, retirement planning, and society more broadly. Regulatory pathways remain uncertain as the FDA does not currently recognize aging as a disease.',
    impactPercent: 6.7,
    sentimentScore: 0.69,
    icon: Heart,
    category: 'Healthcare',
    tickers: [
      { symbol: 'SENS', name: 'SenesTech', change: 8.9, sentiment: 'bullish', themeRelevance: 'Biotech developing novel approaches to cellular senescence and aging intervention.' },
      { symbol: 'AGEN', name: 'Agenus', change: 5.2, sentiment: 'bullish', themeRelevance: 'Immuno-oncology company with aging-related disease applications in pipeline.' },
      { symbol: 'LIFE', name: 'aTyr Pharma', change: 4.1, sentiment: 'neutral', themeRelevance: 'Developing therapeutics targeting immunological diseases with aging implications.' },
      { symbol: 'CORT', name: 'Corcept Therapeutics', change: 3.8, sentiment: 'bullish', themeRelevance: 'Cortisol modulator with applications in metabolic and age-related conditions.' },
    ],
    headlines: [
      { title: 'Altos Labs raises $3B for cellular reprogramming research', source: 'STAT News', time: '3h ago' },
      { title: 'First senolytic drug shows 30% reduction in biological age markers', source: 'Nature Medicine', time: '5h ago' },
      { title: 'Saudi Arabia commits $1B to longevity research initiative', source: 'Bloomberg', time: '8h ago' },
    ],
  },
  {
    id: 'fintech-disruption',
    title: 'Fintech Disruption 2.0',
    summary: 'Next wave of fintech innovation targeting embedded finance and B2B payments.',
    detailedSummary: 'Financial technology is entering its next phase of evolution, moving beyond consumer payments to transform enterprise financial services. Embedded finance is enabling non-financial companies to offer banking, lending, and insurance products seamlessly within their platforms. Real-time payments and open banking are disrupting traditional payment rails. B2B payments, a $125 trillion market, is being digitized with solutions that automate invoice processing and working capital management. Blockchain and tokenization are enabling new models for asset ownership and trading. Traditional financial institutions are both threatened by and partnering with fintech innovators to modernize their offerings.',
    impactPercent: 5.8,
    sentimentScore: 0.68,
    icon: CreditCard,
    category: 'Financials',
    tickers: [
      { symbol: 'AFRM', name: 'Affirm Holdings', change: 7.2, sentiment: 'bullish', themeRelevance: 'Buy-now-pay-later leader with expanding merchant network and improving unit economics.' },
      { symbol: 'BILL', name: 'Bill.com Holdings', change: 4.5, sentiment: 'bullish', themeRelevance: 'B2B payments automation platform serving SMBs with AP/AR solutions.' },
      { symbol: 'SQ', name: 'Block Inc', change: 3.8, sentiment: 'bullish', themeRelevance: 'Integrated payments ecosystem with Square merchant services and Cash App consumer platform.' },
      { symbol: 'PYPL', name: 'PayPal Holdings', change: 1.2, sentiment: 'neutral', themeRelevance: 'Digital payments incumbent facing competition but executing turnaround strategy.' },
    ],
    headlines: [
      { title: 'Embedded finance market to reach $7T by 2030', source: 'McKinsey', time: '2h ago' },
      { title: 'FedNow adoption accelerates with 500 banks connected', source: 'American Banker', time: '4h ago' },
      { title: 'Shopify launches enhanced financial services for merchants', source: 'TechCrunch', time: '6h ago' },
    ],
  },
  {
    id: 'humanoid-robots',
    title: 'Humanoid Robotics',
    summary: 'AI advances enabling practical humanoid robots for manufacturing and service.',
    detailedSummary: 'Advances in AI, particularly large language models and computer vision, are enabling a new generation of humanoid robots capable of operating in unstructured environments. Companies including Tesla, Figure AI, and Boston Dynamics are racing to commercialize general-purpose robots that can work alongside humans in factories, warehouses, and eventually homes. The labor shortage in manufacturing and aging demographics in developed countries are creating strong demand. While early applications will be industrial, the ultimate market for household robots is enormous. The supply chain for actuators, sensors, and batteries is scaling to meet anticipated demand. Regulatory and safety frameworks are developing in parallel.',
    impactPercent: 13.5,
    sentimentScore: 0.84,
    icon: Users,
    category: 'Technology',
    tickers: [
      { symbol: 'TSLA', name: 'Tesla (Optimus)', change: 5.2, sentiment: 'bullish', themeRelevance: 'Developing Optimus humanoid robot leveraging Tesla AI and manufacturing scale.' },
      { symbol: 'ISRG', name: 'Intuitive Surgical', change: 3.1, sentiment: 'bullish', themeRelevance: 'Surgical robotics leader with transferable technology for humanoid manipulation.' },
      { symbol: 'GRAB', name: 'Symbotic', change: 8.4, sentiment: 'bullish', themeRelevance: 'Warehouse automation systems with AI-powered robotic picking and sorting.' },
      { symbol: 'PATH', name: 'UiPath', change: 4.2, sentiment: 'bullish', themeRelevance: 'RPA software platform enabling software robots to automate business processes.' },
    ],
    headlines: [
      { title: 'Tesla demonstrates Optimus robots working in factory production', source: 'Electrek', time: '1h ago' },
      { title: 'Figure AI raises $675M at $2.6B valuation from tech giants', source: 'Bloomberg', time: '3h ago' },
      { title: 'Humanoid robot market projected at $38B by 2035', source: 'Goldman Sachs', time: '5h ago' },
    ],
  },
  {
    id: 'digital-assets',
    title: 'Digital Asset Institutionalization',
    summary: 'Bitcoin ETF approval driving institutional cryptocurrency adoption.',
    detailedSummary: 'The approval of spot Bitcoin ETFs in the US marks a watershed moment for cryptocurrency adoption by institutional investors. Major asset managers including BlackRock and Fidelity now offer Bitcoin exposure through familiar investment vehicles. This is driving a maturation of the market with improved custody, compliance, and risk management infrastructure. The tokenization of real-world assets including real estate, bonds, and private equity is an adjacent trend bringing trillions of dollars of assets onto blockchain rails. Regulatory clarity is improving in major markets, reducing uncertainty for institutional allocators. The upcoming Bitcoin halving is adding to bullish sentiment.',
    impactPercent: 18.2,
    sentimentScore: 0.82,
    icon: Coins,
    category: 'Crypto',
    tickers: [
      { symbol: 'COIN', name: 'Coinbase', change: 12.5, sentiment: 'bullish', themeRelevance: 'Leading US crypto exchange and custodian benefiting from institutional adoption.' },
      { symbol: 'MSTR', name: 'MicroStrategy', change: 15.8, sentiment: 'bullish', themeRelevance: 'Corporate Bitcoin accumulation strategy providing leveraged crypto exposure.' },
      { symbol: 'IBIT', name: 'iShares Bitcoin Trust', change: 8.2, sentiment: 'bullish', themeRelevance: 'BlackRock spot Bitcoin ETF with institutional-grade structure and liquidity.' },
      { symbol: 'MARA', name: 'Marathon Digital', change: 9.4, sentiment: 'bullish', themeRelevance: 'Largest US Bitcoin miner with growing hash rate and operational efficiency.' },
    ],
    headlines: [
      { title: 'Bitcoin ETFs see $10B inflows in first month of trading', source: 'Bloomberg', time: '1h ago' },
      { title: 'BlackRock CEO calls Bitcoin "legitimate financial instrument"', source: 'CNBC', time: '3h ago' },
      { title: 'Tokenized Treasury market exceeds $1B in value', source: 'The Block', time: '5h ago' },
    ],
  },
  {
    id: 'agriculture-tech',
    title: 'Precision Agriculture',
    summary: 'Technology transforming farming with AI, drones, and biotechnology.',
    detailedSummary: 'Agriculture is undergoing a technology-driven transformation to address food security challenges and reduce environmental impact. Precision agriculture uses AI, sensors, and satellite imagery to optimize inputs and increase yields. Vertical farming is enabling year-round production near population centers. Gene editing is accelerating crop improvement for drought resistance and nutritional content. Agricultural robotics is addressing labor shortages while reducing chemical use. The convergence of these technologies is attracting significant venture capital and driving consolidation. Climate change is adding urgency as traditional farming regions face increasingly unpredictable conditions.',
    impactPercent: 4.2,
    sentimentScore: 0.63,
    icon: Wheat,
    category: 'Agriculture',
    tickers: [
      { symbol: 'DE', name: 'Deere & Company', change: 2.8, sentiment: 'bullish', themeRelevance: 'Agricultural equipment leader with autonomous tractors and precision ag technology.' },
      { symbol: 'AGCO', name: 'AGCO Corporation', change: 1.9, sentiment: 'neutral', themeRelevance: 'Global farm equipment manufacturer with growing precision agriculture solutions.' },
      { symbol: 'FMC', name: 'FMC Corporation', change: 2.1, sentiment: 'neutral', themeRelevance: 'Crop protection chemicals company transitioning to biologicals and precision products.' },
      { symbol: 'CTVA', name: 'Corteva', change: 1.5, sentiment: 'neutral', themeRelevance: 'Seed and crop protection leader with gene editing and digital agriculture platforms.' },
    ],
    headlines: [
      { title: 'John Deere autonomous tractors now farming 10M acres', source: 'Farm Journal', time: '2h ago' },
      { title: 'Vertical farming sector attracts $2B in VC funding', source: 'AgFunder', time: '4h ago' },
      { title: 'USDA approves gene-edited drought-resistant wheat', source: 'Reuters', time: '6h ago' },
    ],
  },
  {
    id: 'streaming-wars',
    title: 'Streaming Consolidation',
    summary: 'Streaming market maturing with profitability focus and potential M&A.',
    detailedSummary: 'The streaming video market is entering a phase of consolidation and rationalization after years of growth-focused investment. Subscriber growth is slowing in developed markets as penetration approaches saturation. Platforms are raising prices, cracking down on password sharing, and introducing ad-supported tiers to improve economics. Sports rights are emerging as a key differentiator, with major leagues signing streaming deals worth billions. Consolidation is likely as smaller players struggle with content costs. The advertising-supported streaming market is growing rapidly, attracting budget from linear TV. International expansion remains a growth opportunity.',
    impactPercent: -2.1,
    sentimentScore: 0.48,
    icon: Tv,
    category: 'Media',
    tickers: [
      { symbol: 'NFLX', name: 'Netflix', change: 3.2, sentiment: 'bullish', themeRelevance: 'Streaming leader with strong content slate and successful paid sharing monetization.' },
      { symbol: 'DIS', name: 'Walt Disney', change: -1.5, sentiment: 'bearish', themeRelevance: 'Disney+ reaching profitability but facing cord-cutting pressure on linear networks.' },
      { symbol: 'WBD', name: 'Warner Bros Discovery', change: 2.8, sentiment: 'neutral', themeRelevance: 'Merging Max streaming with strong content library, pursuing cost synergies.' },
      { symbol: 'PARA', name: 'Paramount Global', change: 5.2, sentiment: 'bullish', themeRelevance: 'M&A speculation driving interest, attractive content assets for potential acquirers.' },
    ],
    headlines: [
      { title: 'Netflix adds 13M subscribers on password crackdown success', source: 'Variety', time: '2h ago' },
      { title: 'Disney+ reaches profitability for first time', source: 'WSJ', time: '4h ago' },
      { title: 'Warner Bros and Paramount in merger discussions', source: 'Bloomberg', time: '7h ago' },
    ],
  },
  {
    id: 'housing-crisis',
    title: 'Housing Supply Crisis',
    summary: 'Chronic housing undersupply driving homebuilder and rental market strength.',
    detailedSummary: 'The United States faces a chronic shortage of housing estimated at 3-5 million units, supporting strong demand for both new construction and rental properties. High mortgage rates have locked existing homeowners in place, exacerbating the shortage of homes for sale. Homebuilders have adapted by offering incentives and smaller, more affordable floor plans. The shortage is most acute in Sunbelt metros experiencing strong population growth. Multifamily construction is elevated but increasingly focused on build-to-rent single-family communities. Building materials and labor costs remain elevated but are stabilizing. Regulatory reform to allow higher density development is gaining momentum in some markets.',
    impactPercent: 3.9,
    sentimentScore: 0.61,
    icon: Home,
    category: 'Real Estate',
    tickers: [
      { symbol: 'DHI', name: 'D.R. Horton', change: 2.4, sentiment: 'bullish', themeRelevance: 'Largest US homebuilder with entry-level focus addressing affordability with smaller homes.' },
      { symbol: 'LEN', name: 'Lennar Corporation', change: 1.9, sentiment: 'neutral', themeRelevance: 'Major homebuilder pivoting to asset-light model, spinning off land holdings.' },
      { symbol: 'INVH', name: 'Invitation Homes', change: 3.1, sentiment: 'bullish', themeRelevance: 'Largest single-family rental REIT benefiting from home purchase unaffordability.' },
      { symbol: 'AMH', name: 'American Homes 4 Rent', change: 2.8, sentiment: 'bullish', themeRelevance: 'Build-to-rent leader with newly constructed single-family rental communities.' },
    ],
    headlines: [
      { title: 'US housing starts surge to highest level in two years', source: 'Census Bureau', time: '1h ago' },
      { title: 'D.R. Horton reports record backlog on strong demand', source: 'CNBC', time: '3h ago' },
      { title: 'Build-to-rent sector attracts institutional investment', source: 'WSJ', time: '5h ago' },
    ],
  },
  {
    id: 'sports-betting',
    title: 'Sports Betting Expansion',
    summary: 'Legal sports betting expanding into new states with growing market size.',
    detailedSummary: 'The legalization of sports betting continues to expand across the United States, creating a rapidly growing market projected to reach $40 billion in annual revenue. Major operators are competing for market share through promotional spending while working toward profitability. The integration of betting with live sports broadcasts is enhancing the viewing experience and driving engagement. Online casino (iGaming) is an adjacent opportunity with higher margins but more restrictive state-by-state legalization. International expansion offers additional growth as countries modernize their gambling regulations. Concerns about gambling addiction are driving regulatory scrutiny and responsible gaming requirements.',
    impactPercent: 6.3,
    sentimentScore: 0.66,
    icon: Gamepad2,
    category: 'Consumer',
    tickers: [
      { symbol: 'DKNG', name: 'DraftKings', change: 7.8, sentiment: 'bullish', themeRelevance: 'Leading US sportsbook with improving unit economics and iGaming expansion.' },
      { symbol: 'FLUT', name: 'Flutter Entertainment', change: 4.2, sentiment: 'bullish', themeRelevance: 'Global gaming leader owning FanDuel, with diversified international revenue.' },
      { symbol: 'MGM', name: 'MGM Resorts', change: 2.9, sentiment: 'neutral', themeRelevance: 'Integrated casino operator with BetMGM online sports betting joint venture.' },
      { symbol: 'PENN', name: 'Penn Entertainment', change: 5.1, sentiment: 'bullish', themeRelevance: 'ESPN Bet partnership providing brand advantage and customer acquisition.' },
    ],
    headlines: [
      { title: 'DraftKings achieves profitability as market matures', source: 'Bloomberg', time: '2h ago' },
      { title: 'Three more states legalize sports betting in 2025', source: 'ESPN', time: '4h ago' },
      { title: 'Super Bowl breaks betting handle record with $16B wagered', source: 'Reuters', time: '6h ago' },
    ],
  },
  {
    id: 'copper-supercycle',
    title: 'Copper Supercycle',
    summary: 'Electrification driving unprecedented copper demand against constrained supply.',
    detailedSummary: 'Copper is essential for the energy transition, used extensively in EVs, charging infrastructure, renewable energy systems, and grid modernization. Demand is projected to double by 2035 while supply expansion faces significant challenges from declining ore grades, permitting delays, and ESG concerns. The supply gap could reach 10 million tonnes annually by 2035. Mining companies are struggling to bring new production online fast enough, leading to forecasts of sustained higher prices. Copper recycling is gaining importance but cannot close the gap. Some analysts describe the setup as a potential supercycle similar to the commodity boom of the 2000s.',
    impactPercent: 7.4,
    sentimentScore: 0.75,
    icon: Mountain,
    category: 'Commodities',
    tickers: [
      { symbol: 'FCX', name: 'Freeport-McMoRan', change: 4.8, sentiment: 'bullish', themeRelevance: 'Largest US copper producer with world-class Grasberg mine in Indonesia.' },
      { symbol: 'SCCO', name: 'Southern Copper', change: 3.9, sentiment: 'bullish', themeRelevance: 'Lowest-cost copper producer with largest copper reserves in the world.' },
      { symbol: 'TECK', name: 'Teck Resources', change: 3.2, sentiment: 'bullish', themeRelevance: 'Transforming to pure-play copper company with QB2 ramp-up in Chile.' },
      { symbol: 'RIO', name: 'Rio Tinto', change: 2.5, sentiment: 'neutral', themeRelevance: 'Diversified miner with growing copper exposure through acquisitions.' },
    ],
    headlines: [
      { title: 'Copper prices hit all-time high on supply concerns', source: 'Bloomberg', time: '1h ago' },
      { title: 'Goldman Sachs raises copper price forecast to $15,000/tonne', source: 'Reuters', time: '3h ago' },
      { title: 'Major copper mine expansion delayed by permitting issues', source: 'Mining.com', time: '5h ago' },
    ],
  },
  {
    id: 'private-credit',
    title: 'Private Credit Boom',
    summary: 'Private credit displacing traditional bank lending with attractive yields.',
    detailedSummary: 'Private credit has emerged as a major asset class with assets under management exceeding $1.5 trillion. Banks have retreated from middle-market lending due to regulatory constraints, creating opportunities for alternative lenders. The asset class offers floating-rate exposure with yields typically 400-600 basis points above public credit. Institutional investors are attracted by returns, diversification, and inflation protection. Concerns are emerging about underwriting standards and valuation practices as the market has grown rapidly. The convergence with public markets is occurring as private credit funds seek liquidity solutions and public market investors seek yield. Direct lending, mezzanine, and distressed strategies all offer distinct risk-return profiles.',
    impactPercent: 5.1,
    sentimentScore: 0.64,
    icon: Landmark,
    category: 'Financials',
    tickers: [
      { symbol: 'ARCC', name: 'Ares Capital', change: 1.8, sentiment: 'neutral', themeRelevance: 'Largest BDC providing direct loans to middle-market companies with consistent dividends.' },
      { symbol: 'MAIN', name: 'Main Street Capital', change: 2.1, sentiment: 'bullish', themeRelevance: 'Internally managed BDC with lower middle-market focus and monthly dividends.' },
      { symbol: 'BX', name: 'Blackstone', change: 3.4, sentiment: 'bullish', themeRelevance: 'Alternative asset manager with largest private credit AUM and diversified strategies.' },
      { symbol: 'APO', name: 'Apollo Global', change: 2.9, sentiment: 'bullish', themeRelevance: 'Growing credit origination platform with Athene insurance partnership for capital.' },
    ],
    headlines: [
      { title: 'Private credit AUM surpasses $1.7T as institutional demand grows', source: 'Preqin', time: '2h ago' },
      { title: 'Apollo and Blackstone battle for private credit dominance', source: 'FT', time: '4h ago' },
      { title: 'SEC examines valuation practices in private credit funds', source: 'WSJ', time: '6h ago' },
    ],
  },
  {
    id: 'japan-revival',
    title: 'Japan Corporate Revival',
    summary: 'Corporate governance reforms driving value creation in Japanese equities.',
    detailedSummary: 'Japanese equities are experiencing a renaissance driven by corporate governance reforms that are finally bearing fruit. The Tokyo Stock Exchange is pressuring companies trading below book value to improve capital efficiency. Share buybacks and dividend increases are accelerating. Activist investors are finding a more receptive environment for their proposals. The weak yen is boosting competitiveness while persistent inflation is breaking the deflationary mindset. Warren Buffett\'s investment in Japanese trading companies has drawn global attention. Foreign investors are returning after years of skepticism. The unwinding of cross-shareholdings is improving market liquidity and governance.',
    impactPercent: 4.6,
    sentimentScore: 0.70,
    icon: LineChart,
    category: 'International',
    tickers: [
      { symbol: 'EWJ', name: 'iShares MSCI Japan', change: 2.7, sentiment: 'bullish', themeRelevance: 'Broad Japan equity exposure with currency risk capturing yen weakness benefits.' },
      { symbol: 'DXJ', name: 'WisdomTree Japan Hedged', change: 3.2, sentiment: 'bullish', themeRelevance: 'Currency-hedged Japan ETF isolating equity returns from yen movements.' },
      { symbol: 'TM', name: 'Toyota Motor', change: 1.9, sentiment: 'neutral', themeRelevance: 'World\'s largest automaker benefiting from hybrid leadership and yen weakness.' },
      { symbol: 'SONY', name: 'Sony Group', change: 2.4, sentiment: 'bullish', themeRelevance: 'Entertainment and technology conglomerate with gaming, music, and sensor businesses.' },
    ],
    headlines: [
      { title: 'Nikkei 225 reaches all-time high after 34 years', source: 'Nikkei Asia', time: '1h ago' },
      { title: 'Japanese companies announce record buybacks in 2025', source: 'Bloomberg', time: '3h ago' },
      { title: 'Buffett increases Berkshire stake in Japanese trading houses', source: 'Reuters', time: '5h ago' },
    ],
  },
  {
    id: 'mental-health',
    title: 'Digital Mental Health',
    summary: 'Technology-enabled mental health solutions scaling access to care.',
    detailedSummary: 'The mental health crisis has been exacerbated by the pandemic, creating unprecedented demand for accessible and affordable care. Digital solutions including teletherapy, AI-powered chatbots, and meditation apps are scaling access beyond traditional in-person treatment. Employers are investing heavily in mental health benefits to address productivity losses and attract talent. Payers are expanding coverage as evidence of clinical efficacy accumulates. The integration of mental health into primary care and digital health platforms is a key trend. Psychedelic-assisted therapy is emerging as a potential breakthrough treatment for treatment-resistant conditions. The market is fragmented with opportunities for both pure-play digital health companies and healthcare incumbents.',
    impactPercent: 5.7,
    sentimentScore: 0.67,
    icon: Brain,
    category: 'Healthcare',
    tickers: [
      { symbol: 'TDOC', name: 'Teladoc Health', change: 4.2, sentiment: 'bullish', themeRelevance: 'Telehealth leader with integrated mental health platform through BetterHelp acquisition.' },
      { symbol: 'TALK', name: 'Talkspace', change: 6.8, sentiment: 'bullish', themeRelevance: 'Online therapy platform with B2B employer partnerships driving growth.' },
      { symbol: 'MNMD', name: 'Mind Medicine', change: 9.4, sentiment: 'bullish', themeRelevance: 'Psychedelic medicine developer with LSD and MDMA therapeutics in clinical trials.' },
      { symbol: 'CMPS', name: 'COMPASS Pathways', change: 7.2, sentiment: 'bullish', themeRelevance: 'Psilocybin therapy pioneer with FDA breakthrough designation for depression.' },
    ],
    headlines: [
      { title: 'Workplace mental health spending to reach $100B globally', source: 'Forbes', time: '2h ago' },
      { title: 'FDA grants breakthrough therapy status to MDMA for PTSD', source: 'STAT News', time: '4h ago' },
      { title: 'Teladoc mental health visits grow 40% year-over-year', source: 'Healthcare Dive', time: '6h ago' },
    ],
  },
  {
    id: 'water-scarcity',
    title: 'Water Infrastructure',
    summary: 'Climate change and aging infrastructure driving water sector investment.',
    detailedSummary: 'Water scarcity is emerging as a critical global challenge driven by climate change, population growth, and contamination. In the US, decades of underinvestment have left water infrastructure in urgent need of modernization, with the EPA estimating $750 billion in required investment. Technologies including desalination, water recycling, and smart metering are addressing supply constraints and improving efficiency. Agriculture consumes 70% of freshwater and is a key target for efficiency improvements. Industrial water treatment is essential as manufacturing expands. The investment case is supported by stable, regulated returns and essential service characteristics. Climate adaptation is driving additional spending on flood control and stormwater management.',
    impactPercent: 3.4,
    sentimentScore: 0.58,
    icon: Droplets,
    category: 'Utilities',
    tickers: [
      { symbol: 'AWK', name: 'American Water Works', change: 1.9, sentiment: 'neutral', themeRelevance: 'Largest US water utility with regulated returns and acquisition-driven growth.' },
      { symbol: 'XYL', name: 'Xylem', change: 2.5, sentiment: 'bullish', themeRelevance: 'Water technology leader with pumps, treatment, and smart water solutions.' },
      { symbol: 'WTR', name: 'Essential Utilities', change: 1.4, sentiment: 'neutral', themeRelevance: 'Combined water and wastewater utility with Sunbelt growth strategy.' },
      { symbol: 'FBIN', name: 'Fortune Brands Innovations', change: 2.1, sentiment: 'neutral', themeRelevance: 'Water products manufacturer with Moen faucets and smart water monitoring.' },
    ],
    headlines: [
      { title: 'EPA announces $50B water infrastructure funding program', source: 'WSJ', time: '3h ago' },
      { title: 'California mandates 20% water use reduction by 2030', source: 'LA Times', time: '5h ago' },
      { title: 'Xylem wins major desalination contract in Middle East', source: 'Reuters', time: '7h ago' },
    ],
  },
  {
    id: 'logistics-automation',
    title: 'Warehouse Automation',
    summary: 'E-commerce growth and labor shortages driving logistics automation.',
    detailedSummary: 'The growth of e-commerce and persistent labor shortages in warehouses are driving rapid adoption of automation technologies. Robotic systems including autonomous mobile robots, picking arms, and sortation systems are improving throughput and reducing costs. The technology is becoming accessible to mid-size fulfillment operations as costs decline and ease of deployment improves. The shift toward faster delivery and micro-fulfillment is creating new automation requirements. Companies are increasingly offering robotics-as-a-service models that reduce upfront capital requirements. The integration of AI is enabling more flexible and adaptive automation that can handle the complexity of modern fulfillment operations.',
    impactPercent: 5.3,
    sentimentScore: 0.72,
    icon: Package,
    category: 'Industrials',
    tickers: [
      { symbol: 'AMZN', name: 'Amazon (Robotics)', change: 2.1, sentiment: 'bullish', themeRelevance: 'Internal robotics development and acquisitions driving fulfillment automation.' },
      { symbol: 'SYM', name: 'Symbotic', change: 8.9, sentiment: 'bullish', themeRelevance: 'AI-powered warehouse automation with major Walmart and other retailer contracts.' },
      { symbol: 'ZBRA', name: 'Zebra Technologies', change: 3.4, sentiment: 'bullish', themeRelevance: 'Enterprise mobile computing and scanning solutions for warehouse operations.' },
      { symbol: 'GWRE', name: 'Dematic (KION)', change: 2.8, sentiment: 'neutral', themeRelevance: 'Intralogistics automation provider with conveyor and automated storage systems.' },
    ],
    headlines: [
      { title: 'Amazon deploys 750,000 robots across fulfillment network', source: 'TechCrunch', time: '2h ago' },
      { title: 'Warehouse automation market to reach $50B by 2028', source: 'McKinsey', time: '4h ago' },
      { title: 'Symbotic wins $11B automation contract with Walmart', source: 'Bloomberg', time: '6h ago' },
    ],
  },
  {
    id: 'pet-economy',
    title: 'Premium Pet Economy',
    summary: 'Pet humanization trend driving premium products and services growth.',
    detailedSummary: 'The pet industry continues to benefit from the humanization trend as owners increasingly treat pets as family members and spend accordingly. Premium food, veterinary care, and pet insurance are the fastest-growing segments. The pet population expanded during the pandemic and those animals are now requiring ongoing care and supplies. E-commerce has transformed pet product distribution, with subscription models driving recurring revenue. Veterinary services are experiencing consolidation as private equity backs roll-up strategies. Pet technology including GPS trackers, smart feeders, and telehealth is an emerging sub-segment. The market shows recession resilience as owners maintain spending on pets even during economic stress.',
    impactPercent: 3.8,
    sentimentScore: 0.65,
    icon: Heart,
    category: 'Consumer',
    tickers: [
      { symbol: 'CHWY', name: 'Chewy', change: 5.2, sentiment: 'bullish', themeRelevance: 'Leading pet e-commerce with expanding pharmacy, insurance, and telehealth services.' },
      { symbol: 'IDXX', name: 'IDEXX Laboratories', change: 2.8, sentiment: 'bullish', themeRelevance: 'Veterinary diagnostics leader with consumable-driven recurring revenue model.' },
      { symbol: 'ZTS', name: 'Zoetis', change: 1.9, sentiment: 'neutral', themeRelevance: 'Animal health leader with companion animal medicines and vaccines portfolio.' },
      { symbol: 'TRUP', name: 'Trupanion', change: 4.1, sentiment: 'bullish', themeRelevance: 'Pet insurance disruptor with direct veterinary payment integration and growing penetration.' },
    ],
    headlines: [
      { title: 'US pet spending exceeds $150B for first time', source: 'American Pet Products', time: '3h ago' },
      { title: 'Chewy pharmacy sales grow 50% on pet health focus', source: 'CNBC', time: '5h ago' },
      { title: 'Mars Petcare acquires veterinary hospital chain for $3B', source: 'Reuters', time: '7h ago' },
    ],
  },
  {
    id: 'travel-recovery',
    title: 'Premium Travel Surge',
    summary: 'Luxury and experience travel outpacing mass market with revenge spending.',
    detailedSummary: 'The travel industry recovery has been characterized by strong demand for premium experiences as consumers prioritize experiential spending. Luxury hotels, cruise lines, and airlines are reporting record pricing power and occupancy. Business travel is recovering more slowly but corporate demand for premium services remains strong. The trend toward remote work has enabled extended trips that blend work and leisure. International travel is normalizing after pandemic restrictions, with pent-up demand for long-haul destinations. Cruise lines are benefiting from capacity constraints and strong booking trends. The sector faces risks from economic slowdown and capacity expansion, but near-term fundamentals remain supportive.',
    impactPercent: 4.1,
    sentimentScore: 0.69,
    icon: Plane,
    category: 'Consumer',
    tickers: [
      { symbol: 'MAR', name: 'Marriott International', change: 2.4, sentiment: 'bullish', themeRelevance: 'Largest hotel company with asset-light franchise model and luxury portfolio expansion.' },
      { symbol: 'RCL', name: 'Royal Caribbean', change: 4.8, sentiment: 'bullish', themeRelevance: 'Premium cruise operator with record pricing power and new ship deliveries.' },
      { symbol: 'BKNG', name: 'Booking Holdings', change: 2.1, sentiment: 'neutral', themeRelevance: 'Online travel agency with global reach and connected trip strategy.' },
      { symbol: 'ABNB', name: 'Airbnb', change: 3.5, sentiment: 'bullish', themeRelevance: 'Alternative accommodations leader expanding into experiences and long-term stays.' },
    ],
    headlines: [
      { title: 'Royal Caribbean books best year ever with record pricing', source: 'Skift', time: '2h ago' },
      { title: 'Luxury hotel RevPAR exceeds 2019 levels by 25%', source: 'STR', time: '4h ago' },
      { title: 'International travel demand recovers to pre-pandemic levels', source: 'IATA', time: '6h ago' },
    ],
  },
  {
    id: 'restaurant-tech',
    title: 'Restaurant Technology',
    summary: 'Labor challenges driving automation and digital transformation in dining.',
    detailedSummary: 'The restaurant industry is rapidly adopting technology to address persistent labor challenges and changing consumer expectations. Digital ordering, kitchen automation, and AI-powered inventory management are improving margins and customer experience. Ghost kitchens and delivery-focused concepts are reshaping real estate requirements. Robotics is moving from novelty to necessity as labor costs rise and availability declines. Loyalty programs and data analytics are enabling personalized marketing and menu optimization. The consolidation of restaurant technology providers is creating platforms that serve the entire value chain from ordering to payment to labor management.',
    impactPercent: 4.5,
    sentimentScore: 0.62,
    icon: Coffee,
    category: 'Consumer',
    tickers: [
      { symbol: 'TOST', name: 'Toast', change: 6.2, sentiment: 'bullish', themeRelevance: 'Restaurant technology platform with POS, payments, and workforce management solutions.' },
      { symbol: 'RAVE', name: 'Rave Restaurant Group', change: 3.1, sentiment: 'neutral', themeRelevance: 'Pizza franchise operator testing kiosk ordering and kitchen automation.' },
      { symbol: 'CMG', name: 'Chipotle', change: 2.8, sentiment: 'bullish', themeRelevance: 'Fast-casual pioneer with digital ordering leadership and kitchen robotics pilots.' },
      { symbol: 'SBUX', name: 'Starbucks', change: 1.5, sentiment: 'neutral', themeRelevance: 'Mobile ordering leader facing execution challenges but investing in automation.' },
    ],
    headlines: [
      { title: 'Toast expands to 100,000 restaurant locations', source: 'Restaurant Business', time: '2h ago' },
      { title: 'Chipotle pilots autonomous kitchen line with robotics', source: 'TechCrunch', time: '4h ago' },
      { title: 'Digital ordering now accounts for 40% of QSR sales', source: 'Nation\'s Restaurant News', time: '6h ago' },
    ],
  },
  {
    id: 'data-centers',
    title: 'Data Center REITs',
    summary: 'AI and cloud driving unprecedented demand for data center capacity.',
    detailedSummary: 'Data center real estate is experiencing unprecedented demand driven by AI workloads, cloud migration, and digital transformation. Vacancy rates in major markets have dropped to historic lows while rental rates are rising rapidly. The power intensity of AI workloads is creating challenges and opportunities, with locations offering abundant and reliable power commanding premiums. Hyperscale buildout continues at a rapid pace with major cloud providers committing billions to new facilities. Edge computing is creating demand for smaller facilities closer to end users. The environmental impact of data centers is drawing scrutiny, driving investment in renewable power and cooling efficiency. The asset class offers stable cash flows with significant growth potential.',
    impactPercent: 8.2,
    sentimentScore: 0.78,
    icon: Database,
    category: 'Real Estate',
    tickers: [
      { symbol: 'EQIX', name: 'Equinix', change: 3.8, sentiment: 'bullish', themeRelevance: 'Global data center REIT with interconnection-focused strategy and premium pricing.' },
      { symbol: 'DLR', name: 'Digital Realty', change: 4.2, sentiment: 'bullish', themeRelevance: 'Hyperscale data center specialist with PlatformDIGITAL enterprise platform.' },
      { symbol: 'AMT', name: 'American Tower', change: 2.1, sentiment: 'neutral', themeRelevance: 'Tower REIT expanding into data centers through CoreSite acquisition.' },
      { symbol: 'SBAC', name: 'SBA Communications', change: 1.8, sentiment: 'neutral', themeRelevance: 'Tower operator benefiting from 5G densification and edge computing buildout.' },
    ],
    headlines: [
      { title: 'Equinix reports 100% occupancy in Northern Virginia campus', source: 'Data Center Dynamics', time: '2h ago' },
      { title: 'AI driving 40% increase in data center power demand', source: 'Goldman Sachs', time: '4h ago' },
      { title: 'Microsoft signs 10-year data center lease worth $500M', source: 'Bloomberg', time: '6h ago' },
    ],
  },
  {
    id: 'gene-therapy',
    title: 'Gene Therapy Breakthroughs',
    summary: 'Approved gene therapies proving efficacy with expanding treatment pipeline.',
    detailedSummary: 'Gene therapy is transitioning from experimental concept to proven treatment modality with multiple FDA approvals demonstrating durable efficacy. Treatments for inherited conditions including sickle cell disease and hemophilia are showing the potential to provide functional cures with single treatments. Manufacturing scale-up and cost reduction are critical for broader adoption, with prices for current therapies exceeding $2 million. The technology is expanding beyond rare diseases to more common conditions including cardiovascular disease and diabetes. CRISPR and base editing technologies are enabling precise genetic modifications with improved safety profiles. The regulatory pathway is becoming clearer as agencies gain experience with these novel therapies.',
    impactPercent: 9.8,
    sentimentScore: 0.83,
    icon: Microscope,
    category: 'Healthcare',
    tickers: [
      { symbol: 'CRSP', name: 'CRISPR Therapeutics', change: 7.5, sentiment: 'bullish', themeRelevance: 'First FDA-approved CRISPR therapy for sickle cell with expanding pipeline.' },
      { symbol: 'BEAM', name: 'Beam Therapeutics', change: 8.2, sentiment: 'bullish', themeRelevance: 'Base editing pioneer with precision gene modification without double-strand breaks.' },
      { symbol: 'NTLA', name: 'Intellia Therapeutics', change: 6.9, sentiment: 'bullish', themeRelevance: 'In-vivo CRISPR leader with systemic editing for transthyretin amyloidosis.' },
      { symbol: 'VRTX', name: 'Vertex Pharmaceuticals', change: 3.4, sentiment: 'bullish', themeRelevance: 'Casgevy gene therapy partner with CF franchise and pain pipeline.' },
    ],
    headlines: [
      { title: 'Vertex/CRISPR sickle cell therapy shows 100% response rate at 2 years', source: 'NEJM', time: '1h ago' },
      { title: 'Gene therapy manufacturing costs fall 50% on process improvements', source: 'BioPharma Dive', time: '3h ago' },
      { title: 'FDA clears path for in-vivo CRISPR trials in common diseases', source: 'STAT News', time: '5h ago' },
    ],
  },
  {
    id: 'social-commerce',
    title: 'Social Commerce Evolution',
    summary: 'Social platforms becoming primary shopping channels with embedded commerce.',
    detailedSummary: 'The integration of commerce into social media platforms is transforming how consumers discover and purchase products. TikTok Shop, Instagram Checkout, and YouTube Shopping are enabling seamless transactions within content consumption experiences. Influencer marketing is evolving toward performance-based models with direct attribution. Live shopping, which has been massive in China, is gaining traction in Western markets. The trend is particularly strong in categories including beauty, fashion, and consumer electronics. Brands are shifting marketing budgets toward social platforms that can demonstrate clear ROI through integrated commerce. The disintermediation of traditional retail and marketing channels has significant implications for legacy players.',
    impactPercent: 6.4,
    sentimentScore: 0.71,
    icon: Smartphone,
    category: 'Technology',
    tickers: [
      { symbol: 'META', name: 'Meta Platforms', change: 3.2, sentiment: 'bullish', themeRelevance: 'Instagram and Facebook Shops enabling embedded commerce at massive scale.' },
      { symbol: 'SNAP', name: 'Snap Inc', change: 4.8, sentiment: 'bullish', themeRelevance: 'AR try-on features and creator commerce tools driving shopping engagement.' },
      { symbol: 'PINS', name: 'Pinterest', change: 5.1, sentiment: 'bullish', themeRelevance: 'Visual discovery platform with high purchase intent and shoppable content.' },
      { symbol: 'SHOP', name: 'Shopify', change: 3.9, sentiment: 'bullish', themeRelevance: 'E-commerce infrastructure powering social commerce integrations for brands.' },
    ],
    headlines: [
      { title: 'TikTok Shop GMV exceeds $20B in first full year', source: 'The Information', time: '2h ago' },
      { title: 'Meta expands Instagram Checkout to 20 new countries', source: 'TechCrunch', time: '4h ago' },
      { title: 'Social commerce projected at $2.9T by 2026', source: 'eMarketer', time: '6h ago' },
    ],
  },
  {
    id: 'edge-computing',
    title: 'Edge Computing Buildout',
    summary: 'Low-latency applications driving distributed computing infrastructure.',
    detailedSummary: 'Edge computing is emerging as a critical complement to centralized cloud infrastructure, enabling low-latency applications and addressing data sovereignty requirements. 5G network deployments are creating the connectivity foundation for edge use cases including autonomous vehicles, industrial IoT, and augmented reality. Content delivery networks are evolving into general-purpose edge platforms. Telecommunications companies are monetizing their network presence through edge services. The convergence of telecom, cloud, and content is reshaping competitive dynamics. Manufacturing, healthcare, and retail are early adopters driving proof-of-concept deployments. The market remains fragmented with opportunities for both incumbents and specialists.',
    impactPercent: 5.9,
    sentimentScore: 0.68,
    icon: Wifi,
    category: 'Technology',
    tickers: [
      { symbol: 'AKAM', name: 'Akamai Technologies', change: 3.5, sentiment: 'bullish', themeRelevance: 'CDN pioneer expanding into edge computing and security services.' },
      { symbol: 'FSLY', name: 'Fastly', change: 6.2, sentiment: 'bullish', themeRelevance: 'Developer-focused edge platform with serverless compute capabilities.' },
      { symbol: 'NET', name: 'Cloudflare', change: 4.8, sentiment: 'bullish', themeRelevance: 'Edge computing platform with Workers enabling distributed application logic.' },
      { symbol: 'LLNW', name: 'Limelight Networks', change: 2.9, sentiment: 'neutral', themeRelevance: 'CDN provider with growing edge computing focus after Edgecast merger.' },
    ],
    headlines: [
      { title: 'Edge computing market to reach $200B by 2028', source: 'Gartner', time: '3h ago' },
      { title: 'AT&T and Microsoft expand edge computing partnership', source: 'Fierce Telecom', time: '5h ago' },
      { title: 'Cloudflare Workers processes 10 trillion requests monthly', source: 'VentureBeat', time: '7h ago' },
    ],
  },
  {
    id: 'alternative-protein',
    title: 'Alternative Proteins',
    summary: 'Plant-based and cultivated meat addressing sustainability and health trends.',
    detailedSummary: 'The alternative protein market is evolving beyond plant-based burgers to encompass a broader range of products including cultivated (cell-based) meat, precision fermentation, and novel protein sources. While the initial plant-based boom has moderated, companies are improving taste and price parity with conventional products. Cultivated meat received its first regulatory approvals and is scaling toward commercial viability. Major food companies are investing heavily in the space, both directly and through acquisitions. Sustainability concerns and animal welfare considerations are driving consumer interest, particularly among younger demographics. The technology has potential applications beyond human food in pet food and aquaculture feed.',
    impactPercent: 2.8,
    sentimentScore: 0.54,
    icon: Beef,
    category: 'Consumer',
    tickers: [
      { symbol: 'BYND', name: 'Beyond Meat', change: -4.2, sentiment: 'bearish', themeRelevance: 'Plant-based meat pioneer facing demand normalization and margin pressure.' },
      { symbol: 'OTLY', name: 'Oatly Group', change: 2.1, sentiment: 'neutral', themeRelevance: 'Oat milk leader with foodservice expansion and improving manufacturing.' },
      { symbol: 'TSN', name: 'Tyson Foods', change: 1.5, sentiment: 'neutral', themeRelevance: 'Meat giant with alternative protein investments hedging long-term shift.' },
      { symbol: 'ADM', name: 'Archer-Daniels-Midland', change: 1.8, sentiment: 'neutral', themeRelevance: 'Agricultural processor supplying plant-based protein ingredients at scale.' },
    ],
    headlines: [
      { title: 'USDA approves second cultivated meat producer for sale', source: 'Food Navigator', time: '2h ago' },
      { title: 'Alternative protein sector raises $3B in 2025', source: 'Good Food Institute', time: '4h ago' },
      { title: 'Nestlé expands plant-based product line globally', source: 'Reuters', time: '6h ago' },
    ],
  },
  {
    id: 'music-streaming',
    title: 'Music Streaming Monetization',
    summary: 'Streaming platforms improving economics for artists and shareholders.',
    detailedSummary: 'Music streaming platforms are maturing with improving unit economics as subscriber growth continues and advertising revenue scales. Price increases are being accepted by consumers, demonstrating the value proposition. Podcast and audiobook integration is driving engagement and differentiation. AI is transforming music discovery, creation, and personalization. The relationship between platforms and record labels is evolving as both sides seek to optimize the economics of streaming. Emerging markets offer significant growth potential as smartphone penetration increases. Live music is experiencing a renaissance, creating synergies with streaming platforms that can promote and sell tickets. The sector offers exposure to resilient entertainment spending.',
    impactPercent: 3.6,
    sentimentScore: 0.63,
    icon: Music,
    category: 'Media',
    tickers: [
      { symbol: 'SPOT', name: 'Spotify', change: 4.5, sentiment: 'bullish', themeRelevance: 'Streaming leader with improving margins through cost discipline and price increases.' },
      { symbol: 'WMG', name: 'Warner Music Group', change: 2.3, sentiment: 'neutral', themeRelevance: 'Major record label benefiting from streaming growth and catalog value.' },
      { symbol: 'UMG', name: 'Universal Music Group', change: 1.9, sentiment: 'neutral', themeRelevance: 'Largest music company with dominant market share and artist roster.' },
      { symbol: 'LYV', name: 'Live Nation', change: 3.1, sentiment: 'bullish', themeRelevance: 'Live entertainment leader with concert promotion, venues, and Ticketmaster.' },
    ],
    headlines: [
      { title: 'Spotify achieves sustained profitability for first time', source: 'Billboard', time: '2h ago' },
      { title: 'Music streaming revenue exceeds $25B globally', source: 'IFPI', time: '4h ago' },
      { title: 'AI-generated music sparks royalty debate between platforms and labels', source: 'Variety', time: '6h ago' },
    ],
  },
  {
    id: 'senior-housing',
    title: 'Senior Living Demand',
    summary: 'Aging demographics driving demand for senior housing and care facilities.',
    detailedSummary: 'The aging of the Baby Boom generation is creating sustained demand for senior housing, assisted living, and skilled nursing facilities. New supply has been constrained by construction costs and labor challenges, tightening occupancy rates. The sector is recovering from pandemic headwinds with improving fundamentals. Technology is enabling aging-in-place solutions that complement facility-based care. The integration of healthcare services into senior living is improving outcomes and reimbursement. Labor remains the critical constraint, driving investment in automation and retention programs. The long-term demographic tailwind is among the most predictable in real estate, with the 80+ population projected to double over the next two decades.',
    impactPercent: 4.3,
    sentimentScore: 0.66,
    icon: Home,
    category: 'Real Estate',
    tickers: [
      { symbol: 'WELL', name: 'Welltower', change: 2.8, sentiment: 'bullish', themeRelevance: 'Largest senior housing REIT with premium operator partnerships and tech investment.' },
      { symbol: 'VTR', name: 'Ventas', change: 2.4, sentiment: 'bullish', themeRelevance: 'Diversified healthcare REIT with senior housing and life science exposure.' },
      { symbol: 'OHI', name: 'Omega Healthcare', change: 1.9, sentiment: 'neutral', themeRelevance: 'Skilled nursing focused REIT with high dividend yield and tenant improvement.' },
      { symbol: 'SBRA', name: 'Sabra Health Care REIT', change: 2.1, sentiment: 'neutral', themeRelevance: 'Senior care REIT diversifying from skilled nursing into senior housing.' },
    ],
    headlines: [
      { title: 'Senior housing occupancy reaches 85%, highest since 2020', source: 'NIC', time: '3h ago' },
      { title: 'Welltower invests $1B in memory care facilities', source: 'Senior Housing News', time: '5h ago' },
      { title: 'Labor costs stabilize as retention programs take effect', source: 'McKnight\'s', time: '7h ago' },
    ],
  },
  {
    id: 'education-tech',
    title: 'EdTech Renaissance',
    summary: 'Post-pandemic education technology focusing on outcomes and efficiency.',
    detailedSummary: 'Education technology is evolving beyond pandemic-era emergency adoption toward sustainable models focused on student outcomes and institutional efficiency. AI tutoring and adaptive learning platforms are demonstrating improved learning outcomes at scale. The higher education market faces enrollment headwinds but is investing in technology to reduce costs and improve student success. Corporate training is a rapidly growing segment as companies invest in workforce development. Credential innovation including micro-credentials and skills-based certifications is addressing employer needs. International markets offer significant growth as education access expands. The sector is consolidating after the pandemic funding surge with a focus on profitability.',
    impactPercent: 3.4,
    sentimentScore: 0.59,
    icon: GraduationCap,
    category: 'Technology',
    tickers: [
      { symbol: 'DUOL', name: 'Duolingo', change: 5.8, sentiment: 'bullish', themeRelevance: 'Language learning app with AI features driving engagement and monetization.' },
      { symbol: 'COUR', name: 'Coursera', change: 3.2, sentiment: 'neutral', themeRelevance: 'Online learning platform with university partnerships and enterprise training.' },
      { symbol: '2U', name: '2U Inc', change: -2.4, sentiment: 'bearish', themeRelevance: 'Online degree provider struggling with enrollment and margin pressure.' },
      { symbol: 'CHGG', name: 'Chegg', change: 1.9, sentiment: 'neutral', themeRelevance: 'Student services platform adapting to AI disruption with new products.' },
    ],
    headlines: [
      { title: 'Duolingo AI features drive 50% increase in engagement', source: 'EdSurge', time: '2h ago' },
      { title: 'Corporate training market reaches $400B as upskilling accelerates', source: 'Training Industry', time: '4h ago' },
      { title: 'AI tutors match human instructor effectiveness in studies', source: 'Nature Education', time: '6h ago' },
    ],
  },
  {
    id: 'infrastructure-bill',
    title: 'Infrastructure Investment',
    summary: 'Federal infrastructure spending flowing into roads, bridges, and broadband.',
    detailedSummary: 'The Infrastructure Investment and Jobs Act and related legislation are driving substantial investment in physical infrastructure including transportation, water, broadband, and energy systems. The spending is creating multi-year demand for engineering and construction services, building materials, and heavy equipment. Reshoring of manufacturing is adding to industrial construction activity. The transition to electric vehicles requires significant charging infrastructure investment. Rural broadband expansion is connecting underserved communities. The labor market for skilled trades remains tight, supporting wage growth and driving productivity-enhancing investment. The projects have long lead times, with spending expected to accelerate through the decade.',
    impactPercent: 4.7,
    sentimentScore: 0.67,
    icon: Truck,
    category: 'Industrials',
    tickers: [
      { symbol: 'MLM', name: 'Martin Marietta', change: 2.6, sentiment: 'bullish', themeRelevance: 'Aggregates producer with infrastructure exposure and pricing power.' },
      { symbol: 'VMC', name: 'Vulcan Materials', change: 2.3, sentiment: 'bullish', themeRelevance: 'Largest US aggregates company with strong Sunbelt presence.' },
      { symbol: 'URI', name: 'United Rentals', change: 3.1, sentiment: 'bullish', themeRelevance: 'Equipment rental leader benefiting from infrastructure project activity.' },
      { symbol: 'PWR', name: 'Quanta Services', change: 2.8, sentiment: 'bullish', themeRelevance: 'Specialty contractor for electric grid and communications infrastructure.' },
    ],
    headlines: [
      { title: 'DOT announces $20B in highway project awards', source: 'ENR', time: '2h ago' },
      { title: 'Aggregate demand reaches record on infrastructure spending', source: 'Rock Products', time: '4h ago' },
      { title: 'Rural broadband deployment accelerates with federal funding', source: 'Fierce Telecom', time: '6h ago' },
    ],
  },
  {
    id: 'luxury-goods',
    title: 'Luxury Market Resilience',
    summary: 'High-end brands maintaining pricing power amid economic uncertainty.',
    detailedSummary: 'The luxury goods sector continues to demonstrate resilience with strong demand from wealthy consumers relatively insulated from economic pressures. Brand heritage, exclusivity, and craftsmanship command premium pricing that is being maintained despite broader consumer caution. Chinese demand is recovering after pandemic disruptions, a critical driver for the sector. The shift toward experiences and travel is benefiting luxury hospitality and jewelry. Younger affluent consumers are driving growth in categories including sneakers and contemporary brands. Digital channels are becoming more important for customer acquisition while maintaining the exclusivity that defines luxury. The sector faces risks from potential recession but has historically demonstrated less cyclicality than mass market consumer goods.',
    impactPercent: 3.2,
    sentimentScore: 0.64,
    icon: ShoppingCart,
    category: 'Consumer',
    tickers: [
      { symbol: 'LVMHF', name: 'LVMH', change: 2.1, sentiment: 'neutral', themeRelevance: 'Largest luxury conglomerate with Louis Vuitton, Dior, and diverse brand portfolio.' },
      { symbol: 'CFRUY', name: 'Richemont', change: 2.8, sentiment: 'bullish', themeRelevance: 'Luxury jewelry and watch leader with Cartier and Van Cleef & Arpels.' },
      { symbol: 'TPR', name: 'Tapestry', change: 3.4, sentiment: 'bullish', themeRelevance: 'Accessible luxury with Coach, Kate Spade, and Capri acquisition.' },
      { symbol: 'RL', name: 'Ralph Lauren', change: 1.9, sentiment: 'neutral' },
    ],
    headlines: [
      { title: 'LVMH reports resilient demand despite economic headwinds', source: 'WWD', time: '2h ago' },
      { title: 'Chinese luxury spending recovers to pre-pandemic levels', source: 'Bain & Co', time: '4h ago' },
      { title: 'Gen Z drives 30% of luxury market growth', source: 'McKinsey', time: '6h ago' },
    ],
  },
  {
    id: 'carbon-capture',
    title: 'Carbon Capture Technology',
    summary: 'Direct air capture and industrial carbon capture scaling with policy support.',
    detailedSummary: 'Carbon capture and storage technologies are receiving unprecedented investment driven by policy support and corporate net-zero commitments. The Inflation Reduction Act provides substantial tax credits for carbon capture projects, dramatically improving economics. Direct air capture facilities are scaling from pilot to commercial scale, though costs remain high. Industrial carbon capture from cement, steel, and chemical production offers more immediate opportunities. Carbon dioxide utilization in products including concrete and fuels is an emerging application. The development of CO2 transport and storage infrastructure is critical for scale. Voluntary carbon markets are evolving with improved standards and verification. The sector offers potential for companies with technological advantages as policy support expands globally.',
    impactPercent: 5.2,
    sentimentScore: 0.65,
    icon: Wind,
    category: 'Energy',
    tickers: [
      { symbol: 'LIN', name: 'Linde', change: 2.4, sentiment: 'bullish' },
      { symbol: 'APD', name: 'Air Products', change: 1.9, sentiment: 'neutral' },
      { symbol: 'XOM', name: 'ExxonMobil (CCS)', change: 1.5, sentiment: 'neutral' },
      { symbol: 'OXY', name: 'Occidental Petroleum', change: 3.8, sentiment: 'bullish' },
    ],
    headlines: [
      { title: 'Occidental opens world\'s largest direct air capture facility', source: 'Reuters', time: '1h ago' },
      { title: 'DOE awards $1.5B for carbon capture hubs', source: 'E&E News', time: '3h ago' },
      { title: 'Carbon capture project pipeline exceeds 500 globally', source: 'IEA', time: '5h ago' },
    ],
  },
  {
    id: 'connected-fitness',
    title: 'Connected Fitness Evolution',
    summary: 'At-home fitness platforms pivoting to sustainable business models.',
    detailedSummary: 'The connected fitness market is maturing after pandemic-driven growth, with companies pivoting toward sustainable business models. Hardware sales have normalized but subscription revenue remains resilient. The integration of AI is enabling personalized coaching and adaptive programming. Partnerships with healthcare providers and insurers are creating new distribution channels. The convergence with wearables and health data is enabling more holistic wellness solutions. Live and social features are improving engagement and retention. International expansion offers growth opportunities in underpenetrated markets. The sector is consolidating with weaker players exiting and stronger platforms acquiring technology and content.',
    impactPercent: 2.1,
    sentimentScore: 0.52,
    icon: Heart,
    category: 'Consumer',
    tickers: [
      { symbol: 'PTON', name: 'Peloton', change: 4.5, sentiment: 'bullish' },
      { symbol: 'NKE', name: 'Nike (Digital)', change: 1.8, sentiment: 'neutral' },
      { symbol: 'LULU', name: 'Lululemon', change: 2.3, sentiment: 'neutral' },
      { symbol: 'AAPL', name: 'Apple (Fitness+)', change: 1.2, sentiment: 'neutral' },
    ],
    headlines: [
      { title: 'Peloton subscription retention improves to 92%', source: 'Bloomberg', time: '2h ago' },
      { title: 'Connected fitness market stabilizes at $15B annually', source: 'NPD', time: '4h ago' },
      { title: 'AI personal trainers show promising early results', source: 'CNET', time: '6h ago' },
    ],
  },
  {
    id: 'synthetic-biology',
    title: 'Synthetic Biology Applications',
    summary: 'Engineering biology to produce materials, chemicals, and medicines.',
    detailedSummary: 'Synthetic biology is enabling the programmable design of biological systems to produce valuable products including materials, chemicals, and therapeutics. The technology is reducing reliance on petrochemicals and agricultural inputs while enabling novel products impossible through traditional chemistry. Applications range from sustainable materials and fragrances to cell and gene therapies. Manufacturing scale-up remains challenging but is progressing. The convergence of AI and biology is accelerating design cycles. Food and agriculture applications including animal-free proteins and nitrogen-fixing crops are addressing sustainability challenges. The sector requires patient capital given long development timelines but offers transformative potential across multiple industries.',
    impactPercent: 6.8,
    sentimentScore: 0.72,
    icon: Beaker,
    category: 'Healthcare',
    tickers: [
      { symbol: 'DNA', name: 'Ginkgo Bioworks', change: 5.8, sentiment: 'bullish' },
      { symbol: 'AMRS', name: 'Amyris', change: -3.2, sentiment: 'bearish' },
      { symbol: 'TWST', name: 'Twist Bioscience', change: 4.2, sentiment: 'bullish' },
      { symbol: 'CDXS', name: 'Codexis', change: 3.5, sentiment: 'bullish' },
    ],
    headlines: [
      { title: 'Ginkgo Bioworks achieves first profitable quarter', source: 'Fierce Biotech', time: '2h ago' },
      { title: 'Synthetic biology market projected at $50B by 2030', source: 'Nature Biotechnology', time: '4h ago' },
      { title: 'Bio-based materials gain traction in fashion industry', source: 'WWD', time: '6h ago' },
    ],
  },
  {
    id: 'electrification',
    title: 'Building Electrification',
    summary: 'Heat pumps and electric appliances replacing fossil fuels in buildings.',
    detailedSummary: 'The electrification of buildings is accelerating as governments mandate the phase-out of fossil fuel heating and new technologies improve performance. Heat pumps are becoming the standard for both heating and cooling, with efficiency improvements making them viable in cold climates. Electric appliances for cooking, water heating, and drying are gaining market share. Building codes are being updated to require all-electric new construction in many jurisdictions. The existing building stock represents a massive retrofit opportunity supported by incentives. The electrical grid requires upgrades to handle increased load from building electrification, creating opportunities for utility and equipment providers. The trend is global with Europe leading adoption.',
    impactPercent: 4.9,
    sentimentScore: 0.69,
    icon: Thermometer,
    category: 'Industrials',
    tickers: [
      { symbol: 'CARR', name: 'Carrier Global', change: 3.2, sentiment: 'bullish' },
      { symbol: 'TT', name: 'Trane Technologies', change: 2.8, sentiment: 'bullish' },
      { symbol: 'LII', name: 'Lennox International', change: 2.4, sentiment: 'neutral' },
      { symbol: 'JCI', name: 'Johnson Controls', change: 1.9, sentiment: 'neutral' },
    ],
    headlines: [
      { title: 'US heat pump sales exceed gas furnaces for first time', source: 'E&E News', time: '2h ago' },
      { title: 'California mandates all-electric new construction by 2027', source: 'LA Times', time: '4h ago' },
      { title: 'Carrier introduces cold-climate heat pump for northern markets', source: 'HPAC', time: '6h ago' },
    ],
  },
];

function TickerPill({ ticker, onClick }: { ticker: ThemeTicker; onClick: () => void }) {
  const sentimentColor = {
    bullish: 'bg-emerald-500',
    bearish: 'bg-red-500',
    neutral: 'bg-amber-500',
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 shrink-0 hover:bg-white/10 hover:border-primary/30 transition-all group"
    >
      <div className={cn('w-1.5 h-1.5 rounded-full', sentimentColor[ticker.sentiment])} />
      <span className="text-xs font-mono font-medium text-foreground group-hover:text-primary transition-colors">
        {ticker.symbol}
      </span>
      <span className={cn(
        'text-[10px] font-mono',
        ticker.change >= 0 ? 'text-emerald-400' : 'text-red-400'
      )}>
        {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(1)}%
      </span>
    </button>
  );
}

function ThemeCard({ 
  theme, 
  onClick,
  onTickerClick
}: { 
  theme: MarketTheme; 
  onClick: () => void;
  onTickerClick: (symbol: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = theme.icon;
  const isPositive = theme.impactPercent >= 0;

  const handleSeeMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group w-[300px] sm:w-[340px] shrink-0 p-4 rounded-xl text-left transition-all duration-300",
        "bg-white/5 backdrop-blur-md border border-white/10",
        "hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]",
        "focus:outline-none focus:ring-2 focus:ring-primary/50"
      )}
    >
      {/* Impact Badge with Glow */}
      <div className={cn(
        "absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold",
        "flex items-center gap-1",
        isPositive 
          ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
          : "bg-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
      )}>
        {isPositive ? '+' : ''}{theme.impactPercent.toFixed(1)}%
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 pr-14">
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            {theme.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border/50">
              {theme.category}
            </Badge>
            <span className={cn(
              "text-[10px] font-medium",
              theme.sentimentScore >= 0.6 ? "text-emerald-400" : 
              theme.sentimentScore >= 0.4 ? "text-amber-400" : "text-red-400"
            )}>
              {(theme.sentimentScore * 100).toFixed(0)}% bullish
            </span>
          </div>
        </div>
      </div>

      {/* Summary with See More */}
      <div className="mb-3">
        <p className={cn(
          "text-xs text-muted-foreground leading-relaxed transition-all duration-200",
          !expanded && "line-clamp-2"
        )}>
          {expanded ? theme.detailedSummary : theme.summary}
        </p>
        <span
          onClick={handleSeeMoreClick}
          className={cn(
            "inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-primary",
            "hover:text-primary/80 cursor-pointer transition-colors",
            "focus:outline-none focus:underline"
          )}
        >
          {expanded ? 'See less' : 'See more'}
          <ArrowRight className={cn(
            "h-3 w-3 transition-transform duration-200",
            expanded && "rotate-90"
          )} />
        </span>
      </div>

      {/* Ticker Ribbon */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {theme.tickers.slice(0, 3).map((ticker) => (
          <TickerPill 
            key={ticker.symbol} 
            ticker={ticker} 
            onClick={() => onTickerClick(ticker.symbol)}
          />
        ))}
        {theme.tickers.length > 3 && (
          <div className="flex items-center px-2 text-[10px] text-muted-foreground">
            +{theme.tickers.length - 3}
          </div>
        )}
      </div>
    </button>
  );
}

export function MarketThemesSection() {
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState<MarketTheme | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Reset expansion when theme changes
  const handleThemeSelect = (theme: MarketTheme) => {
    setSheetExpanded(false);
    setSelectedTheme(theme);
  };

  const handleAddToWatchlist = () => {
    if (!selectedTheme) return;
    console.log('Adding tickers to watchlist:', selectedTheme.tickers.map(t => t.symbol));
    setSelectedTheme(null);
  };

  const handleTickerClick = (symbol: string) => {
    navigate(`/stock/${symbol}`);
  };

  const displayedThemes = showAll ? MARKET_THEMES : MARKET_THEMES.slice(0, 12);

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Major Market Themes</h2>
            <p className="text-[10px] text-muted-foreground">{MARKET_THEMES.length} active themes tracked</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowAll(!showAll)}
          className="text-xs h-7"
        >
          {showAll ? 'Show Less' : `View All ${MARKET_THEMES.length}`}
        </Button>
      </div>

      {/* Theme Cards - Horizontal Scroll or Grid */}
      <div className={cn(
        showAll 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" 
          : "relative -mx-4 sm:-mx-6 px-4 sm:px-6"
      )}>
        {showAll ? (
          displayedThemes.map((theme) => (
            <div key={theme.id} className="w-full">
              <ThemeCard 
                theme={theme} 
                onClick={() => handleThemeSelect(theme)}
                onTickerClick={handleTickerClick}
              />
            </div>
          ))
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {displayedThemes.map((theme) => (
              <ThemeCard 
                key={theme.id} 
                theme={theme} 
                onClick={() => handleThemeSelect(theme)}
                onTickerClick={handleTickerClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <Sheet open={!!selectedTheme} onOpenChange={() => setSelectedTheme(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-background/95 backdrop-blur-xl border-border">
          {selectedTheme && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <selectedTheme.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-lg">{selectedTheme.title}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {selectedTheme.category}
                      </Badge>
                      <span className={cn(
                        "text-sm font-bold",
                        selectedTheme.impactPercent >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {selectedTheme.impactPercent >= 0 ? '+' : ''}{selectedTheme.impactPercent.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {(selectedTheme.sentimentScore * 100).toFixed(0)}% bullish
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-240px)] mt-4 pr-4">
                {/* Detailed Summary - Collapsible */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Theme Analysis
                  </h4>
                  <div className="relative">
                    <p className={cn(
                      "text-sm text-foreground leading-relaxed transition-all duration-200",
                      !sheetExpanded && "line-clamp-3"
                    )}>
                      {selectedTheme.detailedSummary}
                    </p>
                    <button
                      onClick={() => setSheetExpanded(!sheetExpanded)}
                      className={cn(
                        "mt-2 text-xs font-medium text-primary hover:text-primary/80",
                        "flex items-center gap-1 transition-colors"
                      )}
                    >
                      {sheetExpanded ? 'See less' : 'See more'}
                      <ArrowRight className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        sheetExpanded && "rotate-90"
                      )} />
                    </button>
                  </div>
                </div>

                {/* Related Tickers */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Related Companies ({selectedTheme.tickers.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTheme.tickers.map((ticker) => (
                      <button 
                        key={ticker.symbol}
                        onClick={() => handleTickerClick(ticker.symbol)}
                        className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            ticker.sentiment === 'bullish' ? 'bg-emerald-500' :
                            ticker.sentiment === 'bearish' ? 'bg-red-500' : 'bg-amber-500'
                          )} />
                          <div className="text-left">
                            <span className="font-mono font-medium text-sm group-hover:text-primary transition-colors">
                              {ticker.symbol}
                            </span>
                            <p className="text-xs text-muted-foreground">{ticker.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-mono text-sm font-medium",
                            ticker.change >= 0 ? "text-emerald-400" : "text-red-400"
                          )}>
                            {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(1)}%
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Headlines */}
                <div className="mb-6">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Related News ({selectedTheme.headlines.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTheme.headlines.map((headline, idx) => (
                      <a 
                        key={idx}
                        href={headline.url || `https://www.google.com/search?q=${encodeURIComponent(headline.title)}&tbm=nws`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 hover:border-primary/30 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
                            {headline.title}
                          </p>
                          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-medium">{headline.source}</span>
                          <span>•</span>
                          <span>{headline.time}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </ScrollArea>

              {/* Action Button */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
                <Button 
                  onClick={handleAddToWatchlist}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Trade the Theme ({selectedTheme.tickers.length} tickers)
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

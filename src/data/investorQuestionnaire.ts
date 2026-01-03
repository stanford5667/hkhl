import { QuestionnaireQuestion, QuestionCategory } from '@/types/investorPolicy';

export interface QuestionnaireSection {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  questions: QuestionnaireQuestion[];
}

// ============================================
// SECTION 1: GOALS & PURPOSE
// ============================================
const goalsQuestions: QuestionnaireQuestion[] = [
  {
    id: 'goal-purpose',
    category: 'goals',
    question: 'What is the primary purpose of this investment?',
    explanation: 'Your investment goal determines everything from how much risk to take to which types of assets to hold. A retirement fund 30 years away can weather storms; a house down payment needed in 2 years cannot.',
    impactDescription: 'This directly sets your time horizon and risk capacity. Long-term goals allow for more aggressive growth strategies.',
    inputType: 'select',
    options: [
      {
        value: 'retirement',
        label: 'Retirement',
        description: 'Building wealth for when you stop working. Typically 10-40 years away, allowing for aggressive growth strategies early on.'
      },
      {
        value: 'house-purchase',
        label: 'House Down Payment',
        description: 'Saving for a specific large purchase. Usually 2-7 years away, requiring more conservative approaches as you get closer.'
      },
      {
        value: 'education',
        label: 'Education Funding',
        description: 'Saving for your or a child\'s education. Timeline is usually fixed and known, requiring careful planning.'
      },
      {
        value: 'wealth-building',
        label: 'General Wealth Building',
        description: 'Growing your money without a specific goal. Offers flexibility but requires self-discipline about not touching it.'
      },
      {
        value: 'income-generation',
        label: 'Generate Regular Income',
        description: 'Creating a stream of income from investments. Focuses on dividend stocks, bonds, and income-producing assets.'
      },
      {
        value: 'financial-independence',
        label: 'Financial Independence / Early Retirement',
        description: 'Building enough wealth to make work optional. Requires aggressive savings and strategic investment.'
      }
    ]
  },
  {
    id: 'goal-timeline',
    category: 'goals',
    question: 'When do you need to access this money?',
    explanation: 'Time is your greatest asset in investing. The longer your timeline, the more you can benefit from compound growth and recover from market downturns. This is perhaps the single most important factor in determining your asset allocation.',
    technicalTerm: 'Time Horizon',
    technicalDefinition: 'The expected number of years you plan to hold an investment before needing the money. Longer time horizons allow for more risk-taking.',
    impactDescription: 'Short timelines (under 3 years) require very conservative allocations. Medium (3-10 years) allows moderate risk. Long (10+ years) enables aggressive growth strategies.',
    inputType: 'select',
    options: [
      {
        value: 'less-than-1',
        label: 'Less than 1 year',
        description: 'Very short-term. Should be mostly cash or very short-term bonds. Not suitable for stock market investing.'
      },
      {
        value: '1-3-years',
        label: '1-3 years',
        description: 'Short-term. Limited equity exposure recommended. Focus on capital preservation with modest growth.'
      },
      {
        value: '3-5-years',
        label: '3-5 years',
        description: 'Medium-term. Can tolerate some volatility. Balanced approach between growth and stability.'
      },
      {
        value: '5-10-years',
        label: '5-10 years',
        description: 'Medium-long term. Historically, stocks have rarely lost money over any 10-year period. Can take meaningful equity risk.'
      },
      {
        value: '10-20-years',
        label: '10-20 years',
        description: 'Long-term. Time is on your side. Can weather significant downturns and benefit from compound growth.'
      },
      {
        value: 'more-than-20',
        label: 'More than 20 years',
        description: 'Very long-term. Maximum growth potential. Can be very aggressive early and gradually reduce risk as you approach your goal.'
      }
    ]
  },
  {
    id: 'goal-target-specificity',
    category: 'goals',
    question: 'How specific is your target amount?',
    explanation: 'Some goals have firm numbers (like a $60,000 house down payment), while others are more flexible. This affects how we balance growth potential against the risk of falling short.',
    impactDescription: 'Fixed targets require more conservative strategies to ensure you hit the number. Flexible goals allow us to optimize for growth.',
    inputType: 'select',
    options: [
      {
        value: 'very-specific',
        label: 'I need exactly $X by date Y',
        description: 'Fixed target. We\'ll prioritize hitting your number over maximizing growth.'
      },
      {
        value: 'approximate',
        label: 'I have a rough target in mind',
        description: 'Some flexibility. We can take slightly more risk for potentially better outcomes.'
      },
      {
        value: 'maximize',
        label: 'I just want to maximize growth',
        description: 'No specific target. We can optimize purely for risk-adjusted returns.'
      },
      {
        value: 'minimum-threshold',
        label: 'I need at least $X, but more is better',
        description: 'Floor with upside. We\'ll ensure you hit the minimum while reaching for more.'
      }
    ]
  },
  {
    id: 'goal-other-assets',
    category: 'goals',
    question: 'Do you have other investments or savings outside of what we\'re planning here?',
    explanation: 'Understanding your complete financial picture helps us make better recommendations. If you have other conservative investments, we might suggest more aggressive positions here (and vice versa).',
    impactDescription: 'Your total portfolio matters more than any single account. We\'ll consider how this fits into your overall financial situation.',
    inputType: 'select',
    options: [
      {
        value: 'significant-other',
        label: 'Yes, significant other investments',
        description: 'This portfolio is part of a larger strategy. We can optimize this piece to complement your other holdings.'
      },
      {
        value: 'some-savings',
        label: 'Some savings, but this is my main investment',
        description: 'This is your primary investment vehicle. We\'ll build a well-rounded portfolio.'
      },
      {
        value: 'emergency-only',
        label: 'Just emergency savings',
        description: 'Good foundation. This portfolio needs to be self-sufficient for your goals.'
      },
      {
        value: 'this-is-everything',
        label: 'This is essentially everything',
        description: 'Important context. We\'ll be more thoughtful about risk since there\'s no backup.'
      }
    ]
  },
  {
    id: 'goal-success-vision',
    category: 'goals',
    question: 'What would success look like for you in 5 years?',
    explanation: 'Beyond the numbers, understanding what you\'re really working toward helps us align your investments with your life goals. Money is a means to an end, not the end itself.',
    impactDescription: 'Your answer helps us understand your true priorities and risk tolerance beyond just the financial metrics.',
    inputType: 'text'
  },
  {
    id: 'goal-priority',
    category: 'goals',
    question: 'How critical is achieving this specific goal versus your overall financial wellbeing?',
    explanation: 'Some goals are "must achieve" (like retirement income), while others are "nice to have" (like a dream vacation home). This affects how we balance risk and reward.',
    impactDescription: 'Critical goals require more conservative approaches to ensure success. Aspirational goals can tolerate more risk for higher potential rewards.',
    inputType: 'select',
    options: [
      {
        value: 'critical',
        label: 'Critical - I absolutely need to achieve this',
        description: 'We\'ll prioritize certainty over maximum returns.'
      },
      {
        value: 'important',
        label: 'Important - I\'d be disappointed to miss it',
        description: 'We\'ll balance probability of success with growth potential.'
      },
      {
        value: 'nice-to-have',
        label: 'Nice to have - I\'m okay with uncertainty',
        description: 'We can take more risk for potentially higher rewards.'
      }
    ]
  }
];

// ============================================
// SECTION 2: RISK UNDERSTANDING
// ============================================
const riskQuestions: QuestionnaireQuestion[] = [
  {
    id: 'risk-scenario-drop',
    category: 'risk',
    question: 'Scenario: Your $100,000 portfolio drops to $80,000 in one month. What would you actually do?',
    explanation: 'This is the most important question. How you behave during market drops matters more than your stated risk tolerance. Most people overestimate their ability to stay calm during losses. Be honest with yourself.',
    technicalTerm: 'Behavioral Risk Tolerance',
    technicalDefinition: 'How you actually react to losses, as opposed to how you think you\'d react. Studies show most investors sell at the worst times due to emotional reactions.',
    impactDescription: 'If you\'d sell during a drop, we need a more conservative portfolio. The worst outcome is selling low and missing the recovery.',
    inputType: 'scenario',
    options: [
      {
        value: 'sell-all',
        label: 'Sell everything to stop the bleeding',
        description: 'Honest answer. This means a very conservative portfolio is right for you - you\'ll avoid most drops but also most gains.'
      },
      {
        value: 'sell-some',
        label: 'Sell some to reduce exposure',
        description: 'Understandable, but often locks in losses. Suggests a moderate portfolio to minimize these situations.'
      },
      {
        value: 'hold',
        label: 'Do nothing and wait it out',
        description: 'Good discipline, but be honest - is this really how you\'d feel with real money?'
      },
      {
        value: 'buy-more',
        label: 'Buy more at the lower prices',
        description: 'Classic contrarian approach. If this is genuinely you, you can handle an aggressive portfolio.'
      },
      {
        value: 'panic-but-hold',
        label: 'I\'d panic but force myself not to sell',
        description: 'Very honest answer. A moderate portfolio reduces the panic while still allowing for growth.'
      }
    ]
  },
  {
    id: 'risk-past-losses',
    category: 'risk',
    question: 'Have you ever sold an investment at a loss? If so, how did it feel?',
    explanation: 'Past behavior is the best predictor of future behavior. Your emotional response to past losses tells us a lot about your true risk tolerance.',
    impactDescription: 'Negative experiences with losses suggest a need for more conservative positioning, regardless of what the "optimal" strategy might be.',
    inputType: 'select',
    options: [
      {
        value: 'never-invested',
        label: 'I\'ve never really invested before',
        description: 'No problem - we\'ll start conservative and adjust as you gain experience.'
      },
      {
        value: 'no-losses',
        label: 'I\'ve invested but never sold at a loss',
        description: 'You may not know your true reaction yet. Consider starting moderately.'
      },
      {
        value: 'loss-devastating',
        label: 'Yes, and it was devastating - I couldn\'t stop thinking about it',
        description: 'This is valuable self-knowledge. A conservative portfolio will help you sleep at night.'
      },
      {
        value: 'loss-uncomfortable',
        label: 'Yes, it was uncomfortable but I got over it',
        description: 'Normal reaction. A balanced portfolio is probably right for you.'
      },
      {
        value: 'loss-learning',
        label: 'Yes, but I saw it as a learning experience',
        description: 'Healthy perspective. You can likely handle more volatility than average.'
      }
    ]
  },
  {
    id: 'risk-max-loss',
    category: 'risk',
    question: 'What\'s the maximum percentage loss you could tolerate in a year before it would affect your sleep or daily life?',
    explanation: 'This isn\'t about what you think is "reasonable" - it\'s about what you can actually live with. If a loss would cause you stress that affects your life, your portfolio is too risky for you.',
    technicalTerm: 'Maximum Drawdown Tolerance',
    technicalDefinition: 'The largest decline from peak to trough that you can emotionally and financially withstand without making poor decisions.',
    impactDescription: 'This directly limits how aggressive your portfolio can be. We\'ll structure it so that typical worst-case scenarios stay within your tolerance.',
    inputType: 'slider',
    options: [
      { value: '5', label: '5%', description: 'Very conservative - prioritize stability' },
      { value: '10', label: '10%', description: 'Conservative - accept some volatility' },
      { value: '15', label: '15%', description: 'Moderate-conservative' },
      { value: '20', label: '20%', description: 'Moderate - balanced approach' },
      { value: '25', label: '25%', description: 'Moderate-aggressive' },
      { value: '30', label: '30%', description: 'Aggressive - accept significant volatility' },
      { value: '40', label: '40%+', description: 'Very aggressive - long-term growth focus' }
    ]
  },
  {
    id: 'risk-gain-then-loss',
    category: 'risk',
    question: 'How would you feel if your portfolio gained 30% one year, then lost 20% the next?',
    explanation: 'This is a realistic scenario for aggressive portfolios. After a 30% gain and 20% loss, you\'d actually be up 4% total - but many people focus on the loss and feel like they\'re behind.',
    impactDescription: 'Your answer reveals whether you can handle the emotional rollercoaster of higher-risk investments, even when the math works out.',
    inputType: 'select',
    options: [
      {
        value: 'devastated',
        label: 'I\'d focus on the 20% loss and feel like I failed',
        description: 'You should probably avoid high-volatility investments, even if they offer higher long-term returns.'
      },
      {
        value: 'frustrated',
        label: 'I\'d be frustrated - why couldn\'t I lock in the gains?',
        description: 'Consider a more moderate approach. The regret of "missed" gains can lead to poor decisions.'
      },
      {
        value: 'understand',
        label: 'I\'d understand this is normal and I\'m still up 4%',
        description: 'Good mathematical thinking. You can handle a balanced-to-aggressive portfolio.'
      },
      {
        value: 'opportunity',
        label: 'I\'d see the drop as a buying opportunity',
        description: 'Excellent mindset for an aggressive portfolio. Just make sure this is how you\'d really feel.'
      }
    ]
  },
  {
    id: 'risk-knowledge-level',
    category: 'risk',
    question: 'Honestly, how would you rate your investment knowledge?',
    explanation: 'There\'s no judgment here. Knowing what you don\'t know is actually wisdom. Less experienced investors often benefit from simpler, more diversified portfolios.',
    impactDescription: 'Your experience level affects both the complexity of strategies we recommend and how much volatility you can handle without panicking.',
    inputType: 'select',
    options: [
      {
        value: 'beginner',
        label: 'Beginner - I know the basics but that\'s about it',
        description: 'We\'ll keep it simple and educational. You\'ll learn as you go.'
      },
      {
        value: 'intermediate',
        label: 'Intermediate - I understand stocks, bonds, and diversification',
        description: 'Good foundation. We can explore more sophisticated strategies together.'
      },
      {
        value: 'advanced',
        label: 'Advanced - I\'m comfortable with complex financial concepts',
        description: 'Great. We can discuss advanced strategies and optimizations.'
      },
      {
        value: 'professional',
        label: 'Professional - I work in finance or have extensive experience',
        description: 'We can have a peer-level conversation about portfolio construction.'
      }
    ]
  },
  {
    id: 'risk-emotional-vs-financial',
    category: 'risk',
    question: 'Is your concern about risk more emotional (how you\'d feel) or financial (can you actually afford to lose)?',
    explanation: 'These are different things. You might be emotionally comfortable with risk but unable to afford losses (or vice versa). We need to respect whichever limit is tighter.',
    impactDescription: 'We\'ll structure your portfolio to stay within both your emotional and financial risk limits.',
    inputType: 'select',
    options: [
      {
        value: 'mostly-emotional',
        label: 'Mostly emotional - I could afford losses but they\'d stress me out',
        description: 'We\'ll prioritize reducing volatility even if it means slightly lower expected returns.'
      },
      {
        value: 'mostly-financial',
        label: 'Mostly financial - I\'m emotionally okay with risk but can\'t afford big losses',
        description: 'We\'ll focus on capital preservation and avoiding worst-case scenarios.'
      },
      {
        value: 'both',
        label: 'Both - I\'m sensitive to losses emotionally AND financially',
        description: 'We\'ll take a very conservative approach to protect both your wealth and peace of mind.'
      },
      {
        value: 'neither',
        label: 'Neither - I have high risk capacity and tolerance',
        description: 'You\'re well-positioned for an aggressive growth strategy.'
      }
    ]
  },
  {
    id: 'risk-regret',
    category: 'risk',
    question: 'Which would you regret more?',
    explanation: 'There\'s no right answer - this reveals your true risk personality. Some people are more afraid of losing money, others more afraid of missing gains. Neither is wrong.',
    impactDescription: 'This helps us calibrate between conservative (avoid losses) and aggressive (capture gains) strategies.',
    inputType: 'select',
    options: [
      {
        value: 'missing-gains',
        label: 'Missing out on gains because I was too conservative',
        description: 'You have a growth mindset. We can lean more aggressive.'
      },
      {
        value: 'losing-money',
        label: 'Losing money because I was too aggressive',
        description: 'You prioritize preservation. We\'ll be more conservative.'
      },
      {
        value: 'equal',
        label: 'I\'d regret both equally',
        description: 'A balanced approach is probably right for you.'
      }
    ]
  }
];

// ============================================
// SECTION 3: FINANCIAL SITUATION
// ============================================
const liquidityQuestions: QuestionnaireQuestion[] = [
  {
    id: 'liquidity-income-stability',
    category: 'liquidity',
    question: 'How stable is your primary income source?',
    explanation: 'Stable income is like a safety net - it lets you take more investment risk because you can afford to wait out downturns. Uncertain income means you might need to sell at bad times.',
    impactDescription: 'Stable income allows for more aggressive investing. Variable income requires more conservative approaches and larger cash reserves.',
    inputType: 'select',
    options: [
      {
        value: 'very-stable',
        label: 'Very stable - secure job, consistent salary',
        description: 'Great foundation for investing. You can handle more market volatility.'
      },
      {
        value: 'mostly-stable',
        label: 'Mostly stable - employed but some uncertainty',
        description: 'Good position. Maintain some extra liquidity as a buffer.'
      },
      {
        value: 'variable',
        label: 'Variable - commission, freelance, or seasonal work',
        description: 'We\'ll build in more flexibility and avoid illiquid investments.'
      },
      {
        value: 'uncertain',
        label: 'Uncertain - business owner, startup, or unstable situation',
        description: 'We\'ll be more conservative and ensure you have ample emergency reserves.'
      }
    ]
  },
  {
    id: 'liquidity-emergency-fund',
    category: 'liquidity',
    question: 'How many months of expenses do you have in emergency savings (outside of this investment)?',
    explanation: 'Your emergency fund is the foundation of financial security. Without it, you might be forced to sell investments at the worst possible time. This is non-negotiable.',
    technicalTerm: 'Emergency Fund',
    technicalDefinition: 'Liquid savings (cash or cash-equivalents) that can cover 3-6 months of essential expenses, kept separate from investments.',
    impactDescription: 'If you lack emergency savings, we should prioritize building that before aggressive investing. Forced selling during emergencies is a wealth destroyer.',
    inputType: 'select',
    options: [
      {
        value: 'less-than-1',
        label: 'Less than 1 month',
        description: 'Priority #1: Build emergency fund before investing. Seriously.'
      },
      {
        value: '1-3-months',
        label: '1-3 months',
        description: 'Getting there. Consider building to 3-6 months alongside conservative investing.'
      },
      {
        value: '3-6-months',
        label: '3-6 months',
        description: 'Solid foundation. You\'re ready to invest with confidence.'
      },
      {
        value: '6-12-months',
        label: '6-12 months',
        description: 'Excellent cushion. You can afford to take more investment risk.'
      },
      {
        value: 'more-than-12',
        label: 'More than 12 months',
        description: 'Very well-prepared. Some of this could arguably be invested.'
      }
    ]
  },
  {
    id: 'liquidity-upcoming-expenses',
    category: 'liquidity',
    question: 'Do you have any major expenses coming up in the next 3 years?',
    explanation: 'Money you need soon shouldn\'t be in volatile investments. We need to know about upcoming expenses so we don\'t put that money at risk.',
    impactDescription: 'Anticipated expenses will be kept in safer, more liquid investments to ensure they\'re available when needed.',
    inputType: 'multi-select',
    options: [
      {
        value: 'none',
        label: 'No major expenses planned',
        description: 'Full flexibility for long-term investing.'
      },
      {
        value: 'home-purchase',
        label: 'Home purchase or down payment',
        description: 'We\'ll keep this portion safer and more accessible.'
      },
      {
        value: 'wedding',
        label: 'Wedding or major celebration',
        description: 'We\'ll plan for this expense to be available when needed.'
      },
      {
        value: 'education',
        label: 'Education expenses',
        description: 'Education costs require careful timing and planning.'
      },
      {
        value: 'medical',
        label: 'Medical or healthcare expenses',
        description: 'Health-related expenses often come with uncertainty - we\'ll plan conservatively.'
      },
      {
        value: 'vehicle',
        label: 'Vehicle purchase',
        description: 'We\'ll ensure funds are available when you need them.'
      },
      {
        value: 'other',
        label: 'Other significant expense',
        description: 'We\'ll factor this into your liquidity needs.'
      }
    ]
  },
  {
    id: 'liquidity-tax-bracket',
    category: 'liquidity',
    question: 'What\'s your approximate federal tax bracket?',
    explanation: 'Your tax bracket affects which investments are most efficient for you. Higher brackets benefit more from tax-advantaged strategies and municipal bonds.',
    technicalTerm: 'Tax-Efficient Investing',
    technicalDefinition: 'Strategies that minimize taxes on investment gains, such as using tax-advantaged accounts, holding investments long-term, and tax-loss harvesting.',
    impactDescription: 'Higher tax brackets make tax-advantaged investments more valuable. We\'ll optimize your after-tax returns, not just pre-tax.',
    inputType: 'select',
    options: [
      {
        value: '10-12',
        label: '10-12% bracket',
        description: 'At lower brackets, tax-efficiency is less critical. Focus on returns.'
      },
      {
        value: '22',
        label: '22% bracket',
        description: 'Middle ground. Some tax optimization is valuable.'
      },
      {
        value: '24',
        label: '24% bracket',
        description: 'Tax-efficient strategies become more important.'
      },
      {
        value: '32',
        label: '32% bracket',
        description: 'Significant tax savings possible through smart allocation.'
      },
      {
        value: '35-37',
        label: '35-37% bracket',
        description: 'Tax optimization is crucial. Every point saved is valuable.'
      },
      {
        value: 'unsure',
        label: 'I\'m not sure',
        description: 'No problem - we\'ll use general best practices.'
      }
    ]
  },
  {
    id: 'liquidity-tax-advantaged',
    category: 'liquidity',
    question: 'Are you maximizing contributions to tax-advantaged retirement accounts?',
    explanation: 'Tax-advantaged accounts (401k, IRA, HSA) are usually the best place to invest first. The tax savings are essentially free returns. Make sure you\'re using these before taxable investing.',
    impactDescription: 'If you\'re not maxing tax-advantaged accounts, that might be a better first step than taxable investing.',
    inputType: 'select',
    options: [
      {
        value: 'maxing-all',
        label: 'Yes, I max out my 401k and IRA',
        description: 'Excellent. Additional investing in taxable accounts makes sense.'
      },
      {
        value: 'partial',
        label: 'I contribute but don\'t max out',
        description: 'Consider increasing tax-advantaged contributions before taxable investing.'
      },
      {
        value: 'employer-match-only',
        label: 'Just enough to get employer match',
        description: 'Good start. There may be room to optimize further.'
      },
      {
        value: 'none',
        label: 'I\'m not contributing to any tax-advantaged accounts',
        description: 'This should probably be your first priority before taxable investing.'
      },
      {
        value: 'not-available',
        label: 'I don\'t have access to these accounts',
        description: 'IRAs are available to almost everyone - we can explore options.'
      }
    ]
  }
];

// ============================================
// SECTION 4: INVESTMENT PREFERENCES
// ============================================
const constraintsQuestions: QuestionnaireQuestion[] = [
  {
    id: 'constraints-ethical',
    category: 'constraints',
    question: 'Are there any industries you want to avoid for ethical reasons?',
    explanation: 'Your investments should align with your values. Some investors prefer to avoid certain industries even if it means slightly lower returns. There\'s no right answer here.',
    technicalTerm: 'ESG Investing',
    technicalDefinition: 'Environmental, Social, and Governance investing considers factors beyond just financial returns, like climate impact, labor practices, and corporate ethics.',
    impactDescription: 'Excluding industries reduces diversification slightly but allows your portfolio to reflect your values. We\'ll find alternatives.',
    inputType: 'multi-select',
    options: [
      {
        value: 'none',
        label: 'No restrictions - I prioritize returns',
        description: 'Maximum investment flexibility and diversification.'
      },
      {
        value: 'tobacco',
        label: 'Tobacco and nicotine',
        description: 'Excludes cigarette manufacturers and vaping companies.'
      },
      {
        value: 'weapons',
        label: 'Weapons and defense',
        description: 'Excludes defense contractors and firearm manufacturers.'
      },
      {
        value: 'fossil-fuels',
        label: 'Fossil fuels and oil',
        description: 'Excludes oil, gas, and coal companies.'
      },
      {
        value: 'gambling',
        label: 'Gambling and casinos',
        description: 'Excludes casinos, sports betting, and lottery companies.'
      },
      {
        value: 'alcohol',
        label: 'Alcohol producers',
        description: 'Excludes breweries, distilleries, and wine producers.'
      },
      {
        value: 'animal-testing',
        label: 'Companies that test on animals',
        description: 'Excludes cosmetics and pharma companies with animal testing.'
      },
      {
        value: 'private-prisons',
        label: 'Private prisons',
        description: 'Excludes for-profit prison operators.'
      }
    ]
  },
  {
    id: 'constraints-international',
    category: 'constraints',
    question: 'How do you feel about international investments?',
    explanation: 'International diversification can reduce risk because different economies don\'t always move together. However, it adds currency risk and may feel less familiar.',
    technicalTerm: 'Global Diversification',
    technicalDefinition: 'Spreading investments across multiple countries and regions to reduce the risk of any single economy underperforming.',
    impactDescription: 'International exposure can improve risk-adjusted returns but adds complexity. We\'ll balance your comfort level with optimal diversification.',
    inputType: 'select',
    options: [
      {
        value: 'us-only',
        label: 'I prefer to stick with US investments only',
        description: 'Familiar and simpler, but less diversified. US is about 60% of global market.'
      },
      {
        value: 'mostly-us',
        label: 'Mostly US with some international exposure',
        description: 'Good balance. Keeps home bias while adding diversification benefits.'
      },
      {
        value: 'balanced',
        label: 'Balanced global exposure matching market weights',
        description: 'Most diversified approach. Invests globally based on actual market sizes.'
      },
      {
        value: 'emerging',
        label: 'I\'m interested in emerging markets for growth',
        description: 'Higher risk, higher potential reward. Emerging markets can be volatile.'
      }
    ]
  },
  {
    id: 'constraints-volatility-preference',
    category: 'constraints',
    question: 'Which would you prefer: steady small gains or volatile higher potential gains?',
    explanation: 'There\'s a fundamental trade-off in investing: higher expected returns come with higher volatility. This question helps us understand which side of that trade-off you prefer.',
    impactDescription: 'Your preference shapes the core of your portfolio allocation between stable (bonds, value stocks) and growth (tech, small-cap) investments.',
    inputType: 'select',
    options: [
      {
        value: 'steady',
        label: '6% average with rarely more than 10% swings',
        description: 'Focus on stability. More bonds, value stocks, and dividend payers.'
      },
      {
        value: 'moderate',
        label: '8% average with occasional 20% swings',
        description: 'Balanced approach. Mix of stable and growth investments.'
      },
      {
        value: 'growth',
        label: '10% average but could see 30%+ swings some years',
        description: 'Growth-focused. More stocks, including aggressive growth sectors.'
      },
      {
        value: 'aggressive',
        label: 'Maximize long-term returns, I can handle any volatility',
        description: 'Maximum growth potential. Heavy equity, growth tilts, emerging markets.'
      }
    ]
  },
  {
    id: 'constraints-review-frequency',
    category: 'constraints',
    question: 'How often would you want to review and potentially adjust your portfolio?',
    explanation: 'Some people like to be hands-on, others prefer set-it-and-forget-it. There\'s research suggesting less frequent checking leads to better outcomes (less emotional trading).',
    impactDescription: 'This affects how we structure rebalancing and whether we include more complex strategies that need monitoring.',
    inputType: 'select',
    options: [
      {
        value: 'daily',
        label: 'I want to check it daily',
        description: 'Be careful - frequent checking often leads to emotional decisions. Consider why you want to check so often.'
      },
      {
        value: 'weekly',
        label: 'Weekly seems about right',
        description: 'More active than necessary, but if it helps you stay engaged, we can work with it.'
      },
      {
        value: 'monthly',
        label: 'Monthly check-ins work for me',
        description: 'Good balance of engagement without obsessing over daily moves.'
      },
      {
        value: 'quarterly',
        label: 'Quarterly is enough',
        description: 'Healthy approach. Matches most institutional rebalancing schedules.'
      },
      {
        value: 'annually',
        label: 'Once a year or less',
        description: 'Set-and-forget. We\'ll build a portfolio that doesn\'t need constant attention.'
      }
    ]
  },
  {
    id: 'constraints-income-preference',
    category: 'constraints',
    question: 'Do you want investments that pay regular dividends or income?',
    explanation: 'Dividends provide regular cash but may be less tax-efficient than growth investments. Some people love seeing dividends hit their account; others prefer pure growth.',
    technicalTerm: 'Dividend Investing',
    technicalDefinition: 'Focusing on stocks that pay regular dividends, providing income regardless of whether you sell shares.',
    impactDescription: 'Income preference shapes whether we emphasize dividend stocks and bonds versus pure growth investments.',
    inputType: 'select',
    options: [
      {
        value: 'no-income-needed',
        label: 'No - I don\'t need income, just grow my wealth',
        description: 'Maximum growth focus. Can be more tax-efficient in taxable accounts.'
      },
      {
        value: 'like-dividends',
        label: 'I like seeing dividends but don\'t need them',
        description: 'We\'ll include some dividend payers for the psychological benefit.'
      },
      {
        value: 'moderate-income',
        label: 'Some income would be nice for reinvesting',
        description: 'Balanced approach with both growth and income components.'
      },
      {
        value: 'need-income',
        label: 'I need regular income from my investments',
        description: 'Income-focused portfolio with dividends, bonds, and income ETFs.'
      }
    ]
  },
  {
    id: 'constraints-single-stock-limit',
    category: 'constraints',
    question: 'What\'s the maximum you\'d want in any single stock?',
    explanation: 'Concentration can lead to big wins or big losses. Even great companies can decline unexpectedly. Diversification protects you from the unknown.',
    technicalTerm: 'Concentration Risk',
    technicalDefinition: 'The risk of having too much of your portfolio in a single investment, making your wealth vulnerable to that one position\'s performance.',
    impactDescription: 'This sets limits on individual positions and guides how we structure your portfolio diversification.',
    inputType: 'select',
    options: [
      {
        value: 'very-diversified',
        label: '2-3% max in any single stock',
        description: 'Highly diversified. No single stock can significantly hurt your portfolio.'
      },
      {
        value: 'moderate',
        label: '5% max - some room for conviction picks',
        description: 'Balanced approach. Room for favorites while staying diversified.'
      },
      {
        value: 'concentrated',
        label: '10% max - I want meaningful positions',
        description: 'More concentrated. Individual picks will have real impact.'
      },
      {
        value: 'high-conviction',
        label: 'No strict limit - I believe in concentrated bets',
        description: 'High risk, high conviction approach. Make sure you can afford to be wrong.'
      }
    ]
  },
  {
    id: 'constraints-crypto',
    category: 'constraints',
    question: 'How do you feel about cryptocurrency as part of your portfolio?',
    explanation: 'Cryptocurrency is highly volatile but some investors view it as a hedge against traditional finance or a high-growth opportunity. It\'s not for everyone.',
    technicalTerm: 'Digital Assets',
    technicalDefinition: 'Cryptocurrencies like Bitcoin and Ethereum are decentralized digital currencies. They can gain or lose 50%+ in months.',
    impactDescription: 'Your comfort with crypto affects whether we include any digital asset exposure and at what allocation level.',
    inputType: 'select',
    options: [
      {
        value: 'no-crypto',
        label: 'No thanks - I don\'t want any cryptocurrency',
        description: 'Completely avoid crypto. Focus on traditional assets only.'
      },
      {
        value: 'small-allocation',
        label: 'A small allocation (1-3%) might be interesting',
        description: 'Dip your toes in. Small enough to not hurt if it crashes, enough to benefit if it moons.'
      },
      {
        value: 'moderate-allocation',
        label: 'I\'d consider 5-10% in established crypto',
        description: 'Meaningful exposure to Bitcoin/Ethereum. Adds volatility and potential upside.'
      },
      {
        value: 'crypto-enthusiast',
        label: 'I\'m bullish on crypto - willing to go higher',
        description: 'Aggressive crypto exposure. High risk, high potential reward.'
      },
      {
        value: 'already-have',
        label: 'I already hold crypto separately',
        description: 'No need to add more here. We\'ll focus on traditional assets to balance your overall portfolio.'
      }
    ]
  },
  {
    id: 'constraints-esg-importance',
    category: 'constraints',
    question: 'How important is it that your investments have positive environmental and social impact?',
    explanation: 'ESG (Environmental, Social, Governance) investing considers factors beyond financial returns. Some studies suggest ESG funds perform similarly to traditional funds, though results vary.',
    technicalTerm: 'Impact Investing',
    technicalDefinition: 'Investing with the intention of generating positive environmental or social impact alongside financial returns.',
    impactDescription: 'Your ESG preference determines whether we use standard index funds or ESG-screened alternatives.',
    inputType: 'select',
    options: [
      {
        value: 'not-important',
        label: 'Not important - I focus purely on returns',
        description: 'Maximum flexibility. We\'ll optimize purely for risk-adjusted returns.'
      },
      {
        value: 'nice-to-have',
        label: 'Nice to have if it doesn\'t hurt returns',
        description: 'We\'ll prefer ESG options when they\'re comparable in cost and expected return.'
      },
      {
        value: 'important',
        label: 'Important - I\'m willing to accept slightly different returns',
        description: 'We\'ll prioritize ESG funds even if fees are slightly higher.'
      },
      {
        value: 'essential',
        label: 'Essential - I only want impact-focused investments',
        description: 'Full ESG portfolio. Every holding will be screened for positive impact.'
      }
    ]
  },
  {
    id: 'constraints-sector-interests',
    category: 'constraints',
    question: 'Are there any sectors you\'re particularly interested in or want to overweight?',
    explanation: 'While diversification is generally wise, some investors have strong convictions about certain sectors. Just know that sector bets add risk.',
    impactDescription: 'Sector preferences will inform tactical tilts in your portfolio, balanced against diversification principles.',
    inputType: 'multi-select',
    options: [
      {
        value: 'no-preference',
        label: 'No preference - I trust the market weights',
        description: 'Maximum diversification. Let the market decide sector allocations.'
      },
      {
        value: 'technology',
        label: 'Technology and AI',
        description: 'Focus on tech innovation, software, semiconductors, and AI companies.'
      },
      {
        value: 'healthcare',
        label: 'Healthcare and Biotech',
        description: 'Pharmaceutical companies, biotech, medical devices, and healthcare services.'
      },
      {
        value: 'clean-energy',
        label: 'Clean Energy and Climate',
        description: 'Solar, wind, EVs, and companies addressing climate change.'
      },
      {
        value: 'financials',
        label: 'Financials and Banking',
        description: 'Banks, insurance companies, fintech, and financial services.'
      },
      {
        value: 'real-estate',
        label: 'Real Estate (REITs)',
        description: 'Real estate investment trusts providing exposure to property.'
      },
      {
        value: 'consumer',
        label: 'Consumer goods and brands',
        description: 'Companies selling products and services to consumers.'
      },
      {
        value: 'industrials',
        label: 'Industrials and Infrastructure',
        description: 'Manufacturing, construction, transportation, and infrastructure.'
      }
    ]
  },
  {
    id: 'constraints-alternatives',
    category: 'constraints',
    question: 'How interested are you in alternative investments beyond stocks and bonds?',
    explanation: 'Alternatives like commodities, gold, and REITs can provide diversification benefits but add complexity. They often behave differently from traditional assets.',
    technicalTerm: 'Alternative Investments',
    technicalDefinition: 'Assets outside traditional stocks and bonds, including commodities, real estate, gold, and more exotic instruments.',
    impactDescription: 'Your interest in alternatives determines portfolio complexity and diversification approach.',
    inputType: 'select',
    options: [
      {
        value: 'stocks-bonds-only',
        label: 'Keep it simple - stocks and bonds only',
        description: 'Traditional portfolio. Easier to understand and manage.'
      },
      {
        value: 'some-alternatives',
        label: 'Open to some alternatives for diversification',
        description: 'May include REITs, commodities, or gold for added diversification.'
      },
      {
        value: 'interested',
        label: 'I\'m interested in a diversified multi-asset approach',
        description: 'Broader asset allocation including alternatives for portfolio resilience.'
      },
      {
        value: 'sophisticated',
        label: 'I want exposure to various alternative strategies',
        description: 'More sophisticated portfolio with meaningful alternative allocations.'
      }
    ]
  },
  {
    id: 'constraints-factor-investing',
    category: 'constraints',
    question: 'Would you like to tilt your portfolio toward specific investment styles?',
    explanation: 'Factor investing means tilting toward characteristics that have historically provided higher returns (with higher risk). This is more sophisticated than basic indexing.',
    technicalTerm: 'Smart Beta / Factor Investing',
    technicalDefinition: 'Strategies that target specific factors like value, momentum, quality, or small-cap that have historically outperformed.',
    impactDescription: 'Factor preferences guide whether we use plain index funds or factor-tilted alternatives.',
    inputType: 'multi-select',
    options: [
      {
        value: 'no-preference',
        label: 'No preference - just track the market',
        description: 'Standard market-cap weighted index funds. Simple and effective.'
      },
      {
        value: 'value',
        label: 'Value - buy underpriced companies',
        description: 'Tilt toward stocks trading below their intrinsic value.'
      },
      {
        value: 'growth',
        label: 'Growth - focus on fast-growing companies',
        description: 'Emphasize companies with high revenue and earnings growth.'
      },
      {
        value: 'quality',
        label: 'Quality - stable, profitable companies',
        description: 'Focus on companies with strong balance sheets and consistent profitability.'
      },
      {
        value: 'dividend',
        label: 'Dividend - income-generating stocks',
        description: 'Tilt toward high-dividend-yield companies.'
      },
      {
        value: 'small-cap',
        label: 'Small-cap - smaller companies with growth potential',
        description: 'Overweight smaller companies that may offer higher long-term returns.'
      },
      {
        value: 'momentum',
        label: 'Momentum - ride winning trends',
        description: 'Follow price momentum, buying recent winners.'
      }
    ]
  }
];

// ============================================
// SECTION 5: KNOWLEDGE CHECK
// ============================================
const knowledgeQuestions: QuestionnaireQuestion[] = [
  {
    id: 'knowledge-bonds-rates',
    category: 'knowledge',
    question: 'What do you think happens to bond prices when interest rates rise?',
    explanation: 'This tests understanding of a key concept. Don\'t worry if you get it wrong - the goal is to identify what to teach you, not to judge you.',
    technicalTerm: 'Interest Rate Risk',
    technicalDefinition: 'When interest rates rise, existing bonds become less attractive (they pay lower rates than new bonds), so their prices fall. The reverse is also true.',
    impactDescription: 'Understanding this helps you make better decisions about when and how much to hold in bonds.',
    inputType: 'select',
    options: [
      {
        value: 'correct-fall',
        label: 'Bond prices fall when rates rise',
        description: '✓ Correct! Existing bonds become less attractive when new bonds offer higher rates.'
      },
      {
        value: 'incorrect-rise',
        label: 'Bond prices rise when rates rise',
        description: 'Actually, it\'s the opposite. When rates rise, existing bonds (with lower rates) become less valuable.'
      },
      {
        value: 'incorrect-no-change',
        label: 'Bond prices aren\'t affected by interest rates',
        description: 'Actually, bonds are very sensitive to rates. It\'s one of the key factors affecting bond prices.'
      },
      {
        value: 'unsure',
        label: 'I\'m not sure',
        description: 'No problem! The answer is: bond prices fall when rates rise. We\'ll explain more as we build your portfolio.'
      }
    ]
  },
  {
    id: 'knowledge-diversification-underperform',
    category: 'knowledge',
    question: 'Why might a diversified portfolio underperform a single hot stock in a bull market?',
    explanation: 'This explores understanding of diversification\'s purpose and tradeoffs. Diversification protects you in bad times but means you won\'t capture 100% of any single winner.',
    impactDescription: 'Understanding this prevents frustration when your diversified portfolio trails a hot stock in the news.',
    inputType: 'select',
    options: [
      {
        value: 'correct',
        label: 'Diversification means owning average performers too, diluting the winners',
        description: '✓ Exactly right! Diversification is about avoiding disasters, not catching every rocket ship.'
      },
      {
        value: 'incorrect-worse',
        label: 'Diversification actually makes returns worse overall',
        description: 'Not quite. Diversification typically improves risk-adjusted returns - you give up some upside to avoid catastrophic downside.'
      },
      {
        value: 'incorrect-fees',
        label: 'The fees of diversified funds are too high',
        description: 'While fees matter, index funds are very cheap. The real reason is that you can\'t own just the winners in advance.'
      },
      {
        value: 'unsure',
        label: 'I\'m not sure',
        description: 'The answer: A diversified portfolio includes average and poor performers along with winners. That\'s the cost of protection against picking the wrong single stock.'
      }
    ]
  },
  {
    id: 'knowledge-compound-growth',
    category: 'knowledge',
    question: 'If you invest $10,000 at 7% annual return, approximately how much will you have after 10 years?',
    explanation: 'This tests understanding of compound growth - the most powerful force in wealth building. Many people underestimate how much compounding adds up.',
    technicalTerm: 'Compound Interest',
    technicalDefinition: 'Earning returns on your returns. Your money grows exponentially because gains in year 2 are on year 1\'s larger balance, and so on.',
    impactDescription: 'Understanding compounding motivates long-term investing and helps set realistic expectations.',
    inputType: 'select',
    options: [
      {
        value: 'correct',
        label: 'About $19,700 (nearly doubled)',
        description: '✓ Correct! At 7%, money roughly doubles every 10 years thanks to compounding.'
      },
      {
        value: 'underestimate',
        label: 'About $17,000 (10 x 7% = 70% gain)',
        description: 'That\'s simple interest, not compound. With compounding, you earn returns on your returns, getting to ~$19,700.'
      },
      {
        value: 'overestimate',
        label: 'About $25,000 or more',
        description: 'A bit optimistic. 7% compounded over 10 years gives about $19,700. You might be thinking of higher returns or longer timeframes.'
      },
      {
        value: 'unsure',
        label: 'I\'m not sure how to calculate this',
        description: 'The answer is about $19,700. At 7%, your money roughly doubles every 10 years. The "Rule of 72" says divide 72 by your return rate to get the doubling time.'
      }
    ]
  },
  {
    id: 'knowledge-beating-market',
    category: 'knowledge',
    question: 'What percentage of professional fund managers beat the market index over 15 years?',
    explanation: 'This tests understanding of active vs passive investing. Most professionals can\'t consistently beat simple index funds, which is why low-cost indexing is often recommended.',
    impactDescription: 'This affects whether we recommend active funds (higher fees, uncertain results) or passive index funds (lower fees, market returns).',
    inputType: 'select',
    options: [
      {
        value: 'most-beat',
        label: 'Most of them (60%+)',
        description: 'Actually, only about 10-15% beat the market over 15 years. Fees and the difficulty of consistent outperformance work against active managers.'
      },
      {
        value: 'half',
        label: 'About half (40-60%)',
        description: 'It\'s actually much lower - only about 10-15%. The market is very efficient, making it hard to beat consistently.'
      },
      {
        value: 'correct-few',
        label: 'Very few (10-20%)',
        description: '✓ Correct! Only about 10-15% of active managers beat their benchmark over 15 years. This is why index funds are so popular.'
      },
      {
        value: 'unsure',
        label: 'I have no idea',
        description: 'The answer is about 10-15%. This is why many experts recommend low-cost index funds - you get market returns without paying for underperformance.'
      }
    ]
  },
  {
    id: 'knowledge-rebalancing',
    category: 'knowledge',
    question: 'What is the purpose of portfolio rebalancing?',
    explanation: 'Rebalancing is a key portfolio management concept that many investors don\'t fully understand. It\'s about maintaining your intended risk level.',
    impactDescription: 'Understanding rebalancing helps you follow through on the strategy rather than abandoning it.',
    inputType: 'select',
    options: [
      {
        value: 'correct',
        label: 'To maintain your target allocation and risk level as markets move',
        description: '✓ Correct! Rebalancing keeps your portfolio aligned with your goals and risk tolerance as some investments outgrow others.'
      },
      {
        value: 'timing',
        label: 'To time the market and buy low, sell high',
        description: 'Partially true as a side effect, but the main purpose is risk management. You\'re selling what\'s grown (potentially more risky) and buying what\'s lagged.'
      },
      {
        value: 'maximize',
        label: 'To maximize returns by shifting to winning investments',
        description: 'Actually, rebalancing often means selling winners and buying laggards - the opposite. It\'s about maintaining your intended risk level.'
      },
      {
        value: 'unsure',
        label: 'I\'m not sure',
        description: 'Rebalancing means returning to your target allocation (like 60% stocks, 40% bonds) when market movements cause drift. It maintains your intended risk level.'
      }
    ]
  }
];

// ============================================
// EXPORT ALL SECTIONS
// ============================================
export const QUESTIONNAIRE_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'goals',
    title: 'Goals & Purpose',
    description: 'Understanding what you\'re investing for is the foundation of any good investment plan. Let\'s explore your objectives.',
    icon: 'Target',
    questions: goalsQuestions
  },
  {
    id: 'risk',
    title: 'Risk Understanding',
    description: 'Risk tolerance isn\'t just about what you say - it\'s about how you\'d actually behave. Let\'s explore your true relationship with risk.',
    icon: 'Shield',
    questions: riskQuestions
  },
  {
    id: 'liquidity',
    title: 'Financial Situation',
    description: 'Your current financial situation affects how much risk you can take. This isn\'t about judgment - it\'s about building the right plan for you.',
    icon: 'Wallet',
    questions: liquidityQuestions
  },
  {
    id: 'constraints',
    title: 'Investment Preferences',
    description: 'Beyond risk and goals, everyone has preferences about how their money is invested. Let\'s understand yours.',
    icon: 'Settings',
    questions: constraintsQuestions
  },
  {
    id: 'knowledge',
    title: 'Knowledge Check',
    description: 'These questions help us understand your familiarity with investing concepts. There\'s no judgment - getting things "wrong" just means we\'ll explain more.',
    icon: 'GraduationCap',
    questions: knowledgeQuestions
  }
];

// Helper function to get all questions
export const getAllQuestions = (): QuestionnaireQuestion[] => {
  return QUESTIONNAIRE_SECTIONS.flatMap(section => section.questions);
};

// Helper function to get question by ID
export const getQuestionById = (id: string): QuestionnaireQuestion | undefined => {
  return getAllQuestions().find(q => q.id === id);
};

// Helper function to get section by ID
export const getSectionById = (id: string): QuestionnaireSection | undefined => {
  return QUESTIONNAIRE_SECTIONS.find(s => s.id === id);
};

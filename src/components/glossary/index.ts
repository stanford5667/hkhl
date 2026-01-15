/**
 * Financial Glossary Components
 * 
 * A comprehensive, site-wide educational glossary system.
 * 
 * SETUP:
 * 1. Wrap your app with <FinancialGlossaryProvider> in App.tsx
 * 2. Use <Term> anywhere to make text clickable
 * 3. Use useGlossary() hook for programmatic access
 * 
 * EXAMPLE:
 * ```tsx
 * // In App.tsx
 * import { FinancialGlossaryProvider } from '@/components/glossary';
 * 
 * function App() {
 *   return (
 *     <FinancialGlossaryProvider>
 *       <YourApp />
 *     </FinancialGlossaryProvider>
 *   );
 * }
 * 
 * // Anywhere in your app
 * import { Term, useGlossary } from '@/components/glossary';
 * 
 * function MyComponent() {
 *   const { openTerm } = useGlossary();
 *   
 *   return (
 *     <p>
 *       Your <Term>expected return</Term> depends on <Term>volatility</Term>.
 *     </p>
 *   );
 * }
 * ```
 */

// Provider and context
export { 
  FinancialGlossaryProvider, 
  useGlossary,
  findTerm,
  searchTerms,
  FINANCIAL_TERMS,
  type TermItem,
  type TermCategory,
  type TermDefinition,
} from './FinancialGlossaryProvider';

// Components
export { 
  Term, 
  AutoLinkTerms, 
  parseTerms,
  GlossarySearchTrigger,
  QuickGlossary,
} from './Term';

// Detail sheet (usually not needed directly - provider handles it)
export { FinancialTermDetail } from './FinancialTermDetail';

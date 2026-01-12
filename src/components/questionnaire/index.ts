/**
 * UNIFIED QUESTIONNAIRE COMPONENTS
 * 
 * Export all questionnaire UI primitives for consistent usage across:
 * - Investment Plan questionnaire
 * - Portfolio Builder AI Co-Pilot
 * - Portfolio Builder IPS Questionnaire
 */

// Shell & Layout
export { QuestionnaireShell } from './QuestionnaireShell';
export type { QuestionnaireStep } from './QuestionnaireShell';

// Question Card
export { QuestionCard } from './QuestionCard';

// Question Options
export { 
  OptionCard,
  MultiSelectGrid,
  LabeledSlider,
  ScenarioPicker,
  AmountInput,
} from './QuestionOptions';

// Results Components
export {
  ResultsHeader,
  ArchetypeHero,
  RiskGauge,
  StatsGrid,
  getArchetype,
  INVESTOR_ARCHETYPES,
} from './QuestionnaireResults';

/**
 * Utilities for cognitive module interface declarations.
 * Provides DI injection tokens and base cognitive module interface.
 */

/**
 * ICognitiveModule
 *
 * Base interface that all Brain V2 cognitive services implement.
 * Provides a uniform contract for lifecycle management and
 * health checks used by the Consciousness module.
 */
export interface ICognitiveModule {
  /**
   * Human-readable name of this cognitive module.
   * Used in CognitiveTrace logging.
   */
  readonly moduleName: string;

  /**
   * Returns true if this module is ready to process requests.
   * Used by the Executive to skip unavailable modules gracefully.
   */
  isReady(): boolean;
}

/**
 * IPerceptionService
 *
 * Interface for the Perception Layer.
 * Perception normalizes raw input into a PerceptionResult.
 */
export const PERCEPTION_SERVICE = Symbol('IPerceptionService');

/**
 * IAttentionService
 *
 * Interface for the Attention System.
 * Computes cognitive signals from PerceptionResult.
 */
export const ATTENTION_SERVICE = Symbol('IAttentionService');

/**
 * IWorkingMemoryService
 *
 * Interface for the Working Memory service.
 * Manages volatile per-session cognitive state.
 */
export const WORKING_MEMORY_SERVICE = Symbol('IWorkingMemoryService');

/**
 * IExecutiveService
 *
 * Interface for the Executive Controller.
 * Produces ExecutiveDecision from AttentionResult.
 */
export const EXECUTIVE_SERVICE = Symbol('IExecutiveService');

/**
 * ILanguageService
 *
 * Interface for the Language Generator.
 * Converts CognitiveContext into natural language.
 */
export const LANGUAGE_SERVICE = Symbol('ILanguageService');

/**
 * IMemoryGateway
 *
 * Interface for the Memory Gateway.
 * Single access point to the existing long-term memory system.
 */
export const MEMORY_GATEWAY = Symbol('IMemoryGateway');

/**
 * IReasoningService
 *
 * Interface for the Reasoning Gateway.
 * Wraps V1 ReasonerService behind a clean V2 interface.
 */
export const REASONING_SERVICE = Symbol('IReasoningService');

/**
 * IPlanningService
 *
 * Interface for the Planning Gateway.
 * Wraps V1 PlannerService behind a clean V2 interface.
 */
export const PLANNING_SERVICE = Symbol('IPlanningService');

/**
 * ISkillRouter
 *
 * Interface for the Skills Router.
 * Routes tool/skill invocations based on ExecutiveDecision.
 */
export const SKILL_ROUTER = Symbol('ISkillRouter');

/**
 * IReflectionService (V2)
 *
 * Interface for the async Reflection module.
 */
export const REFLECTION_SERVICE_V2 = Symbol('IReflectionServiceV2');

/**
 * ILearningService (V2)
 *
 * Interface for the async Learning module.
 */
export const LEARNING_SERVICE_V2 = Symbol('ILearningServiceV2');

/**
 * IPersonalityService
 *
 * Interface for the Personality module.
 * Injects character traits into Language Generator prompts.
 */
export const PERSONALITY_SERVICE = Symbol('IPersonalityService');

/**
 * IEmotionService
 *
 * Interface for the Emotion module.
 * Tracks and modulates emotional state.
 */
export const EMOTION_SERVICE = Symbol('IEmotionService');

/**
 * BRAIN_V2_CONFIG
 *
 * DI injection token for BrainV2Config.
 */
export const BRAIN_V2_CONFIG = Symbol('BRAIN_V2_CONFIG');

/**
 * BRAIN_V2_FEATURE_FLAGS
 *
 * DI injection token for BrainV2FeatureFlags.
 */
export const BRAIN_V2_FEATURE_FLAGS = Symbol('BRAIN_V2_FEATURE_FLAGS');

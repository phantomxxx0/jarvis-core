/**
 * Enumerates the categories of capability a Brain module may declare.
 *
 * This list is intentionally broad and forward-looking: not every
 * capability listed here has a corresponding module implementation yet.
 * New capabilities should be appended, never renumbered or removed,
 * since capability values may be persisted (e.g. in logs, routing
 * tables, or configuration) and must remain stable over time.
 */
export enum BrainCapability {
  // Cognition
  PLANNING = 'PLANNING',
  REASONING = 'REASONING',
  CONTEXT = 'CONTEXT',

  // Perception — vision
  VISION = 'VISION',
  FACE_RECOGNITION = 'FACE_RECOGNITION',
  PERSON_DETECTION = 'PERSON_DETECTION',
  OBJECT_DETECTION = 'OBJECT_DETECTION',
  SCENE_UNDERSTANDING = 'SCENE_UNDERSTANDING',

  // Perception — audio
  VOICE = 'VOICE',
  SPEECH_TO_TEXT = 'SPEECH_TO_TEXT',
  TEXT_TO_SPEECH = 'TEXT_TO_SPEECH',
  SPEAKER_IDENTIFICATION = 'SPEAKER_IDENTIFICATION',
  WAKE_WORD_DETECTION = 'WAKE_WORD_DETECTION',

  // Action
  AUTOMATION = 'AUTOMATION',
  ROBOTICS = 'ROBOTICS',
  DEVICE_CONTROL = 'DEVICE_CONTROL',

  // Safety / governance
  SECURITY = 'SECURITY',
  POLICY_ENFORCEMENT = 'POLICY_ENFORCEMENT',

  // Inference backends
  LOCAL_LLM = 'LOCAL_LLM',
  CLOUD_LLM = 'CLOUD_LLM',
  EMBEDDING = 'EMBEDDING',

  // Tooling / integration
  MCP_TOOLS = 'MCP_TOOLS',
  KNOWLEDGE_RETRIEVAL = 'KNOWLEDGE_RETRIEVAL',
  MEMORY_ACCESS = 'MEMORY_ACCESS',
}

import { BrainCapability } from '../enums/brain-capability.enum';
import { BrainRequest } from '../contracts/brain-request';
import { BrainResponse } from '../contracts/brain-response';

/**
 * The contract every Brain module (Planner, Reasoner, Vision, Voice,
 * Automation, Security, Local/Cloud LLM, MCP Tools, etc.) must satisfy
 * to participate in the Brain.
 *
 * This interface is intentionally free of NestJS decorators, DI, and
 * business logic — it exists purely to define the shape a module must
 * expose. Concrete implementations (in their own modules) are
 * responsible for the actual NestJS wiring, service classes, and any
 * imports from AI, Knowledge, Memories, Vision, Voice, or Automation.
 */
export interface BrainModule {
  /**
   * A stable, unique identifier for this module (e.g. 'vision.face-recognition',
   * 'inference.local-llm'). Used for logging, routing diagnostics, and
   * disambiguating between multiple modules that declare the same
   * capability.
   */
  readonly id: string;

  /**
   * The set of capabilities this module declares support for. An
   * orchestrator uses this to route a BrainTask (via its `capability`
   * field) to the module(s) able to handle it. A module may support
   * more than one capability (e.g. a combined LOCAL_LLM + REASONING
   * module).
   */
  readonly capabilities: readonly BrainCapability[];

  /**
   * Returns true if this module can currently handle the given
   * request — not just whether it declares the capability, but
   * whether it's presently able to (e.g. a Vision module might
   * declare FACE_RECOGNITION but return false if no camera is
   * connected). Orchestration code should check this before
   * dispatching, but is not required to.
   */
  canHandle(request: BrainRequest): boolean;

  /**
   * Handles a single BrainRequest and returns a BrainResponse.
   * Implementations own all business logic, error handling, and any
   * cross-module orchestration they require — this interface only
   * defines the boundary.
   */
  handle<TPayload = unknown, TData = unknown>(
    request: BrainRequest<TPayload>,
  ): Promise<BrainResponse<TData>>;
}

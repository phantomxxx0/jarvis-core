import { Injectable, Logger } from '@nestjs/common';
import type { AttentionResult } from '../contracts/attention-result';
import type { ExecutiveDecision } from '../contracts/executive-decision';
import type { CognitiveContext } from '../contracts/cognitive-context';
import type { WorkingMemoryState } from '../contracts/working-memory';
import { ExecutionRouter } from './execution-router';
import { ExecutionEngine } from './execution-engine';
import { LatencyTracker } from '../metrics/latency';
import { CognitionTracker } from '../metrics/cognition';
import { AuthorizationService } from '../../governance/authorization/authorization.service';

/**
 * ExecutiveService
 *
 * The "Prefrontal Cortex" of Brain V2.
 * Receives the AttentionResult, makes a routing decision (ExecutionDecision),
 * and drives the execution of the selected cognitive path via the ExecutionEngine.
 *
 * Ensures that the system does the minimum necessary cognitive work
 * to satisfy the request, respecting latency targets.
 *
 * Governance: before handing the decision to ExecutionEngine, Executive
 * asks AuthorizationService to evaluate the decision's capability flags
 * (e.g. useTool) against the turn's ExecutionContext. Executive deals only
 * in capability flags — it never imports or references Permission; the
 * mapping from capability to Permission is internal to the governance
 * module (PermissionMapper). ExecutiveDecision itself is never mutated —
 * a new decision object is built from the governance result, keeping
 * ExecutiveDecision immutable end to end.
 */
@Injectable()
export class ExecutiveService {
  readonly moduleName = 'Executive';
  private readonly logger = new Logger(ExecutiveService.name);

  constructor(
    private readonly router: ExecutionRouter,
    private readonly engine: ExecutionEngine,
    private readonly cognitionTracker: CognitionTracker,
    private readonly authorizationService: AuthorizationService,
  ) {}

  /** @implements ICognitiveModule */
  isReady(): boolean {
    return true;
  }

  /**
   * Decides on an execution path and executes it.
   * Modifies the CognitiveContext in-place as downstream modules complete.
   *
   * @param context - The active CognitiveContext.
   * @param state   - The active WorkingMemoryState.
   * @param latency - The per-request latency tracker.
   * @returns The ExecutiveDecision that was made (governance-narrowed).
   */
  async process(
    context: CognitiveContext,
    state: WorkingMemoryState,
    latency: LatencyTracker,
  ): Promise<ExecutiveDecision> {
    const start = Date.now();
    this.logger.debug(
      `[Executive] Processing AttentionResult for user=${state.userId}`,
    );

    // 1. Make routing decision
    const routedDecision = this.router.route(
      context.attentionResult,
      context.perceptionResult?.normalizedInput ?? '',
    );

    // 2. Governance: narrow the decision's capability flags against the
    // turn's ExecutionContext. A denial degrades the turn (e.g. no tool
    // use) rather than aborting it. ExecutiveDecision is rebuilt as a new
    // object — never mutated in place.
    const governanceResult = this.authorizationService.evaluateDecision(
      context.executionContext,
      { useTool: routedDecision.useTool },
    );

    if (governanceResult.denials.length > 0) {
      this.logger.warn(
        `[Executive] Governance denied capabilities for principal=${context.executionContext?.principal?.id}: ${governanceResult.denials.map((d) => d.capability).join(', ')}`,
      );
    }

    const decision: ExecutiveDecision = {
      ...routedDecision,
      useTool: governanceResult.capabilities.useTool ?? false,
    };

    context.executiveDecision = decision;
    context.governanceDenials = governanceResult.denials;

    // 3. Track decision for observability
    this.cognitionTracker.record(context.attentionResult, decision);

    this.logger.debug(
      `[Executive] Decision: ${decision.executionPath}. Rationale: ${decision.rationale}`,
    );

    // 4. Execute the decided (governance-narrowed) path
    await this.engine.execute(decision, context, state, latency);

    latency.record('Executive', true, start, Date.now() - start);

    return decision;
  }
}

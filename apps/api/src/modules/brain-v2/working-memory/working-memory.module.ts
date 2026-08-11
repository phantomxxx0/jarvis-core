import { Module } from '@nestjs/common';
import { WorkingMemoryService } from './working-memory.service';
import { ConversationStateManager } from './conversation-state';
import { ContextWindowManager } from './context-window';
import { ActiveGoalTracker } from './active-goal';
import { FocusStackManager } from './focus-stack';
import { ToolResultsStore } from './tool-results';
import { TransientMemory } from './transient-memory';

/**
 * WorkingMemoryModule (Brain V2)
 *
 * The Working Memory module. Provides volatile per-session cognitive state
 * management for Brain V2.
 *
 * Zero external dependencies. All state is in-process.
 * Working Memory is purposely ephemeral — it mirrors the volatile nature
 * of biological working memory (RAM, not disk).
 *
 * Exported:
 *   - WorkingMemoryService: create, seed, update, and snapshot state.
 *   - ContextWindowManager: token budget management for Language Generator.
 *   - ToolResultsStore: skill output management.
 *   - TransientMemory: arbitrary scratch pad access.
 */
@Module({
  providers: [
    WorkingMemoryService,
    ConversationStateManager,
    ContextWindowManager,
    ActiveGoalTracker,
    FocusStackManager,
    ToolResultsStore,
    TransientMemory,
  ],
  exports: [
    WorkingMemoryService,
    ContextWindowManager,
    ToolResultsStore,
    TransientMemory,
  ],
})
export class WorkingMemoryModule {}

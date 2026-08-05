import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinition, WorkflowStep } from '../contracts/workflow.dto';
import { CapabilityRegistryService } from './capability-registry.service';

export class WorkflowValidationError extends Error {
  constructor(message: string, public readonly stepId?: string) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

@Injectable()
export class WorkflowValidatorService {
  private readonly logger = new Logger(WorkflowValidatorService.name);

  constructor(private readonly capabilityRegistry: CapabilityRegistryService) {}

  public validate(definition: WorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      this.validateStructure(definition);
      this.validateCapabilities(definition);
      this.validateDependencies(definition);
      this.validateCycles(definition);
      this.validateVariables(definition);
    } catch (e: any) {
      if (e instanceof WorkflowValidationError) {
        errors.push(e.message);
      } else {
        errors.push(e.message || 'Unknown validation error');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateStructure(definition: WorkflowDefinition) {
    if (!definition || !definition.steps || !Array.isArray(definition.steps)) {
      throw new WorkflowValidationError('Workflow definition must contain a steps array');
    }

    const stepIds = new Set<string>();
    for (const step of definition.steps) {
      if (!step.id) throw new WorkflowValidationError('Every step must have an id');
      if (!step.capabilityId) throw new WorkflowValidationError(`Step ${step.id} must have a capabilityId`, step.id);
      
      if (stepIds.has(step.id)) {
        throw new WorkflowValidationError(`Duplicate step id found: ${step.id}`, step.id);
      }
      stepIds.add(step.id);
    }
  }

  private validateCapabilities(definition: WorkflowDefinition) {
    for (const step of definition.steps) {
      const capability = this.capabilityRegistry.getCapability(step.capabilityId);
      if (!capability) {
        throw new WorkflowValidationError(`Unknown capability required: ${step.capabilityId}`, step.id);
      }
    }
  }

  private validateDependencies(definition: WorkflowDefinition) {
    const stepIds = new Set(definition.steps.map(s => s.id));
    for (const step of definition.steps) {
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            throw new WorkflowValidationError(`Step ${step.id} declares an unknown dependency: ${dep}`, step.id);
          }
        }
      }
    }
  }

  private validateCycles(definition: WorkflowDefinition) {
    // Basic DFS cycle detection
    const adj = new Map<string, string[]>();
    for (const step of definition.steps) {
      adj.set(step.id, step.dependencies || []);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (node: string) => {
      if (visiting.has(node)) {
        throw new WorkflowValidationError(`Cycle detected involving step ${node}`, node);
      }
      if (visited.has(node)) return;

      visiting.add(node);
      const deps = adj.get(node) || [];
      for (const dep of deps) {
        visit(dep);
      }
      visiting.delete(node);
      visited.add(node);
    };

    for (const step of definition.steps) {
      if (!visited.has(step.id)) {
        visit(step.id);
      }
    }
  }

  private validateVariables(definition: WorkflowDefinition) {
    // Ensure interpolated variables like ${step1.output.foo} reference a valid upstream dependency
    // NOTE: For strict validation, the referenced step MUST be in the dependency chain (either direct or indirect)
    
    // First, build indirect dependency map
    const adj = new Map<string, string[]>();
    for (const step of definition.steps) {
      adj.set(step.id, step.dependencies || []);
    }

    const getAllAncestors = (node: string, memo: Map<string, Set<string>> = new Map()): Set<string> => {
      if (memo.has(node)) return memo.get(node)!;
      const ancestors = new Set<string>();
      const deps = adj.get(node) || [];
      for (const dep of deps) {
        ancestors.add(dep);
        for (const ind of getAllAncestors(dep, memo)) {
          ancestors.add(ind);
        }
      }
      memo.set(node, ancestors);
      return ancestors;
    };

    const memo = new Map<string, Set<string>>();
    for (const step of definition.steps) {
      const ancestors = getAllAncestors(step.id, memo);
      
      const checkNode = (obj: any) => {
        if (typeof obj === 'string') {
          const matches = obj.matchAll(/\$\{([^}]+)\}/g);
          for (const match of matches) {
            const path = match[1];
            const targetStepId = path.split('.')[0];
            if (!ancestors.has(targetStepId)) {
              throw new WorkflowValidationError(`Variable interpolation "${match[0]}" in step ${step.id} references ${targetStepId} which is not an upstream dependency.`, step.id);
            }
          }
        } else if (Array.isArray(obj)) {
          obj.forEach(checkNode);
        } else if (obj !== null && typeof obj === 'object') {
          for (const val of Object.values(obj)) {
            checkNode(val);
          }
        }
      };

      checkNode(step.input);
    }
  }
}

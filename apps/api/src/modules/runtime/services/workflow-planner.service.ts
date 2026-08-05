import { Injectable, Logger } from '@nestjs/common';
import { WorkflowDefinition, WorkflowPlanningMetadata } from '../contracts/workflow.dto';
import { InferenceService } from '../../workers/inference/services/inference.service';
import { InferenceProviderType } from '../../workers/inference/enums/provider.enum';
import { WorkflowValidatorService } from './workflow-validator.service';
import { CapabilityRegistryService } from './capability-registry.service';

export class WorkflowPlanningError extends Error {
  constructor(message: string, public readonly metadata: WorkflowPlanningMetadata) {
    super(message);
    this.name = 'WorkflowPlanningError';
  }
}

@Injectable()
export class WorkflowPlannerService {
  private readonly logger = new Logger(WorkflowPlannerService.name);
  private readonly promptVersion = '1.0.0';

  constructor(
    private readonly inferenceService: InferenceService,
    private readonly validatorService: WorkflowValidatorService,
    private readonly capabilityRegistry: CapabilityRegistryService
  ) {}

  public async plan(goal: string, provider: InferenceProviderType = InferenceProviderType.OLLAMA, model: string = 'llama3'): Promise<WorkflowDefinition> {
    const startTime = Date.now();
    let repairAttempts = 0;
    
    let metadata: WorkflowPlanningMetadata = {
      provider,
      model,
      promptVersion: this.promptVersion,
      repairAttempts,
      validationResult: 'SUCCESS',
      planningTimeMs: 0
    };

    try {
      const prompt = this.buildPrompt(goal);
      const response = await this.invokeLLM(provider, prompt, model);
      const parsedDefinition = this.parseResponse(response);
      
      const validation = this.validatorService.validate(parsedDefinition);
      
      if (!validation.valid) {
        this.logger.warn(`Initial workflow validation failed: ${validation.errors.join(', ')}. Attempting repair...`);
        repairAttempts++;
        metadata.repairAttempts = repairAttempts;
        
        const repairPrompt = this.buildRepairPrompt(goal, response, validation.errors);
        const repairResponse = await this.invokeLLM(provider, repairPrompt, model);
        const repairedDefinition = this.parseResponse(repairResponse);
        
        const repairValidation = this.validatorService.validate(repairedDefinition);
        if (!repairValidation.valid) {
          metadata.validationResult = 'FAILED';
          metadata.planningTimeMs = Date.now() - startTime;
          throw new WorkflowPlanningError(`Workflow repair failed: ${repairValidation.errors.join(', ')}`, metadata);
        }
        
        metadata.validationResult = 'REPAIRED';
        repairedDefinition.planningMetadata = metadata;
        repairedDefinition.planningMetadata.planningTimeMs = Date.now() - startTime;
        return repairedDefinition;
      }
      
      metadata.planningTimeMs = Date.now() - startTime;
      parsedDefinition.planningMetadata = metadata;
      return parsedDefinition;

    } catch (e: any) {
      if (e instanceof WorkflowPlanningError) {
        throw e;
      }
      
      metadata.validationResult = 'FAILED';
      metadata.planningTimeMs = Date.now() - startTime;
      throw new WorkflowPlanningError(e.message || 'Unknown planning error', metadata);
    }
  }

  private buildPrompt(goal: string): string {
    const capabilities = this.capabilityRegistry.listCapabilities();
    const capabilitiesJson = JSON.stringify(capabilities.map(c => ({
      id: c.id,
      description: c.description
    })), null, 2);

    return `You are a Workflow Planner for Jarvis.
Your task is to convert a natural language goal into a Directed Acyclic Graph (DAG) workflow definition.

Goal: "${goal}"

Available Capabilities:
${capabilitiesJson}

Requirements:
1. Return ONLY valid JSON containing a "steps" array. Do not include markdown blocks like \`\`\`json.
2. Each step must have: "id" (string), "capabilityId" (string), "input" (object), "dependencies" (string array).
3. "dependencies" must contain IDs of steps that must complete before this step.
4. You can pass variables from upstream steps to downstream steps using the exact string syntax: "\${step_id.output.property}".
5. Any step referenced in a variable interpolation MUST be in the "dependencies" array of the step using it.

Example JSON:
{
  "steps": [
    {
      "id": "fetch_data",
      "capabilityId": "filesystem.read",
      "input": { "path": "/tmp/data.txt" },
      "dependencies": []
    },
    {
      "id": "process_data",
      "capabilityId": "shell.exec",
      "input": { "command": "echo \\"\${fetch_data.output.content}\\" | grep ERROR" },
      "dependencies": ["fetch_data"]
    }
  ]
}`;
  }

  private buildRepairPrompt(goal: string, previousResponse: string, errors: string[]): string {
    return `You are a Workflow Planner for Jarvis.
You previously generated a workflow definition that failed validation.

Goal: "${goal}"

Previous Output:
${previousResponse}

Validation Errors:
${errors.map(e => `- ${e}`).join('\n')}

Fix the workflow definition and return ONLY the corrected valid JSON containing the "steps" array.`;
  }

  private async invokeLLM(provider: InferenceProviderType, prompt: string, model: string): Promise<string> {
    const response = await this.inferenceService.infer(provider, {
      modelId: model,
      prompt,
      maxTokens: 2000,
      temperature: 0.1
    });
    
    // Fallback if the payload is complex or text-based
    if (typeof response.content === 'string') {
      return response.content;
    } else if (response.content && typeof response.content === 'object' && 'text' in (response.content as any)) {
      return (response.content as any).text;
    }
    
    // In case the provider wraps it differently
    return JSON.stringify(response.content);
  }

  private parseResponse(response: string): WorkflowDefinition {
    // Strip markdown JSON wrappers if they exist
    let cleaned = response.trim();
    if (cleaned.startsWith('\`\`\`json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('\`\`\`')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('\`\`\`')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    
    try {
      return JSON.parse(cleaned) as WorkflowDefinition;
    } catch (e) {
      throw new Error(`Failed to parse LLM response as JSON: ${e}`);
    }
  }
}

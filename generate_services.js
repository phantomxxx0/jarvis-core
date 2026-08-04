const fs = require('fs');
const path = require('path');

const svcDir = path.join(__dirname, 'apps/api/src/modules/personal-intelligence/services');
fs.mkdirSync(svcDir, { recursive: true });

const domains = [
  { name: 'Profile' },
  { name: 'Preference' },
  { name: 'Habit' },
  { name: 'Goal' },
  { name: 'Project' },
  { name: 'Device' },
];

domains.forEach(d => {
  const content = `import { Injectable } from '@nestjs/common';
import { ${d.name}Repository, ${d.name}Select } from '../repositories/${d.name.toLowerCase()}.repository';

@Injectable()
export class ${d.name}Service {
  constructor(private readonly repository: ${d.name}Repository) {}

  async getContextForUser(userId: string): Promise<${d.name}Select[]> {
    return this.repository.findByUserId(userId);
  }
}
`;
  fs.writeFileSync(path.join(svcDir, `${d.name.toLowerCase()}.service.ts`), content);
});

// ObservationEngineService
const obsContent = `import { Injectable } from '@nestjs/common';
import { ObservationRepository, ObservationInsert } from '../repositories/observation.repository';

@Injectable()
export class ObservationEngineService {
  constructor(private readonly observationRepository: ObservationRepository) {}

  async ingestObservation(userId: string, source: string, payload: Record<string, unknown>, confidence = 50): Promise<void> {
    const data: ObservationInsert = {
      userId,
      source,
      payload,
      confidence,
    };
    await this.observationRepository.create(data);
  }
}
`;
fs.writeFileSync(path.join(svcDir, `observation-engine.service.ts`), obsContent);

// LearningEngineService
const leContent = `import { Injectable, Logger } from '@nestjs/common';
import { HabitRepository, HabitInsert } from '../repositories/habit.repository';
import { GoalRepository, GoalInsert } from '../repositories/goal.repository';
import { ProjectRepository, ProjectInsert } from '../repositories/project.repository';
import { PreferenceRepository, PreferenceInsert } from '../repositories/preference.repository';
import { ProfileRepository, ProfileInsert } from '../repositories/profile.repository';
import { DeviceRepository, DeviceInsert } from '../repositories/device.repository';

@Injectable()
export class LearningEngineService {
  private readonly logger = new Logger(LearningEngineService.name);

  constructor(
    private readonly habitRepository: HabitRepository,
    private readonly goalRepository: GoalRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly preferenceRepository: PreferenceRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  async evaluateAndLearn(userId: string): Promise<void> {
    // In the future, this will consume un-processed observations
    // and mutate the domains. 
    this.logger.log(\`Evaluating observations for user: \${userId}\`);
  }
}
`;
fs.writeFileSync(path.join(svcDir, `learning-engine.service.ts`), leContent);

console.log('Services generated.');

import { Injectable, Logger } from '@nestjs/common';
import {
  ContextProvider,
  ContextSection,
} from '../../brain/context/contracts/context-provider.interface';
import { ProfileService } from '../services/profile.service';
import { PreferenceService } from '../services/preference.service';
import { HabitService } from '../services/habit.service';
import { GoalService } from '../services/goal.service';
import { ProjectService } from '../services/project.service';
import { DeviceService } from '../services/device.service';

@Injectable()
export class PersonalContextProvider implements ContextProvider {
  public readonly name = 'PersonalIntelligence';
  public readonly defaultTimeoutMs = 1000;
  private readonly logger = new Logger(PersonalContextProvider.name);

  constructor(
    private readonly profileService: ProfileService,
    private readonly preferenceService: PreferenceService,
    private readonly habitService: HabitService,
    private readonly goalService: GoalService,
    private readonly projectService: ProjectService,
    private readonly deviceService: DeviceService,
  ) {}

  isHealthy(): boolean {
    return true;
  }

  async buildContext(
    query: string,
    userId = 'system',
  ): Promise<ContextSection> {
    try {
      const [profiles, preferences, habits, goals, projects, devices] =
        await Promise.all([
          this.profileService.getContextForUser(userId),
          this.preferenceService.getContextForUser(userId),
          this.habitService.getContextForUser(userId),
          this.goalService.getContextForUser(userId),
          this.projectService.getContextForUser(userId),
          this.deviceService.getContextForUser(userId),
        ]);

      const lines: string[] = [];

      if (profiles.length)
        lines.push(
          `**Profile:** ${profiles[0].displayName || 'Unknown'} - ${profiles[0].biography || ''}`,
        );
      if (preferences.length)
        lines.push(
          `**Preferences:** ${preferences.map((p) => `${p.key}: ${p.value}`).join(', ')}`,
        );
      if (habits.length)
        lines.push(
          `**Habits:** ${habits.map((h) => `${h.name} (${h.frequency})`).join(', ')}`,
        );
      if (goals.length)
        lines.push(
          `**Goals:** ${goals.map((g) => `${g.title} [${g.status}]`).join(', ')}`,
        );
      if (projects.length)
        lines.push(
          `**Projects:** ${projects.map((p) => `${p.name} [${p.status}]`).join(', ')}`,
        );
      if (devices.length)
        lines.push(
          `**Devices:** ${devices.map((d) => `${d.deviceName} (${d.deviceType})`).join(', ')}`,
        );

      const content = lines.join('\n\n');

      // Token budget enforcement: Simple character slice for now
      const maxChars = 2000;
      const compressedContent =
        content.length > maxChars
          ? content.slice(0, maxChars) + '... (truncated)'
          : content;

      return {
        source: this.name,
        title: 'Personal Intelligence Context',
        content: compressedContent || 'No personal intelligence data found.',
        hasData: lines.length > 0,
        priority: 95,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error building personal context: ${errorMsg}`);
      return {
        source: this.name,
        title: 'Personal Intelligence Context',
        content: 'Error retrieving personal intelligence.',
        hasData: false,
        priority: 95,
      };
    }
  }
}

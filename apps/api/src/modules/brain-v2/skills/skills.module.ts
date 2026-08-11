import { Module } from '@nestjs/common';
import { ToolsModule } from '../../tools/tools.module';
import { GovernanceModule } from '../../governance/governance.module';
import { ToolRouter } from './tool-router';
import {
  CodeSkill,
  BrowserSkill,
  ShellSkill,
  SearchSkill,
  VisionSkill,
} from './code-skill';
@Module({
  imports: [ToolsModule, GovernanceModule],
  providers: [
    ToolRouter,
    CodeSkill,
    BrowserSkill,
    ShellSkill,
    SearchSkill,
    VisionSkill,
  ],
  exports: [ToolRouter],
})
export class SkillsModule {}

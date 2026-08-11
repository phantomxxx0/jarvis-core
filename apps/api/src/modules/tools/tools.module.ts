import { Module } from '@nestjs/common';

import { RegistryModule } from '../registry/registry.module';

import { ToolRegistryService } from './tool-registry.service';
import { ReadFileTool } from './implementations/read-file.tool';
import { ExecuteSqlTool } from './implementations/execute-sql.tool';

@Module({
  imports: [RegistryModule],

  providers: [ToolRegistryService, ReadFileTool, ExecuteSqlTool],

  exports: [ToolRegistryService, ReadFileTool, ExecuteSqlTool],
})
export class ToolsModule {}

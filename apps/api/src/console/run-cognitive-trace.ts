import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BrainService } from '../modules/brain/brain.service';

async function bootstrap() {
  console.log(`\n🚀 Initializing Cognitive Pipeline Execution Trace`);

  // Headless Context (no HTTP listener)
  const app = await NestFactory.createApplicationContext(AppModule);

  const brainService = app.get(BrainService);
  const prompt = process.argv[2] || 'Read README.md and summarize the project.';

  console.log(`====================================================`);
  console.log(`User Prompt: "${prompt}"\n`);

  // Directly trigger pipeline bypassing legacy controller
  const trace = (await brainService.processIntent(
    prompt,
    'CLI Trace Execution',
  )) as Record<string, unknown>;

  console.log(`\n====================================================`);
  console.log(`Pipeline Trace Summary`);
  console.log(`====================================================`);
  console.dir(trace, { depth: null, colors: true });

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, 'apps/api/src/modules/personal-intelligence/repositories');
fs.mkdirSync(repoDir, { recursive: true });

const schemas = [
  { name: 'Profile', table: 'userProfiles', singular: 'Profile', hasUniqueUserId: true },
  { name: 'Preference', table: 'userPreferences', singular: 'Preference', hasUniqueUserId: false },
  { name: 'Habit', table: 'userHabits', singular: 'Habit', hasUniqueUserId: false },
  { name: 'Goal', table: 'userGoals', singular: 'Goal', hasUniqueUserId: false },
  { name: 'Project', table: 'userProjects', singular: 'Project', hasUniqueUserId: false },
  { name: 'Device', table: 'userDevices', singular: 'Device', hasUniqueUserId: false },
  { name: 'Observation', table: 'userObservations', singular: 'Observation', hasUniqueUserId: false },
];

schemas.forEach(s => {
  const content = `import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ${s.table} } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type ${s.singular}Insert = InferInsertModel<typeof ${s.table}>;
export type ${s.singular}Select = InferSelectModel<typeof ${s.table}>;

@Injectable()
export class ${s.name}Repository {
  constructor(private readonly database: DatabaseService) {}

  async findByUserId(userId: string): Promise<${s.singular}Select[]> {
    return this.database.db
      .select()
      .from(${s.table})
      .where(eq(${s.table}.userId, userId));
  }

  async create(data: ${s.singular}Insert): Promise<${s.singular}Select> {
    const [result] = await this.database.db
      .insert(${s.table})
      .values(data)
      .returning();
    return result;
  }
}
`;
  fs.writeFileSync(path.join(repoDir, `${s.name.toLowerCase()}.repository.ts`), content);
});

console.log('Repositories generated.');

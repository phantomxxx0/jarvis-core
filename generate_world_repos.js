const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, 'apps/api/src/modules/world-model/repositories');
fs.mkdirSync(repoDir, { recursive: true });

const schemas = [
  { name: 'Entity', table: 'worldEntities', hasUserId: false },
  { name: 'Relationship', table: 'worldRelationships', hasUserId: true },
  { name: 'Location', table: 'worldLocations', hasUserId: true },
  { name: 'Environment', table: 'worldEnvironmentStates', hasUserId: true },
];

schemas.forEach(s => {
  const findMethod = s.hasUserId 
    ? `async findByUserId(userId: string): Promise<${s.name}Select[]> {
    return this.database.db
      .select()
      .from(${s.table})
      .where(eq(${s.table}.userId, userId));
  }`
    : `async findById(id: string): Promise<${s.name}Select[]> {
    return this.database.db
      .select()
      .from(${s.table})
      .where(eq(${s.table}.id, id));
  }`;

  const content = `import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ${s.table} } from '@jarvis/database';
import { DatabaseService } from '../../../database';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type ${s.name}Insert = InferInsertModel<typeof ${s.table}>;
export type ${s.name}Select = InferSelectModel<typeof ${s.table}>;

@Injectable()
export class ${s.name}Repository {
  constructor(private readonly database: DatabaseService) {}

  ${findMethod}

  async create(data: ${s.name}Insert): Promise<${s.name}Select> {
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

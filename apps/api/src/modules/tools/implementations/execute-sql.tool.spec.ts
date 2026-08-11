import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteSqlTool } from './execute-sql.tool';
import { DatabaseService } from '../../../database/database.service';

describe('ExecuteSqlTool', () => {
  let tool: ExecuteSqlTool;
  let mockDb: { execute: jest.Mock };

  beforeEach(async () => {
    mockDb = { execute: jest.fn().mockResolvedValue([{ ok: true }]) };
    const mockDatabaseService = { db: mockDb };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteSqlTool,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    tool = module.get<ExecuteSqlTool>(ExecuteSqlTool);
  });

  it('allows a plain SELECT query', async () => {
    await tool.execute({ query: 'SELECT * FROM users' });
    expect(mockDb.execute).toHaveBeenCalled();
  });

  it('blocks a query that does not start with SELECT', async () => {
    await expect(
      tool.execute({ query: 'DELETE FROM users WHERE id = 1' }),
    ).rejects.toThrow(/read-only SELECT/i);
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('blocks a stacked SELECT + DROP query', async () => {
    await expect(
      tool.execute({ query: 'SELECT * FROM users; DROP TABLE users;' }),
    ).rejects.toThrow(/write-related keyword/i);
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('blocks an UPDATE query', async () => {
    await expect(
      tool.execute({ query: 'UPDATE users SET name = 1' }),
    ).rejects.toThrow(/read-only SELECT/i);
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('throws if query argument is missing', async () => {
    await expect(tool.execute({})).rejects.toThrow(
      /query argument is required/i,
    );
  });
});

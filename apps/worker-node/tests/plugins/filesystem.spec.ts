import { filesystemList } from '../../src/plugins/filesystem-list';
import { filesystemRead } from '../../src/plugins/filesystem-read';
import { filesystemWrite } from '../../src/plugins/filesystem-write';
import { filesystemSearch } from '../../src/plugins/filesystem-search';
import { filesystemMove } from '../../src/plugins/filesystem-move';
import { filesystemCopy } from '../../src/plugins/filesystem-copy';
import { filesystemDelete } from '../../src/plugins/filesystem-delete';
import { filesystemMkdir } from '../../src/plugins/filesystem-mkdir';
import { filesystemStat } from '../../src/plugins/filesystem-stat';
import { sandbox } from '../../src/services/filesystem-sandbox';
import * as os from 'os';
import * as path from 'path';
import * as fsp from 'fs/promises';

describe('Filesystem Capabilities Plugins', () => {
  const dummyContext = { workerId: 'test-worker' };
  let originalWorkspaceRoot: string;
  let tempDir: string;

  beforeAll(async () => {
    originalWorkspaceRoot = sandbox.getWorkspaceRoot();
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'capability-plugins-test-'));
    // Force sandbox root to tempDir for test isolation
    (sandbox as any).workspaceRoot = tempDir;
  });

  afterAll(async () => {
    await fsp.rm(tempDir, { recursive: true, force: true });
    (sandbox as any).workspaceRoot = originalWorkspaceRoot;
  });

  it('should list files via filesystem.list', async () => {
    await sandbox.write('hello.txt', 'world');
    const result = await filesystemList.execute({ path: '' }, dummyContext) as any;
    expect(result.entries.some((e: any) => e.name === 'hello.txt')).toBe(true);
  });

  it('should read files via filesystem.read', async () => {
    await sandbox.write('read.txt', 'content');
    const result = await filesystemRead.execute({ path: 'read.txt' }, dummyContext) as any;
    expect(result.content).toBe('content');
    expect(result.encoding).toBe('utf8');
  });

  it('should write files via filesystem.write', async () => {
    const result = await filesystemWrite.execute({ path: 'write.txt', content: 'test data' }, dummyContext) as any;
    expect(result.success).toBe(true);
    const content = await sandbox.read('write.txt');
    expect(content.content).toBe('test data');
  });

  it('should search files via filesystem.search', async () => {
    await sandbox.write('searchable.json', '{}');
    const result = await filesystemSearch.execute({ root: '', pattern: 'searchable\\.json' }, dummyContext) as any;
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].includes('searchable.json')).toBe(true);
  });

  it('should move files via filesystem.move', async () => {
    await sandbox.write('move-src.txt', 'data');
    const result = await filesystemMove.execute({ source: 'move-src.txt', destination: 'move-dest.txt' }, dummyContext) as any;
    expect(result.success).toBe(true);
    expect(await sandbox.exists('move-src.txt')).toBe(false);
    expect(await sandbox.exists('move-dest.txt')).toBe(true);
  });

  it('should copy files via filesystem.copy', async () => {
    await sandbox.write('copy-src.txt', 'data');
    const result = await filesystemCopy.execute({ source: 'copy-src.txt', destination: 'copy-dest.txt' }, dummyContext) as any;
    expect(result.success).toBe(true);
    expect(await sandbox.exists('copy-src.txt')).toBe(true);
    expect(await sandbox.exists('copy-dest.txt')).toBe(true);
  });

  it('should delete files via filesystem.delete', async () => {
    await sandbox.write('delete-me.txt', 'data');
    const result = await filesystemDelete.execute({ path: 'delete-me.txt' }, dummyContext) as any;
    expect(result.success).toBe(true);
    expect(await sandbox.exists('delete-me.txt')).toBe(false);
  });

  it('should create directories via filesystem.mkdir', async () => {
    const result = await filesystemMkdir.execute({ path: 'new-dir' }, dummyContext) as any;
    expect(result.success).toBe(true);
    expect(await sandbox.exists('new-dir')).toBe(true);
  });

  it('should get stats via filesystem.stat', async () => {
    await sandbox.write('stat-me.txt', 'data');
    const result = await filesystemStat.execute({ path: 'stat-me.txt' }, dummyContext) as any;
    expect(result.isFile).toBe(true);
    expect(result.size).toBe(4);
  });
});

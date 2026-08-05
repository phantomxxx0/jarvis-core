import { shellExec } from '../../src/plugins/shell-exec';
import { nodeExec } from '../../src/plugins/node-exec';
import { gitStatus } from '../../src/plugins/git-status';
import { gitCheckout } from '../../src/plugins/git-checkout';
import { gitCommit } from '../../src/plugins/git-commit';
import { gitReset } from '../../src/plugins/git-reset';
import { gitClone } from '../../src/plugins/git-clone';
import { gitFetch } from '../../src/plugins/git-fetch';
import { gitPull } from '../../src/plugins/git-pull';
import { gitPush } from '../../src/plugins/git-push';
import { gitMerge } from '../../src/plugins/git-merge';
import { sandbox, PathTraversalException } from '../../src/services/filesystem-sandbox';
import * as os from 'os';
import * as path from 'path';
import * as fsp from 'fs/promises';

describe('Developer Capabilities Plugins', () => {
  const dummyContext = { workerId: 'test-worker' };
  let originalWorkspaceRoot: string;
  let tempDir: string;

  beforeAll(async () => {
    originalWorkspaceRoot = sandbox.getWorkspaceRoot();
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'developer-plugins-test-'));
    (sandbox as any).workspaceRoot = tempDir;
  });

  afterAll(async () => {
    await fsp.rm(tempDir, { recursive: true, force: true });
    (sandbox as any).workspaceRoot = originalWorkspaceRoot;
  });

  describe('shell.exec', () => {
    it('should execute a command successfully', async () => {
      const result = await shellExec.execute({ command: 'echo', args: ['hello'] }, dummyContext) as any;
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('hello');
    });

    it('should timeout if execution takes too long', async () => {
      const result = await shellExec.execute({ command: 'sleep', args: ['5'], timeoutMs: 100 }, dummyContext) as any;
      expect(result.exitCode).toBe(124);
      expect(result.stderr).toContain('[TIMEOUT]');
    });

    it('should reject traversal in cwd', async () => {
      await expect(
        shellExec.execute({ command: 'ls', cwd: '../../' }, dummyContext)
      ).rejects.toThrow(PathTraversalException);
    });
  });

  describe('node.exec', () => {
    it('should execute node script and return output', async () => {
      const code = `console.log('node test');`;
      const result = await nodeExec.execute({ scriptContent: code }, dummyContext) as any;
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('node test');
    });

    it('should clean up the script file', async () => {
      const code = `console.log('cleanup test');`;
      await nodeExec.execute({ scriptContent: code }, dummyContext);
      
      const files = await fsp.readdir(tempDir);
      // Temp scripts start with .tmp_script_, there should be none left
      const tempFiles = files.filter(f => f.startsWith('.tmp_script_'));
      expect(tempFiles.length).toBe(0);
    });
  });

  describe('git.status', () => {
    it('should fail cleanly if not a git repository', async () => {
      await expect(
        gitStatus.execute({ cwd: '' }, dummyContext)
      ).rejects.toThrow(/Git error/);
    });
    
    // Testing full git flow would require initializing a git repo in tempDir
    // which is totally feasible but optional. We'll do a quick init.
    it('should parse git status correctly', async () => {
      // Setup a dummy git repo
      await shellExec.execute({ command: 'git', args: ['init'] }, dummyContext);
      await shellExec.execute({ command: 'git', args: ['config', 'user.name', 'test'] }, dummyContext);
      await shellExec.execute({ command: 'git', args: ['config', 'user.email', 'test@test.com'] }, dummyContext);
      
      await fsp.writeFile(path.join(tempDir, 'test.txt'), 'hello');
      
      const result = await gitStatus.execute({ cwd: '' }, dummyContext) as any;
      expect(result.untracked).toContain('test.txt');
    });
  });

  describe('git new commands', () => {
    it('should checkout, commit and reset', async () => {
      // already initialized in the previous test block, but tests run sequentially. Let's just in case init
      await shellExec.execute({ command: 'git', args: ['init'] }, dummyContext);
      await shellExec.execute({ command: 'git', args: ['config', 'user.name', 'test'] }, dummyContext);
      await shellExec.execute({ command: 'git', args: ['config', 'user.email', 'test@test.com'] }, dummyContext);
      
      await sandbox.write('file.txt', 'a');
      await shellExec.execute({ command: 'git', args: ['add', 'file.txt'] }, dummyContext);

      const commitRes = await gitCommit.execute({ message: 'initial' }, dummyContext) as any;
      expect(commitRes.success).toBe(true);

      const checkoutRes = await gitCheckout.execute({ branch: 'new-branch', create: true }, dummyContext) as any;
      expect(checkoutRes.success).toBe(true);

      const resetRes = await gitReset.execute({ mode: 'hard', commit: 'HEAD' }, dummyContext) as any;
      expect(resetRes.success).toBe(true);
    });
  });
});

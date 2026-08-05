import { httpGet } from '../../src/plugins/http-get';
import { httpPost } from '../../src/plugins/http-post';
import { httpDownload } from '../../src/plugins/http-download';
import { httpUpload } from '../../src/plugins/http-upload';
import { sandbox } from '../../src/services/filesystem-sandbox';
import * as os from 'os';
import * as path from 'path';
import * as fsp from 'fs/promises';

describe('HTTP Capabilities Plugins', () => {
  const dummyContext = { workerId: 'test-worker' };
  let originalWorkspaceRoot: string;
  let tempDir: string;

  beforeAll(async () => {
    originalWorkspaceRoot = sandbox.getWorkspaceRoot();
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'http-plugins-test-'));
    (sandbox as any).workspaceRoot = tempDir;
  });

  afterAll(async () => {
    await fsp.rm(tempDir, { recursive: true, force: true });
    (sandbox as any).workspaceRoot = originalWorkspaceRoot;
  });

  it('should have correct metadata for http.get', () => {
    expect(httpGet.id).toBe('http.get');
  });

  it('should have correct metadata for http.post', () => {
    expect(httpPost.id).toBe('http.post');
  });

  it('should have correct metadata for http.download', () => {
    expect(httpDownload.id).toBe('http.download');
  });

  it('should have correct metadata for http.upload', () => {
    expect(httpUpload.id).toBe('http.upload');
  });

  // Actually executing these requires mocking global fetch, which we can do simply:
  it('should execute http.get successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'success' }),
    });

    const result = await httpGet.execute({ url: 'https://example.com' }, dummyContext) as any;
    expect(result.status).toBe(200);
    expect(result.data.message).toBe('success');
  });

  it('should execute http.post successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 123 }),
    });

    const result = await httpPost.execute({ url: 'https://example.com', body: { a: 1 } }, dummyContext) as any;
    expect(result.status).toBe(201);
    expect(result.data.id).toBe(123);
  });

  it('should execute http.download successfully', async () => {
    const buffer = Buffer.from('test file content');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      arrayBuffer: async () => buffer,
    });

    const result = await httpDownload.execute({ url: 'https://example.com/file.txt' }, dummyContext) as any;
    expect(result.filename).toBe('file.txt');
    expect(result.size).toBe(buffer.length);
    
    // Check if the file was saved
    const exists = await sandbox.exists(result.path);
    expect(exists).toBe(true);
    
    const content = await sandbox.read(result.path, 'utf8');
    expect(content.content).toBe('test file content');
  });
});

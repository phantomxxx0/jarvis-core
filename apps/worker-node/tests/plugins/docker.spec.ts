import { dockerPs } from '../../src/plugins/docker-ps';
import { dockerLogs } from '../../src/plugins/docker-logs';
import { dockerExec } from '../../src/plugins/docker-exec';
import { dockerCompose } from '../../src/plugins/docker-compose';
import { dockerInspect } from '../../src/plugins/docker-inspect';

describe('Docker Capabilities Plugins', () => {
  it('should have correct metadata for docker.ps', () => {
    expect(dockerPs.id).toBe('docker.ps');
  });

  it('should have correct metadata for docker.logs', () => {
    expect(dockerLogs.id).toBe('docker.logs');
  });

  it('should have correct metadata for docker.exec', () => {
    expect(dockerExec.id).toBe('docker.exec');
  });

  it('should have correct metadata for docker.compose', () => {
    expect(dockerCompose.id).toBe('docker.compose');
  });

  it('should have correct metadata for docker.inspect', () => {
    expect(dockerInspect.id).toBe('docker.inspect');
  });
});

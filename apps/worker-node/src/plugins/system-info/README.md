# System Information Capability (`system.info`)

## Purpose
The `system.info` capability provides runtime information about the worker host environment, without using shell commands or external processes. It is used to monitor system health, verify the deployment environment, and retrieve hardware constraints.

## Supported Platforms
- Windows
- Linux
- macOS

## Returned Fields
- **worker**: Identification metadata for the worker node (`id`, `hostname`, `version`, `startedAt`)
- **system**: OS platform metadata (`platform`, `arch`, `release`, `uptimeSeconds`)
- **cpu**: Processor hardware information (`model`, `cores`, `loadAverage`)
- **memory**: Available and used system RAM (`total`, `free`, `used`)
- **runtime**: Node.js runtime information (`node` version, `pid`)
- **network**: Network interface names available on the machine

## Example Payload
```json
{
  "worker": {
    "id": "ephemeral-uuid-1234",
    "hostname": "prod-worker-01",
    "version": "1.0.0",
    "startedAt": "2026-08-04T12:00:00.000Z"
  },
  "system": {
    "platform": "linux",
    "arch": "x64",
    "release": "5.15.0-101-generic",
    "uptimeSeconds": 142456
  },
  "cpu": {
    "model": "Intel(R) Xeon(R) CPU E5-2676 v3 @ 2.40GHz",
    "cores": 4,
    "loadAverage": [0.15, 0.05, 0.01]
  },
  "memory": {
    "total": 16777216,
    "free": 8388608,
    "used": 8388608
  },
  "runtime": {
    "node": "v22.0.0",
    "pid": 1234
  },
  "network": {
    "interfaces": ["lo", "eth0"]
  }
}
```

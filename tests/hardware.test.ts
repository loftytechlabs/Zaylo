import { describe, it, expect } from 'vitest';
import { HardwareScanner } from '@local-ai/hardware';

describe('HardwareScanner', () => {
  it('should scan host hardware without errors and return valid profile', async () => {
    const profile = await HardwareScanner.scan();

    expect(profile).toBeDefined();
    expect(['darwin', 'linux', 'win32']).toContain(profile.platform);
    expect(profile.cpu.model).toBeTruthy();
    expect(profile.cpu.physicalCores).toBeGreaterThan(0);
    expect(profile.cpu.logicalThreads).toBeGreaterThan(0);

    expect(profile.memory.totalBytes).toBeGreaterThan(1e9); // At least 1 GB
    expect(profile.memory.availableBytes).toBeGreaterThan(0);
    expect(profile.memory.usedBytes).toBeGreaterThan(0);

    expect(profile.gpus.length).toBeGreaterThan(0);
    expect(profile.gpus[0].backend).toBeDefined();

    expect(profile.disks.length).toBeGreaterThan(0);
    expect(profile.disks[0].totalBytes).toBeGreaterThan(0);
  });
});

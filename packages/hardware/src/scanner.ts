import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import type {
  HardwareProfile,
  CPUInfo,
  MemoryInfo,
  GPUInfo,
  DiskInfo,
  SystemPlatform,
  Architecture,
  GPUBackend,
} from '@local-ai/shared';

export class HardwareScanner {
  public static async scan(): Promise<HardwareProfile> {
    const platform = process.platform as SystemPlatform;
    const arch = process.arch as Architecture;

    const cpu = this.detectCPU(platform, arch);
    const memory = this.detectMemory(platform);
    const gpus = this.detectGPUs(platform);
    const disks = this.detectDisks(platform);

    const primaryGPU = gpus.length > 0 ? (gpus.find((g) => !g.isIntegrated) || gpus[0]) : undefined;

    return {
      platform,
      osRelease: os.release(),
      hostname: os.hostname(),
      cpu,
      memory,
      gpus,
      primaryGPU,
      disks,
      detectedAt: Date.now(),
    };
  }

  public static detectCPU(platform: SystemPlatform, arch: Architecture): CPUInfo {
    const cpus = os.cpus();
    let model = cpus.length > 0 ? cpus[0].model.trim() : 'Unknown CPU';
    let baseFrequencyHz = cpus.length > 0 ? cpus[0].speed * 1_000_000 : undefined;
    const logicalThreads = cpus.length || 1;
    let physicalCores = logicalThreads;

    if (platform === 'darwin') {
      try {
        const brand = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf-8', timeout: 2000 }).trim();
        if (brand) model = brand;
        const cores = parseInt(execSync('sysctl -n hw.physicalcpu', { encoding: 'utf-8', timeout: 2000 }).trim(), 10);
        if (!isNaN(cores)) physicalCores = cores;
      } catch {
        physicalCores = Math.max(1, Math.floor(logicalThreads / 2));
      }
    } else if (platform === 'linux') {
      try {
        const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf-8');
        const modelMatch = cpuinfo.match(/model name\s+:\s+(.+)/i);
        if (modelMatch) model = modelMatch[1].trim();
        const coreMatches = cpuinfo.match(/cpu cores\s+:\s+(\d+)/i);
        if (coreMatches) physicalCores = parseInt(coreMatches[1], 10);
      } catch {
        physicalCores = Math.max(1, Math.floor(logicalThreads / 2));
      }
    } else if (platform === 'win32') {
      try {
        const wmicOut = execSync('wmic cpu get NumberOfCores,Name /format:csv', { encoding: 'utf-8', timeout: 3000 });
        const lines = wmicOut.trim().split('\n').filter(Boolean);
        if (lines.length > 1) {
          const parts = lines[1].split(',');
          if (parts.length >= 3) {
            model = parts[2].trim() || model;
            const cores = parseInt(parts[1], 10);
            if (!isNaN(cores)) physicalCores = cores;
          }
        }
      } catch {
        physicalCores = Math.max(1, Math.floor(logicalThreads / 2));
      }
    }

    return {
      model,
      architecture: arch,
      physicalCores,
      logicalThreads,
      baseFrequencyHz,
    };
  }

  public static detectMemory(platform: SystemPlatform): MemoryInfo {
    const totalBytes = os.totalmem();
    let availableBytes = os.freemem();

    if (platform === 'darwin') {
      try {
        const vmStat = execSync('vm_stat', { encoding: 'utf-8', timeout: 2000 });
        const pageSize = 4096;
        const freePages = parseInt(vmStat.match(/Pages free:\s+(\d+)/)?.[1] || '0', 10);
        const inactivePages = parseInt(vmStat.match(/Pages inactive:\s+(\d+)/)?.[1] || '0', 10);
        const speculativePages = parseInt(vmStat.match(/Pages speculative:\s+(\d+)/)?.[1] || '0', 10);
        availableBytes = (freePages + inactivePages + speculativePages) * pageSize;
      } catch {
        availableBytes = os.freemem();
      }
    } else if (platform === 'linux') {
      try {
        const meminfo = fs.readFileSync('/proc/meminfo', 'utf-8');
        const memAvail = meminfo.match(/MemAvailable:\s+(\d+)\s+kB/i);
        if (memAvail) {
          availableBytes = parseInt(memAvail[1], 10) * 1024;
        }
      } catch {
        availableBytes = os.freemem();
      }
    }

    // Sanity bounds
    availableBytes = Math.min(totalBytes, Math.max(0, availableBytes));
    const usedBytes = totalBytes - availableBytes;

    return {
      totalBytes,
      availableBytes,
      usedBytes,
    };
  }

  public static detectGPUs(platform: SystemPlatform): GPUInfo[] {
    const gpus: GPUInfo[] = [];

    if (platform === 'darwin') {
      try {
        const output = execSync('system_profiler SPDisplaysDataType', { encoding: 'utf-8', timeout: 4000 });
        const blocks = output.split('\n\n');
        
        for (const block of blocks) {
          const chipsetMatch = block.match(/Chipset Model:\s*(.+)/i);
          if (!chipsetMatch) continue;

          const model = chipsetMatch[1].trim();
          const vendorMatch = block.match(/Vendor:\s*(.+)/i);
          let vendor = vendorMatch ? vendorMatch[1].trim() : 'Unknown';
          if (model.includes('Intel')) vendor = 'Intel';
          else if (model.includes('AMD') || model.includes('Radeon')) vendor = 'AMD';
          else if (model.includes('Apple')) vendor = 'Apple';
          else if (model.includes('NVIDIA')) vendor = 'NVIDIA';

          let vramBytes: number | undefined;
          const vramMatch = block.match(/VRAM\s*(?:\([^)]+\))?:\s*(\d+)\s*(MB|GB)/i);
          if (vramMatch) {
            const val = parseInt(vramMatch[1], 10);
            const unit = vramMatch[2].toUpperCase();
            vramBytes = unit === 'GB' ? val * 1024 * 1024 * 1024 : val * 1024 * 1024;
          } else if (vendor === 'Apple') {
            // Apple Silicon unified memory
            vramBytes = os.totalmem();
          }

          const isIntegrated = block.includes('Built-In') || model.includes('Intel UHD') || model.includes('Intel Iris') || model.includes('Intel HD');
          const backend: GPUBackend = 'metal';

          gpus.push({
            vendor,
            model,
            vramBytes,
            backend,
            isIntegrated,
          });
        }
      } catch (err) {
        // Fallback check if Apple Silicon
        if (os.cpus()[0]?.model.includes('Apple')) {
          gpus.push({
            vendor: 'Apple',
            model: os.cpus()[0].model,
            vramBytes: os.totalmem(),
            backend: 'metal',
            isIntegrated: true,
          });
        }
      }
    } else if (platform === 'linux' || platform === 'win32') {
      // Check for NVIDIA GPU via nvidia-smi
      try {
        const smi = execSync('nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits', {
          encoding: 'utf-8',
          timeout: 3000,
        });
        const lines = smi.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const [name, memMb, driver] = line.split(',').map((s) => s.trim());
          const totalMb = parseInt(memMb, 10);
          gpus.push({
            vendor: 'NVIDIA',
            model: name,
            vramBytes: !isNaN(totalMb) ? totalMb * 1024 * 1024 : undefined,
            driverVersion: driver,
            backend: 'cuda',
            isIntegrated: false,
          });
        }
      } catch {
        // No NVIDIA or nvidia-smi not in PATH
      }

      if (gpus.length === 0 && platform === 'linux') {
        try {
          const lspci = execSync('lspci | grep -iE "vga|3d|display"', { encoding: 'utf-8', timeout: 2000 });
          for (const line of lspci.trim().split('\n').filter(Boolean)) {
            const vendor = line.includes('NVIDIA') ? 'NVIDIA' : line.includes('AMD') || line.includes('ATI') ? 'AMD' : line.includes('Intel') ? 'Intel' : 'Unknown';
            gpus.push({
              vendor,
              model: line.replace(/^[0-9a-f:.]+\s+[^:]+:\s+/, '').trim(),
              backend: vendor === 'NVIDIA' ? 'cuda' : vendor === 'AMD' ? 'rocm' : 'vulkan',
              isIntegrated: vendor === 'Intel',
            });
          }
        } catch {
          // Ignored
        }
      }
    }

    if (gpus.length === 0) {
      gpus.push({
        vendor: 'CPU',
        model: os.cpus()[0]?.model || 'Generic Host CPU',
        backend: 'cpu',
        isIntegrated: true,
      });
    }

    return gpus;
  }

  public static detectDisks(platform: SystemPlatform): DiskInfo[] {
    const disks: DiskInfo[] = [];
    try {
      if (platform === 'darwin' || platform === 'linux') {
        const df = execSync('df -k /', { encoding: 'utf-8', timeout: 2000 });
        const lines = df.trim().split('\n');
        if (lines.length > 1) {
          const tokens = lines[1].split(/\s+/);
          const totalKb = parseInt(tokens[1], 10);
          const usedKb = parseInt(tokens[2], 10);
          const availKb = parseInt(tokens[3], 10);
          const mount = tokens[tokens.length - 1] || '/';

          disks.push({
            mount,
            totalBytes: totalKb * 1024,
            usedBytes: usedKb * 1024,
            availableBytes: availKb * 1024,
          });
        }
      } else if (platform === 'win32') {
        const wmic = execSync('wmic logicaldisk get Caption,FreeSpace,Size /format:csv', { encoding: 'utf-8', timeout: 3000 });
        const lines = wmic.trim().split('\n').filter(Boolean);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 4) {
            const mount = parts[1].trim();
            const free = parseInt(parts[2], 10);
            const total = parseInt(parts[3], 10);
            if (!isNaN(total) && total > 0) {
              disks.push({
                mount,
                totalBytes: total,
                availableBytes: free,
                usedBytes: total - free,
              });
            }
          }
        }
      }
    } catch {
      // Fallback
      disks.push({
        mount: '/',
        totalBytes: 100 * 1024 * 1024 * 1024,
        availableBytes: 50 * 1024 * 1024 * 1024,
        usedBytes: 50 * 1024 * 1024 * 1024,
      });
    }
    return disks;
  }
}

import os from 'node:os';
import type { NetworkInterfaceInfo } from '@local-ai/shared';

export class NetworkScanner {
  public static getInterfaces(): NetworkInterfaceInfo[] {
    const interfaces = os.networkInterfaces();
    const result: NetworkInterfaceInfo[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4') {
          let type: NetworkInterfaceInfo['type'] = 'other';
          const lowerName = name.toLowerCase();

          if (addr.internal || lowerName.includes('lo') || addr.address.startsWith('127.')) {
            type = 'loopback';
          } else if (
            lowerName.includes('wi') ||
            lowerName.includes('wlan') ||
            lowerName.includes('wireless') ||
            lowerName.startsWith('en0') ||
            lowerName.startsWith('wlp')
          ) {
            type = 'wifi';
          } else if (
            lowerName.includes('eth') ||
            lowerName.includes('ethernet') ||
            lowerName.includes('lan') ||
            lowerName.includes('local area') ||
            lowerName.startsWith('en')
          ) {
            type = 'ethernet';
          }

          result.push({
            name,
            address: addr.address,
            family: 'IPv4',
            internal: addr.internal || addr.address.startsWith('127.'),
            type,
            mac: addr.mac,
          });
        }
      }
    }

    return result;
  }

  public static getPrimaryLANAddress(): string | null {
    const ifaces = this.getInterfaces();

    // 1. Filter out internal, loopback, and link-local (169.254.x.x) addresses
    const valid = ifaces.filter(
      (i) =>
        !i.internal &&
        !i.address.startsWith('127.') &&
        !i.address.startsWith('169.254.') &&
        i.address !== '0.0.0.0'
    );

    if (valid.length === 0) return null;

    // 2. Score candidates: prioritize real physical Wi-Fi/Ethernet on home/office subnets (192.168.x.x, 10.x.x.x)
    const scored = valid.map((i) => {
      let score = 0;
      const lowerName = i.name.toLowerCase();

      // Deprioritize virtual adapters (Hyper-V, WSL, VirtualBox, VMware, Docker)
      if (
        lowerName.includes('vethernet') ||
        lowerName.includes('virtual') ||
        lowerName.includes('vbox') ||
        lowerName.includes('vmnet') ||
        lowerName.includes('docker') ||
        lowerName.includes('wsl') ||
        lowerName.includes('tailscale') ||
        lowerName.includes('zerotier')
      ) {
        score -= 50;
      }

      // Prioritize Wi-Fi and Ethernet
      if (i.type === 'wifi') score += 40;
      if (i.type === 'ethernet') score += 30;

      // Prioritize standard home/LAN subnets
      if (i.address.startsWith('192.168.')) score += 30;
      else if (i.address.startsWith('10.')) score += 20;
      else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(i.address)) score += 15;

      return { address: i.address, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.address || valid[0].address;
  }
}

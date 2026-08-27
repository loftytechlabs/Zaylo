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

          const isVirtual =
            lowerName.includes('vethernet') ||
            lowerName.includes('wsl') ||
            lowerName.includes('virtual') ||
            lowerName.includes('vmware') ||
            lowerName.includes('hyper-v') ||
            lowerName.includes('docker') ||
            lowerName.includes('tailscale') ||
            lowerName.includes('zerotier') ||
            lowerName.includes('tap') ||
            lowerName.includes('tun');

          if (addr.internal || lowerName.includes('lo') || lowerName.includes('loopback')) {
            type = 'loopback';
          } else if (
            !isVirtual &&
            (lowerName.includes('wi') ||
              lowerName.includes('wl') ||
              lowerName.includes('wlan') ||
              lowerName.includes('wireless') ||
              lowerName.startsWith('en0'))
          ) {
            type = 'wifi';
          } else if (
            !isVirtual &&
            (lowerName.includes('eth') ||
              lowerName.includes('en') ||
              lowerName.includes('local area connection'))
          ) {
            type = 'ethernet';
          }

          result.push({
            name,
            address: addr.address,
            family: 'IPv4',
            internal: addr.internal,
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
    
    // Valid non-internal IPv4 addresses that are not link-local (169.254) or loopback
    const valid = ifaces.filter((i) => {
      if (i.internal || i.type === 'loopback') return false;
      const ip = i.address;
      if (!ip || ip.startsWith('127.') || ip.startsWith('169.254.') || ip === '0.0.0.0') return false;
      return true;
    });

    if (valid.length === 0) return null;

    // 1. Prioritize Wi-Fi or Ethernet on standard home/office subnets (192.168.x.x)
    const classC = valid.find((i) => (i.type === 'wifi' || i.type === 'ethernet') && i.address.startsWith('192.168.'));
    if (classC) return classC.address;

    // 2. Prioritize Wi-Fi or Ethernet on class A (10.x.x.x)
    const classA = valid.find((i) => (i.type === 'wifi' || i.type === 'ethernet') && i.address.startsWith('10.'));
    if (classA) return classA.address;

    // 3. Any Wi-Fi or Ethernet
    const standardLan = valid.find((i) => i.type === 'wifi' || i.type === 'ethernet');
    if (standardLan) return standardLan.address;

    // 4. Any 192.168.x.x or 10.x.x.x
    const anyPrivate = valid.find((i) => i.address.startsWith('192.168.') || i.address.startsWith('10.'));
    if (anyPrivate) return anyPrivate.address;

    return valid[0].address;
  }
}

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

          if (addr.internal || lowerName.includes('lo')) {
            type = 'loopback';
          } else if (lowerName.includes('wi') || lowerName.includes('wl') || lowerName.startsWith('en0')) {
            type = 'wifi';
          } else if (lowerName.includes('eth') || lowerName.includes('en')) {
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
    // Prioritize non-internal Wi-Fi or Ethernet IPv4
    const lan = ifaces.find((i) => !i.internal && (i.type === 'wifi' || i.type === 'ethernet'));
    if (lan) return lan.address;

    const anyNonInternal = ifaces.find((i) => !i.internal);
    return anyNonInternal ? anyNonInternal.address : null;
  }
}

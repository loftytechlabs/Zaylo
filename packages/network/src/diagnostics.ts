import net from 'node:net';
import { NetworkScanner } from './interfaces.js';

export interface DiagnosticsResult {
  portAvailable: boolean;
  lanAddress?: string;
  hasNetworkConnectivity: boolean;
  issues: string[];
  suggestions: string[];
}

export class NetworkDiagnostics {
  public static async checkPort(port: number, host: string = '127.0.0.1'): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen({ port, host }, () => {
        server.close(() => resolve(true));
      });
    });
  }

  public static async runDiagnostics(port: number, lanEnabled: boolean): Promise<DiagnosticsResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    const lanAddress = NetworkScanner.getPrimaryLANAddress() || undefined;
    const ifaces = NetworkScanner.getInterfaces();
    const hasNetworkConnectivity = ifaces.some((i) => !i.internal);

    const targetHost = lanEnabled ? '0.0.0.0' : '127.0.0.1';
    const portAvailable = await this.checkPort(port, targetHost);

    if (!portAvailable) {
      issues.push(`Port ${port} is currently in use by another process.`);
      suggestions.push(`Change the server port to ${port + 1} in Settings or terminate the occupying process.`);
    }

    if (lanEnabled && !lanAddress) {
      issues.push('No active Wi-Fi or Ethernet network interface detected.');
      suggestions.push('Connect this machine to your local Wi-Fi or Ethernet network.');
    }

    if (lanEnabled && lanAddress) {
      suggestions.push(`Ensure connecting devices are on the same Wi-Fi subnet (${lanAddress.split('.').slice(0, 3).join('.')}.x).`);
      suggestions.push('If connecting devices timeout, check local OS firewall or router client isolation settings.');
    }

    return {
      portAvailable,
      lanAddress,
      hasNetworkConnectivity,
      issues,
      suggestions,
    };
  }
}

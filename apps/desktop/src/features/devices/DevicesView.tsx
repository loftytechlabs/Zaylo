import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  QrCode,
  Laptop,
  Trash2,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { api } from '../../api/client';
import type { PairingTokenInfo } from '@local-ai/shared';

export const DevicesView: React.FC = () => {
  const { devices, serverConfig, fetchDevicesAndKeys, revokeDevice, deleteDevice } = useAppStore();
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [pairingInfo, setPairingInfo] = useState<PairingTokenInfo | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Auto-refresh devices list while view is active
  useEffect(() => {
    fetchDevicesAndKeys();
    const interval = setInterval(() => {
      fetchDevicesAndKeys();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenPairing = async () => {
    setLoadingQr(true);
    setPairingModalOpen(true);
    try {
      const info = await api.invoke('devices:create-pairing-token', undefined);
      setPairingInfo(info);
    } catch (err: any) {
      alert(`Failed to create pairing token: ${err.message}`);
    } finally {
      setLoadingQr(false);
    }
  };

  const getDeviceIcon = (name: string, ua?: string) => {
    const text = ((name || '') + ' ' + (ua || '')).toLowerCase();
    if (text.includes('iphone') || text.includes('android') || text.includes('phone') || text.includes('mobile')) {
      return <Smartphone className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    if (text.includes('ipad') || text.includes('tablet')) {
      return <Tablet className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    return <Laptop className="w-4 h-4 text-emerald-400 shrink-0" />;
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header & Action */}
      <div className="flex items-center justify-between border-b border-[#202227] pb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-400" />
            Connected & Paired Devices
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage physical computers, phones, and tablets that have accessed or paired with this inference server.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDevicesAndKeys()}
            className="p-1.5 rounded-md bg-[#16181f] hover:bg-[#20242e] text-zinc-400 hover:text-white border border-[#242834] transition-colors"
            title="Refresh devices"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenPairing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Pair New Device</span>
          </button>
        </div>
      </div>

      {/* LAN Warning if not enabled */}
      {!serverConfig?.lanEnabled && (
        <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center gap-3 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-semibold">LAN Access is currently disabled.</span> Enable LAN Access in Server & API settings to allow phones and laptops on your Wi-Fi network to connect.
          </div>
        </div>
      )}

      {/* Devices List Table */}
      <div className="border border-[#202227] rounded-lg overflow-hidden font-mono text-xs bg-[#111317]">
        <table className="w-full text-left">
          <thead className="bg-[#0e1013] text-zinc-500 text-[11px] border-b border-[#202227]">
            <tr>
              <th className="py-3 px-4">DEVICE NAME</th>
              <th className="py-3 px-4">IP ADDRESS</th>
              <th className="py-3 px-4">LAST ACTIVITY</th>
              <th className="py-3 px-4">REQUESTS</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c1f26] text-zinc-300">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                  No devices connected yet. Open the Web Chat or scan the QR code from another device on this Wi-Fi network.
                </td>
              </tr>
            ) : (
              devices.map((d) => {
                const isOnline = !d.isRevoked && Date.now() - d.lastRequestAt < 45000;
                return (
                  <tr key={d.id} className="hover:bg-[#14161c]">
                    <td className="py-3.5 px-4 font-sans font-medium text-zinc-200">
                      <div className="flex items-center gap-2.5">
                        {getDeviceIcon(d.deviceName, d.userAgent)}
                        <div>
                          <div className="text-zinc-100 font-semibold">{d.deviceName}</div>
                          {d.userAgent && (
                            <div className="text-[10px] text-zinc-500 font-mono truncate max-w-xs">
                              {d.userAgent}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono">{d.ipAddress}</td>
                    <td className="py-3.5 px-4 text-zinc-500">{new Date(d.lastRequestAt).toLocaleTimeString()}</td>
                    <td className="py-3.5 px-4 text-zinc-400 font-mono">{d.requestCount}</td>
                    <td className="py-3.5 px-4">
                      {d.isRevoked ? (
                        <span className="text-rose-400 text-[11px] font-medium">Revoked</span>
                      ) : isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-zinc-800/80 text-zinc-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!d.isRevoked && (
                          <button
                            onClick={() => revokeDevice(d.id)}
                            className="text-xs text-amber-500 hover:text-amber-400 px-2 py-1 rounded bg-amber-950/30 border border-amber-800/40"
                            title="Revoke device authentication"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => deleteDevice(d.id)}
                          className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                          title="Remove device record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* QR Pairing Modal */}
      {pairingModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#121419] border border-[#262a34] rounded-xl p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setPairingModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                Pair Mobile Device or Tablet
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Scan this QR code with your mobile device on the same Wi-Fi network.
              </p>
            </div>

            {loadingQr ? (
              <div className="h-64 flex items-center justify-center text-xs text-zinc-500">Generating secure token...</div>
            ) : pairingInfo ? (
              <div className="space-y-4 text-center">
                <div className="bg-white p-3 rounded-lg inline-block mx-auto shadow">
                  <img src={pairingInfo.qrDataUrl} alt="Pairing QR Code" className="w-56 h-56" />
                </div>

                <div className="space-y-1 font-mono text-[11px]">
                  <div className="text-zinc-300 font-semibold">{pairingInfo.serverUrl}</div>
                  <div className="text-zinc-500">
                    Pairing token expires in 5 minutes
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0e1014] border border-[#1e222b] text-[11px] text-zinc-400 text-left">
                  <span className="font-semibold text-zinc-200 block mb-0.5">How it works:</span>
                  The mobile device scans the configuration payload and receives a local API key automatically.
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                onClick={() => setPairingModalOpen(false)}
                className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

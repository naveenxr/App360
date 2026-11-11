'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Site, Device } from '../../types/topology';
import Badge from '../common/Badge';
import topologyService from '../../services/topologyService';
import { HardDrive, ChevronRight } from 'lucide-react';

interface NetworkMapProps {
  sites: Site[];
  selectedSite: Site | null;
  onSelectSite: (site: Site) => void;
  onInspectNode: (deviceId: string) => void;
}

// Controller component to smoothly pan map when a site is selected
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 7, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  sites,
  selectedSite,
  onSelectSite,
  onInspectNode
}) => {
  const [siteDevicesMap, setSiteDevicesMap] = useState<Record<string, Device[]>>({});
  const [loadingDevices, setLoadingDevices] = useState<Record<string, boolean>>({});

  // Helper to create glowing severity markers
  const createMarkerIcon = (severity: string, activeCount: number) => {
    const sev = String(severity).toUpperCase();
    let color = '#10b981'; // CLEAR: emerald
    let glow = 'rgba(16, 185, 129, 0.4)';

    if (sev === 'CRITICAL') {
      color = '#ef4444';
      glow = 'rgba(239, 68, 68, 0.7)';
    } else if (sev === 'MAJOR') {
      color = '#f97316';
      glow = 'rgba(249, 115, 22, 0.6)';
    } else if (sev === 'MINOR') {
      color = '#eab308';
      glow = 'rgba(234, 179, 8, 0.5)';
    } else if (sev === 'WARNING') {
      color = '#f59e0b';
      glow = 'rgba(245, 158, 11, 0.5)';
    }

    const html = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        ${
          sev === 'CRITICAL'
            ? `<div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${glow}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ''
        }
        <div style="width: 24px; height: 24px; border-radius: 50%; background: #0f172a; border: 2.5px solid ${color}; box-shadow: 0 0 10px ${glow}; display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
        </div>
        ${
          activeCount > 0
            ? `<div style="position: absolute; top: -2px; right: -2px; background: ${color}; color: #ffffff; font-size: 9px; font-weight: 700; border-radius: 9999px; min-width: 14px; height: 14px; padding: 0 3px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #0f172a;">${activeCount}</div>`
            : ''
        }
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-topology-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });
  };

  const handlePopupOpen = async (siteId: string) => {
    if (siteDevicesMap[siteId]) return;
    setLoadingDevices((prev) => ({ ...prev, [siteId]: true }));
    try {
      const data = await topologyService.getSiteById(siteId);
      setSiteDevicesMap((prev) => ({ ...prev, [siteId]: data.devices }));
    } catch (e) {
      console.error('Failed to load site devices for popup:', e);
    } finally {
      setLoadingDevices((prev) => ({ ...prev, [siteId]: false }));
    }
  };

  const activeCenter: [number, number] | null = selectedSite
    ? [selectedSite.coordinates.latitude, selectedSite.coordinates.longitude]
    : null;

  return (
    <div className="relative w-full h-[650px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#020617' }}
      >
        <MapController center={activeCenter} />

        {/* High performance dark cartographic tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {sites.map((site) => {
          const devices = siteDevicesMap[site.siteId] || [];
          const isLoadingDevs = loadingDevices[site.siteId];

          return (
            <Marker
              key={site.siteId}
              position={[site.coordinates.latitude, site.coordinates.longitude]}
              icon={createMarkerIcon(site.currentSeverity, site.activeAlarmCount)}
              eventHandlers={{
                click: () => onSelectSite(site),
                popupopen: () => handlePopupOpen(site.siteId)
              }}
            >
              <Popup className="dark-topology-popup" closeButton={false}>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 min-w-[240px]">
                  {/* Site Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                        <span>{site.name}</span>
                        <span className="font-mono text-indigo-400">({site.siteId})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">{site.region} Region • {site.address || 'Telecom Facility'}</p>
                    </div>
                    <Badge variant="severity" severity={site.currentSeverity} />
                  </div>

                  {/* Hardware Devices List */}
                  <div className="mt-2">
                    <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                      <span>Constituent Nodes ({devices.length})</span>
                      <span className="text-slate-500 text-[9px]">Click to Inspect</span>
                    </p>

                    {isLoadingDevs ? (
                      <div className="py-2 text-center text-slate-500 text-[11px]">Loading nodes...</div>
                    ) : devices.length === 0 ? (
                      <div className="py-1 text-slate-500 text-[11px]">No hardware nodes registered</div>
                    ) : (
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {devices.map((d) => (
                          <button
                            key={d.deviceId}
                            onClick={() => onInspectNode(d.deviceId)}
                            className="w-full text-left p-1.5 rounded bg-slate-950/80 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/30 flex items-center justify-between text-xs transition-colors group"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <HardDrive className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 shrink-0" />
                              <span className="font-mono font-semibold text-slate-200 truncate text-[11px]">
                                {d.deviceId}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate">{d.type}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant="severity" severity={d.currentSeverity} className="text-[9px] py-0 px-1.5" />
                              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-slate-200" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default NetworkMap;

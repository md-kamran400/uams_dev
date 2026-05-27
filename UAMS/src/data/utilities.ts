export interface Utility {
  id: string;
  name: string;
  icon: string; // lucide icon name key — resolved in component
  status: 'operational' | 'alert' | 'offline';
  location: string;
  lastChecked: string;
  alert?: string;
}

export const UTILITIES: Utility[] = [
  {
    id: 'ht-electrical',
    name: 'HT Electrical',
    icon: 'ZapIcon',
    status: 'alert',
    location: 'Main Substation, Block A',
    lastChecked: '2 min ago',
    alert: 'Voltage fluctuation detected on Phase B — 12:34 PM',
  },
  {
    id: 'ht-factory',
    name: 'HT Factory',
    icon: 'FactoryIcon',
    status: 'operational',
    location: 'Factory Floor, Building 2',
    lastChecked: '5 min ago',
  },
  {
    id: 'energy-meter',
    name: 'Energy Meter',
    icon: 'GaugeIcon',
    status: 'alert',
    location: 'Utility Room, Ground Floor',
    lastChecked: '1 min ago',
    alert: 'Meter reading deviation >5% from baseline — requires inspection',
  },
  {
    id: 'diesel-generator',
    name: 'Diesel Generator',
    icon: 'PowerIcon',
    status: 'operational',
    location: 'Generator Bay, Block C',
    lastChecked: '8 min ago',
  },
  {
    id: 'ups',
    name: 'UPS',
    icon: 'BatteryChargingIcon',
    status: 'alert',
    location: 'Server Room, Level 1',
    lastChecked: '3 min ago',
    alert: 'Battery health degraded — 67% capacity remaining',
  },
  {
    id: 'compressors',
    name: 'Compressors',
    icon: 'WindIcon',
    status: 'operational',
    location: 'Compressor Hall, Block B',
    lastChecked: '10 min ago',
  },
  {
    id: 'hvac-systems',
    name: 'HVAC Systems',
    icon: 'AirVentIcon',
    status: 'alert',
    location: 'Roof Unit & Zone 3',
    lastChecked: '6 min ago',
    alert: 'Filter replacement due in Zone 3 — scheduled for tomorrow',
  },
  {
    id: 'fuel',
    name: 'Fuel',
    icon: 'FuelIcon',
    status: 'operational',
    location: 'Fuel Storage, Block D',
    lastChecked: '4 min ago',
  },
];

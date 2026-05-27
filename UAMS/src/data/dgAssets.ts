export interface DGAsset {
  id: string;
  assetTag: string;
  unitName: string;
  make: string;
  model: string;
  serialNumber: string;
  kvaRating: string;
  status: "operational" | "maintenance" | "offline";
  runningHours: number;
  lastServiceDate: string;
  nextServiceDue: number;
  installationDate: string;
  warrantyExpiry: string;
  ratedVoltage: string;
  ratedFrequency: string;
  ratedCurrent: string;
  fuelType: string;
  location: string;
  assignedEngineer: string;
}

export const DG_COLUMN_META: Array<{
  id: keyof DGAsset;
  label: string;
  defaultVisible: boolean;
}> = [
  { id: "assetTag", label: "Asset Tag", defaultVisible: true },
  { id: "unitName", label: "Unit Name", defaultVisible: true },
  { id: "make", label: "Make / Model", defaultVisible: true },
  { id: "kvaRating", label: "KVA Rating", defaultVisible: true },
  { id: "status", label: "Status", defaultVisible: true },
  { id: "runningHours", label: "Running Hours", defaultVisible: true },
  { id: "lastServiceDate", label: "Last Service", defaultVisible: true },
  { id: "location", label: "Location", defaultVisible: true },
  { id: "serialNumber", label: "Serial No.", defaultVisible: false },
  { id: "installationDate", label: "Installed On", defaultVisible: false },
  { id: "nextServiceDue", label: "Next Service (h)", defaultVisible: false },
  { id: "ratedVoltage", label: "Rated Voltage", defaultVisible: false },
  { id: "assignedEngineer", label: "Engineer", defaultVisible: false },
  { id: "warrantyExpiry", label: "Warranty Expiry", defaultVisible: false },
];

export const DG_ASSETS: DGAsset[] = [
  {
    id: "dg-001",
    assetTag: "DG-001",
    unitName: "DG Set - Main",
    make: "Kirloskar",
    model: "KG2-2500-WS",
    serialNumber: "KE2021001",
    kvaRating: "500 KVA",
    status: "operational",
    runningHours: 4820,
    lastServiceDate: "2024-11-15",
    nextServiceDue: 5000,
    installationDate: "2021-03-15",
    warrantyExpiry: "2026-03-15",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "694A",
    fuelType: "HSD",
    location: "Generator Bay, Block C",
    assignedEngineer: "Arjun Sharma",
  },
  {
    id: "dg-002",
    assetTag: "DG-002",
    unitName: "DG Set - Standby",
    make: "Cummins",
    model: "C500D5",
    serialNumber: "CM2019042",
    kvaRating: "500 KVA",
    status: "maintenance",
    runningHours: 3210,
    lastServiceDate: "2025-01-08",
    nextServiceDue: 3500,
    installationDate: "2019-08-20",
    warrantyExpiry: "2024-08-20",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "694A",
    fuelType: "HSD",
    location: "Generator Bay, Block C",
    assignedEngineer: "Ravi Kumar",
  },
  {
    id: "dg-003",
    assetTag: "DG-003",
    unitName: "DG Set - Auxiliary",
    make: "Perkins",
    model: "4006-23TAG3A",
    serialNumber: "PK2020078",
    kvaRating: "250 KVA",
    status: "operational",
    runningHours: 2890,
    lastServiceDate: "2024-12-20",
    nextServiceDue: 3000,
    installationDate: "2020-06-10",
    warrantyExpiry: "2025-06-10",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "347A",
    fuelType: "HSD",
    location: "Sub-Station, Block A",
    assignedEngineer: "Arjun Sharma",
  },
  {
    id: "dg-004",
    assetTag: "DG-004",
    unitName: "DG Set - Emergency",
    make: "Mahindra",
    model: "Powerol P110",
    serialNumber: "MP2022015",
    kvaRating: "100 KVA",
    status: "offline",
    runningHours: 1560,
    lastServiceDate: "2023-09-10",
    nextServiceDue: 2000,
    installationDate: "2022-01-25",
    warrantyExpiry: "2027-01-25",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "139A",
    fuelType: "HSD",
    location: "Server Room, Level 1",
    assignedEngineer: "Suresh Nair",
  },
  {
    id: "dg-005",
    assetTag: "DG-005",
    unitName: "DG Set - Process Load",
    make: "Caterpillar",
    model: "DE550GC",
    serialNumber: "CA2023099",
    kvaRating: "550 KVA",
    status: "operational",
    runningHours: 6102,
    lastServiceDate: "2025-02-01",
    nextServiceDue: 6500,
    installationDate: "2023-04-05",
    warrantyExpiry: "2028-04-05",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "763A",
    fuelType: "HSD",
    location: "Factory Floor, Block B",
    assignedEngineer: "Ravi Kumar",
  },
];

export interface CompressorAsset {
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

export const COMPRESSOR_COLUMN_META: Array<{
  id: keyof CompressorAsset;
  label: string;
  defaultVisible: boolean;
}> = [
  { id: "assetTag", label: "Asset Tag", defaultVisible: true },
  { id: "unitName", label: "Unit Name", defaultVisible: true },
  { id: "make", label: "Make / Model", defaultVisible: true },
  { id: "kvaRating", label: "kW Rating", defaultVisible: true },
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

export const COMPRESSOR_ASSETS: CompressorAsset[] = [
  {
    id: "cpr-001",
    assetTag: "CPR-001",
    unitName: "Compressor Unit - Main",
    make: "Atlas Copco",
    model: "GA 75 VSD+",
    serialNumber: "AC2023011",
    kvaRating: "75 kW",
    status: "operational",
    runningHours: 8420,
    lastServiceDate: "2025-03-02",
    nextServiceDue: 9000,
    installationDate: "2023-01-15",
    warrantyExpiry: "2028-01-15",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "125A",
    fuelType: "Electric",
    location: "Compressor Hall, Block B",
    assignedEngineer: "Nikhil Verma",
  },
  {
    id: "cpr-002",
    assetTag: "CPR-002",
    unitName: "Compressor Unit - Backup",
    make: "Ingersoll Rand",
    model: "SSR 45",
    serialNumber: "IR2021044",
    kvaRating: "45 kW",
    status: "maintenance",
    runningHours: 6230,
    lastServiceDate: "2025-04-12",
    nextServiceDue: 6600,
    installationDate: "2021-08-28",
    warrantyExpiry: "2026-08-28",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "90A",
    fuelType: "Electric",
    location: "Compressor Bay, Block A",
    assignedEngineer: "Priya Singh",
  },
  {
    id: "cpr-003",
    assetTag: "CPR-003",
    unitName: "Compressor Unit - Process",
    make: "Kaeser",
    model: "ASD 55",
    serialNumber: "KS2022059",
    kvaRating: "55 kW",
    status: "operational",
    runningHours: 7340,
    lastServiceDate: "2025-05-18",
    nextServiceDue: 7800,
    installationDate: "2022-05-30",
    warrantyExpiry: "2027-05-30",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "106A",
    fuelType: "Electric",
    location: "Production Line 3",
    assignedEngineer: "Anita Dutt",
  },
  {
    id: "cpr-004",
    assetTag: "CPR-004",
    unitName: "Compressor Unit - Chill",
    make: "Sullair",
    model: "LSA 75",
    serialNumber: "SL2022067",
    kvaRating: "75 kW",
    status: "offline",
    runningHours: 5120,
    lastServiceDate: "2024-12-01",
    nextServiceDue: 5600,
    installationDate: "2020-11-22",
    warrantyExpiry: "2025-11-22",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "125A",
    fuelType: "Electric",
    location: "Cooling Section, Block D",
    assignedEngineer: "Rohit Patel",
  },
  {
    id: "cpr-005",
    assetTag: "CPR-005",
    unitName: "Compressor Unit - Spare",
    make: "Hitachi",
    model: "Screw HE",
    serialNumber: "HT2024074",
    kvaRating: "37 kW",
    status: "operational",
    runningHours: 2110,
    lastServiceDate: "2025-02-20",
    nextServiceDue: 2500,
    installationDate: "2024-02-10",
    warrantyExpiry: "2029-02-10",
    ratedVoltage: "415V",
    ratedFrequency: "50Hz",
    ratedCurrent: "65A",
    fuelType: "Electric",
    location: "Maintenance Yard",
    assignedEngineer: "Sanjay Rao",
  },
];

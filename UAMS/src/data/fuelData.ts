// ─── Types ────────────────────────────────────────────────────────────────────

export type FuelType = 'HSD' | 'Petrol' | 'LPG' | 'CNG';
export type ConsumerType = 'Vehicle' | 'Forklift' | 'DG Set' | 'Other';
export type TransactionType = 'Receipt' | 'Dispensing';
export type Shift = 'A' | 'B' | 'C';
export type TankStatus = 'Active' | 'Maintenance' | 'Inactive';
export type ConsumerStatus = 'Active' | 'Inactive';

export interface FuelTank {
  id: string;
  tankId: string;
  name: string;
  fuelType: FuelType;
  capacityL: number;
  currentLevelL: number;
  location: string;
  status: TankStatus;
  lastInspected: string;
}

export interface FuelConsumer {
  id: string;
  consumerId: string;
  name: string;
  type: ConsumerType;
  registrationNo: string;
  department: string;
  fuelType: FuelType;
  tankCapacityL: number;
  status: ConsumerStatus;
}

export interface FuelTransaction {
  id: string;
  date: string;
  shift: Shift;
  type: TransactionType;
  // Receipt fields
  supplier?: string;
  invoiceNo?: string;
  // Dispensing fields
  consumerId?: string;
  consumerName?: string;
  operator?: string;
  odometerOrHours?: string;
  costCentre?: string;
  authorisedBy?: string;
  // Common
  fuelType: FuelType;
  tankId: string;
  tankName: string;
  quantityL: number;
  unitCostPerL?: number;
  remarks?: string;
}

// ─── Mock Tanks ───────────────────────────────────────────────────────────────

export const FUEL_TANKS: FuelTank[] = [
  {
    id: 'tank-1',
    tankId: 'TK-001',
    name: 'Main HSD Tank',
    fuelType: 'HSD',
    capacityL: 50000,
    currentLevelL: 32500,
    location: 'Fuel Storage, Block D',
    status: 'Active',
    lastInspected: '2026-04-10',
  },
  {
    id: 'tank-2',
    tankId: 'TK-002',
    name: 'Secondary HSD Tank',
    fuelType: 'HSD',
    capacityL: 25000,
    currentLevelL: 8200,
    location: 'Fuel Storage, Block D',
    status: 'Active',
    lastInspected: '2026-04-10',
  },
  {
    id: 'tank-3',
    tankId: 'TK-003',
    name: 'Petrol Reserve',
    fuelType: 'Petrol',
    capacityL: 5000,
    currentLevelL: 3100,
    location: 'Workshop Bay, Block B',
    status: 'Active',
    lastInspected: '2026-04-05',
  },
];

// ─── Mock Consumers ───────────────────────────────────────────────────────────

export const FUEL_CONSUMERS: FuelConsumer[] = [
  { id: 'c-1', consumerId: 'VH-001', name: 'Tata Ace - Logistics', type: 'Vehicle', registrationNo: 'GJ-05-AB-1234', department: 'Logistics', fuelType: 'HSD', tankCapacityL: 40, status: 'Active' },
  { id: 'c-2', consumerId: 'VH-002', name: 'Mahindra Bolero - Admin', type: 'Vehicle', registrationNo: 'GJ-05-CD-5678', department: 'Administration', fuelType: 'Petrol', tankCapacityL: 60, status: 'Active' },
  { id: 'c-3', consumerId: 'VH-003', name: 'Eicher Truck - Material', type: 'Vehicle', registrationNo: 'GJ-05-EF-9012', department: 'Production', fuelType: 'HSD', tankCapacityL: 120, status: 'Active' },
  { id: 'c-4', consumerId: 'FK-001', name: 'Toyota Forklift #1', type: 'Forklift', registrationNo: 'FK-2022-001', department: 'Warehouse', fuelType: 'HSD', tankCapacityL: 30, status: 'Active' },
  { id: 'c-5', consumerId: 'FK-002', name: 'Toyota Forklift #2', type: 'Forklift', registrationNo: 'FK-2022-002', department: 'Warehouse', fuelType: 'HSD', tankCapacityL: 30, status: 'Active' },
  { id: 'c-6', consumerId: 'FK-003', name: 'Kion Forklift #3', type: 'Forklift', registrationNo: 'FK-2023-001', department: 'Dispatch', fuelType: 'HSD', tankCapacityL: 28, status: 'Active' },
  { id: 'c-7', consumerId: 'DG-001', name: 'DG Set - Block A', type: 'DG Set', registrationNo: 'DG-2021-001', department: 'Utilities', fuelType: 'HSD', tankCapacityL: 500, status: 'Active' },
  { id: 'c-8', consumerId: 'DG-002', name: 'DG Set - Block C', type: 'DG Set', registrationNo: 'DG-2021-002', department: 'Utilities', fuelType: 'HSD', tankCapacityL: 500, status: 'Active' },
  { id: 'c-9', consumerId: 'OT-001', name: 'JCB - Civil Works', type: 'Other', registrationNo: 'JCB-2020-001', department: 'Maintenance', fuelType: 'HSD', tankCapacityL: 160, status: 'Inactive' },
];

// ─── Mock Transactions ────────────────────────────────────────────────────────

export const FUEL_TRANSACTIONS: FuelTransaction[] = [
  // Receipts
  { id: 'tx-1',  date: '2026-04-01', shift: 'A', type: 'Receipt',    supplier: 'HPCL',       invoiceNo: 'INV-2026-0401', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 10000, unitCostPerL: 92.5 },
  { id: 'tx-2',  date: '2026-04-08', shift: 'A', type: 'Receipt',    supplier: 'BPCL',       invoiceNo: 'INV-2026-0408', fuelType: 'HSD',    tankId: 'tank-2', tankName: 'Secondary HSD Tank', quantityL: 8000,  unitCostPerL: 92.8 },
  { id: 'tx-3',  date: '2026-04-15', shift: 'A', type: 'Receipt',    supplier: 'HPCL',       invoiceNo: 'INV-2026-0415', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 12000, unitCostPerL: 93.0 },
  { id: 'tx-4',  date: '2026-04-22', shift: 'B', type: 'Receipt',    supplier: 'HPCL',       invoiceNo: 'INV-2026-0422', fuelType: 'Petrol', tankId: 'tank-3', tankName: 'Petrol Reserve',     quantityL: 2000,  unitCostPerL: 103.5 },
  // Dispensing
  { id: 'tx-5',  date: '2026-04-02', shift: 'A', type: 'Dispensing', consumerId: 'c-7', consumerName: 'DG Set - Block A',    operator: 'Ravi Kumar',   odometerOrHours: '4820 h', costCentre: 'Utilities',      authorisedBy: 'S. Mehta', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 350 },
  { id: 'tx-6',  date: '2026-04-03', shift: 'B', type: 'Dispensing', consumerId: 'c-4', consumerName: 'Toyota Forklift #1', operator: 'Ankit Shah',   odometerOrHours: '1240 h', costCentre: 'Warehouse',      authorisedBy: 'P. Desai', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 25 },
  { id: 'tx-7',  date: '2026-04-04', shift: 'A', type: 'Dispensing', consumerId: 'c-3', consumerName: 'Eicher Truck',        operator: 'Mahesh Patel', odometerOrHours: '84320 km', costCentre: 'Production',   authorisedBy: 'S. Mehta', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 80 },
  { id: 'tx-8',  date: '2026-04-05', shift: 'C', type: 'Dispensing', consumerId: 'c-8', consumerName: 'DG Set - Block C',    operator: 'Ravi Kumar',   odometerOrHours: '3910 h', costCentre: 'Utilities',      authorisedBy: 'N. Joshi', fuelType: 'HSD',    tankId: 'tank-2', tankName: 'Secondary HSD Tank', quantityL: 420 },
  { id: 'tx-9',  date: '2026-04-06', shift: 'A', type: 'Dispensing', consumerId: 'c-1', consumerName: 'Tata Ace - Logistics',operator: 'Suresh Verma', odometerOrHours: '52100 km', costCentre: 'Logistics',    authorisedBy: 'P. Desai', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 35 },
  { id: 'tx-10', date: '2026-04-07', shift: 'B', type: 'Dispensing', consumerId: 'c-5', consumerName: 'Toyota Forklift #2', operator: 'Ankit Shah',   odometerOrHours: '980 h',  costCentre: 'Warehouse',      authorisedBy: 'P. Desai', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 22 },
  { id: 'tx-11', date: '2026-04-09', shift: 'A', type: 'Dispensing', consumerId: 'c-2', consumerName: 'Mahindra Bolero',     operator: 'Vijay Singh',  odometerOrHours: '63400 km', costCentre: 'Administration', authorisedBy: 'S. Mehta', fuelType: 'Petrol', tankId: 'tank-3', tankName: 'Petrol Reserve',     quantityL: 40 },
  { id: 'tx-12', date: '2026-04-10', shift: 'C', type: 'Dispensing', consumerId: 'c-7', consumerName: 'DG Set - Block A',    operator: 'Ravi Kumar',   odometerOrHours: '4960 h', costCentre: 'Utilities',      authorisedBy: 'N. Joshi', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 380 },
  { id: 'tx-13', date: '2026-04-12', shift: 'A', type: 'Dispensing', consumerId: 'c-6', consumerName: 'Kion Forklift #3',    operator: 'Dinesh Rao',   odometerOrHours: '760 h',  costCentre: 'Dispatch',       authorisedBy: 'P. Desai', fuelType: 'HSD',    tankId: 'tank-2', tankName: 'Secondary HSD Tank', quantityL: 20 },
  { id: 'tx-14', date: '2026-04-14', shift: 'B', type: 'Dispensing', consumerId: 'c-8', consumerName: 'DG Set - Block C',    operator: 'Ravi Kumar',   odometerOrHours: '4050 h', costCentre: 'Utilities',      authorisedBy: 'N. Joshi', fuelType: 'HSD',    tankId: 'tank-2', tankName: 'Secondary HSD Tank', quantityL: 400 },
  { id: 'tx-15', date: '2026-04-16', shift: 'A', type: 'Dispensing', consumerId: 'c-3', consumerName: 'Eicher Truck',        operator: 'Mahesh Patel', odometerOrHours: '84640 km', costCentre: 'Production',   authorisedBy: 'S. Mehta', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 90 },
  { id: 'tx-16', date: '2026-04-18', shift: 'C', type: 'Dispensing', consumerId: 'c-7', consumerName: 'DG Set - Block A',    operator: 'Ravi Kumar',   odometerOrHours: '5100 h', costCentre: 'Utilities',      authorisedBy: 'S. Mehta', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 360 },
  { id: 'tx-17', date: '2026-04-20', shift: 'A', type: 'Dispensing', consumerId: 'c-1', consumerName: 'Tata Ace - Logistics',operator: 'Suresh Verma', odometerOrHours: '52480 km', costCentre: 'Logistics',    authorisedBy: 'P. Desai', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 38 },
  { id: 'tx-18', date: '2026-04-22', shift: 'B', type: 'Dispensing', consumerId: 'c-4', consumerName: 'Toyota Forklift #1', operator: 'Ankit Shah',   odometerOrHours: '1350 h', costCentre: 'Warehouse',      authorisedBy: 'P. Desai', fuelType: 'HSD',    tankId: 'tank-1', tankName: 'Main HSD Tank',      quantityL: 27 },
  { id: 'tx-19', date: '2026-04-23', shift: 'A', type: 'Dispensing', consumerId: 'c-2', consumerName: 'Mahindra Bolero',     operator: 'Vijay Singh',  odometerOrHours: '63820 km', costCentre: 'Administration', authorisedBy: 'S. Mehta', fuelType: 'Petrol', tankId: 'tank-3', tankName: 'Petrol Reserve',     quantityL: 45 },
  { id: 'tx-20', date: '2026-04-24', shift: 'A', type: 'Dispensing', consumerId: 'c-8', consumerName: 'DG Set - Block C',    operator: 'Ravi Kumar',   odometerOrHours: '4200 h', costCentre: 'Utilities',      authorisedBy: 'N. Joshi', fuelType: 'HSD',    tankId: 'tank-2', tankName: 'Secondary HSD Tank', quantityL: 390 },
];

// ─── Column Meta ─────────────────────────────────────────────────────────────

export const TRANSACTION_COLUMN_META: Array<{ id: keyof FuelTransaction; label: string; defaultVisible: boolean }> = [
  { id: 'date',         label: 'Date',           defaultVisible: true },
  { id: 'shift',        label: 'Shift',          defaultVisible: true },
  { id: 'type',         label: 'Type',           defaultVisible: true },
  { id: 'fuelType',     label: 'Fuel Type',      defaultVisible: true },
  { id: 'tankName',     label: 'Tank',           defaultVisible: true },
  { id: 'quantityL',    label: 'Qty (L)',         defaultVisible: true },
  { id: 'supplier',     label: 'Supplier',       defaultVisible: false },
  { id: 'invoiceNo',    label: 'Invoice No.',    defaultVisible: false },
  { id: 'consumerName', label: 'Consumer',       defaultVisible: true },
  { id: 'operator',     label: 'Operator',       defaultVisible: false },
  { id: 'costCentre',   label: 'Cost Centre',    defaultVisible: true },
  { id: 'authorisedBy', label: 'Authorised By',  defaultVisible: false },
  { id: 'unitCostPerL', label: 'Unit Cost (₹/L)', defaultVisible: false },
];

export const TANK_COLUMN_META: Array<{ id: keyof FuelTank; label: string; defaultVisible: boolean }> = [
  { id: 'tankId',        label: 'Tank ID',       defaultVisible: true },
  { id: 'name',          label: 'Name',          defaultVisible: true },
  { id: 'fuelType',      label: 'Fuel Type',     defaultVisible: true },
  { id: 'capacityL',     label: 'Capacity (L)',  defaultVisible: true },
  { id: 'currentLevelL', label: 'Current (L)',   defaultVisible: true },
  { id: 'location',      label: 'Location',      defaultVisible: true },
  { id: 'status',        label: 'Status',        defaultVisible: true },
  { id: 'lastInspected', label: 'Last Inspected',defaultVisible: false },
];

export const CONSUMER_COLUMN_META: Array<{ id: keyof FuelConsumer; label: string; defaultVisible: boolean }> = [
  { id: 'consumerId',     label: 'ID',            defaultVisible: true },
  { id: 'name',           label: 'Name',          defaultVisible: true },
  { id: 'type',           label: 'Type',          defaultVisible: true },
  { id: 'registrationNo', label: 'Reg. No.',      defaultVisible: true },
  { id: 'department',     label: 'Department',    defaultVisible: true },
  { id: 'fuelType',       label: 'Fuel Type',     defaultVisible: true },
  { id: 'tankCapacityL',  label: 'Tank Cap. (L)', defaultVisible: false },
  { id: 'status',         label: 'Status',        defaultVisible: true },
];

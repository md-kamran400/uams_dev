// dummyDGData.ts

// Types
export interface KPIStats {
  totalRuntime: number;
  totalEnergy: number;
  totalDiesel: number;
  avgEfficiency: number;
  avgFuelPerHour: number;
  avgEnergyPerHour: number;
}

export interface RuntimeData {
  date: string;
  runtime: number;
}

export interface FuelEnergyData {
  date: string;
  fuel: number;
  energy: number;
}

export interface EfficiencyData {
  date: string;
  efficiency: number;
}

export interface LoadFactorData {
  month: string;
  loadFactor: number;
}

export interface TempPressureData {
  date: string;
  oilTemp: number;
  coolantTemp: number;
  oilPressure: number;
}

export interface ShiftData {
  shift: string;
  runtime: number;
  efficiency: number;
}

export interface MonthlySummary {
  month: string;
  runtime: number;
  energy: number;
  diesel: number;
  efficiency: number;
  fuelPerHour: number;
  loadFactor: number;
}

export interface DailyLog {
  date: string;
  runningTime: number;
  totalKWH: number;
  hsdConsumed: number;
  oilPressure: number;
  oilTemperature: number;
  coolantTemperature: number;
  loadFactor: number;
}

// Daily operational logs (last 30 days)
export const DGDailyLog: DailyLog[] = [
  { date: '2026-03-01', runningTime: 8.5, totalKWH: 2975, hsdConsumed: 743.75, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 70 },
  { date: '2026-03-02', runningTime: 8.2, totalKWH: 2870, hsdConsumed: 717.5, oilPressure: 53, oilTemperature: 84, coolantTemperature: 77, loadFactor: 69 },
  { date: '2026-03-03', runningTime: 9.0, totalKWH: 3150, hsdConsumed: 787.5, oilPressure: 51, oilTemperature: 86, coolantTemperature: 79, loadFactor: 71 },
  { date: '2026-03-04', runningTime: 7.8, totalKWH: 2730, hsdConsumed: 682.5, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 68 },
  { date: '2026-03-05', runningTime: 8.3, totalKWH: 2905, hsdConsumed: 726.25, oilPressure: 50, oilTemperature: 87, coolantTemperature: 80, loadFactor: 69 },
  { date: '2026-03-06', runningTime: 8.0, totalKWH: 2800, hsdConsumed: 700, oilPressure: 51, oilTemperature: 86, coolantTemperature: 78, loadFactor: 70 },
  { date: '2026-03-07', runningTime: 7.5, totalKWH: 2625, hsdConsumed: 656.25, oilPressure: 52, oilTemperature: 84, coolantTemperature: 77, loadFactor: 67 },
  { date: '2026-03-08', runningTime: 8.6, totalKWH: 3010, hsdConsumed: 752.5, oilPressure: 51, oilTemperature: 85, coolantTemperature: 78, loadFactor: 70 },
  { date: '2026-03-09', runningTime: 8.9, totalKWH: 3115, hsdConsumed: 778.75, oilPressure: 50, oilTemperature: 86, coolantTemperature: 79, loadFactor: 71 },
  { date: '2026-03-10', runningTime: 8.1, totalKWH: 2835, hsdConsumed: 708.75, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 69 },
  { date: '2026-03-11', runningTime: 7.9, totalKWH: 2765, hsdConsumed: 691.25, oilPressure: 53, oilTemperature: 84, coolantTemperature: 77, loadFactor: 68 },
  { date: '2026-03-12', runningTime: 8.4, totalKWH: 2940, hsdConsumed: 735, oilPressure: 51, oilTemperature: 85, coolantTemperature: 78, loadFactor: 70 },
  { date: '2026-03-13', runningTime: 8.7, totalKWH: 3045, hsdConsumed: 761.25, oilPressure: 50, oilTemperature: 86, coolantTemperature: 79, loadFactor: 71 },
  { date: '2026-03-14', runningTime: 7.6, totalKWH: 2660, hsdConsumed: 665, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 67 },
  { date: '2026-03-15', runningTime: 8.2, totalKWH: 2870, hsdConsumed: 717.5, oilPressure: 51, oilTemperature: 84, coolantTemperature: 77, loadFactor: 69 },
  { date: '2026-03-16', runningTime: 8.0, totalKWH: 2800, hsdConsumed: 700, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 70 },
  { date: '2026-03-17', runningTime: 8.5, totalKWH: 2975, hsdConsumed: 743.75, oilPressure: 51, oilTemperature: 86, coolantTemperature: 79, loadFactor: 70 },
  { date: '2026-03-18', runningTime: 9.1, totalKWH: 3185, hsdConsumed: 796.25, oilPressure: 50, oilTemperature: 87, coolantTemperature: 80, loadFactor: 72 },
  { date: '2026-03-19', runningTime: 7.7, totalKWH: 2695, hsdConsumed: 673.75, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 68 },
  { date: '2026-03-20', runningTime: 8.3, totalKWH: 2905, hsdConsumed: 726.25, oilPressure: 51, oilTemperature: 84, coolantTemperature: 77, loadFactor: 69 },
  { date: '2026-03-21', runningTime: 8.8, totalKWH: 3080, hsdConsumed: 770, oilPressure: 50, oilTemperature: 86, coolantTemperature: 79, loadFactor: 71 },
  { date: '2026-03-22', runningTime: 7.4, totalKWH: 2590, hsdConsumed: 647.5, oilPressure: 53, oilTemperature: 84, coolantTemperature: 77, loadFactor: 67 },
  { date: '2026-03-23', runningTime: 8.1, totalKWH: 2835, hsdConsumed: 708.75, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 69 },
  { date: '2026-03-24', runningTime: 8.6, totalKWH: 3010, hsdConsumed: 752.5, oilPressure: 51, oilTemperature: 86, coolantTemperature: 79, loadFactor: 70 },
  { date: '2026-03-25', runningTime: 7.9, totalKWH: 2765, hsdConsumed: 691.25, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 68 },
  { date: '2026-03-26', runningTime: 8.4, totalKWH: 2940, hsdConsumed: 735, oilPressure: 51, oilTemperature: 84, coolantTemperature: 77, loadFactor: 70 },
  { date: '2026-03-27', runningTime: 8.0, totalKWH: 2800, hsdConsumed: 700, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 69 },
  { date: '2026-03-28', runningTime: 8.7, totalKWH: 3045, hsdConsumed: 761.25, oilPressure: 50, oilTemperature: 86, coolantTemperature: 79, loadFactor: 71 },
  { date: '2026-03-29', runningTime: 9.2, totalKWH: 3220, hsdConsumed: 805, oilPressure: 49, oilTemperature: 88, coolantTemperature: 81, loadFactor: 73 },
  { date: '2026-03-30', runningTime: 7.8, totalKWH: 2730, hsdConsumed: 682.5, oilPressure: 52, oilTemperature: 85, coolantTemperature: 78, loadFactor: 68 },
];

// 1. Runtime Trend Data (last 30 days)
export const DGRuntimeData: RuntimeData[] = DGDailyLog.map(log => ({
  date: log.date.slice(5),
  runtime: log.runningTime,
}));

// 2. Fuel vs Energy Comparison Data (last 15 days)
export const DGFuelEnergyData: FuelEnergyData[] = DGDailyLog.slice(-15).map(log => ({
  date: log.date.slice(5),
  fuel: log.hsdConsumed,
  energy: log.totalKWH,
}));

// 3. Efficiency Trend Data (last 30 days)
export const DGEfficiencyData: EfficiencyData[] = DGDailyLog.map(log => ({
  date: log.date.slice(5),
  efficiency: parseFloat((log.totalKWH / log.hsdConsumed).toFixed(2)),
}));

// 4. Load Factor Distribution (monthly)
export const DGLoadFactorData: LoadFactorData[] = [
  { month: 'Jan', loadFactor: 65 },
  { month: 'Feb', loadFactor: 67 },
  { month: 'Mar', loadFactor: 69 },
  { month: 'Apr', loadFactor: 72 },
  { month: 'May', loadFactor: 71 },
  { month: 'Jun', loadFactor: 68 },
  { month: 'Jul', loadFactor: 70 },
  { month: 'Aug', loadFactor: 66 },
  { month: 'Sep', loadFactor: 64 },
  { month: 'Oct', loadFactor: 67 },
  { month: 'Nov', loadFactor: 69 },
  { month: 'Dec', loadFactor: 68 },
];

// 5. Temperature & Pressure Trends (last 15 days)
export const DGTemperaturePressureData: TempPressureData[] = DGDailyLog.slice(-15).map(log => ({
  date: log.date.slice(5),
  oilTemp: log.oilTemperature,
  coolantTemp: log.coolantTemperature,
  oilPressure: log.oilPressure,
}));

// 6. Shift-wise Comparison Data
export const DGShiftData: ShiftData[] = [
  { shift: 'Morning (6AM-2PM)', runtime: 245, efficiency: 3.95 },
  { shift: 'Evening (2PM-10PM)', runtime: 268, efficiency: 4.02 },
  { shift: 'Night (10PM-6AM)', runtime: 187, efficiency: 3.88 },
];

// 7. Monthly Summary Table
export const DGMonthlySummary: MonthlySummary[] = [
  { month: 'Jan 2026', runtime: 245, energy: 85750, diesel: 21437, efficiency: 4.00, fuelPerHour: 87.5, loadFactor: 65 },
  { month: 'Feb 2026', runtime: 238, energy: 83300, diesel: 20825, efficiency: 4.00, fuelPerHour: 87.5, loadFactor: 67 },
  { month: 'Mar 2026', runtime: 260, energy: 91000, diesel: 22750, efficiency: 4.00, fuelPerHour: 87.5, loadFactor: 69 },
  { month: 'Apr 2026', runtime: 252, energy: 90720, diesel: 22680, efficiency: 4.00, fuelPerHour: 90.0, loadFactor: 72 },
  { month: 'May 2026', runtime: 248, energy: 86800, diesel: 21700, efficiency: 4.00, fuelPerHour: 87.5, loadFactor: 71 },
];
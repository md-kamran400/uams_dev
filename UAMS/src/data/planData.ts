// planData.ts

export interface ScheduleEntry {
  id: string;
  equipmentNo: string;
  equipmentDescription: string;
  frequency: "M" | "Q" | "HY" | "Y";
  year?: string;
  scheduleDate?: string;
  monthlyData: {
    [key: string]: {
      plan: string;
      actual: string;
    };
  };
  remarks: string;
}

export interface PlanType {
  id: string;
  planId: string;
  planName: string;
  year: string;
  assets: number;
  active: "active" | "inactive" | "draft";
  scheduleData?: ScheduleEntry[]; // Optional schedule data for the plan
}

export const COLUMN_META_PLAN = [
  { id: "planId", label: "Plan ID", defaultVisible: true },
  { id: "planName", label: "Plan Name", defaultVisible: true },
  { id: "year", label: "Year", defaultVisible: true },
  { id: "assets", label: "Assets", defaultVisible: true },
  { id: "active", label: "Active", defaultVisible: true },
];

// Sample schedule data for different plans
const getSampleScheduleData = (planId: string): ScheduleEntry[] => {
  const commonEquipment = {
    "PLAN-001": [
      {
        id: "sched-1",
        equipmentNo: "DG-001",
        equipmentDescription: "Diesel Generator Set - Main",
        frequency: "M" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Regular monthly maintenance",
      },
      {
        id: "sched-2",
        equipmentNo: "DG-002",
        equipmentDescription: "Diesel Generator Set - Backup",
        frequency: "Q" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Quarterly inspection",
      },
      {
        id: "sched-3",
        equipmentNo: "HVAC-01",
        equipmentDescription: "HVAC System - Block A",
        frequency: "HY" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Half-yearly servicing",
      },
    ],
    "PLAN-002": [
      {
        id: "sched-4",
        equipmentNo: "DG-003",
        equipmentDescription: "Diesel Generator - Tower 1",
        frequency: "Q" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Quarterly generator check",
      },
      {
        id: "sched-5",
        equipmentNo: "DG-004",
        equipmentDescription: "Diesel Generator - Tower 2",
        frequency: "Q" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Quarterly generator check",
      },
    ],
    "PLAN-003": [
      {
        id: "sched-6",
        equipmentNo: "HVAC-02",
        equipmentDescription: "HVAC System - Block B",
        frequency: "HY" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Bi-annual HVAC service",
      },
      {
        id: "sched-7",
        equipmentNo: "HVAC-03",
        equipmentDescription: "HVAC System - Block C",
        frequency: "Y" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Annual comprehensive check",
      },
    ],
    "PLAN-004": [
      {
        id: "sched-8",
        equipmentNo: "DG-001",
        equipmentDescription: "Diesel Generator Set - Main",
        frequency: "M" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Pre-monsoon readiness",
      },
      {
        id: "sched-9",
        equipmentNo: "DG-003",
        equipmentDescription: "Diesel Generator - Tower 1",
        frequency: "M" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Pre-monsoon inspection",
      },
      {
        id: "sched-10",
        equipmentNo: "HVAC-01",
        equipmentDescription: "HVAC System - Block A",
        frequency: "M" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Pre-monsoon check",
      },
    ],
    "PLAN-005": [
      {
        id: "sched-11",
        equipmentNo: "DG-002",
        equipmentDescription: "Diesel Generator Set - Backup",
        frequency: "Q" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Emergency drill preparation",
      },
      {
        id: "sched-12",
        equipmentNo: "DG-004",
        equipmentDescription: "Diesel Generator - Tower 2",
        frequency: "Q" as const,
        monthlyData: generateSampleMonthlyData(),
        remarks: "Emergency response test",
      },
    ],
  };

  return commonEquipment[planId as keyof typeof commonEquipment] || [];
};

// Helper function to generate sample monthly data
export const generateSampleMonthlyData = () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const sampleData: { [key: string]: { plan: string; actual: string } } = {};

  months.forEach((month) => {
    sampleData[month] = {
      plan: Math.random() > 0.5 ? "--" : "—",
      actual: Math.random() > 0.5 ? "--" : "—",
    };
  });

  return sampleData;
};

export const PLANS_DATA: PlanType[] = [
  {
    id: "plan-1",
    planId: "PLAN-001",
    planName: "Annual Maintenance Plan",
    year: "2024",
    assets: 40,
    active: "active",
    scheduleData: getSampleScheduleData("PLAN-001"),
  },
  {
    id: "plan-2",
    planId: "PLAN-002",
    planName: "Quarterly Generator Check",
    year: "2024",
    assets: 55,
    active: "inactive",
    scheduleData: getSampleScheduleData("PLAN-002"),

    // assets: ["DG-003", "DG-004", "DG-005"],
    // active: "active",
    // scheduleData: getSampleScheduleData("PLAN-002"),
  },
  {
    id: "plan-3",
    planId: "PLAN-003",
    planName: "Bi-Annual HVAC Service",
    year: "2025",
    assets: 30,
    active: "inactive",
    scheduleData: getSampleScheduleData("PLAN-003"),
    // assets: ["HVAC-02", "HVAC-03"],
    // active: "draft",
    // scheduleData: getSampleScheduleData("PLAN-003"),
  },
  {
    id: "plan-4",
    planId: "PLAN-004",
    planName: "Pre-Monsoon Inspection",
    year: "2025",
    assets: 25,
    active: "inactive",
    scheduleData: getSampleScheduleData("PLAN-004"),
  },
  {
    id: "plan-5",
    planId: "PLAN-005",
    planName: "Emergency Response Drill",
    year: "2024",
    assets: 12,
    active: "inactive",
    scheduleData: getSampleScheduleData("PLAN-005"),
  },
];

// Helper function to get plan by ID with its schedule data
export const getPlanById = (id: string): PlanType | undefined => {
  return PLANS_DATA.find((plan) => plan.id === id);
};

// Helper function to update plan schedule data
export const updatePlanScheduleData = (
  planId: string,
  scheduleData: ScheduleEntry[],
): void => {
  const planIndex = PLANS_DATA.findIndex((plan) => plan.id === planId);
  if (planIndex !== -1) {
    PLANS_DATA[planIndex].scheduleData = scheduleData;
  }
};

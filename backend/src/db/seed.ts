import "dotenv/config";
import { db, pool } from "./index.js";
import {
  users,
  sites,
  plants,
  areas,
  utilityTypes,
  utFields,
  utKpis,
  utAlertRules,
  utComponents,
  assets,
  spares,
  pmPlans,
  assetComponents,
  assetFiles,
} from "./schema.js";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function ensureUmsDevDatabase() {
  const result = await pool.query(
    "SELECT current_database() AS current_database",
  );
  const currentDb = result.rows?.[0]?.current_database;
  if (currentDb !== "Ums_dev") {
    console.warn(
      `Skipping seed: connected database is "${currentDb}" not "Ums_dev".`,
    );
    process.exit(0);
  }
}

async function seed() {
  await ensureUmsDevDatabase();
  console.log("🌱 Seeding UAMS database...");

  // Check if data already exists
  const [existingUser] = await db.select().from(users).limit(1);
  if (existingUser) {
    console.log(
      "✅ Data already exists. Updating Vikram to engineer and skipping full seed.",
    );
    await db.execute(
      sql`UPDATE users SET role = 'engineer' WHERE email = 'vikram@adani.com'`,
    );
    process.exit(0);
  }

  // ── Users ────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 10);
  const operatorHash = await bcrypt.hash("operator123", 10);

  const [admin] = await db
    .insert(users)
    .values({
      name: "Priya Patel",
      email: "priya@adani.com",
      passwordHash: adminHash,
      role: "admin",
      shift: "A",
    })
    .returning();

  const [approver] = await db
    .insert(users)
    .values({
      name: "Mahendra Sahu",
      email: "mahendra@adani.com",
      passwordHash: adminHash,
      role: "approver",
      shift: "A",
    })
    .returning();

  const [reviewer] = await db
    .insert(users)
    .values({
      name: "Ankit Sharma",
      email: "ankit@adani.com",
      passwordHash: operatorHash,
      role: "reviewer",
      shift: "B",
    })
    .returning();

  const [op1] = await db
    .insert(users)
    .values({
      name: "Rajesh Kumar",
      email: "rajesh@adani.com",
      passwordHash: operatorHash,
      role: "operator",
      shift: "A",
    })
    .returning();

  await db.insert(users).values({
    name: "Vikram Singh",
    email: "vikram@adani.com",
    passwordHash: operatorHash,
    role: "engineer",
    shift: "C",
  });

  // ── Sites / Plants / Areas ───────────────────────────────
  const [site] = await db
    .insert(sites)
    .values({ name: "Kanpur Factory" })
    .returning();
  const [plant1] = await db
    .insert(plants)
    .values({ siteId: site.id, name: "Main Plant" })
    .returning();
  const [plant2] = await db
    .insert(plants)
    .values({ siteId: site.id, name: "Assembly Unit" })
    .returning();
  const [area1] = await db
    .insert(areas)
    .values({ plantId: plant1.id, name: "Electrical Building" })
    .returning();
  const [area2] = await db
    .insert(areas)
    .values({ plantId: plant1.id, name: "Factory Building" })
    .returning();
  const [area3] = await db
    .insert(areas)
    .values({ plantId: plant1.id, name: "Main Electrical Room" })
    .returning();
  await db.insert(areas).values({ plantId: plant2.id, name: "Assembly Floor" });
  await db.insert(areas).values({ plantId: plant2.id, name: "Testing Lab" });

  // ── Utility Types ────────────────────────────────────────
  const [dgType] = await db
    .insert(utilityTypes)
    .values({
      name: "DG Set",
      icon: "ZapIcon",
      category: "Power",
      description: "Diesel Generator backup power systems",
    })
    .returning();

  const [htType] = await db
    .insert(utilityTypes)
    .values({
      name: "HT Electrical Bldg",
      icon: "Building2Icon",
      category: "Power",
      description: "11KV RMU & 315 KVA Transformer — Electrical Building",
    })
    .returning();

  const [upsType] = await db
    .insert(utilityTypes)
    .values({
      name: "UPS Systems",
      icon: "BatteryChargingIcon",
      category: "Power",
      description: "2× 600 KVA Uninterruptible Power Supply systems",
    })
    .returning();

  // ── DG Fields ────────────────────────────────────────────
  await db.insert(utFields).values([
    {
      utilityTypeId: dgType.id,
      name: "Start Time",
      type: "time",
      unit: "",
      required: true,
      computed: false,
      sortOrder: 1,
    },
    {
      utilityTypeId: dgType.id,
      name: "Stop Time",
      type: "time",
      unit: "",
      required: true,
      computed: false,
      sortOrder: 2,
    },
    {
      utilityTypeId: dgType.id,
      name: "Running Time",
      type: "number",
      unit: "hrs",
      required: true,
      computed: true,
      formula: "Stop Time - Start Time",
      sortOrder: 3,
    },
    {
      utilityTypeId: dgType.id,
      name: "HSD Start",
      type: "number",
      unit: "L",
      required: true,
      computed: false,
      sortOrder: 4,
    },
    {
      utilityTypeId: dgType.id,
      name: "HSD Stop",
      type: "number",
      unit: "L",
      required: true,
      computed: false,
      sortOrder: 5,
    },
    {
      utilityTypeId: dgType.id,
      name: "HSD Consumed",
      type: "number",
      unit: "L",
      required: true,
      computed: true,
      formula: "HSD Start - HSD Stop",
      sortOrder: 6,
    },
    {
      utilityTypeId: dgType.id,
      name: "Start KWH",
      type: "number",
      unit: "kWh",
      required: true,
      computed: false,
      sortOrder: 7,
    },
    {
      utilityTypeId: dgType.id,
      name: "Stop KWH",
      type: "number",
      unit: "kWh",
      required: true,
      computed: false,
      sortOrder: 8,
    },
    {
      utilityTypeId: dgType.id,
      name: "Total KWH",
      type: "number",
      unit: "kWh",
      required: true,
      computed: true,
      formula: "Stop KWH - Start KWH",
      sortOrder: 9,
    },
    {
      utilityTypeId: dgType.id,
      name: "Current",
      type: "number",
      unit: "A",
      required: true,
      computed: false,
      sortOrder: 10,
    },
    {
      utilityTypeId: dgType.id,
      name: "Voltage",
      type: "number",
      unit: "V",
      required: true,
      computed: false,
      sortOrder: 11,
    },
    {
      utilityTypeId: dgType.id,
      name: "Frequency",
      type: "number",
      unit: "Hz",
      required: true,
      computed: false,
      sortOrder: 12,
    },
    {
      utilityTypeId: dgType.id,
      name: "Oil Pressure",
      type: "number",
      unit: "Bar",
      required: true,
      computed: false,
      sortOrder: 13,
    },
    {
      utilityTypeId: dgType.id,
      name: "Oil Temperature",
      type: "number",
      unit: "°C",
      required: true,
      computed: false,
      sortOrder: 14,
    },
    {
      utilityTypeId: dgType.id,
      name: "Coolant Temp",
      type: "number",
      unit: "°C",
      required: true,
      computed: false,
      sortOrder: 15,
    },
    {
      utilityTypeId: dgType.id,
      name: "Hour Meter Start",
      type: "number",
      unit: "hrs",
      required: false,
      computed: false,
      sortOrder: 16,
    },
    {
      utilityTypeId: dgType.id,
      name: "Weather",
      type: "dropdown",
      unit: "",
      required: false,
      computed: false,
      options: ["Clear", "Cloudy", "Rainy", "Stormy"],
      sortOrder: 17,
    },
    {
      utilityTypeId: dgType.id,
      name: "Remarks",
      type: "text",
      unit: "",
      required: false,
      computed: false,
      sortOrder: 18,
    },
  ]);

  await db.insert(utKpis).values([
    {
      utilityTypeId: dgType.id,
      name: "DG Efficiency",
      formula: "Total KWH / HSD Consumed",
      unit: "kWh/L",
      alertBelow: "2.8",
      target: "3.2",
      recommendedChart: "area",
    },
    {
      utilityTypeId: dgType.id,
      name: "Fuel per Hour",
      formula: "HSD Consumed / Running Time",
      unit: "L/hr",
      alertAbove: "25",
      recommendedChart: "line",
    },
    {
      utilityTypeId: dgType.id,
      name: "Load Factor",
      formula: "(Current × Voltage × 1.732) / (Rated_KVA × 1000) × 100",
      unit: "%",
      alertBelow: "40",
      alertAbove: "90",
      recommendedChart: "radial",
    },
  ]);

  await db.insert(utAlertRules).values([
    {
      utilityTypeId: dgType.id,
      name: "Low Efficiency",
      fieldName: "DG Efficiency",
      condition: "<",
      value: "2.8",
      severity: "high",
      action: "Check fuel quality and engine load.",
    },
    {
      utilityTypeId: dgType.id,
      name: "Oil Pressure Drop",
      fieldName: "Oil Pressure",
      condition: "<",
      value: "2.0",
      severity: "critical",
      action: "STOP DG immediately. Check oil level.",
    },
    {
      utilityTypeId: dgType.id,
      name: "High Oil Temperature",
      fieldName: "Oil Temperature",
      condition: ">",
      value: "100",
      severity: "critical",
      action: "Risk of engine seizure. Schedule immediate inspection.",
    },
    {
      utilityTypeId: dgType.id,
      name: "High Coolant Temp",
      fieldName: "Coolant Temp",
      condition: ">",
      value: "90",
      severity: "high",
      action: "Check coolant level and radiator.",
    },
    {
      utilityTypeId: dgType.id,
      name: "Voltage Out of Range",
      fieldName: "Voltage",
      condition: "<",
      value: "400",
      severity: "medium",
      action: "Check AVR settings.",
    },
    {
      utilityTypeId: dgType.id,
      name: "High Fuel Rate",
      fieldName: "Fuel per Hour",
      condition: ">",
      value: "25",
      severity: "high",
      action: "Inspect injectors and air filter.",
    },
  ]);

  await db.insert(utComponents).values([
    {
      utilityTypeId: dgType.id,
      name: "Engine Block",
      subcomponents: [
        "Piston Assembly",
        "Crankshaft",
        "Cylinder Liner",
        "Connecting Rod",
      ],
    },
    {
      utilityTypeId: dgType.id,
      name: "Alternator",
      subcomponents: ["Rotor", "Stator", "AVR", "Bearings"],
    },
    {
      utilityTypeId: dgType.id,
      name: "Cooling System",
      subcomponents: ["Radiator", "Water Pump", "Thermostat", "Fan Belt"],
    },
    {
      utilityTypeId: dgType.id,
      name: "Fuel System",
      subcomponents: ["Fuel Pump", "Injectors", "Fuel Filter", "Fuel Tank"],
    },
    {
      utilityTypeId: dgType.id,
      name: "Electrical System",
      subcomponents: [
        "Battery",
        "Starter Motor",
        "Alternator Winding",
        "Control Panel",
      ],
    },
  ]);

  // ── HT Fields ─────────────────────────────────────────────
  await db.insert(utFields).values([
    {
      utilityTypeId: htType.id,
      name: "Feeder Voltage",
      type: "number",
      unit: "kV",
      required: true,
      sortOrder: 1,
    },
    {
      utilityTypeId: htType.id,
      name: "Feeder Current",
      type: "number",
      unit: "A",
      required: true,
      sortOrder: 2,
    },
    {
      utilityTypeId: htType.id,
      name: "Feeder kW",
      type: "number",
      unit: "kW",
      required: true,
      sortOrder: 3,
    },
    {
      utilityTypeId: htType.id,
      name: "Power Factor",
      type: "number",
      unit: "",
      required: true,
      sortOrder: 4,
    },
    {
      utilityTypeId: htType.id,
      name: "TR Winding Temp",
      type: "number",
      unit: "°C",
      required: true,
      sortOrder: 5,
    },
    {
      utilityTypeId: htType.id,
      name: "MDB Voltage",
      type: "number",
      unit: "V",
      required: true,
      sortOrder: 6,
    },
    {
      utilityTypeId: htType.id,
      name: "MDB kW",
      type: "number",
      unit: "kW",
      required: true,
      sortOrder: 7,
    },
    {
      utilityTypeId: htType.id,
      name: "Battery Charger Mode",
      type: "dropdown",
      unit: "",
      required: true,
      options: ["Trickle", "Boost"],
      sortOrder: 8,
    },
    {
      utilityTypeId: htType.id,
      name: "DG Running",
      type: "dropdown",
      unit: "",
      required: true,
      options: ["Running", "Off"],
      sortOrder: 9,
    },
    {
      utilityTypeId: htType.id,
      name: "Weather",
      type: "dropdown",
      unit: "",
      required: false,
      options: ["Dry", "Cloudy", "Rainy", "Stormy", "Windy"],
      sortOrder: 10,
    },
    {
      utilityTypeId: htType.id,
      name: "Remarks",
      type: "text",
      unit: "",
      required: false,
      sortOrder: 11,
    },
  ]);

  await db.insert(utKpis).values([
    {
      utilityTypeId: htType.id,
      name: "Avg Power Factor",
      formula: "Average of Power Factor readings",
      unit: "",
      alertBelow: "0.90",
      target: "0.95",
      recommendedChart: "line",
    },
    {
      utilityTypeId: htType.id,
      name: "Transformer Loading",
      formula: "(Feeder kW / 315) × 100",
      unit: "%",
      alertAbove: "85",
      recommendedChart: "radial",
    },
    {
      utilityTypeId: htType.id,
      name: "Winding Temp Trend",
      formula: "TR Winding Temp over time",
      unit: "°C",
      alertAbove: "60",
      recommendedChart: "area",
    },
  ]);

  await db.insert(utAlertRules).values([
    {
      utilityTypeId: htType.id,
      name: "Low Power Factor",
      fieldName: "Power Factor",
      condition: "<",
      value: "0.90",
      severity: "high",
      action: "Check capacitor bank status.",
    },
    {
      utilityTypeId: htType.id,
      name: "TX Overload",
      fieldName: "Feeder kW",
      condition: ">",
      value: "268",
      severity: "critical",
      action: "Reduce load immediately.",
    },
    {
      utilityTypeId: htType.id,
      name: "High Winding Temp",
      fieldName: "TR Winding Temp",
      condition: ">",
      value: "60",
      severity: "critical",
      action: "Reduce load. Check cooling.",
    },
  ]);

  // ── UPS Fields ────────────────────────────────────────────
  await db.insert(utFields).values([
    {
      utilityTypeId: upsType.id,
      name: "UPS Unit",
      type: "dropdown",
      unit: "",
      required: true,
      options: ["UPS-1", "UPS-2"],
      sortOrder: 1,
    },
    {
      utilityTypeId: upsType.id,
      name: "Input Voltage",
      type: "number",
      unit: "V",
      required: true,
      sortOrder: 2,
    },
    {
      utilityTypeId: upsType.id,
      name: "Input Current",
      type: "number",
      unit: "A",
      required: true,
      sortOrder: 3,
    },
    {
      utilityTypeId: upsType.id,
      name: "Output Voltage",
      type: "number",
      unit: "V",
      required: true,
      sortOrder: 4,
    },
    {
      utilityTypeId: upsType.id,
      name: "Output Frequency",
      type: "number",
      unit: "Hz",
      required: true,
      sortOrder: 5,
    },
    {
      utilityTypeId: upsType.id,
      name: "Battery Voltage",
      type: "number",
      unit: "V",
      required: true,
      sortOrder: 6,
    },
    {
      utilityTypeId: upsType.id,
      name: "Ambient Temp",
      type: "number",
      unit: "°C",
      required: true,
      sortOrder: 7,
    },
    {
      utilityTypeId: upsType.id,
      name: "Storage Temp",
      type: "number",
      unit: "°C",
      required: true,
      sortOrder: 8,
    },
    {
      utilityTypeId: upsType.id,
      name: "Charging Mode",
      type: "dropdown",
      unit: "",
      required: true,
      options: ["Float", "Boost"],
      sortOrder: 9,
    },
    {
      utilityTypeId: upsType.id,
      name: "Cooling Fan",
      type: "dropdown",
      unit: "",
      required: true,
      options: ["OK", "Faulty"],
      sortOrder: 10,
    },
    {
      utilityTypeId: upsType.id,
      name: "Any Alarm",
      type: "dropdown",
      unit: "",
      required: true,
      options: ["No", "Yes"],
      sortOrder: 11,
    },
    {
      utilityTypeId: upsType.id,
      name: "Alarm Description",
      type: "text",
      unit: "",
      required: false,
      sortOrder: 12,
    },
  ]);

  await db.insert(utKpis).values([
    {
      utilityTypeId: upsType.id,
      name: "UPS Efficiency",
      formula: "(Output kW / Input kW) × 100",
      unit: "%",
      alertBelow: "85",
      target: "94",
      recommendedChart: "radial",
    },
    {
      utilityTypeId: upsType.id,
      name: "Load Factor",
      formula: "(Output kW / 600) × 100",
      unit: "%",
      alertBelow: "30",
      alertAbove: "80",
      recommendedChart: "line",
    },
  ]);

  await db.insert(utAlertRules).values([
    {
      utilityTypeId: upsType.id,
      name: "Low Efficiency",
      fieldName: "UPS Efficiency",
      condition: "<",
      value: "85",
      severity: "high",
      action: "Check IGBT modules.",
    },
    {
      utilityTypeId: upsType.id,
      name: "Battery Overheat",
      fieldName: "Storage Temp",
      condition: ">",
      value: "30",
      severity: "critical",
      action: "Check battery room AC immediately.",
    },
    {
      utilityTypeId: upsType.id,
      name: "Fan Fault",
      fieldName: "Cooling Fan",
      condition: "==",
      value: "Faulty",
      severity: "critical",
      action: "Emergency maintenance.",
    },
    {
      utilityTypeId: upsType.id,
      name: "Active Alarm",
      fieldName: "Any Alarm",
      condition: "==",
      value: "Yes",
      severity: "high",
      action: "Identify alarm code.",
    },
  ]);

  // ── Assets ────────────────────────────────────────────────
  const [dg320] = await db
    .insert(assets)
    .values({
      name: "DG-320 KVA",
      utilityTypeId: dgType.id,
      siteId: site.id,
      plantId: plant1.id,
      areaId: area1.id,
      status: "Active",
      manufacturer: "Cummins",
      model: "C320D5",
      serial: "DG-320-001",
      installDate: "2022-03-15",
      ratedKva: "320",
    })
    .returning();

  const [dg810] = await db
    .insert(assets)
    .values({
      name: "DG-810 KVA",
      utilityTypeId: dgType.id,
      siteId: site.id,
      plantId: plant1.id,
      areaId: area2.id,
      status: "Active",
      manufacturer: "Cummins",
      model: "C810D5",
      serial: "DG-810-001",
      installDate: "2021-07-20",
      ratedKva: "810",
    })
    .returning();

  await db.insert(assets).values({
    name: "315 KVA Transformer",
    utilityTypeId: htType.id,
    siteId: site.id,
    plantId: plant1.id,
    areaId: area1.id,
    status: "Active",
    manufacturer: "ABB",
    model: "TR-315",
    serial: "TR-315-001",
    installDate: "2020-11-10",
    ratedKva: "315",
  });

  const [ups1] = await db
    .insert(assets)
    .values({
      name: "UPS-1 (600 KVA)",
      utilityTypeId: upsType.id,
      siteId: site.id,
      plantId: plant1.id,
      areaId: area2.id,
      status: "Active",
      manufacturer: "APC",
      model: "SRT600",
      serial: "UPS-600-001",
      installDate: "2021-01-05",
      ratedKva: "600",
    })
    .returning();

  await db.insert(assets).values({
    name: "UPS-2 (600 KVA)",
    utilityTypeId: upsType.id,
    siteId: site.id,
    plantId: plant1.id,
    areaId: area3.id,
    status: "Under Maintenance",
    manufacturer: "APC",
    model: "SRT600",
    serial: "UPS-600-002",
    installDate: "2021-01-05",
    ratedKva: "600",
  });

  // ── Spares ────────────────────────────────────────────────
  await db.insert(spares).values([
    {
      name: "Fuel Filter — DG",
      partCode: "FF-DG-001",
      unit: "Pcs",
      minStock: 5,
      currentQty: 12,
      unitCost: "1200",
      utilityTypeId: dgType.id,
      location: "Store-A",
    },
    {
      name: "Engine Oil 15W40",
      partCode: "OIL-15W40-L",
      unit: "L",
      minStock: 20,
      currentQty: 8,
      unitCost: "350",
      utilityTypeId: dgType.id,
      location: "Store-A",
    },
    {
      name: "Air Filter Element",
      partCode: "AF-DG-003",
      unit: "Pcs",
      minStock: 3,
      currentQty: 4,
      unitCost: "2800",
      utilityTypeId: dgType.id,
      location: "Store-A",
    },
    {
      name: "Battery Cell 2V/100Ah",
      partCode: "BAT-2V-100",
      unit: "Pcs",
      minStock: 4,
      currentQty: 3,
      unitCost: "15000",
      utilityTypeId: upsType.id,
      location: "Store-B",
    },
    {
      name: "UPS Cooling Fan 48V",
      partCode: "FAN-UPS-48V",
      unit: "Pcs",
      minStock: 2,
      currentQty: 0,
      unitCost: "4500",
      utilityTypeId: upsType.id,
      location: "Store-B",
    },
    {
      name: "Transformer Cooling Oil",
      partCode: "OIL-TR-ISO",
      unit: "L",
      minStock: 50,
      currentQty: 120,
      unitCost: "280",
      utilityTypeId: htType.id,
      location: "Store-C",
    },
  ]);

  // ── PM Plans ─────────────────────────────────────────────
  await db.insert(pmPlans).values([
    {
      utilityTypeId: dgType.id,
      assetId: dg320.id,
      task: "Engine Oil & Filter Change",
      frequency: "Monthly",
      nextDue: "2026-04-15",
      lastDone: "2026-03-14",
      status: "Scheduled",
      assignedToId: reviewer.id,
      components: ["Engine Block"],
      estimatedHours: "3",
    },
    {
      utilityTypeId: dgType.id,
      assetId: dg810.id,
      task: "Annual Service — Full Overhaul",
      frequency: "Annual",
      nextDue: "2026-07-20",
      lastDone: "2025-07-20",
      status: "Scheduled",
      assignedToId: approver.id,
      components: ["Engine Block", "Alternator", "Cooling System"],
      estimatedHours: "16",
    },
    {
      utilityTypeId: upsType.id,
      assetId: ups1.id,
      task: "Battery Health Check & Cell Testing",
      frequency: "Quarterly",
      nextDue: "2026-04-05",
      lastDone: "2026-01-05",
      status: "Overdue",
      assignedToId: op1.id,
      components: ["Battery Bank"],
      estimatedHours: "4",
    },
  ]);

  // ── Asset Components ─────────────────────────────────────
  await db.insert(assetComponents).values([
    {
      assetId: dg320.id,
      name: "Engine Block",
      group: "Engine",
      partNumber: "EB-CUM-001",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
    {
      assetId: dg320.id,
      name: "Cylinder Head",
      group: "Engine",
      partNumber: "CH-CUM-002",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
    {
      assetId: dg320.id,
      name: "Fuel Injection System",
      group: "Engine",
      partNumber: "FI-CUM-003",
      condition: "Due for Replacement",
      lastChecked: "2025-01-08",
    },
    {
      assetId: dg320.id,
      name: "Stator",
      group: "Alternator",
      partNumber: "ST-ALT-001",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
    {
      assetId: dg320.id,
      name: "Rotor",
      group: "Alternator",
      partNumber: "RO-ALT-002",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
    {
      assetId: dg320.id,
      name: "Voltage Regulator (AVR)",
      group: "Alternator",
      partNumber: "AVR-ALT-003",
      condition: "Fair",
      lastChecked: "2025-01-15",
    },
    {
      assetId: dg320.id,
      name: "AMF Controller",
      group: "Control Panel",
      partNumber: "AMF-CP-001",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
    {
      assetId: dg320.id,
      name: "Circuit Breaker",
      group: "Control Panel",
      partNumber: "CB-CP-002",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
    {
      assetId: dg320.id,
      name: "Radiator",
      group: "Cooling",
      partNumber: "RD-CL-001",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
    {
      assetId: dg320.id,
      name: "Fuel Filter Assembly",
      group: "Fuel System",
      partNumber: "FF-FS-001",
      condition: "Due for Replacement",
      lastChecked: "2025-01-08",
    },
    // DG-810
    {
      assetId: dg810.id,
      name: "Engine Block",
      group: "Engine",
      partNumber: "EB-CUM-810",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
    {
      assetId: dg810.id,
      name: "Stator",
      group: "Alternator",
      partNumber: "ST-810-001",
      condition: "Fair",
      lastChecked: "2025-01-15",
    },
    {
      assetId: dg810.id,
      name: "Radiator",
      group: "Cooling",
      partNumber: "RD-810-001",
      condition: "Good",
      lastChecked: "2025-02-01",
    },
  ]);

  // ── Asset Files ───────────────────────────────────────────
  await db.insert(assetFiles).values([
    {
      assetId: dg320.id,
      name: "C320D5 Operation Manual.pdf",
      category: "Manual",
      sizeBytes: 4200000,
      uploadedById: approver.id,
    },
    {
      assetId: dg320.id,
      name: "Installation Certificate.pdf",
      category: "Certificate",
      sizeBytes: 1100000,
      uploadedById: admin.id,
    },
    {
      assetId: dg320.id,
      name: "Annual Inspection Report 2024.pdf",
      category: "Inspection Report",
      sizeBytes: 2800000,
      uploadedById: reviewer.id,
    },
    {
      assetId: dg320.id,
      name: "Electrical Schematic Drawing.pdf",
      category: "Drawing",
      sizeBytes: 6500000,
      uploadedById: approver.id,
    },
    {
      assetId: dg810.id,
      name: "C810D5 Service Manual.pdf",
      category: "Manual",
      sizeBytes: 5100000,
      uploadedById: approver.id,
    },
    {
      assetId: dg810.id,
      name: "Noise Level Certificate.pdf",
      category: "Certificate",
      sizeBytes: 850000,
      uploadedById: admin.id,
    },
  ]);

  console.log("✅ Seed complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

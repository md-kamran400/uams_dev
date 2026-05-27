import { useState } from "react";
import {
  AlertCircle,
  Wind,
  TrendingUp,
  CheckCircle,
  Clock,
  BarChart2,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────
const monthlyEmissions = [
  {
    month: "Jan",
    co2e: 245,
    target: 220,
    prevYear: 268,
    powerOutput: 1850,
    efficiency: 92.5,
  },
  {
    month: "Feb",
    co2e: 228,
    target: 220,
    prevYear: 250,
    powerOutput: 1780,
    efficiency: 93.2,
  },
  {
    month: "Mar",
    co2e: 267,
    target: 220,
    prevYear: 235,
    powerOutput: 1920,
    efficiency: 91.8,
  },
  {
    month: "Apr",
    co2e: 240,
    target: 220,
    prevYear: 258,
    powerOutput: 1850,
    efficiency: 92.9,
  },
  {
    month: "May",
    co2e: 212,
    target: 220,
    prevYear: 232,
    powerOutput: 1650,
    efficiency: 94.2,
  },
  {
    month: "Jun",
    co2e: 248,
    target: 220,
    prevYear: 243,
    powerOutput: 1890,
    efficiency: 92.1,
  },
  {
    month: "Jul",
    co2e: 225,
    target: 220,
    prevYear: 222,
    powerOutput: 1780,
    efficiency: 93.5,
  },
  {
    month: "Aug",
    co2e: 236,
    target: 220,
    prevYear: 255,
    powerOutput: 1820,
    efficiency: 92.8,
  },
  {
    month: "Sep",
    co2e: 216,
    target: 220,
    prevYear: 234,
    powerOutput: 1700,
    efficiency: 93.9,
  },
  {
    month: "Oct",
    co2e: 261,
    target: 220,
    prevYear: 249,
    powerOutput: 1920,
    efficiency: 91.5,
  },
  {
    month: "Nov",
    co2e: 233,
    target: 220,
    prevYear: 241,
    powerOutput: 1810,
    efficiency: 93.1,
  },
  {
    month: "Dec",
    co2e: 243,
    target: 220,
    prevYear: 252,
    powerOutput: 1860,
    efficiency: 92.4,
  },
];

const compressorData = [
  {
    compressor: "CPR-001",
    co2e: 198,
    efficiency: "Excellent",
    intensity: 0.32,
    utilization: 82,
    powerOutput: 1850,
    status: "active",
    trend: -3,
  },
  {
    compressor: "CPR-002",
    co2e: 156,
    efficiency: "Excellent",
    intensity: 0.29,
    utilization: 68,
    powerOutput: 1540,
    status: "active",
    trend: -5,
  },
  {
    compressor: "CPR-003",
    co2e: 214,
    efficiency: "Good",
    intensity: 0.37,
    utilization: 91,
    powerOutput: 1920,
    status: "active",
    trend: 2,
  },
  {
    compressor: "CPR-004",
    co2e: 178,
    efficiency: "Excellent",
    intensity: 0.31,
    utilization: 75,
    powerOutput: 1750,
    status: "active",
    trend: -4,
  },
  {
    compressor: "CPR-005",
    co2e: 132,
    efficiency: "Excellent",
    intensity: 0.26,
    powerOutput: 1280,
    utilization: 58,
    status: "active",
    trend: -6,
  },
];

const emissionRecords = [
  {
    date: "2026-04-01",
    compressor: "CPR-001",
    powerOutput: 95,
    co2Factor: 2.1,
    efficiency: 92.5,
    co2kg: 199.5,
    co2ton: 0.1995,
    intensity: 0.32,
    status: "Approved",
  },
  {
    date: "2026-04-02",
    compressor: "CPR-002",
    powerOutput: 78,
    co2Factor: 2.1,
    efficiency: 94.2,
    co2kg: 163.8,
    co2ton: 0.1638,
    intensity: 0.29,
    status: "Pending",
  },
  {
    date: "2026-04-03",
    compressor: "CPR-003",
    powerOutput: 105,
    co2Factor: 2.1,
    efficiency: 91.8,
    co2kg: 220.5,
    co2ton: 0.2205,
    intensity: 0.37,
    status: "Approved",
  },
  {
    date: "2026-04-04",
    compressor: "CPR-001",
    powerOutput: 92,
    co2Factor: 2.1,
    efficiency: 93.1,
    co2kg: 193.2,
    co2ton: 0.1932,
    intensity: 0.31,
    status: "Approved",
  },
  {
    date: "2026-04-05",
    compressor: "CPR-002",
    powerOutput: 85,
    co2Factor: 2.1,
    efficiency: 93.8,
    co2kg: 178.5,
    co2ton: 0.1785,
    intensity: 0.29,
    status: "Approved",
  },
  {
    date: "2026-04-06",
    compressor: "CPR-004",
    powerOutput: 82,
    co2Factor: 2.1,
    efficiency: 92.9,
    co2kg: 172.2,
    co2ton: 0.1722,
    intensity: 0.31,
    status: "Approved",
  },
  {
    date: "2026-04-07",
    compressor: "CPR-005",
    powerOutput: 68,
    co2Factor: 2.1,
    efficiency: 94.5,
    co2kg: 142.8,
    co2ton: 0.1428,
    intensity: 0.26,
    status: "Approved",
  },
  {
    date: "2026-04-08",
    compressor: "CPR-003",
    powerOutput: 98,
    co2Factor: 2.1,
    efficiency: 92.2,
    co2kg: 205.8,
    co2ton: 0.2058,
    intensity: 0.37,
    status: "Pending",
  },
  {
    date: "2026-04-09",
    compressor: "CPR-001",
    powerOutput: 88,
    co2Factor: 2.1,
    efficiency: 92.8,
    co2kg: 184.8,
    co2ton: 0.1848,
    intensity: 0.31,
    status: "Approved",
  },
  {
    date: "2026-04-10",
    compressor: "CPR-004",
    powerOutput: 80,
    co2Factor: 2.1,
    efficiency: 93.2,
    co2kg: 168.0,
    co2ton: 0.168,
    intensity: 0.31,
    status: "Approved",
  },
];

const shiftData = [
  { shift: "Morning (6AM–2PM)", co2e: 198, efficiency: 94.2, output: 1820 },
  { shift: "Evening (2PM–10PM)", co2e: 245, efficiency: 91.8, output: 1960 },
  { shift: "Night (10PM–6AM)", co2e: 156, efficiency: 95.1, output: 1650 },
];

const emissionFactors = [
  {
    source: "Compressor Electric Power",
    factor: 2.1,
    unit: "kg CO₂e/kWh",
    standard: "BEE 2023",
  },
  {
    source: "Grid Electricity (IN)",
    factor: 0.62,
    unit: "kg CO₂e/kWh",
    standard: "CEA 2023",
  },
  {
    source: "RE PPA — Adani Green",
    factor: 0.0,
    unit: "kg CO₂e/kWh",
    standard: "Custom",
  },
];

// ─── KPICard Component ───────────────────────────────────────────────────────
const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  change,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  color: string;
  change?: number;
}) => (
  <div className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col gap-1">
    <div className="flex items-start justify-between">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      {change !== undefined && (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            change >= 0
              ? "text-red-600 bg-red-50"
              : "text-green-600 bg-green-50"
          }`}
        >
          {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
        </span>
      )}
    </div>
    <p className="text-xl font-bold text-gray-900 mt-1 leading-tight">
      {value}
    </p>
    <p className="text-xs font-medium text-gray-600">{title}</p>
    {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
  </div>
);

// ─── PDF Generator ───────────────────────────────────────────────────────────
const generatePDF = async (reportType: string, dateRange: string) => {
  const approvedRecordsActual = emissionRecords.filter(
    (r) => r.status === "Approved",
  );
  const totalCO2 = approvedRecordsActual
    .reduce((s, r) => s + r.co2kg, 0)
    .toFixed(1);
  const totalOutput = approvedRecordsActual.reduce(
    (s, r) => s + r.powerOutput,
    0,
  );
  const approved = approvedRecordsActual.length;
  const pending = emissionRecords.filter((r) => r.status === "Pending").length;
  const yearCO2 = monthlyEmissions.reduce((s, m) => s + m.co2e, 0);
  const avgDaily = (parseFloat(totalCO2) / 30).toFixed(1);

  const logoResponse = await fetch("/adani-logo.svg");
  const svgText = await logoResponse.text();
  const svgBase64 = btoa(unescape(encodeURIComponent(svgText)));
  const adaniLogoImg = `<img src="data:image/svg+xml;base64,${svgBase64}" alt="Adani Group" style="height: 49px; width: auto;" />`;

  const tableRows = approvedRecordsActual
    .map(
      (r) => `
    <tr>
      <td>${new Date(r.date).toLocaleDateString("en-IN")}</td>
      <td>${r.compressor}</td>
      <td style="text-align:right">${r.powerOutput}</td>
      <td style="text-align:right">${r.co2Factor}</td>
      <td style="text-align:right"><strong>${r.co2kg.toFixed(1)}</strong></td>
      <td style="text-align:right">${r.co2ton.toFixed(4)}</td>
      <td style="text-align:right">${r.efficiency}%</td>
      <td style="text-align:center"><span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:9999px;font-size:11px">Approved</span></td>
    </tr>`,
    )
    .join("");

  const compressorRows = compressorData
    .map(
      (a) => `
    <tr>
      <td>${a.compressor}</td>
      <td style="text-align:right">${a.co2e}</td>
      <td style="text-align:right">${a.powerOutput.toLocaleString()}</td>
      <td style="text-align:right">${a.intensity}</td>
      <td style="text-align:right">${a.utilization}%</td>
      <td style="text-align:center">
        <span style="padding:2px 8px;border-radius:9999px;font-size:11px;${
          a.efficiency === "Excellent"
            ? "background:#dcfce7;color:#166534"
            : "background:#dbeafe;color:#1e40af"
        }">${a.efficiency}</span>
        </td>
      <td style="text-align:right;${
        a.trend < 0 ? "color:#16a34a" : "color:#dc2626"
      }">${a.trend > 0 ? "+" : ""}${a.trend}%</td>
    </tr>`,
    )
    .join("");

  const monthRows = monthlyEmissions
    .map(
      (m) => `
    <tr>
      <td>${m.month}</td>
      <td style="text-align:right">${m.co2e}</td>
      <td style="text-align:right">${m.target}</td>
      <td style="text-align:right;${
        m.co2e > m.target ? "color:#dc2626" : "color:#16a34a"
      }">${m.co2e > m.target ? "Above" : "Below"} (${Math.abs(m.co2e - m.target)} kg)</td>
      <td style="text-align:right">${m.powerOutput}</td>
      <td style="text-align:right">${m.efficiency}%</td>
    </tr>`,
    )
    .join("");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Compressor Emission Report — Adani Group</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      color: #1a1a2e; 
      background: #fff; 
      font-size: 12px; 
      padding: 20px;
    }
    @page { 
      size: A4; 
      margin: 15mm 12mm; 
    }
    .page { 
      max-width: 1100px; 
      margin: 0 auto; 
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      padding: 20px 0 16px; 
      border-bottom: 3px solid #006db6; 
      margin-bottom: 20px; 
    }
    .header-left h1 { 
      font-size: 20px; 
      font-weight: 700; 
      color: #006db6; 
      letter-spacing: 0.5px; 
    }
    .header-left p { 
      font-size: 11px; 
      color: #666; 
      margin-top: 3px; 
    }
    .header-right { 
      text-align: right; 
    }
    .report-meta { 
      font-size: 10px; 
      color: #666; 
      margin-top: 4px; 
    }
    .stripe { 
      display: flex; 
      height: 6px; 
      border-radius: 3px; 
      overflow: hidden; 
      margin-bottom: 24px; 
    }
    .stripe div { 
      flex: 1; 
    }
    .kpi-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 12px; 
      margin-bottom: 24px; 
    }
    .kpi-card { 
      background: #f8fafc; 
      border: 1px solid #e2e8f0; 
      border-radius: 8px; 
      padding: 12px; 
    }
    .kpi-label { 
      font-size: 10px; 
      color: #64748b; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
    }
    .kpi-value { 
      font-size: 20px; 
      font-weight: 700; 
      color: #1e293b; 
      margin: 4px 0 2px; 
    }
    .kpi-sub { 
      font-size: 10px; 
      color: #94a3b8; 
    }
    .kpi-badge-red { 
      font-size: 10px; 
      color: #dc2626; 
      background: #fee2e2; 
      padding: 2px 8px; 
      border-radius: 20px; 
      display: inline-block; 
      margin-top: 6px; 
    }
    .kpi-badge-green { 
      font-size: 10px; 
      color: #16a34a; 
      background: #dcfce7; 
      padding: 2px 8px; 
      border-radius: 20px; 
      display: inline-block; 
      margin-top: 6px; 
    }
    .section-title { 
      font-size: 15px; 
      font-weight: 700; 
      color: #1e293b; 
      margin: 24px 0 12px; 
      padding-bottom: 6px; 
      border-bottom: 2px solid #e2e8f0; 
      display: flex; 
      align-items: center; 
      gap: 8px; 
    }
    .section-title .dot { 
      width: 8px; 
      height: 8px; 
      border-radius: 50%; 
      background: #006db6; 
      display: inline-block; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 11px; 
      margin-bottom: 20px; 
    }
    thead { 
      background: #006db6; 
      color: #fff; 
    }
    th, td { 
      padding: 8px 10px; 
      text-align: left; 
      border-bottom: 1px solid #e2e8f0;
    }
    th { 
      font-weight: 600; 
      font-size: 11px; 
      text-transform: uppercase; 
      letter-spacing: 0.4px; 
    }
    td { 
      color: #334155; 
    }
    tr:nth-child(even) { 
      background: #f8fafc; 
    }
    .shift-grid { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      gap: 12px; 
      margin-bottom: 24px; 
    }
    .shift-card { 
      border: 1px solid #e2e8f0; 
      border-radius: 8px; 
      padding: 14px; 
      text-align: center; 
      background: #f8fafc;
    }
    .shift-name { 
      font-size: 11px; 
      font-weight: 600; 
      color: #475569; 
      margin-bottom: 8px; 
    }
    .shift-value { 
      font-size: 24px; 
      font-weight: 700; 
      color: #1e293b; 
    }
    .shift-unit { 
      font-size: 10px; 
      color: #94a3b8; 
    }
    .shift-eff {
      font-size: 11px;
      font-weight: 500;
      margin-top: 6px;
    }
    .config-note { 
      background: #eff6ff; 
      border: 1px solid #bfdbfe; 
      border-radius: 8px; 
      padding: 10px 14px; 
      font-size: 10.5px; 
      color: #1e40af; 
      margin-bottom: 16px; 
    }
    .footer { 
      margin-top: 30px; 
      padding-top: 14px; 
      border-top: 2px solid #e2e8f0; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      font-size: 10px; 
      color: #94a3b8; 
    }
    .footer strong { 
      color: #475569; 
    }
    .page-break { 
      page-break-before: always; 
      margin-top: 20px; 
    }
    @media print { 
      .no-print { display: none; } 
      body { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
        padding: 0;
      }
      .page { 
        max-width: 100%;
      }
    }
    .text-right {
      text-align: right !important;
    }
    .text-center {
      text-align: center !important;
    }
    .font-bold {
      font-weight: 700;
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div>${adaniLogoImg}</div>
      <h1 style="margin-top:12px">Compressor Emission Monitoring Report</h1>
      <p>Industrial Compressor CO₂e Tracking · Adani Group ESG Compliance</p>
    </div>
    <div class="header-right">
      <div class="report-meta"><strong>Report Type:</strong> ${reportType}</div>
      <div class="report-meta"><strong>Period:</strong> ${dateRange}</div>
      <div class="report-meta"><strong>Generated:</strong> ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
      <div class="report-meta"><strong>Emission Factor:</strong> 2.1 kg CO₂e/kWh</div>
      <div class="report-meta" style="margin-top:8px;padding:4px 10px;background:#eff6ff;border-radius:4px;color:#1e40af;font-weight:600">CONFIDENTIAL</div>
    </div>
  </div>
  
  <div class="stripe">
    <div style="background:#00b16b"></div>
    <div style="background:#006db6"></div>
    <div style="background:#8e278f"></div>
    <div style="background:#f04c23"></div>
  </div>

  <div class="section-title">
    <span class="dot"></span>Executive Summary — Key Performance Indicators
  </div>
  
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total CO₂e (Month)</div>
      <div class="kpi-value">${totalCO2} kg</div>
      <div class="kpi-sub">${(parseFloat(totalCO2) / 1000).toFixed(3)} tonnes</div>
      <span class="kpi-badge-red">↑ 1.2% vs last month</span>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Year-to-Date CO₂e</div>
      <div class="kpi-value">${yearCO2.toLocaleString()} kg</div>
      <div class="kpi-sub">${(yearCO2 / 1000).toFixed(2)} tonnes</div>
      <span class="kpi-badge-green">↓ 0.8% vs target</span>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Daily CO₂e</div>
      <div class="kpi-value">${avgDaily} kg</div>
      <div class="kpi-sub">Based on ${approved} approved records</div>
      <span class="kpi-badge-green">↓ 2.3% vs prior</span>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Power Output</div>
      <div class="kpi-value">${totalOutput} kW</div>
      <div class="kpi-sub">${approved} approved · ${pending} pending</div>
      <span class="kpi-badge-green">Factor: 2.1 kg/kWh</span>
    </div>
  </div>

  <div class="section-title">
    <span class="dot"></span>Approved Emission Submissions
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Compressor</th>
        <th class="text-right">Output (kW)</th>
        <th class="text-right">Em. Factor</th>
        <th class="text-right">CO₂e (kg)</th>
        <th class="text-right">CO₂e (t)</th>
        <th class="text-right">Efficiency</th>
        <th class="text-center">Status</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="section-title">
    <span class="dot"></span>Compressor Performance Summary
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Compressor</th>
        <th class="text-right">CO₂e (kg)</th>
        <th class="text-right">Power (kW)</th>
        <th class="text-right">Intensity (kg/kW)</th>
        <th class="text-right">Utilization</th>
        <th class="text-center">Efficiency</th>
        <th class="text-right">Trend</th>
      </tr>
    </thead>
    <tbody>${compressorRows}</tbody>
  </table>

  <div class="section-title">
    <span class="dot"></span>Shift Performance Summary
  </div>
  
  <div class="shift-grid">
    ${shiftData
      .map(
        (s) => `
      <div class="shift-card">
        <div class="shift-name">${s.shift}</div>
        <div class="shift-value">${s.co2e}</div>
        <div class="shift-unit">kg CO₂e</div>
        <div class="shift-eff" style="color:${s.efficiency >= 93 ? "#16a34a" : "#dc2626"}">${s.efficiency}% efficiency</div>
        <div class="shift-unit" style="margin-top:6px">Output: ${s.output} kW</div>
      </div>
    `,
      )
      .join("")}
  </div>

  <div class="page-break"></div>
  
  <div class="header" style="margin-bottom:16px; border-bottom: 1px solid #e2e8f0;">
    <div>${adaniLogoImg}</div>
    <div class="header-right">
      <div class="report-meta">Compressor Emission Report · Page 2</div>
      <div class="report-meta">${dateRange}</div>
    </div>
  </div>

  <div class="section-title">
    <span class="dot"></span>Monthly CO₂e Trend vs Target (YTD)
  </div>
  
  <table style="width: 100%;">
    <thead>
      <tr>
        <th>Month</th>
        <th class="text-right">CO₂e (kg)</th>
        <th class="text-right">Target (kg)</th>
        <th class="text-right">Variance</th>
        <th class="text-right">Power (kW)</th>
        <th class="text-right">Efficiency</th>
      </tr>
    </thead>
    <tbody>${monthRows}</tbody>
  </table>

  <div class="section-title">
    <span class="dot"></span>Active Emission Factors (Configuration)
  </div>
  
  <div class="config-note">
    <strong>Note:</strong> All emission calculations use the factors listed below. These factors are updated annually per BEE standards.
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Source Type</th>
        <th class="text-right">Factor Value</th>
        <th>Unit</th>
        <th>Standard</th>
      </tr>
    </thead>
    <tbody>
      ${emissionFactors
        .map(
          (f) => `
        <tr>
          <td><strong>${f.source}</strong></td>
          <td class="text-right font-bold">${f.factor.toFixed(2)}</td>
          <td>${f.unit}</td>
          <td><span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:9999px;font-size:10px">${f.standard}</span></td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <strong>Adani Group</strong> · Compressor Emission Monitoring System<br/>
      Emission Factor: BEE Industrial Compressor Standard (2.1 kg CO₂e/kWh)
    </div>
    <div style="text-align:right">
      Generated: ${new Date().toLocaleString("en-IN")}<br/>
      <strong>CONFIDENTIAL — INTERNAL USE ONLY</strong>
    </div>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Adani_Compressor_Emission_Report_${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CompressorEmissionReports = () => {
  const [dateRange, setDateRange] = useState("April 2026");
  const [reportType, setReportType] = useState("Monthly Summary");
  const [downloading, setDownloading] = useState(false);

  const approvedRecords = emissionRecords.filter(
    (r) => r.status === "Approved",
  );
  const totalCO2kg = approvedRecords.reduce((s, r) => s + r.co2kg, 0);
  const totalOutput = approvedRecords.reduce((s, r) => s + r.powerOutput, 0);
  const totalRecords = approvedRecords.length;
  const yearCO2 = monthlyEmissions.reduce((s, m) => s + m.co2e, 0);

  const handleDownload = async () => {
    setDownloading(true);
    setTimeout(async () => {
      await generatePDF(reportType, dateRange);
      setDownloading(false);
    }, 800);
  };

  return (
    <div className="space-y-5 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg rounded-2xl overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                <BarChart2 size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  Emission Reports
                </h1>
                <p className="text-sm text-blue-100 mt-1">PDF Generator</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 lg:p-6">
        <div className="p-3 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-blue-100">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg bg-white border border-blue-200 text-gray-700"
              >
                <option>Monthly Summary</option>
                <option>Compressor Performance</option>
                <option>Shift Analysis</option>
                <option>Annual Report</option>
                <option>Compliance Report</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg bg-white border border-blue-200 text-gray-700"
              >
                <option>April 2026</option>
                <option>Q1 2026 (Jan–Mar)</option>
                <option>FY 2025–2026</option>
                <option>Last 30 Days</option>
                <option>Last 12 Months</option>
              </select>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                downloading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {downloading ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            title="Total CO₂e This Month"
            value={`${totalCO2kg.toFixed(1)} kg`}
            subtitle={`${(totalCO2kg / 1000).toFixed(3)} tonnes`}
            icon={AlertCircle}
            color="bg-blue-600"
            change={1.2}
          />
          <KPICard
            title="Year-to-Date CO₂e"
            value={`${yearCO2.toLocaleString()} kg`}
            subtitle={`${(yearCO2 / 1000).toFixed(2)} tonnes`}
            icon={TrendingUp}
            color="bg-green-500"
            change={-0.8}
          />
          <KPICard
            title="Total Power Output"
            value={`${totalOutput} kW`}
            subtitle={`${totalRecords} approved records`}
            icon={Wind}
            color="bg-amber-500"
            change={-2.3}
          />
          <KPICard
            title="Avg Emission Intensity"
            value={`${(totalCO2kg / Math.max(totalOutput, 1)).toFixed(3)} kg/kW`}
            subtitle={`Over ${totalOutput} kW output`}
            icon={AlertCircle}
            color="bg-purple-600"
            change={-1.5}
          />
        </div>

        <div className="p-3 mt-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-blue-100">
            <h2 className="text-sm font-bold text-gray-800">
              Compressor Emission Details
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Data used for PDF generation
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-200">
                <tr>
                  {[
                    "Date",
                    "Compressor",
                    "Power (kW)",
                    "CO₂e (kg)",
                    "CO₂e (t)",
                    "Efficiency",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-indigo-700 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100">
                {emissionRecords.map((r, i) => (
                  <tr
                    key={i}
                    className="hover:bg-indigo-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(r.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {r.compressor}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.powerOutput}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {r.co2kg.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.co2ton.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.efficiency}%
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.status === "Approved" ? (
                          <CheckCircle size={10} />
                        ) : (
                          <Clock size={10} />
                        )}
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-indigo-600 mt-0.5 shrink-0" />
          <p className="text-xs text-indigo-900 leading-relaxed">
            <strong>Report Methodology:</strong> KPI calculations include only{" "}
            <strong>approved records</strong>. Emission Factor uses BEE
            compressor standard (2.1 kg CO₂e/kWh · BEE 2023). Charts and
            visualizations are available only in the downloaded PDF report.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompressorEmissionReports;

import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireAuth } from "./lib/auth.js";

// Import route handlers
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import assetRoutes from "./routes/assets.js";
import submissionRoutes from "./routes/submissions.js";
import complaintRoutes from "./routes/complaints.js";
import breakdownRoutes from "./routes/breakdowns.js";
import pmPlanRoutes from "./routes/pmPlans.js";
import spareRoutes from "./routes/spares.js";
import utilityTypeRoutes from "./routes/utilityTypes.js";
import siteRoutes from "./routes/sites.js";
import reportRoutes from "./routes/reports.js";
import assetDetailRoutes from "./routes/assetDetails.js";
import ticketRoutes from "./routes/tickets.js";
import maintenancePlanRoutes from "./routes/maintenancePlans.js";
import assetAlertRoutes from "./routes/assetAlerts.js";
import analyticsRoutes from "./routes/analytics.js";
import filesRoutes from "./routes/files.js";
import reportTemplateRoutes from "./routes/reportTemplates.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

// ── Middleware ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Welcome to API.");
});
// ── Health check ──────────────────────────────────────────
app.get("/api/ping", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ── Auth routes (no requireAuth on login itself) ──────────
app.use("/api/auth", authRoutes);

// For /api/auth/me we do need auth — attach middleware inside the route
app.use("/api/auth/me", requireAuth);

// ── Protected routes ──────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/breakdowns", breakdownRoutes);
app.use("/api/pm-plans", pmPlanRoutes);
app.use("/api/spares", spareRoutes);
app.use("/api/utility-types", utilityTypeRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/assets", assetDetailRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/maintenance-plans", maintenancePlanRoutes);
app.use("/api/assets", assetAlertRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/files", filesRoutes);
// Template-driven report endpoints, scoped by utility-type:
//   GET  /api/utility-types/:utilityTypeId/reports
//   POST /api/utility-types/:utilityTypeId/reports          (create template)
//   POST /api/utility-types/:utilityTypeId/reports/generate (utility-scope run)
//   ... plus section/column CRUD, all in routes/reportTemplates.ts
app.use("/api/utility-types/:utilityTypeId/reports", reportTemplateRoutes);

// ── 404 handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ──────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 UAMS API running on http://0.0.0.0:${PORT}`);
});

export default app;

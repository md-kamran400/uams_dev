import {
  pgTable, uuid, text, integer, numeric, boolean,
  timestamp, date, jsonb, pgEnum,
} from 'drizzle-orm/pg-core'

// ── Enums ──────────────────────────────────────────────────
export const roleEnum = pgEnum('role', ['admin', 'approver', 'reviewer', 'operator', 'leadership', 'engineer'])
export const shiftEnum = pgEnum('shift', ['A', 'B', 'C'])
export const fieldTypeEnum = pgEnum('field_type', ['number', 'text', 'time', 'dropdown', 'date', 'photo', 'video'])
export const chartTypeEnum = pgEnum('chart_type', ['area', 'bar', 'line', 'radial', 'pie', 'composed'])
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high', 'critical'])
export const conditionEnum = pgEnum('condition', ['>', '<', '=='])
export const assetStatusEnum = pgEnum('asset_status', ['Active', 'Under Maintenance', 'Inactive'])
export const submissionStatusEnum = pgEnum('submission_status', ['Submitted', 'Under Review', 'Approved', 'Rejected'])
export const complaintStatusEnum = pgEnum('complaint_status', ['Open', 'Assigned', 'In Progress', 'Pending', 'Closed'])
export const priorityEnum = pgEnum('priority', ['Low', 'Medium', 'High', 'Critical'])
export const breakdownStatusEnum = pgEnum('breakdown_status', ['Raised', 'Assigned', 'In Progress', 'Resolved', 'Closed'])
export const pmStatusEnum = pgEnum('pm_status', ['Scheduled', 'Overdue', 'Completed'])

const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}

// ── Core ───────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('operator'),
  shift: shiftEnum('shift'),
  assignedUtilityIds: uuid('assigned_utility_ids').array().default([]),
  ...timestamps,
})

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ...timestamps,
})

export const plants = pgTable('plants', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ...timestamps,
})

export const areas = pgTable('areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  plantId: uuid('plant_id').notNull().references(() => plants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ...timestamps,
})

// ── Utility configuration ──────────────────────────────────
export const utilityTypes = pgTable('utility_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('🔧'),
  category: text('category').notNull().default('General'),
  description: text('description'),
  ...timestamps,
})

export const utFields = pgTable('ut_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: fieldTypeEnum('type').notNull().default('number'),
  unit: text('unit').default(''),
  required: boolean('required').notNull().default(true),
  computed: boolean('computed').notNull().default(false),
  formula: text('formula'),
  options: jsonb('options').$type<string[]>().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const utForms = pgTable('ut_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  scope: text('scope').notNull().default('engineer'),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const utFormSections = pgTable('ut_form_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => utForms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const utFormSectionFields = pgTable('ut_form_section_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => utForms.id, { onDelete: 'cascade' }),
  sectionId: uuid('section_id').notNull().references(() => utFormSections.id, { onDelete: 'cascade' }),
  fieldId: uuid('field_id').notNull().references(() => utFields.id, { onDelete: 'cascade' }),
  requiredOverride: boolean('required_override'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const utKpis = pgTable('ut_kpis', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  formula: text('formula').notNull(),
  unit: text('unit').default(''),
  alertBelow: numeric('alert_below'),
  alertAbove: numeric('alert_above'),
  target: numeric('target'),
  recommendedChart: chartTypeEnum('recommended_chart').notNull().default('line'),
  ...timestamps,
})

export const utAnalyticsLayouts = pgTable('ut_analytics_layouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().unique().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  items: jsonb('items').$type<{
    kpiId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    hidden?: boolean;
    chartType?: 'line' | 'bar' | 'area';
  }[]>().notNull().default([]),
  updatedById: uuid('updated_by_id').references(() => users.id),
  ...timestamps,
})

export const utAlertRules = pgTable('ut_alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fieldName: text('field_name').notNull(),
  condition: conditionEnum('condition').notNull(),
  value: text('value').notNull(),
  condition2: conditionEnum('condition2'),
  value2: text('value2'),
  severity: severityEnum('severity').notNull().default('medium'),
  action: text('action'),
  ...timestamps,
})

export const assetAlertRuleOverrides = pgTable('asset_alert_rule_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  utilityAlertRuleId: uuid('utility_alert_rule_id').notNull().references(() => utAlertRules.id, { onDelete: 'cascade' }),
  isDisabled: boolean('is_disabled').notNull().default(false),
  overrideValue: text('override_value'),
  overrideSeverity: severityEnum('override_severity'),
  ...timestamps,
})

export const assetExtraAlertRules = pgTable('asset_extra_alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fieldName: text('field_name').notNull(),
  condition: conditionEnum('condition').notNull(),
  value: text('value').notNull(),
  condition2: conditionEnum('condition2'),
  value2: text('value2'),
  severity: severityEnum('severity').notNull().default('medium'),
  action: text('action'),
  ...timestamps,
})

// ── Report Templates ───────────────────────────────────────
// Admin-configurable per-utility report definitions. Replaces the hardcoded
// list of 6 DG-specific reports with a multi-section template engine that
// works for any utility type. See migrations/add_report_templates.sql.
export const utReportTemplates = pgTable('ut_report_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon').notNull().default('file-text'),
  defaultScope: text('default_scope').notNull().default('both'), // 'asset' | 'utility' | 'both'
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const utReportSections = pgTable('ut_report_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => utReportTemplates.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  source: text('source').notNull(), // submissions | breakdowns | pm_plans | tickets | spare_consumption | computed
  grouping: text('grouping').notNull().default('row'),
  filters: jsonb('filters').$type<Record<string, unknown>>().default({}),
  utilityScopeBehavior: text('utility_scope_behavior').notNull().default('append_asset_col'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const utReportSectionColumns = pgTable('ut_report_section_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id').notNull().references(() => utReportSections.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  key: text('key').notNull(),
  kind: text('kind').notNull(), // builtin | field | aggregate | formula
  builtin: text('builtin'),
  fieldId: uuid('field_id').references(() => utFields.id, { onDelete: 'set null' }),
  fieldName: text('field_name'),
  aggregate: text('aggregate'),
  formula: text('formula'),
  width: integer('width').notNull().default(80),
  align: text('align').notNull().default('left'),
  format: jsonb('format').$type<{ digits?: number; dateFormat?: 'short' | 'long' }>().default({}),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const utComponents = pgTable('ut_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subcomponents: jsonb('subcomponents').$type<string[]>().default([]),
  ...timestamps,
})

// ── Operational ────────────────────────────────────────────
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id),
  siteId: uuid('site_id').notNull().references(() => sites.id),
  plantId: uuid('plant_id').notNull().references(() => plants.id),
  areaId: uuid('area_id').notNull().references(() => areas.id),
  status: assetStatusEnum('status').notNull().default('Active'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  serial: text('serial'),
  installDate: date('install_date'),
  ratedKva: numeric('rated_kva'),
  ...timestamps,
})

export const assetFormFieldOverrides = pgTable('asset_form_field_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  formSectionFieldId: uuid('form_section_field_id').notNull().references(() => utFormSectionFields.id, { onDelete: 'cascade' }),
  isHidden: boolean('is_hidden').notNull().default(false),
  requiredOverride: boolean('required_override'),
  sortOrder: integer('sort_order'),
  ...timestamps,
})

export const assetExtraFields = pgTable('asset_extra_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id, { onDelete: 'cascade' }),
  formId: uuid('form_id').notNull().references(() => utForms.id, { onDelete: 'cascade' }),
  sectionId: uuid('section_id').notNull().references(() => utFormSections.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: fieldTypeEnum('type').notNull().default('number'),
  unit: text('unit').default(''),
  required: boolean('required').notNull().default(true),
  computed: boolean('computed').notNull().default(false),
  formula: text('formula'),
  options: jsonb('options').$type<string[]>().default([]),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const assetComponents = pgTable('asset_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  group: text('group').notNull().default('General'),
  partNumber: text('part_number').default(''),
  condition: text('condition').notNull().default('Good'),
  lastChecked: date('last_checked'),
  notes: text('notes'),
  ...timestamps,
})

// ── Asset Checklists ───────────────────────────────────────
// Each checklist belongs to an asset and has a frequency (M, QY, HY, Y).
// Items within the checklist define what to check, how, and against what standard.
export const assetChecklists = pgTable('asset_checklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  frequency: text('frequency').notNull(), // 'M' | 'QY' | 'HY' | 'Y'
  ...timestamps,
})

export const assetChecklistItems = pgTable('asset_checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  checklistId: uuid('checklist_id').notNull().references(() => assetChecklists.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),            // checked item name
  frequency: text('frequency').notNull(),  // M | QY | HY | Y
  checkingMethod: text('checking_method').notNull().default('Visual'),
  standard: text('standard').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const assetFiles = pgTable('asset_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull().default('Other'),
  sizeBytes: integer('size_bytes').default(0),
  uploadedById: uuid('uploaded_by_id').references(() => users.id),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  url: text('url'),
  ...timestamps,
})


export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id),
  assetId: uuid('asset_id').notNull().references(() => assets.id),
  formId: uuid('form_id').references(() => utForms.id),
  operatorId: uuid('operator_id').notNull().references(() => users.id),
  shift: shiftEnum('shift').notNull(),
  values: jsonb('values').$type<Record<string, unknown>>().notNull().default({}),
  status: submissionStatusEnum('status').notNull().default('Submitted'),
  rejectionReason: text('rejection_reason'),
  approvedBy: uuid('approved_by').references(() => users.id),
  date: date('date').notNull(),
  ...timestamps,
})

export const complaints = pgTable('complaints', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull().unique(),
  assetId: uuid('asset_id').references(() => assets.id),
  utilityTypeId: uuid('utility_type_id').references(() => utilityTypes.id),
  category: text('category').notNull(),
  location: text('location'),
  description: text('description').notNull(),
  status: complaintStatusEnum('status').notNull().default('Open'),
  priority: priorityEnum('priority').notNull().default('Medium'),
  reporterId: uuid('reporter_id').notNull().references(() => users.id),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  timeTaken: numeric('time_taken'),
  completionDate: date('completion_date'),
  remarks: jsonb('remarks').$type<{ text: string; by: string; date: string }[]>().default([]),
  ...timestamps,
})

export const breakdowns = pgTable('breakdowns', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull().unique(),
  assetId: uuid('asset_id').notNull().references(() => assets.id),
  componentId: uuid('component_id').references(() => utComponents.id),
  subcomponent: text('subcomponent'),
  nature: text('nature').notNull(),
  status: breakdownStatusEnum('status').notNull().default('Raised'),
  priority: priorityEnum('priority').notNull().default('High'),
  reporterId: uuid('reporter_id').notNull().references(() => users.id),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  actionTaken: text('action_taken'),
  sparesUsed: jsonb('spares_used').$type<{ id: string; name: string; qty: number }[]>().default([]),
  laborHours: numeric('labor_hours').default('0'),
  downtimeHours: numeric('downtime_hours').default('0'),
  resolvedAt: timestamp('resolved_at'),
  ...timestamps,
})

export const pmPlans = pgTable('pm_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilityTypeId: uuid('utility_type_id').notNull().references(() => utilityTypes.id),
  assetId: uuid('asset_id').notNull().references(() => assets.id),
  task: text('task').notNull(),
  frequency: text('frequency').notNull(),
  nextDue: date('next_due').notNull(),
  lastDone: date('last_done'),
  status: pmStatusEnum('status').notNull().default('Scheduled'),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  components: jsonb('components').$type<string[]>().default([]),
  estimatedHours: numeric('estimated_hours'),
  completionReason: text('completion_reason'),
  ...timestamps,
})

export const spares = pgTable('spares', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  partCode: text('part_code').notNull().unique(),
  unit: text('unit').notNull().default('Pcs'),
  minStock: integer('min_stock').notNull().default(0),
  currentQty: integer('current_qty').notNull().default(0),
  unitCost: numeric('unit_cost').notNull().default('0'),
  utilityTypeId: uuid('utility_type_id').references(() => utilityTypes.id),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  location: text('location'),
  ...timestamps,
})

export const ticketTypeEnum = pgEnum('ticket_type', ['Data Entry', 'PM Plan', 'Breakdown'])
export const ticketStatusEnum = pgEnum('ticket_status', ['Open', 'Assigned', 'In Progress', 'Submitted', 'Resubmitted', 'Approved', 'Rejected', 'Needs Revision', 'Closed'])

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: text('number').notNull().unique(),
  type: ticketTypeEnum('type').notNull(),
  priority: priorityEnum('priority').notNull().default('Medium'),
  status: ticketStatusEnum('status').notNull().default('Open'),
  utilityTypeId: uuid('utility_type_id').references(() => utilityTypes.id, { onDelete: 'set null' }),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  formId: uuid('form_id').references(() => utForms.id, { onDelete: 'set null' }),
  pmPlanId: uuid('pm_plan_id').references(() => pmPlans.id, { onDelete: 'set null' }),
  maintenancePlanEntryId: uuid('maintenance_plan_entry_id').references(() => maintenancePlanEntries.id, { onDelete: 'set null' }),
  breakdownId: uuid('breakdown_id').references(() => breakdowns.id, { onDelete: 'set null' }),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'set null' }),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  assignedToId: uuid('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedById: uuid('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  filledValues: jsonb('filled_values').$type<Record<string, unknown>>().default({}),
  ...timestamps,
})

// ── Maintenance Plans (named plan grouping multiple assets) ──
export const maintenancePlanStatusEnum = pgEnum('maintenance_plan_status', ['Draft', 'Active', 'Paused', 'Inactive', 'Archived'])

export const maintenancePlans = pgTable('maintenance_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  planCode: text('plan_code').notNull().unique(),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  status: maintenancePlanStatusEnum('status').notNull().default('Draft'),
  description: text('description'),
  endDate: date('end_date'),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
})

// Each entry = one asset OR one manual equipment row, with frequency schedule
export const maintenancePlanEntries = pgTable('maintenance_plan_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id').notNull().references(() => maintenancePlans.id, { onDelete: 'cascade' }),
  // Asset-backed or manual equipment
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
  equipmentNo: text('equipment_no'),       // manual entry
  equipmentDesc: text('equipment_desc'),   // manual entry
  // Frequency schedule — JSONB array of { frequency, startMonth (1-12), startDay (1-31) }
  frequencies: jsonb('frequencies').$type<{ frequency: 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly'; startMonth: number; startDay: number }[]>().default([]),
  year: integer('year').notNull(),
  remarks: text('remarks'),
  assignedToId: uuid('assigned_to_id').references(() => users.id, { onDelete: 'set null' }),
  // Per-month actuals: { "2025-01": "done" | null, ... }
  actuals: jsonb('actuals').$type<Record<string, string | null>>().default({}),
  ...timestamps,
})

// ── Files (generic upload storage; used for evidence + future attachments) ──
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),        // disk filename, e.g. "{uuid}.jpg"
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Type exports ───────────────────────────────────────────
export type User = typeof users.$inferSelect
export type UtilityType = typeof utilityTypes.$inferSelect
export type UtField = typeof utFields.$inferSelect
export type UtForm = typeof utForms.$inferSelect
export type UtFormSection = typeof utFormSections.$inferSelect
export type UtFormSectionField = typeof utFormSectionFields.$inferSelect
export type UtKpi = typeof utKpis.$inferSelect
export type UtAnalyticsLayout = typeof utAnalyticsLayouts.$inferSelect
export type UtAlertRule = typeof utAlertRules.$inferSelect
export type UtComponent = typeof utComponents.$inferSelect
export type Asset = typeof assets.$inferSelect
export type AssetFormFieldOverride = typeof assetFormFieldOverrides.$inferSelect
export type AssetExtraField = typeof assetExtraFields.$inferSelect
export type Submission = typeof submissions.$inferSelect
export type Complaint = typeof complaints.$inferSelect
export type Breakdown = typeof breakdowns.$inferSelect
export type PmPlan = typeof pmPlans.$inferSelect
export type Spare = typeof spares.$inferSelect
export type ActivityLog = typeof activityLog.$inferSelect
export type FileRow = typeof files.$inferSelect
export type MaintenancePlan = typeof maintenancePlans.$inferSelect
export type MaintenancePlanEntry = typeof maintenancePlanEntries.$inferSelect
export type Ticket = typeof tickets.$inferSelect
export type Site = typeof sites.$inferSelect
export type Plant = typeof plants.$inferSelect
export type Area = typeof areas.$inferSelect
export type AssetComponent = typeof assetComponents.$inferSelect
export type AssetFile = typeof assetFiles.$inferSelect
export type AssetChecklist = typeof assetChecklists.$inferSelect
export type AssetChecklistItem = typeof assetChecklistItems.$inferSelect
export type AssetAlertRuleOverride = typeof assetAlertRuleOverrides.$inferSelect
export type AssetExtraAlertRule = typeof assetExtraAlertRules.$inferSelect
export type UtReportTemplate = typeof utReportTemplates.$inferSelect
export type UtReportSection = typeof utReportSections.$inferSelect
export type UtReportSectionColumn = typeof utReportSectionColumns.$inferSelect

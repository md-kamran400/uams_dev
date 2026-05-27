// API base URL — uses Vite env var in production, falls back to /api (proxied by Vite in dev)
const BASE = import.meta.env.VITE_API_URL ?? '/api'

// ── Token storage ─────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem('uams_token')
}

export function setToken(token: string): void {
  localStorage.setItem('uams_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('uams_token')
  localStorage.removeItem('uams_user')
}

export function setStoredUser(user: object): void {
  localStorage.setItem('uams_user', JSON.stringify(user))
}

export function getStoredUser<T>(): T | null {
  try {
    const raw = localStorage.getItem('uams_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ── Core fetch helper ─────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error ?? `Request failed: ${res.status}`)
  }
  return data as T
}

// ── Auth ──────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }, false),

    me: () => request<ApiUser>('/auth/me', { method: 'POST' }),
  },

  // ── Users ─────────────────────────────────────────────
  users: {
    list: () => request<ApiUser[]>('/users'),
    create: (data: CreateUserPayload) =>
      request<ApiUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateUserPayload>) =>
      request<ApiUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
    assignUtility: (id: string, utilityTypeId: string, action: 'assign' | 'unassign') =>
      request<{ ok: boolean }>(`/users/${id}/assign-utility`, { method: 'POST', body: JSON.stringify({ utilityTypeId, action }) }),
  },

  // ── Assets ────────────────────────────────────────────
  assets: {
    list: () => request<ApiAsset[]>('/assets'),
    get: (id: string) => request<ApiAsset>(`/assets/${id}`),
    create: (data: CreateAssetPayload) =>
      request<ApiAsset>('/assets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateAssetPayload>) =>
      request<ApiAsset>(`/assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/assets/${id}`, { method: 'DELETE' }),
  },

  // ── Submissions ───────────────────────────────────────
  submissions: {
    list: (params?: { from?: string; to?: string; utilityTypeId?: string; status?: string }) => {
      const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString()}` : ''
      return request<ApiSubmission[]>(`/submissions${qs}`)
    },
    create: (data: CreateSubmissionPayload) =>
      request<ApiSubmission>('/submissions', { method: 'POST', body: JSON.stringify(data) }),
    review: (id: string, data: { status: 'Approved' | 'Rejected' | 'Under Review'; rejectionReason?: string }) =>
      request<ApiSubmission>(`/submissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // ── Complaints ────────────────────────────────────────
  complaints: {
    list: () => request<ApiComplaint[]>('/complaints'),
    create: (data: CreateComplaintPayload) =>
      request<ApiComplaint>('/complaints', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateComplaintPayload) =>
      request<ApiComplaint>(`/complaints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // ── Breakdowns ────────────────────────────────────────
  breakdowns: {
    list: () => request<ApiBreakdown[]>('/breakdowns'),
    create: (data: CreateBreakdownPayload) =>
      request<ApiBreakdown>('/breakdowns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateBreakdownPayload) =>
      request<ApiBreakdown>(`/breakdowns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // ── Maintenance Plans ─────────────────────────────────
  maintenancePlans: {
    list: () => request<ApiMaintenancePlan[]>('/maintenance-plans'),
    get: (id: string) => request<ApiMaintenancePlanFull>(`/maintenance-plans/${id}`),
    create: (data: { name: string; year: number; status?: MaintenancePlanStatus; description?: string; endDate?: string | null }) =>
      request<ApiMaintenancePlan>('/maintenance-plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; year?: number; status?: MaintenancePlanStatus; description?: string; endDate?: string | null }) =>
      request<ApiMaintenancePlan>(`/maintenance-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/maintenance-plans/${id}`, { method: 'DELETE' }),
    addEntries: (id: string, entries: { assetId?: string | null; equipmentNo?: string | null; equipmentDesc?: string | null; frequencies: FrequencySchedule[]; year: number; remarks?: string | null; assignedToId?: string | null }[]) =>
      request<ApiMaintenancePlanEntry[]>(`/maintenance-plans/${id}/entries`, { method: 'POST', body: JSON.stringify({ entries }) }),
    updateEntry: (id: string, entryId: string, data: { frequencies?: FrequencySchedule[]; remarks?: string | null; actuals?: Record<string, string | null>; assignedToId?: string | null }) =>
      request<ApiMaintenancePlanEntry>(`/maintenance-plans/${id}/entries/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteEntry: (id: string, entryId: string) =>
      request<{ ok: boolean }>(`/maintenance-plans/${id}/entries/${entryId}`, { method: 'DELETE' }),
    listTickets: (id: string) =>
      request<ApiPmPlanTicket[]>(`/maintenance-plans/${id}/tickets`),
  },

  // ── PM Plans ──────────────────────────────────────────
  pmPlans: {
    list: () => request<ApiPmPlan[]>('/pm-plans'),
    create: (data: CreatePmPlanPayload) =>
      request<ApiPmPlan>('/pm-plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdatePmPlanPayload) =>
      request<ApiPmPlan>(`/pm-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/pm-plans/${id}`, { method: 'DELETE' }),
  },

  // ── Spares ───────────────────────────────────────────
  spares: {
    list: (params?: { assetId?: string; utilityTypeId?: string }) => {
      const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString()}` : ''
      return request<ApiSpare[]>(`/spares${qs}`)
    },
    create: (data: CreateSparePayload) =>
      request<ApiSpare>('/spares', { method: 'POST', body: JSON.stringify(data) }),
    updateQty: (id: string, currentQty: number) =>
      request<{ ok: boolean }>(`/spares/${id}/qty`, { method: 'PATCH', body: JSON.stringify({ currentQty }) }),
    update: (id: string, data: Partial<CreateSparePayload>) =>
      request<ApiSpare>(`/spares/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/spares/${id}`, { method: 'DELETE' }),
  },

  // ── Utility Types ─────────────────────────────────────
  utilityTypes: {
    list: () => request<ApiUtilityType[]>('/utility-types'),
    getFull: (id: string) => request<ApiUtilityTypeFull>(`/utility-types/${id}/full`),
    create: (data: { name: string; icon?: string; category?: string; description?: string }) =>
      request<ApiUtilityType>('/utility-types', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; icon: string; category: string; description: string }>) =>
      request<ApiUtilityType>(`/utility-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/utility-types/${id}`, { method: 'DELETE' }),
    addField: (id: string, data: Partial<ApiUtField>) =>
      request<ApiUtField>(`/utility-types/${id}/fields`, { method: 'POST', body: JSON.stringify(data) }),
    updateField: (id: string, fieldId: string, data: Partial<ApiUtField>) =>
      request<ApiUtField>(`/utility-types/${id}/fields/${fieldId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteField: (id: string, fieldId: string) =>
      request<{ ok: boolean }>(`/utility-types/${id}/fields/${fieldId}`, { method: 'DELETE' }),

    addKpi: (id: string, data: Partial<ApiUtKpi>) =>
      request<ApiUtKpi>(`/utility-types/${id}/kpis`, { method: 'POST', body: JSON.stringify(data) }),
    updateKpi: (id: string, kpiId: string, data: Partial<ApiUtKpi>) =>
      request<ApiUtKpi>(`/utility-types/${id}/kpis/${kpiId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteKpi: (id: string, kpiId: string) =>
      request<{ ok: boolean }>(`/utility-types/${id}/kpis/${kpiId}`, { method: 'DELETE' }),

    addAlertRule: (id: string, data: Partial<ApiUtAlertRule>) =>
      request<ApiUtAlertRule>(`/utility-types/${id}/alerts`, { method: 'POST', body: JSON.stringify(data) }),
    updateAlertRule: (id: string, alertId: string, data: Partial<ApiUtAlertRule>) =>
      request<ApiUtAlertRule>(`/utility-types/${id}/alerts/${alertId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteAlertRule: (id: string, alertId: string) =>
      request<{ ok: boolean }>(`/utility-types/${id}/alerts/${alertId}`, { method: 'DELETE' }),

    listForms: (id: string) =>
      request<ApiUtForm[]>(`/utility-types/${id}/forms`),
    getFormFull: (id: string, formId: string) =>
      request<ApiUtFormFull>(`/utility-types/${id}/forms/${formId}/full`),
    createForm: (id: string, data: Partial<ApiUtForm>) =>
      request<ApiUtForm>(`/utility-types/${id}/forms`, { method: 'POST', body: JSON.stringify(data) }),
    updateForm: (id: string, formId: string, data: Partial<ApiUtForm>) =>
      request<ApiUtForm>(`/utility-types/${id}/forms/${formId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteForm: (id: string, formId: string) =>
      request<{ ok: boolean }>(`/utility-types/${id}/forms/${formId}`, { method: 'DELETE' }),

    addSection: (id: string, formId: string, data: { name: string; description?: string; sortOrder?: number }) =>
      request<ApiUtFormSection>(`/utility-types/${id}/forms/${formId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
    updateSection: (id: string, formId: string, sectionId: string, data: Partial<ApiUtFormSection>) =>
      request<ApiUtFormSection>(`/utility-types/${id}/forms/${formId}/sections/${sectionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteSection: (id: string, formId: string, sectionId: string) =>
      request<{ ok: boolean }>(`/utility-types/${id}/forms/${formId}/sections/${sectionId}`, { method: 'DELETE' }),

    addFieldToSection: (id: string, formId: string, sectionId: string, data: { fieldId: string; requiredOverride?: boolean; sortOrder?: number }) =>
      request<ApiUtFormSectionField>(`/utility-types/${id}/forms/${formId}/sections/${sectionId}/fields`, { method: 'POST', body: JSON.stringify(data) }),
    removeFieldFromSection: (id: string, formId: string, sectionId: string, sfId: string) =>
      request<{ ok: boolean }>(`/utility-types/${id}/forms/${formId}/sections/${sectionId}/fields/${sfId}`, { method: 'DELETE' }),

    getAnalyticsLayout: (id: string) =>
      request<ApiAnalyticsLayout>(`/utility-types/${id}/analytics-layout`),
    saveAnalyticsLayout: (id: string, items: AnalyticsLayoutItem[]) =>
      request<ApiAnalyticsLayout>(`/utility-types/${id}/analytics-layout`, { method: 'PUT', body: JSON.stringify({ items }) }),
    resetAnalyticsLayout: (id: string) =>
      request<{ ok: boolean }>(`/utility-types/${id}/analytics-layout`, { method: 'DELETE' }),
  },

  // ── Files (photo/video evidence + future attachments) ─
  files: {
    upload: async (files: File[]): Promise<ApiFileRef[]> => {
      const fd = new FormData()
      for (const f of files) fd.append('files', f)
      const token = getToken()
      const res = await fetch(`${BASE}/files`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      })
      if (!res.ok) {
        let msg = `Upload failed: ${res.status}`
        try { const j = await res.json(); msg = j.error ?? msg } catch { /* noop */ }
        throw new Error(msg)
      }
      return res.json()
    },
    meta: (id: string) => request<ApiFileRef>(`/files/${id}/meta`),
    /** Inline URL for <img> / <video> tags. Requires session token to be valid. */
    url: (id: string): string => {
      const token = getToken()
      // We can't put Authorization header on <img>. The auth middleware accepts ?token= query as fallback.
      return `${BASE}/files/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`
    },
    downloadUrl: (id: string): string => {
      const token = getToken()
      return `${BASE}/files/${id}?download=1${token ? `&token=${encodeURIComponent(token)}` : ''}`
    },
  },

  // ── Sites ─────────────────────────────────────────────
  sites: {
    list: () => request<ApiSite[]>('/sites'),
    hierarchy: () => request<ApiSiteHierarchy[]>('/sites/hierarchy'),
    createSite: (name: string) =>
      request<ApiSite>('/sites', { method: 'POST', body: JSON.stringify({ name }) }),
    createPlant: (siteId: string, name: string) =>
      request<ApiPlant>('/sites/plants', { method: 'POST', body: JSON.stringify({ siteId, name }) }),
    createArea: (plantId: string, name: string) =>
      request<ApiArea>('/sites/areas', { method: 'POST', body: JSON.stringify({ plantId, name }) }),
  },

  // ── Reports ───────────────────────────────────────────
  reports: {
    generate: (data: { reportType: string; fromDate: string; toDate: string; utilityTypeId?: string }) =>
      request<ApiReport>('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),
    dashboard: () => request<ApiDashboardStats>('/reports/dashboard'),
  },

  // ── Report Templates (admin-built) ─────────────────────
  reportTemplates: {
    list: (utilityTypeId: string) =>
      request<ApiReportTemplate[]>(`/utility-types/${utilityTypeId}/reports`),
    create: (utilityTypeId: string, data: { slug: string; name: string; description?: string; icon?: string; defaultScope?: 'asset' | 'utility' | 'both'; sortOrder?: number }) =>
      request<ApiReportTemplate>(`/utility-types/${utilityTypeId}/reports`, { method: 'POST', body: JSON.stringify(data) }),
    update: (utilityTypeId: string, templateId: string, data: Partial<{ slug: string; name: string; description: string | null; icon: string; defaultScope: 'asset' | 'utility' | 'both'; sortOrder: number }>) =>
      request<ApiReportTemplate>(`/utility-types/${utilityTypeId}/reports/${templateId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (utilityTypeId: string, templateId: string) =>
      request<{ ok: boolean }>(`/utility-types/${utilityTypeId}/reports/${templateId}`, { method: 'DELETE' }),

    addSection: (utilityTypeId: string, templateId: string, data: { title: string; source: ReportSource; grouping?: ReportGrouping; filters?: Record<string, unknown>; utilityScopeBehavior?: ReportScopeBehavior; sortOrder?: number }) =>
      request<ApiReportSection>(`/utility-types/${utilityTypeId}/reports/${templateId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
    updateSection: (utilityTypeId: string, templateId: string, sectionId: string, data: Partial<{ title: string; source: ReportSource; grouping: ReportGrouping; filters: Record<string, unknown>; utilityScopeBehavior: ReportScopeBehavior; sortOrder: number }>) =>
      request<ApiReportSection>(`/utility-types/${utilityTypeId}/reports/${templateId}/sections/${sectionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteSection: (utilityTypeId: string, templateId: string, sectionId: string) =>
      request<{ ok: boolean }>(`/utility-types/${utilityTypeId}/reports/${templateId}/sections/${sectionId}`, { method: 'DELETE' }),
    reorderSections: (utilityTypeId: string, templateId: string, order: string[]) =>
      request<{ ok: boolean }>(`/utility-types/${utilityTypeId}/reports/${templateId}/sections/reorder`, { method: 'POST', body: JSON.stringify({ order }) }),

    addColumn: (utilityTypeId: string, templateId: string, sectionId: string, data: Omit<ApiReportColumn, 'id' | 'sectionId'>) =>
      request<ApiReportColumn>(`/utility-types/${utilityTypeId}/reports/${templateId}/sections/${sectionId}/columns`, { method: 'POST', body: JSON.stringify(data) }),
    updateColumn: (utilityTypeId: string, templateId: string, sectionId: string, columnId: string, data: Partial<Omit<ApiReportColumn, 'id' | 'sectionId'>>) =>
      request<ApiReportColumn>(`/utility-types/${utilityTypeId}/reports/${templateId}/sections/${sectionId}/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteColumn: (utilityTypeId: string, templateId: string, sectionId: string, columnId: string) =>
      request<{ ok: boolean }>(`/utility-types/${utilityTypeId}/reports/${templateId}/sections/${sectionId}/columns/${columnId}`, { method: 'DELETE' }),
    reorderColumns: (utilityTypeId: string, templateId: string, sectionId: string, order: string[]) =>
      request<{ ok: boolean }>(`/utility-types/${utilityTypeId}/reports/${templateId}/sections/${sectionId}/columns/reorder`, { method: 'POST', body: JSON.stringify({ order }) }),

    // Gallery / skeletons
    listSkeletons: (utilityTypeId: string) =>
      request<ApiReportSkeleton[]>(`/utility-types/${utilityTypeId}/reports/skeletons`),
    instantiateSkeleton: (utilityTypeId: string, data: { skeletonId: string; mappings: Record<string, string | null>; name?: string; slug?: string }) =>
      request<{ ok: boolean; templateId: string }>(`/utility-types/${utilityTypeId}/reports/from-skeleton`, { method: 'POST', body: JSON.stringify(data) }),

    // Copy from another utility's template
    listCopyCandidates: (utilityTypeId: string) =>
      request<ApiCopyCandidate[]>(`/utility-types/${utilityTypeId}/reports/copy-candidates`),
    copyFrom: (utilityTypeId: string, data: { sourceTemplateId: string; name?: string; slug?: string }) =>
      request<{ ok: boolean; templateId: string; unmappedColumns: number }>(`/utility-types/${utilityTypeId}/reports/copy-from`, { method: 'POST', body: JSON.stringify(data) }),

    // Preview (returns rendered JSON, NOT a file). Tables are truncated to
    // ~100 rows on the server — for a full count, also check `totalRows`.
    previewUtility: (utilityTypeId: string, data: { templateId: string; fromDate: string; toDate: string; assetIds?: string[] }) =>
      request<ApiReportPreview>(`/utility-types/${utilityTypeId}/reports/preview`, { method: 'POST', body: JSON.stringify(data) }),
    previewAsset: (assetId: string, data: { templateId: string; fromDate: string; toDate: string }) =>
      request<ApiReportPreview>(`/assets/${assetId}/reports/preview`, { method: 'POST', body: JSON.stringify(data) }),

    // Utility-scope generate (streams a file). Pass `assetIds` to limit to a subset.
    generateUtility: async (utilityTypeId: string, opts: ReportGenerateOptions) => {
      const token = getToken()
      const res = await fetch(`${BASE}/utility-types/${utilityTypeId}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(opts),
      })
      if (!res.ok) {
        let msg = `Report failed: ${res.status}`
        try { const j = await res.json(); msg = j.error ?? msg } catch { /* binary */ }
        throw new Error(msg)
      }
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') ?? ''
      const match = /filename="?([^"]+)"?/i.exec(cd)
      const filename = match?.[1] ?? `report.${opts.format.toLowerCase()}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return { filename }
    },

    // Asset-scope generate using a templateId. The legacy `generateReport`
    // method (slug-based) lives under api.assetDetails for backwards compat.
    generateAsset: async (assetId: string, opts: ReportGenerateOptions) => {
      const token = getToken()
      const res = await fetch(`${BASE}/assets/${assetId}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(opts),
      })
      if (!res.ok) {
        let msg = `Report failed: ${res.status}`
        try { const j = await res.json(); msg = j.error ?? msg } catch { /* binary */ }
        throw new Error(msg)
      }
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') ?? ''
      const match = /filename="?([^"]+)"?/i.exec(cd)
      const filename = match?.[1] ?? `report.${opts.format.toLowerCase()}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return { filename }
    },
  },

  // ── Asset Detail Sub-Resources ────────────────────────
  assetDetails: {
    overview: (assetId: string) =>
      request<ApiAssetOverview>(`/assets/${assetId}/overview`),
    listComponents: (assetId: string) =>
      request<ApiAssetComponent[]>(`/assets/${assetId}/components`),
    addComponent: (assetId: string, data: Partial<ApiAssetComponent>) =>
      request<ApiAssetComponent>(`/assets/${assetId}/components`, { method: 'POST', body: JSON.stringify(data) }),
    updateComponent: (assetId: string, cid: string, data: Partial<ApiAssetComponent>) =>
      request<ApiAssetComponent>(`/assets/${assetId}/components/${cid}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteComponent: (assetId: string, cid: string) =>
      request<{ ok: boolean }>(`/assets/${assetId}/components/${cid}`, { method: 'DELETE' }),
    listFiles: (assetId: string) =>
      request<ApiAssetFile[]>(`/assets/${assetId}/files`),
    addFile: (assetId: string, data: Partial<ApiAssetFile>) =>
      request<ApiAssetFile>(`/assets/${assetId}/files`, { method: 'POST', body: JSON.stringify(data) }),
    deleteFile: (assetId: string, fid: string) =>
      request<{ ok: boolean }>(`/assets/${assetId}/files/${fid}`, { method: 'DELETE' }),
    listSubmissions: (assetId: string) =>
      request<ApiSubmission[]>(`/assets/${assetId}/submissions`),
    listBreakdowns: (assetId: string) =>
      request<ApiBreakdown[]>(`/assets/${assetId}/breakdowns`),
    listPmPlans: (assetId: string) =>
      request<ApiPmPlan[]>(`/assets/${assetId}/pm-plans`),
    listSpares: (assetId: string) =>
      request<ApiSpare[]>(`/assets/${assetId}/spares`),
    listForms: (assetId: string) =>
      request<ApiUtForm[]>(`/assets/${assetId}/forms`),
    getFormConfig: (assetId: string, formId: string) =>
      request<ApiAssetFormFull>(`/assets/${assetId}/forms/${formId}`),
    updateFieldOverride: (assetId: string, formId: string, sfId: string, data: { isHidden?: boolean; requiredOverride?: boolean | null }) =>
      request<{ ok: boolean }>(`/assets/${assetId}/forms/${formId}/fields/${sfId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    addExtraField: (assetId: string, formId: string, sectionId: string, data: Partial<ApiAssetExtraField>) =>
      request<ApiAssetExtraField>(`/assets/${assetId}/forms/${formId}/sections/${sectionId}/extra-fields`, { method: 'POST', body: JSON.stringify(data) }),
    deleteExtraField: (assetId: string, efId: string) =>
      request<{ ok: boolean }>(`/assets/${assetId}/extra-fields/${efId}`, { method: 'DELETE' }),
    generateReport: async (assetId: string, reportType: string, fromDate: string, toDate: string, format: string) => {
      const token = getToken()
      const res = await fetch(`${BASE}/assets/${assetId}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reportType, fromDate, toDate, format }),
      })
      if (!res.ok) {
        let msg = `Report failed: ${res.status}`
        try { const j = await res.json(); msg = j.error ?? msg } catch { /* binary or no body */ }
        throw new Error(msg)
      }
      const blob = await res.blob()
      // Prefer server-provided filename from Content-Disposition
      const cd = res.headers.get('content-disposition') ?? ''
      const match = /filename="?([^"]+)"?/i.exec(cd)
      const filename = match?.[1] ?? `${reportType}.${format.toLowerCase()}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Defer revoke so Safari has time to start the download
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return { filename }
    },

    // Checklists
    listChecklists: (assetId: string) =>
      request<ApiAssetChecklist[]>(`/assets/${assetId}/checklists`),
    createChecklist: (assetId: string, frequency: string) =>
      request<ApiAssetChecklist>(`/assets/${assetId}/checklists`, { method: 'POST', body: JSON.stringify({ frequency }) }),
    deleteChecklist: (assetId: string, clId: string) =>
      request<{ ok: boolean }>(`/assets/${assetId}/checklists/${clId}`, { method: 'DELETE' }),
    addChecklistItem: (assetId: string, clId: string, data: Omit<ApiAssetChecklistItem, 'id' | 'checklistId' | 'assetId' | 'createdAt' | 'updatedAt'>) =>
      request<ApiAssetChecklistItem>(`/assets/${assetId}/checklists/${clId}/items`, { method: 'POST', body: JSON.stringify(data) }),
    updateChecklistItem: (assetId: string, clId: string, itemId: string, data: Partial<ApiAssetChecklistItem>) =>
      request<ApiAssetChecklistItem>(`/assets/${assetId}/checklists/${clId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteChecklistItem: (assetId: string, clId: string, itemId: string) =>
      request<{ ok: boolean }>(`/assets/${assetId}/checklists/${clId}/items/${itemId}`, { method: 'DELETE' }),
  },

  // ── Asset Alerts ─────────────────────────────────────
  assetAlerts: {
    list: (assetId: string) =>
      request<ApiAssetAlertsResponse>(`/assets/${assetId}/alerts`),
    setOverride: (assetId: string, ruleId: string, data: { isDisabled?: boolean; overrideValue?: string | null; overrideSeverity?: string | null }) =>
      request<{ id: string }>(`/assets/${assetId}/alert-overrides/${ruleId}`, { method: 'PUT', body: JSON.stringify(data) }),
    addExtraRule: (assetId: string, data: { name: string; fieldName: string; condition: string; value: string; severity: string; action?: string }) =>
      request<ApiAssetExtraAlertRule>(`/assets/${assetId}/alerts`, { method: 'POST', body: JSON.stringify(data) }),
    updateExtraRule: (assetId: string, ruleId: string, data: Partial<{ name: string; fieldName: string; condition: string; value: string; severity: string; action: string }>) =>
      request<ApiAssetExtraAlertRule>(`/assets/${assetId}/alerts/${ruleId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteExtraRule: (assetId: string, ruleId: string) =>
      request<{ ok: boolean }>(`/assets/${assetId}/alerts/${ruleId}`, { method: 'DELETE' }),
  },

  // ── Analytics ─────────────────────────────────────────
  analytics: {
    get: (params: { utilityTypeId: string; assetIds?: string[]; from?: string; to?: string }) => {
      const qs = new URLSearchParams({ utilityTypeId: params.utilityTypeId });
      if (params.assetIds?.length) qs.set('assetIds', params.assetIds.join(','));
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      return request<ApiAnalyticsResult>(`/analytics?${qs.toString()}`);
    },
  },

  // ── Tickets ───────────────────────────────────────────
  tickets: {
    list: (params?: { utilityTypeId?: string; assetId?: string }) => {
      const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]).toString()}` : ''
      return request<ApiTicket[]>(`/tickets${qs}`)
    },
    get: (id: string) => request<ApiTicketFull>(`/tickets/${id}`),
    create: (data: CreateTicketPayload) =>
      request<ApiTicket>('/tickets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateTicketPayload) =>
      request<ApiTicket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/tickets/${id}`, { method: 'DELETE' }),
    engineersForUtility: (utilityTypeId: string) =>
      request<ApiUser[]>(`/tickets/engineers/${utilityTypeId}`),
    getRevisions: (id: string) =>
      request<ApiTicketRevision[]>(`/tickets/${id}/revisions`),
    flagged: () =>
      request<ApiFlaggedTicket[]>('/tickets/flagged'),
  },

  // ── Ping ──────────────────────────────────────────────
  ping: () => request<{ ok: boolean; ts: string }>('/ping', {}, false),
}

// ── API Type Definitions ──────────────────────────────────
export interface ApiUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'approver' | 'reviewer' | 'operator' | 'leadership' | 'engineer'
  shift: 'A' | 'B' | 'C' | null
  assignedUtilityIds: string[]
  createdAt: string
  updatedAt: string
}

export interface ApiAsset {
  id: string
  name: string
  status: 'Active' | 'Under Maintenance' | 'Inactive'
  manufacturer: string | null
  model: string | null
  serial: string | null
  installDate: string | null
  ratedKva: string | null
  utilityTypeId: string
  utilityTypeName: string | null
  utilityTypeIcon: string | null
  siteId: string
  siteName: string | null
  plantId: string
  plantName: string | null
  areaId: string
  areaName: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiSubmission {
  id: string
  date: string
  shift: 'A' | 'B' | 'C'
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'
  values: Record<string, unknown>
  rejectionReason: string | null
  assetId: string
  assetName: string | null
  utilityTypeId: string
  utilityTypeName: string | null
  operatorId: string
  operatorName: string | null
  createdAt: string
}

export interface ApiComplaint {
  id: string
  number: string
  category: string
  location: string | null
  description: string
  status: 'Open' | 'Assigned' | 'In Progress' | 'Pending' | 'Closed'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  assetId: string | null
  assetName: string | null
  utilityTypeId: string | null
  utilityTypeName: string | null
  reporterId: string
  reporterName: string | null
  timeTaken: string | null
  completionDate: string | null
  remarks: { text: string; by: string; date: string }[]
  createdAt: string
  updatedAt: string
}

export interface ApiBreakdown {
  id: string
  number: string
  nature: string
  status: 'Raised' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  assetId: string
  assetName: string | null
  reporterId: string
  reporterName: string | null
  actionTaken: string | null
  laborHours: string | null
  downtimeHours: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiPmPlan {
  id: string
  task: string
  frequency: string
  nextDue: string
  lastDone: string | null
  status: 'Scheduled' | 'Overdue' | 'Completed'
  components: string[]
  estimatedHours: string | null
  completionReason: string | null
  assetId: string
  assetName: string | null
  utilityTypeId: string
  utilityTypeName: string | null
  assignedToId: string | null
  assignedToName: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiSpare {
  id: string
  name: string
  partCode: string
  unit: string
  minStock: number
  currentQty: number
  unitCost: string
  utilityTypeId: string | null
  assetId: string | null
  location: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiUtilityType {
  id: string
  name: string
  icon: string
  category: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiUtField {
  id: string
  utilityTypeId: string
  name: string
  type: 'number' | 'text' | 'time' | 'dropdown' | 'date' | 'photo' | 'video'
  unit: string | null
  required: boolean
  computed: boolean
  formula: string | null
  options: string[] | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ApiUtKpi {
  id: string
  utilityTypeId: string
  name: string
  formula: string
  unit: string | null
  alertBelow: string | null
  alertAbove: string | null
  target: string | null
  recommendedChart: 'area' | 'bar' | 'line' | 'radial' | 'pie' | 'composed'
  createdAt: string
  updatedAt: string
}

export interface ApiFileRef {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  uploadedById?: string | null
  createdAt?: string
  url: string
}

export interface AnalyticsLayoutItem {
  kpiId: string
  x: number
  y: number
  w: number
  h: number
  hidden?: boolean
  chartType?: 'line' | 'bar' | 'area'
}

export interface ApiAnalyticsLayout {
  id?: string
  utilityTypeId?: string
  items: AnalyticsLayoutItem[]
  updatedById?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ApiUtAlertRule {
  id: string
  utilityTypeId: string
  name: string
  fieldName: string
  condition: '>' | '<' | '=='
  value: string
  condition2: '>' | '<' | '==' | null
  value2: string | null
  minValue: string | null
  maxValue: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiUtilityTypeFull extends ApiUtilityType {
  fields: ApiUtField[]
  kpis: ApiUtKpi[]
  alertRules: ApiUtAlertRule[]
  components: unknown[]
  forms: ApiUtForm[]
}

export interface ApiUtForm {
  id: string
  utilityTypeId: string
  name: string
  description: string | null
  scope: 'engineer' | 'operator'
  isDefault: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ApiUtFormSection {
  id: string
  formId: string
  name: string
  description: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ApiUtFormSectionField {
  id: string
  formId: string
  sectionId: string
  fieldId: string
  fieldName: string | null
  fieldType: string | null
  fieldUnit: string | null
  required?: boolean | null
  requiredOverride: boolean | null
  sortOrder: number
  createdAt: string
  updatedAt?: string
}

export interface ApiUtFormFull extends ApiUtForm {
  sections: (ApiUtFormSection & { fields: ApiUtFormSectionField[] })[]
}

export interface ApiAssetExtraField {
  id: string
  assetId: string
  utilityTypeId: string
  formId: string
  sectionId: string
  name: string
  type: 'number' | 'text' | 'time' | 'dropdown' | 'date' | 'photo' | 'video'
  unit: string | null
  required: boolean
  computed: boolean
  formula: string | null
  options: string[] | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ApiAssetFormSectionField extends ApiUtFormSectionField {
  isHidden: boolean
  assetRequiredOverride: boolean | null
}

export interface ApiAssetFormFull extends ApiUtForm {
  sections: (ApiUtFormSection & {
    fields: ApiAssetFormSectionField[]
    extraFields: ApiAssetExtraField[]
  })[]
}

export interface ApiSite {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ApiPlant extends ApiSite {
  siteId: string
}

export interface ApiArea extends ApiSite {
  plantId: string
}

export interface ApiSiteHierarchy extends ApiSite {
  plants: (ApiPlant & { areas: ApiArea[] })[]
}

export interface ApiReport {
  reportType: string
  dateRange: { from: string; to: string }
  totalRecords: number
  data: { period: string; count: number; statuses: { submitted: number; approved: number; rejected: number } }[]
}

export interface ApiDashboardStats {
  totalSubmissions: number
  approved: number
  rejected: number
  pending: number
  approvalRate: number
  period: { from: string; to: string }
}

// ── Payload types ─────────────────────────────────────────
export interface CreateUserPayload {
  name: string
  email: string
  password?: string
  role: ApiUser['role']
  shift?: 'A' | 'B' | 'C' | null
}

export interface CreateAssetPayload {
  name: string
  utilityTypeId: string
  siteId: string
  plantId: string
  areaId: string
  status?: 'Active' | 'Under Maintenance' | 'Inactive'
  manufacturer?: string
  model?: string
  serial?: string
  installDate?: string
  ratedKva?: string
}

export interface CreateSubmissionPayload {
  utilityTypeId: string
  assetId: string
  formId?: string
  shift: 'A' | 'B' | 'C'
  values: Record<string, unknown>
}

export interface CreateComplaintPayload {
  description: string
  category: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  location?: string
  assetId?: string | null
  utilityTypeId?: string | null
}

export interface UpdateComplaintPayload {
  status?: 'Open' | 'Assigned' | 'In Progress' | 'Pending' | 'Closed'
  assignedToId?: string | null
  timeTaken?: string
  completionDate?: string
  remarks?: { text: string; by: string; date: string }[]
}

export interface CreateBreakdownPayload {
  assetId: string
  nature: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
}

export interface UpdateBreakdownPayload {
  status?: 'Raised' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed'
  assignedToId?: string | null
  actionTaken?: string
  laborHours?: string
  downtimeHours?: string
  resolvedAt?: string | null
}

export interface CreatePmPlanPayload {
  task: string
  assetId: string
  utilityTypeId: string
  assignedToId?: string | null
  frequency: string
  nextDue: string
  estimatedHours?: string | null
  components?: string[]
}

export interface UpdatePmPlanPayload {
  status?: 'Scheduled' | 'Overdue' | 'Completed'
  lastDone?: string | null
  nextDue?: string
  assignedToId?: string | null
  completionReason?: string
  components?: string[]
}

// ── Maintenance Plans ─────────────────────────────────────
export type MaintenancePlanStatus = 'Draft' | 'Active' | 'Paused' | 'Inactive' | 'Archived'
export type FrequencyType = 'Monthly' | 'Quarterly' | 'Half Yearly' | 'Yearly'

export interface FrequencySchedule {
  frequency: FrequencyType
  startMonth: number
  startDay: number
}

export interface ApiMaintenancePlanEntry {
  id: string
  planId: string
  assetId: string | null
  assetName: string | null
  utilityTypeId: string | null
  utilityTypeName: string | null
  equipmentNo: string | null
  equipmentDesc: string | null
  frequencies: FrequencySchedule[]
  year: number
  remarks: string | null
  actuals: Record<string, string | null>
  assignedToId: string | null
  assignedToName: string | null
  createdAt: string
}

export interface ApiMaintenancePlan {
  id: string
  planCode: string
  name: string
  year: number
  status: MaintenancePlanStatus
  description: string | null
  endDate: string | null
  createdById: string | null
  createdByName: string | null
  assetCount: number
  createdAt: string
  updatedAt: string
}

export interface ApiMaintenancePlanFull extends ApiMaintenancePlan {
  entries: ApiMaintenancePlanEntry[]
}

export interface CreateSparePayload {
  name: string
  partCode: string
  unit?: string
  minStock?: number
  currentQty?: number
  unitCost?: string
  utilityTypeId?: string | null
  assetId?: string | null
  location?: string | null
}

export interface ApiAssetComponent {
  id: string
  assetId: string
  name: string
  group: string
  partNumber: string
  condition: 'Good' | 'Fair' | 'Due for Replacement'
  lastChecked: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiAssetChecklistItem {
  id: string
  checklistId: string
  assetId: string
  name: string
  frequency: string
  checkingMethod: string
  standard: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ApiAssetChecklist {
  id: string
  assetId: string
  frequency: string
  createdAt: string
  updatedAt: string
  items: ApiAssetChecklistItem[]
}

export interface ApiAssetFile {
  id: string
  assetId: string
  name: string
  category: 'Manual' | 'Certificate' | 'Inspection Report' | 'Drawing' | 'Photo' | 'Other'
  sizeBytes: number | null
  uploadedById: string | null
  uploadedByName: string | null
  uploadedAt: string
  url: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiAssetOverview extends ApiAsset {
  pmPlans: ApiPmPlan[]
  lastServiceDate: string | null
  nextServiceDue: string | null
  openBreakdowns: number
  siteName: string | null
  plantName: string | null
  areaName: string | null
}

// ── Ticket types ──────────────────────────────────────────
export type TicketType = 'Task' | 'Data Entry' | 'PM Plan' | 'Breakdown'
export type TicketStatus = 'Open' | 'Assigned' | 'In Progress' | 'Submitted' | 'Resubmitted' | 'Approved' | 'Rejected' | 'Needs Revision' | 'Closed'
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export interface ApiTicket {
  id: string
  number: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  title: string
  description: string | null
  dueDate: string | null
  submittedAt: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  filledValues: Record<string, unknown>
  utilityTypeId: string | null
  utilityTypeName: string | null
  assetId: string | null
  assetName: string | null
  assetSerial: string | null
  formId: string | null
  formName: string | null
  pmPlanId: string | null
  maintenancePlanEntryId: string | null
  breakdownId: string | null
  submissionId: string | null
  createdById: string | null
  assignedToId: string | null
  assignedToName: string | null
  engineerHeadId: string | null
  additionalEngineerIds: string[]
  reviewedById: string | null
  createdAt: string
  updatedAt: string
  alertCount?: number
  criticalCount?: number
  highCount?: number
  planId?: string | null
  planName?: string | null
  planStatus?: MaintenancePlanStatus | null
  planEndDate?: string | null
}

export interface ApiTicketTimelineEvent {
  event: string
  status: string
  byName: string
  byId: string
  note?: string | null
  at: string
}

export interface ApiTicketSubmission {
  index: number
  status: string
  byName: string
  byId: string
  at: string
  values: Record<string, unknown>
  formSnapshot: ApiTicketFormData | null
  triggeredAlerts?: ApiTriggeredAlert[]
}

// Keep for backwards compat
export interface ApiTicketRevision {
  id: string
  ticketId: string
  status: string
  filledValues: Record<string, unknown>
  note: string | null
  submittedAt: string
  submittedById: string | null
  submittedByName: string | null
}

export type ApiTicketFormData = {
  sections: {
    id: string
    name: string
    sortOrder: number
    fields: {
      id: string
      fieldId: string
      fieldName: string | null
      fieldType: string | null
      fieldUnit: string | null
      required: boolean | null
      fieldOptions: string[] | null
      requiredOverride: boolean | null
      isHidden: boolean
      assetRequiredOverride: boolean | null
      computed: boolean
      formula: string | null
      sortOrder: number
    }[]
    extraFields: ApiAssetExtraField[]
  }[]
}

export interface ApiTicketFull extends ApiTicket {
  formData: ApiTicketFormData | null
  submissions: ApiTicketSubmission[]
  timeline: ApiTicketTimelineEvent[]
  triggeredAlerts: ApiTriggeredAlert[]
}

export interface ApiTriggeredAlert {
  ruleId: string
  name: string
  fieldName: string
  condition: string
  threshold: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: string | null
  submittedValue: string
}

export interface ApiPmPlanTicket {
  id: string
  number: string
  status: TicketStatus
  title: string
  dueDate: string | null
  submittedAt: string | null
  reviewedAt: string | null
  maintenancePlanEntryId: string | null
  assignedToId: string | null
  assignedToName: string | null
  createdAt: string
  alertCount: number
  criticalCount: number
  highCount: number
}

export interface ApiFlaggedTicket {
  id: string
  number: string
  type: string
  priority: string
  status: string
  title: string
  description: string | null
  dueDate: string | null
  submittedAt: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  utilityTypeId: string | null
  utilityTypeName: string | null
  assetId: string | null
  assetName: string | null
  assignedToId: string | null
  assignedToName: string | null
  createdAt: string
  updatedAt: string
  triggeredAlerts: ApiTriggeredAlert[]
  alertCount: number
  criticalCount: number
  highCount: number
}

export interface CreateTicketPayload {
  type: TicketType
  priority?: TicketPriority
  title: string
  description?: string
  dueDate?: string
  utilityTypeId?: string
  assetId?: string
  formId?: string
  pmPlanId?: string
  breakdownId?: string
  assignedToId?: string
  engineerHeadId?: string
  additionalEngineerIds?: string[]
}

export interface UpdateTicketPayload {
  status?: TicketStatus
  priority?: TicketPriority
  assignedToId?: string | null
  engineerHeadId?: string | null
  additionalEngineerIds?: string[]
  dueDate?: string | null
  description?: string
  rejectionReason?: string
  filledValues?: Record<string, unknown>
}

// ── Asset Alert Types ──────────────────────────────────────
export interface ApiAssetAlertRuleWithOverride {
  id: string
  utilityTypeId: string
  name: string
  fieldName: string
  condition: '>' | '<' | '=='
  value: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: string | null
  isDisabled: boolean
  overrideValue: string | null
  overrideSeverity: 'low' | 'medium' | 'high' | 'critical' | null
  hasOverride: boolean
  overrideId: string | null
}

export interface ApiAssetExtraAlertRule {
  id: string
  assetId: string
  utilityTypeId: string
  name: string
  fieldName: string
  condition: '>' | '<' | '=='
  value: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: string | null
}

export interface ApiAssetAlertsResponse {
  utilityRules: ApiAssetAlertRuleWithOverride[]
  extraRules: ApiAssetExtraAlertRule[]
}

// ── Analytics Types ────────────────────────────────────────
export interface ApiAnalyticsKpiSeries {
  id: string
  name: string
  unit: string
  formula: string
  recommendedChart: 'area' | 'bar' | 'line' | 'radial' | 'pie' | 'composed'
  target: number | null
  alertBelow: number | null
  alertAbove: number | null
  series: { date: string; value: number }[]
}

export interface ApiAnalyticsResult {
  kpis: ApiAnalyticsKpiSeries[]
  alertTrend: { date: string; critical: number; high: number; medium: number; low: number }[]
  assets: { id: string; name: string }[]
}

// ── Report Template Types ──────────────────────────────────
export type ReportSource = 'submissions' | 'breakdowns' | 'pm_plans' | 'tickets' | 'spare_consumption' | 'computed'
export type ReportGrouping = 'none' | 'row' | 'date' | 'shift' | 'date_shift' | 'month' | 'status' | 'asset' | 'priority'
export type ReportColumnKind = 'builtin' | 'field' | 'aggregate' | 'formula'
export type ReportAggregate = 'sum' | 'avg' | 'min' | 'max' | 'last' | 'count'
export type ReportScopeBehavior = 'append_asset_col' | 'collapse_per_asset' | 'skip'

export interface ApiReportColumn {
  id: string
  sectionId: string
  label: string
  key: string
  kind: ReportColumnKind
  builtin: string | null
  fieldId: string | null
  fieldName: string | null
  aggregate: ReportAggregate | null
  formula: string | null
  width: number
  align: 'left' | 'right' | 'center'
  format: { digits?: number; dateFormat?: 'short' | 'long' }
  sortOrder: number
}

export interface ApiReportSection {
  id: string
  templateId: string
  title: string
  source: ReportSource
  grouping: ReportGrouping
  filters: Record<string, unknown>
  utilityScopeBehavior: ReportScopeBehavior
  sortOrder: number
  columns: ApiReportColumn[]
}

export interface ApiReportTemplate {
  id: string
  utilityTypeId: string
  slug: string
  name: string
  description: string | null
  icon: string
  defaultScope: 'asset' | 'utility' | 'both'
  sortOrder: number
  sections: ApiReportSection[]
}

export interface ReportGenerateOptions {
  templateId: string
  fromDate: string
  toDate: string
  format: 'PDF' | 'Excel' | 'CSV'
  assetIds?: string[]
}

// ── Skeleton (gallery) types ────────────────────────────────
export interface ApiSkeletonSlot {
  key: string
  label: string
  hint: string
  required?: boolean
}

export interface ApiReportSkeleton {
  id: string
  name: string
  description: string
  icon: string
  defaultScope: 'asset' | 'utility' | 'both'
  slots: ApiSkeletonSlot[]
  sectionCount: number
  sourcesUsed: ReportSource[]
}

export interface ApiCopyCandidate {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string
  sourceUtilityTypeId: string
}

// ── Preview (live on-screen) ───────────────────────────────
export interface ApiReportPreviewColumn {
  key: string
  label: string
  width?: number
  align?: 'left' | 'right' | 'center'
}
export interface ApiReportPreviewTable {
  title: string
  columns: ApiReportPreviewColumn[]
  /** Truncated to a row cap by the backend. `rows.length` may be ≤ `totalRows`. */
  rows: Record<string, string | number | null>[]
  /** Total row count before truncation. */
  totalRows: number
}
export interface ApiReportPreview {
  reportId: string
  title: string
  asset: { id: string; name: string; serial: string | null; utilityTypeId: string; manufacturer: string | null; model: string | null }
  dateRange: { from: string; to: string }
  generatedAt: string
  generatedBy: string
  tables: ApiReportPreviewTable[]
}

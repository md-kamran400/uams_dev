import React, { useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Settings,
  Bell,
  Calendar as CalendarIcon,
  Users,
  Mail,
  Shield,
  Database,
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Eye,
  Send,
} from "lucide-react";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Badge from "../../ui/Badge";
import * as Dialog from "@radix-ui/react-dialog";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Configuration sections
interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface NotificationRule {
  id: string;
  name: string;
  daysBefore: number;
  recipients: string[];
  ccRecipients: string[];
  bccRecipients: string[];
  emailSubject: string;
  emailBody: string;
  enabled: boolean;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
}

interface WorkingDay {
  id: string;
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const sections: ConfigSection[] = [
  {
    id: "general",
    title: "General Settings",
    description: "Basic configuration for maintenance plans",
    icon: <Settings size={18} />,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure alerts and reminders",
    icon: <Bell size={18} />,
  },
  {
    id: "schedule",
    title: "Schedule Rules",
    description: "Working days and holiday calendar",
    icon: <CalendarIcon size={18} />,
  },
  {
    id: "approvals",
    title: "Approval Workflow",
    description: "Setup approval chains for maintenance tasks",
    icon: <Users size={18} />,
  },
  {
    id: "integration",
    title: "Integrations",
    description: "Connect with external systems",
    icon: <Database size={18} />,
  },
];

const frequencyOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "halfYearly", label: "Half Yearly" },
  { value: "yearly", label: "Yearly" },
];

const weekDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const defaultWorkingDays: WorkingDay[] = weekDays.map((day, index) => ({
  id: `wd-${index}`,
  day,
  enabled: index < 5, // Monday to Friday enabled by default
  startTime: "09:00",
  endTime: "17:00",
}));

const defaultHolidays: Holiday[] = [
  { id: "hol-1", name: "New Year's Day", date: "2024-01-01", recurring: true },
  { id: "hol-2", name: "Republic Day", date: "2024-01-26", recurring: true },
  {
    id: "hol-3",
    name: "Independence Day",
    date: "2024-08-15",
    recurring: true,
  },
  { id: "hol-4", name: "Gandhi Jayanti", date: "2024-10-02", recurring: true },
  { id: "hol-5", name: "Christmas Day", date: "2024-12-25", recurring: true },
];

const defaultNotificationRules: NotificationRule[] = [
  {
    id: "notif-1",
    name: "Upcoming Maintenance",
    daysBefore: 7,
    recipients: ["maintenance@example.com", "supervisor@example.com"],
    ccRecipients: ["planner@example.com"],
    bccRecipients: ["audit@example.com"],
    emailSubject: "Upcoming Maintenance Task: {{task_title}}",
    emailBody: `Dear Team,

This is a reminder that the following maintenance task is scheduled:

Task: {{task_title}}
Equipment: {{equipment_name}}
Date: {{task_date}}
Priority: {{priority}}

Please ensure all preparations are completed before the scheduled date.

Best regards,
Maintenance Team`,
    enabled: true,
  },
  {
    id: "notif-2",
    name: "Overdue Tasks",
    daysBefore: 0,
    recipients: ["manager@example.com"],
    ccRecipients: [],
    bccRecipients: [],
    emailSubject: "URGENT: Overdue Maintenance Task - {{task_title}}",
    emailBody: `Dear Manager,

The following maintenance task is now overdue:

Task: {{task_title}}
Equipment: {{equipment_name}}
Original Date: {{task_date}}
Status: Overdue

Please take immediate action to address this overdue task.

Regards,
System Administrator`,
    enabled: true,
  },
  {
    id: "notif-3",
    name: "Completion Confirmation",
    daysBefore: -1,
    recipients: ["planner@example.com"],
    ccRecipients: ["supervisor@example.com"],
    bccRecipients: [],
    emailSubject: "Maintenance Task Completed: {{task_title}}",
    emailBody: `Dear Planner,

The following maintenance task has been completed:

Task: {{task_title}}
Equipment: {{equipment_name}}
Completion Date: {{completion_date}}
Work Order: {{work_order_number}}

Attached is the completion report for your reference.

Best regards,
Maintenance Team`,
    enabled: false,
  },
];

export default function PlanConfig() {
  const [activeSection, setActiveSection] = useState("general");
  const [workingDays, setWorkingDays] =
    useState<WorkingDay[]>(defaultWorkingDays);
  const [holidays, setHolidays] = useState<Holiday[]>(defaultHolidays);
  const [notificationRules, setNotificationRules] = useState<
    NotificationRule[]
  >(defaultNotificationRules);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState<NotificationRule | null>(
    null,
  );
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [previewEmailBody, setPreviewEmailBody] = useState<string>("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    autoScheduleEnabled: true,
    defaultFrequency: "monthly",
    reminderDays: 7,
    requireApproval: true,
    allowWeekendTasks: false,
    taskBufferDays: 3,
  });

  // Integration Settings State
  const [integrationSettings, setIntegrationSettings] = useState({
    erpSyncEnabled: false,
    erpEndpoint: "",
    emailNotifications: true,
    smsNotifications: false,
    webhookUrl: "",
    emailProvider: "smtp", // smtp, sendgrid, aws
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    fromEmail: "noreply@maintenance.com",
    fromName: "Maintenance System",
  });

  const handleSaveAll = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  // const handleAddHoliday = (data: Omit<Holiday, "id">) => {
  //   const newHoliday: Holiday = {
  //     ...data,
  //     id: `hol-${Date.now()}`,
  //   };
  //   setHolidays((prev) => [...prev, newHoliday]);
  // };

  const handleUpdateHoliday = (id: string, data: Partial<Holiday>) => {
    setHolidays((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...data } : h)),
    );
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  // const handleAddNotificationRule = (data: Omit<NotificationRule, "id">) => {
  //   const newRule: NotificationRule = {
  //     ...data,
  //     id: `notif-${Date.now()}`,
  //   };
  //   setNotificationRules((prev) => [...prev, newRule]);
  // };

  const handleUpdateNotificationRule = (
    id: string,
    data: Partial<NotificationRule>,
  ) => {
    setNotificationRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data } : r)),
    );
  };

  const handleDeleteNotificationRule = (id: string) => {
    setNotificationRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleWorkingDay = (id: string) => {
    setWorkingDays((prev) =>
      prev.map((wd) => (wd.id === id ? { ...wd, enabled: !wd.enabled } : wd)),
    );
  };

  const handleUpdateWorkingDayTime = (
    id: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setWorkingDays((prev) =>
      prev.map((wd) => (wd.id === id ? { ...wd, [field]: value } : wd)),
    );
  };

  const previewEmailTemplate = (subject: string, body: string) => {
    // Replace template variables with dummy data for preview
    const dummyData = {
      task_title: "Generator Annual Maintenance",
      equipment_name: "Diesel Generator GEN-001",
      task_date: "March 15, 2024",
      priority: "High",
      completion_date: "March 15, 2024",
      work_order_number: "WO-2024-00123",
    };

    let previewBody = body;
    let previewSubject = subject;

    Object.entries(dummyData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      previewBody = previewBody.replace(regex, value);
      previewSubject = previewSubject.replace(regex, value);
    });

    setPreviewEmailBody(previewBody);
    setShowEmailPreview(true);
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-4">
          Schedule Configuration
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
            <span className="text-sm text-gray-700">Auto-schedule tasks</span>
            <button
              onClick={() =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  autoScheduleEnabled: !prev.autoScheduleEnabled,
                }))
              }
              className={`relative w-10 h-5 rounded-full transition-colors ${generalSettings.autoScheduleEnabled ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${generalSettings.autoScheduleEnabled ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
            <span className="text-sm text-gray-700">
              Require approval for tasks
            </span>
            <button
              onClick={() =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  requireApproval: !prev.requireApproval,
                }))
              }
              className={`relative w-10 h-5 rounded-full transition-colors ${generalSettings.requireApproval ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${generalSettings.requireApproval ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </label>
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Default Frequency
            </label>
            <select
              value={generalSettings.defaultFrequency}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  defaultFrequency: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {frequencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Reminder Days (before task)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={generalSettings.reminderDays}
              onChange={(e) =>
                setGeneralSettings((prev) => ({
                  ...prev,
                  reminderDays: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      {/* Email Provider Settings */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Mail size={16} className="text-blue-600" />
          Email Server Configuration
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Email Provider
            </label>
            <select
              value={integrationSettings.emailProvider}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  emailProvider: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="smtp">SMTP Server</option>
              <option value="sendgrid">SendGrid</option>
              <option value="aws">AWS SES</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              From Email Address
            </label>
            <input
              type="email"
              value={integrationSettings.fromEmail}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  fromEmail: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              From Name
            </label>
            <input
              type="text"
              value={integrationSettings.fromName}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  fromName: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          {integrationSettings.emailProvider === "smtp" && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={integrationSettings.smtpHost}
                  onChange={(e) =>
                    setIntegrationSettings((prev) => ({
                      ...prev,
                      smtpHost: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={integrationSettings.smtpPort}
                  onChange={(e) =>
                    setIntegrationSettings((prev) => ({
                      ...prev,
                      smtpPort: parseInt(e.target.value),
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={integrationSettings.smtpUsername}
                  onChange={(e) =>
                    setIntegrationSettings((prev) => ({
                      ...prev,
                      smtpUsername: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={integrationSettings.smtpPassword}
                  onChange={(e) =>
                    setIntegrationSettings((prev) => ({
                      ...prev,
                      smtpPassword: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notification Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-800">Notification Rules</h4>
          <button
            onClick={() => {
              setEditingNotif(null);
              setIsNotifModalOpen(true);
            }}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} />
            Add Rule
          </button>
        </div>
        
        {notificationRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-800">{rule.name}</h4>
                    {!rule.enabled && (
                      <Badge variant="warning" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                    <Badge
                      variant="default"
                      className="text-xs bg-gray-100 text-gray-600"
                    >
                      {rule.daysBefore === 0
                        ? "On task day"
                        : rule.daysBefore < 0
                          ? `${Math.abs(rule.daysBefore)} day(s) after`
                          : `${rule.daysBefore} day(s) before`}
                    </Badge>
                  </div>
                  
                  {/* Recipients */}
                  <div className="space-y-2 mt-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500">To:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.recipients.map((recipient, idx) => (
                          <Badge key={idx} variant="default" className="text-xs bg-blue-50 text-blue-700">
                            {recipient}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {rule.ccRecipients.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">CC:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.ccRecipients.map((recipient, idx) => (
                            <Badge key={idx} variant="default" className="text-xs bg-gray-50 text-gray-600">
                              {recipient}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {rule.bccRecipients.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">BCC:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.bccRecipients.map((recipient, idx) => (
                            <Badge key={idx} variant="default" className="text-xs bg-gray-50 text-gray-600">
                              {recipient}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Email Subject Preview */}
                  <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                    <span className="font-medium text-gray-500">Subject:</span>
                    <span className="text-gray-700 ml-2">{rule.emailSubject}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => previewEmailTemplate(rule.emailSubject, rule.emailBody)}
                    className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                    title="Preview Email"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingNotif(rule);
                      setIsNotifModalOpen(true);
                    }}
                    className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteNotificationRule(rule.id)}
                    className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {notificationRules.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg">
            No notification rules configured
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      <Dialog.Root open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Mail size={16} />
                Email Preview
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Preview with dummy data</strong>
                  <p className="text-xs text-gray-400 mt-1">
                    Template variables are replaced with example values for preview
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Subject</div>
                  <div className="text-sm font-medium text-gray-800">
                    {previewEmailBody.split('\n')[0] || "Email Preview"}
                  </div>
                </div>
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Body</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {previewEmailBody}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <Button variant="secondary" size="sm" onClick={() => setShowEmailPreview(false)}>
                Close
              </Button>
              <Button variant="primary" size="sm">
                <Send size={14} className="mr-1" />
                Send Test Email
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );

  const renderScheduleRules = () => (
    <div className="space-y-8">
      {/* Working Days */}
      <div>
        <h4 className="font-medium text-gray-800 mb-3">Working Days & Hours</h4>
        <div className="space-y-2">
          {workingDays.map((wd) => (
            <div
              key={wd.id}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <button
                onClick={() => handleToggleWorkingDay(wd.id)}
                className={`w-5 h-5 rounded flex items-center justify-center border ${wd.enabled ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
              >
                {wd.enabled && <Check size={12} className="text-white" />}
              </button>
              <span
                className={`w-28 text-sm font-medium ${wd.enabled ? "text-gray-800" : "text-gray-400"}`}
              >
                {wd.day}
              </span>
              {wd.enabled && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={wd.startTime}
                    onChange={(e) =>
                      handleUpdateWorkingDayTime(
                        wd.id,
                        "startTime",
                        e.target.value,
                      )
                    }
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={wd.endTime}
                    onChange={(e) =>
                      handleUpdateWorkingDayTime(
                        wd.id,
                        "endTime",
                        e.target.value,
                      )
                    }
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Holidays */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-800">Holidays</h4>
          <button
            onClick={() => {
              setEditingHoliday(null);
              setIsHolidayModalOpen(true);
            }}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} />
            Add Holiday
          </button>
        </div>
        <div className="space-y-2">
          {holidays.map((holiday) => (
            <div
              key={holiday.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="font-medium text-gray-800">
                  {holiday.name}
                </span>
                <span className="text-sm text-gray-500 ml-3">
                  {new Date(holiday.date).toLocaleDateString()}
                </span>
                {holiday.recurring && (
                  <Badge
                    variant="default"
                    className="text-xs ml-2 bg-blue-100 text-blue-700"
                  >
                    Recurring
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingHoliday(holiday);
                    setIsHolidayModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteHoliday(holiday.id)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {holidays.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No holidays configured
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderApprovals = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-gray-800">Approval Workflow</h4>
            <p className="text-xs text-gray-500 mt-1">
              Define approval chain for maintenance tasks
            </p>
          </div>
          <Badge variant="success" className="text-xs">
            2 Levels
          </Badge>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Users size={14} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                Level 1: Supervisor
              </p>
              <p className="text-xs text-gray-500">
                For tasks with cost &lt; $5,000
              </p>
            </div>
            <Badge variant="default" className="bg-blue-100 text-blue-700">
              Auto-assign
            </Badge>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Shield size={14} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                Level 2: Manager
              </p>
              <p className="text-xs text-gray-500">
                For tasks with cost ≥ $5,000
              </p>
            </div>
            <Badge variant="default" className="bg-purple-100 text-purple-700">
              Manual
            </Badge>
          </div>
        </div>
        <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <Plus size={14} />
          Add Approval Level
        </button>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
            <div>
              <span className="text-sm text-gray-700">ERP System Sync</span>
              <p className="text-xs text-gray-400">
                Sync data with external ERP system
              </p>
            </div>
            <button
              onClick={() =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  erpSyncEnabled: !prev.erpSyncEnabled,
                }))
              }
              className={`relative w-10 h-5 rounded-full transition-colors ${integrationSettings.erpSyncEnabled ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${integrationSettings.erpSyncEnabled ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </label>
          {integrationSettings.erpSyncEnabled && (
            <Input
              label="ERP Endpoint URL"
              placeholder="https://your-erp-system.com/api"
              value={integrationSettings.erpEndpoint}
              onChange={(e) =>
                setIntegrationSettings((prev) => ({
                  ...prev,
                  erpEndpoint: e.target.value,
                }))
              }
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div>
                <span className="text-sm text-gray-700">
                  Email Notifications
                </span>
                <p className="text-xs text-gray-400">Send email alerts</p>
              </div>
              <button
                onClick={() =>
                  setIntegrationSettings((prev) => ({
                    ...prev,
                    emailNotifications: !prev.emailNotifications,
                  }))
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${integrationSettings.emailNotifications ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${integrationSettings.emailNotifications ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <div>
                <span className="text-sm text-gray-700">SMS Notifications</span>
                <p className="text-xs text-gray-400">Send SMS alerts</p>
              </div>
              <button
                onClick={() =>
                  setIntegrationSettings((prev) => ({
                    ...prev,
                    smsNotifications: !prev.smsNotifications,
                  }))
                }
                className={`relative w-10 h-5 rounded-full transition-colors ${integrationSettings.smsNotifications ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${integrationSettings.smsNotifications ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
            </label>
          </div>
          <Input
            label="Webhook URL (for real-time updates)"
            placeholder="https://your-service.com/webhook"
            value={integrationSettings.webhookUrl}
            onChange={(e) =>
              setIntegrationSettings((prev) => ({
                ...prev,
                webhookUrl: e.target.value,
              }))
            }
          />
        </div>
      </div>
    </div>
  );

  const getSectionContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSettings();
      case "notifications":
        return renderNotifications();
      case "schedule":
        return renderScheduleRules();
      case "approvals":
        return renderApprovals();
      case "integration":
        return renderIntegrations();
      default:
        return null;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Success Toast */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Check size={16} />
          Configuration saved successfully
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-6">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Settings size={16} />
                Configuration
              </h3>
            </div>
            <nav className="p-2 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                    ${
                      activeSection === section.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }
                  `}
                >
                  <span
                    className={
                      activeSection === section.id
                        ? "text-blue-600"
                        : "text-gray-400"
                    }
                  >
                    {section.icon}
                  </span>
                  <div className="text-left">
                    <p
                      className={
                        activeSection === section.id
                          ? "text-blue-700"
                          : "text-gray-700"
                      }
                    >
                      {section.title}
                    </p>
                    <p className="text-xs text-gray-400 hidden lg:block">
                      {section.description}
                    </p>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Content Area */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">
                  {sections.find((s) => s.id === activeSection)?.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {sections.find((s) => s.id === activeSection)?.description}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAll}
                className="bg-blue-600"
              >
                <Save size={14} className="mr-1" />
                Save Changes
              </Button>
            </div>
            <div className="p-6">{getSectionContent()}</div>
          </div>
        </motion.div>
      </div>

      {/* Holiday Modal */}
      <Dialog.Root
        open={isHolidayModalOpen}
        onOpenChange={setIsHolidayModalOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <Dialog.Title className="text-base font-bold text-gray-800">
                {editingHoliday ? "Edit Holiday" : "Add Holiday"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Input
                label="Holiday Name"
                placeholder="e.g., Independence Day"
                defaultValue={editingHoliday?.name || ""}
                onChange={(e) => {
                  if (editingHoliday) {
                    handleUpdateHoliday(editingHoliday.id, {
                      name: e.target.value,
                    });
                  }
                }}
              />
              <Input
                label="Date"
                type="date"
                defaultValue={editingHoliday?.date || ""}
                onChange={(e) => {
                  if (editingHoliday) {
                    handleUpdateHoliday(editingHoliday.id, {
                      date: e.target.value,
                    });
                  }
                }}
              />
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  Recurring annually
                </span>
                <button
                  onClick={() => {
                    if (editingHoliday) {
                      handleUpdateHoliday(editingHoliday.id, {
                        recurring: !editingHoliday.recurring,
                      });
                    }
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${editingHoliday?.recurring ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editingHoliday?.recurring ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Button variant="primary" size="sm">
                  {editingHoliday ? "Update" : "Add"}
                </Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Notification Rule Modal */}
      <Dialog.Root open={isNotifModalOpen} onOpenChange={setIsNotifModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <Dialog.Title className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Mail size={16} />
                {editingNotif ? "Edit Notification Rule" : "Add Notification Rule"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Input
                label="Rule Name"
                placeholder="e.g., Weekly Reminder"
                defaultValue={editingNotif?.name || ""}
                onChange={(e) => {
                  if (editingNotif) {
                    handleUpdateNotificationRule(editingNotif.id, {
                      name: e.target.value,
                    });
                  }
                }}
              />
              
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Days Before/After Task
                </label>
                <input
                  type="number"
                  defaultValue={editingNotif?.daysBefore || 7}
                  onChange={(e) => {
                    if (editingNotif) {
                      handleUpdateNotificationRule(editingNotif.id, {
                        daysBefore: parseInt(e.target.value) || 0,
                      });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use negative for after task (e.g., -1 for after completion)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  To Recipients (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  defaultValue={editingNotif?.recipients.join(", ") || ""}
                  onChange={(e) => {
                    if (editingNotif) {
                      handleUpdateNotificationRule(editingNotif.id, {
                        recipients: e.target.value.split(",").map(s => s.trim()),
                      });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  CC Recipients (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="cc1@example.com, cc2@example.com"
                  defaultValue={editingNotif?.ccRecipients?.join(", ") || ""}
                  onChange={(e) => {
                    if (editingNotif) {
                      handleUpdateNotificationRule(editingNotif.id, {
                        ccRecipients: e.target.value.split(",").map(s => s.trim()).filter(s => s),
                      });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  BCC Recipients (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="bcc1@example.com, bcc2@example.com"
                  defaultValue={editingNotif?.bccRecipients?.join(", ") || ""}
                  onChange={(e) => {
                    if (editingNotif) {
                      handleUpdateNotificationRule(editingNotif.id, {
                        bccRecipients: e.target.value.split(",").map(s => s.trim()).filter(s => s),
                      });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  placeholder="Subject with {{variables}}"
                  defaultValue={editingNotif?.emailSubject || ""}
                  onChange={(e) => {
                    if (editingNotif) {
                      handleUpdateNotificationRule(editingNotif.id, {
                        emailSubject: e.target.value,
                      });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available variables: {'{{task_title}}'}, {'{{equipment_name}}'}, {'{{task_date}}'}, {'{{priority}}'}, {'{{completion_date}}'}, {'{{work_order_number}}'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Email Body
                </label>
                <textarea
                  rows={8}
                  placeholder="Email body with {{variables}}..."
                  defaultValue={editingNotif?.emailBody || ""}
                  onChange={(e) => {
                    if (editingNotif) {
                      handleUpdateNotificationRule(editingNotif.id, {
                        emailBody: e.target.value,
                      });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Enable this rule</span>
                <button
                  onClick={() => {
                    if (editingNotif) {
                      handleUpdateNotificationRule(editingNotif.id, {
                        enabled: !editingNotif.enabled,
                      });
                    }
                  }}
                  className={`relative w-10 h-5 rounded-full transition-colors ${editingNotif?.enabled ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editingNotif?.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </label>

              {editingNotif && (
                <button
                  type="button"
                  onClick={() => previewEmailTemplate(editingNotif.emailSubject, editingNotif.emailBody)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Eye size={14} />
                  Preview Email with Dummy Data
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
              <Dialog.Close asChild>
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <Button variant="primary" size="sm">
                  {editingNotif ? "Update" : "Add"}
                </Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
}
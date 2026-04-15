export interface FormField {
  id: string;
  name: string;
  type: "text" | "dropdown" | "checkbox";
  options?: string[]; // for dropdown
  info: string;
  required: boolean;
  requiredForTags?: string[];
  tags: string[];
  order?: number; // for custom field ordering
}

export interface SavedForm {
  id: string;
  fields: { name: string; value: string }[];
  tags: string[];
  status: string;
  savedAt: string;
}

export interface EmailTemplate {
  id: string;
  subject: string;
  recipient: string;
  body: string;
  createdAt: string;
}

export interface SavedEmail {
  id: string;
  templateId: string;
  templateName: string;
  subject: string;
  recipient: string;
  body: string;
  status: string;
  savedAt: string;
}

export interface RemarkTemplate {
  id: string;
  name: string;
  template: string;
  createdAt: string;
}

export interface SavedRemark {
  id: string;
  templateId: string;
  templateName: string;
  text: string;
  savedAt: string;
}

export interface SOPLink {
  id: string;
  type: "link" | "text";
  url?: string;
  text?: string;
  description: string;
  keywords: string[];
  createdAt: string;
}

// Draft persistence interfaces
export interface EmailDraft {
  subject: string;
  recipient: string;
  body: string;
  selectedTemplateId: string;
}

export interface RemarkDraft {
  selectedId: string | null;
  values: Record<string, string>;
  mergingIds: string[];
  editableContent: string;
}

export interface SOPDraft {
  entryType: "link" | "text";
  url: string;
  text: string;
  description: string;
  selectedKeywords: string[];
  keywordInput: string;
  searchQuery: string;
  editingId: string | null;
}

export interface FormDraft {
  selectedTags: string[];
  values: Record<string, string>;
  expandedFields: string[];
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const storage = {
  getFields: (): FormField[] => load("form_fields", []),
  setFields: (f: FormField[]) => save("form_fields", f),

  getSavedForms: (): SavedForm[] => load("saved_forms", []),
  setSavedForms: (f: SavedForm[]) => save("saved_forms", f),

  getEmailTemplates: (): EmailTemplate[] => load("email_templates", []),
  setEmailTemplates: (t: EmailTemplate[]) => save("email_templates", t),

  getSavedEmails: (): SavedEmail[] => load("saved_emails", []),
  setSavedEmails: (e: SavedEmail[]) => save("saved_emails", e),

  getRemarkTemplates: (): RemarkTemplate[] => load("remark_templates", []),
  setRemarkTemplates: (t: RemarkTemplate[]) => save("remark_templates", t),

  getSavedRemarks: (): SavedRemark[] => load("saved_remarks", []),
  setSavedRemarks: (r: SavedRemark[]) => save("saved_remarks", r),

  getSOPLinks: (): SOPLink[] => load("sop_links", []),
  setSOPLinks: (s: SOPLink[]) => save("sop_links", s),

  // Draft persistence methods
  getEmailDraft: (): EmailDraft => load("email_draft", {
    subject: "",
    recipient: "",
    body: "",
    selectedTemplateId: "",
  }),
  setEmailDraft: (draft: EmailDraft) => save("email_draft", draft),

  getRemarkDraft: (): RemarkDraft => load("remark_draft", {
    selectedId: null,
    values: {},
    mergingIds: [],
    editableContent: "",
  }),
  setRemarkDraft: (draft: RemarkDraft) => save("remark_draft", draft),

  getSOPDraft: (): SOPDraft => load("sop_draft", {
    entryType: "link",
    url: "",
    text: "",
    description: "",
    selectedKeywords: [],
    keywordInput: "",
    searchQuery: "",
    editingId: null,
  }),
  setSOPDraft: (draft: SOPDraft) => save("sop_draft", draft),

  getFormDraft: (): FormDraft => load("form_draft", {
    selectedTags: [],
    values: {},
    expandedFields: [],
  }),
  setFormDraft: (draft: FormDraft) => save("form_draft", draft),

  // Clear all drafts
  clearAllDrafts: () => {
    localStorage.removeItem("email_draft");
    localStorage.removeItem("remark_draft");
    localStorage.removeItem("sop_draft");
    localStorage.removeItem("form_draft");
  },
};

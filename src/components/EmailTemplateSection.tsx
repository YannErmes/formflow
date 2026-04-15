import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Copy, Save, Trash2, Mail, Download, Upload, Clock, CheckCircle, AlertCircle, Edit2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { storage, EmailTemplate, SavedEmail } from "@/lib/storage";
import { useLanguage } from "@/lib/useLanguage";
import { useCachedTranslation } from "@/lib/useCachedTranslation";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function EmailTemplateSection() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<EmailTemplate[]>(storage.getEmailTemplates());
  const [savedEmails, setSavedEmails] = useState<SavedEmail[]>(storage.getSavedEmails());
  const [subject, setSubject] = useState("");
  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const translatedSubject = useCachedTranslation(subject);
  const translatedBody = useCachedTranslation(body);
  const translatedRecipient = useCachedTranslation(recipient);
  const translatedComposeSubject = useCachedTranslation(composeSubject);
  const translatedComposeBody = useCachedTranslation(composeBody);
  const translatedComposeRecipient = useCachedTranslation(composeRecipient);

  // Load draft on component mount
  useEffect(() => {
    const draft = storage.getEmailDraft();
    if (draft.subject || draft.recipient || draft.body || draft.selectedTemplateId) {
      setComposeSubject(draft.subject);
      setComposeRecipient(draft.recipient);
      setComposeBody(draft.body);
      setSelectedTemplateId(draft.selectedTemplateId);
      toast.success("Draft restored from your last session");
    }
  }, []);

  // Save draft whenever compose fields change
  useEffect(() => {
    storage.setEmailDraft({
      subject: composeSubject,
      recipient: composeRecipient,
      body: composeBody,
      selectedTemplateId,
    });
  }, [composeSubject, composeRecipient, composeBody, selectedTemplateId]);

  const refresh = () => {
    setTemplates(storage.getEmailTemplates());
    setSavedEmails(storage.getSavedEmails());
  };

  const defaultStatuses = ["pending", "sent", "draft", "scheduled"];
  const allStatuses = useMemo(() => [...new Set([...defaultStatuses, ...savedEmails.map(e => e.status)])].sort(), [savedEmails.length]);

  const exportTemplates = () => {
    const data = JSON.stringify(templates, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-templates-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Templates exported");
  };

  const importTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!Array.isArray(imported)) {
          toast.error("Invalid file format");
          return;
        }
        const merged = [...templates, ...imported];
        storage.setEmailTemplates(merged);
        refresh();
        toast.success(`Imported ${imported.length} templates`);
      } catch {
        toast.error("Failed to import file");
      }
    };
    reader.readAsText(file);
  };

  const handleCreate = () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!body.trim()) { toast.error("Email body is required"); return; }

    const template: EmailTemplate = {
      id: generateId(),
      subject: subject.trim(),
      recipient: recipient.trim(),
      body: body.trim(),
      createdAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
    };

    const all = storage.getEmailTemplates();
    all.unshift(template);
    storage.setEmailTemplates(all);
    toast.success("Template created");
    setSubject(""); setRecipient(""); setBody("");
    refresh();
  };

  const copyTemplate = async (template: EmailTemplate) => {
    const text = `To: ${template.recipient}\nSubject: ${template.subject}\n\n${template.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("emailCopiedClipboard"));
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(t("emailCopiedClipboard"));
      } catch {
        toast.error("Failed to copy");
      }
      document.body.removeChild(textArea);
    }
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    storage.setEmailTemplates(updated);
    refresh();
    toast.success("Template deleted");
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposeSubject(template.subject);
      setComposeRecipient(template.recipient);
      setComposeBody(template.body);
      setSelectedTemplateId(templateId);
      toast.success("Template loaded for editing");
    }
  };

  const saveComposedEmail = () => {
    if (!composeSubject.trim()) { toast.error("Subject is required"); return; }
    if (!composeBody.trim()) { toast.error("Email body is required"); return; }

    const template = selectedTemplateId ? templates.find(t => t.id === selectedTemplateId) : null;
    const savedEmail: SavedEmail = {
      id: generateId(),
      templateId: selectedTemplateId || "",
      templateName: template?.subject || "Custom Email",
      subject: composeSubject.trim(),
      recipient: composeRecipient.trim(),
      body: composeBody.trim(),
      status: "draft",
      savedAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" }),
    };

    const emails = storage.getSavedEmails();
    emails.unshift(savedEmail);
    storage.setSavedEmails(emails);
    toast.success("Email saved as draft");
    setComposeSubject(""); setComposeRecipient(""); setComposeBody(""); setSelectedTemplateId("");
    // Clear the draft after saving
    storage.setEmailDraft({ subject: "", recipient: "", body: "", selectedTemplateId: "" });
    refresh();
    return savedEmail;
  };

  const copyComposedEmail = async () => {
    if (!composeSubject.trim()) { toast.error(t("subjectRequired")); return; }
    if (!composeBody.trim()) { toast.error(t("emailBodyRequired")); return; }

    const text = `To: ${composeRecipient}\nSubject: ${composeSubject}\n\n${composeBody}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("emailCopiedClipboard"));
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(t("emailCopiedClipboard"));
      } catch {
        toast.error("Failed to copy");
      }
      document.body.removeChild(textArea);
    }
  };

  const loadEmailForEdit = (email: SavedEmail) => {
    setEditingEmailId(email.id);
    setComposeSubject(email.subject);
    setComposeRecipient(email.recipient);
    setComposeBody(email.body);
    setSelectedTemplateId(email.templateId);
    toast.success("Email loaded for editing");
  };

  const updateComposedEmail = () => {
    if (!editingEmailId) return;
    if (!composeSubject.trim()) { toast.error("Subject is required"); return; }
    if (!composeBody.trim()) { toast.error("Email body is required"); return; }

    const updated = savedEmails.map(e =>
      e.id === editingEmailId
        ? {
            ...e,
            subject: composeSubject.trim(),
            recipient: composeRecipient.trim(),
            body: composeBody.trim(),
            savedAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" }),
          }
        : e
    );
    storage.setSavedEmails(updated);
    toast.success("Email updated");
    setComposeSubject(""); setComposeRecipient(""); setComposeBody(""); setSelectedTemplateId(""); setEditingEmailId(null);
    // Clear the draft after updating
    storage.setEmailDraft({ subject: "", recipient: "", body: "", selectedTemplateId: "" });
    refresh();
  };

  const cancelEdit = () => {
    setComposeSubject(""); setComposeRecipient(""); setComposeBody(""); setSelectedTemplateId(""); setEditingEmailId(null);
    // Clear the draft when canceling
    storage.setEmailDraft({ subject: "", recipient: "", body: "", selectedTemplateId: "" });
  };

  const copyEmail = async (email: SavedEmail) => {
    const text = `To: ${email.recipient}\nSubject: ${email.subject}\n\n${email.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("emailCopiedClipboard"));
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(t("emailCopiedClipboard"));
      } catch {
        toast.error("Failed to copy");
      }
      document.body.removeChild(textArea);
    }
  };

  const deleteSavedEmail = (id: string) => {
    const updated = savedEmails.filter(e => e.id !== id);
    storage.setSavedEmails(updated);
    refresh();
    toast.success("Email deleted");
  };

  const updateEmailStatus = (emailId: string, newStatus: string) => {
    if (newStatus === "___custom___") {
      const customStatus = prompt("Enter custom status name:");
      if (!customStatus || !customStatus.trim()) return;
      const statusName = customStatus.trim().toLowerCase().replace(/\s+/g, "_");
      const updated = savedEmails.map(e => e.id === emailId ? { ...e, status: statusName } : e);
      storage.setSavedEmails(updated);
      refresh();
      toast.success(`Status set to "${statusName}"`);
    } else {
      const updated = savedEmails.map(e => e.id === emailId ? { ...e, status: newStatus } : e);
      storage.setSavedEmails(updated);
      refresh();
      toast.success(`Status updated to "${newStatus}"`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-700 text-slate-100";
      case "pending":
        return "bg-yellow-900 text-yellow-100";
      case "sent":
        return "bg-green-900 text-green-100";
      case "scheduled":
        return "bg-blue-900 text-blue-100";
      default:
        return "bg-gray-700 text-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-3 w-3" />;
      case "scheduled":
      case "pending":
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Tabs defaultValue="templates" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="templates">{t("templates")}</TabsTrigger>
        <TabsTrigger value="compose">{t("composeEmail")}</TabsTrigger>
        <TabsTrigger value="saved">{t("savedEmails")} ({savedEmails.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={exportTemplates} variant="outline" className="flex-1" disabled={templates.length === 0}>
            <Download className="h-4 w-4 mr-2" />{t("exportTemplates")}
          </Button>
          <label className="flex-1">
            <input 
              type="file" 
              accept=".json" 
              onChange={importTemplates}
              className="hidden"
            />
            <Button variant="outline" className="w-full cursor-pointer" asChild>
              <span><Upload className="h-4 w-4 mr-2" />{t("importTemplates")}</span>
            </Button>
          </label>
        </div>
        <Collapsible open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                  <CardTitle className="text-lg">{t("createEmailTemplate")}</CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isCreatorOpen ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("subjectTopic")}</Label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("emailSubject")} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("templateName")}</Label>
                    <Input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder={t("templateNamePlaceholder")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("emailBody")}</Label>
                  <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t("writeEmailContent")} rows={6} className="resize-y" />
                </div>
                <Button onClick={handleCreate} className="w-full"><Plus className="h-4 w-4 mr-2" />{t("createTemplate")}</Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {templates.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{t("emailTemplates")} ({templates.length})</h3>
            {templates.map(t => (
              <Card key={t.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="font-medium truncate">{t.subject}</span>
                    </div>
                    {t.recipient && <p className="text-sm text-muted-foreground">{t.recipient}</p>}
                    <p className="text-sm mt-2 whitespace-pre-wrap line-clamp-3">{t.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">{t.createdAt}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button size="sm" variant="ghost" onClick={() => copyTemplate(t)}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="compose" className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("composeEmailFromTemplate")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>{t("loadTemplate")}</Label>
                <Select value={selectedTemplateId} onValueChange={loadTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectTemplateToStart")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(tmpl => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.recipient}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("subject")}</Label>
                <Input value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder={t("emailSubject")} />
              </div>
              <div className="space-y-2">
                <Label>{t("recipientEmail")}</Label>
                <Input value={composeRecipient} onChange={e => setComposeRecipient(e.target.value)} placeholder="recipient@example.com" type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("emailBody")}</Label>
              <Textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} placeholder={t("writeEmailContent")} rows={8} className="resize-y" />
            </div>
            <div className="flex gap-2">
              {editingEmailId ? (
                <>
                  <Button onClick={updateComposedEmail} className="flex-1"><Save className="h-4 w-4 mr-2" />{t("updateEmail")}</Button>
                  <Button onClick={cancelEdit} variant="secondary" className="flex-1">{t("cancel")}</Button>
                </>
              ) : (
                <>
                  <Button onClick={saveComposedEmail} className="flex-1"><Save className="h-4 w-4 mr-2" />{t("saveEmail")}</Button>
                  <Button onClick={copyComposedEmail} variant="outline" className="flex-1"><Copy className="h-4 w-4 mr-2" />{t("copy")}</Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="saved" className="space-y-3">
        {savedEmails.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("noSavedEmailsYet")}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-muted-foreground">{t("filter")}: </span>
              {allStatuses.map(status => (
                <Badge key={status} variant="outline" className="cursor-pointer text-xs capitalize">
                  {status.replace("_", " ")} ({savedEmails.filter(e => e.status === status).length})
                </Badge>
              ))}
            </div>
            {savedEmails.map(email => (
              <Card key={email.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs capitalize ${getStatusColor(email.status)} gap-1`}>
                        {getStatusIcon(email.status)}
                        {email.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex gap-2 items-center mb-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{t("status")}:</span>
                      <Select value={email.status} onValueChange={(newStatus) => updateEmailStatus(email.id, newStatus)}>
                        <SelectTrigger className="w-fit h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allStatuses.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">
                              {status.replace("_", " ")}
                            </SelectItem>
                          ))}
                          <SelectItem value="___custom___">{t("addCustomStatus")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 mb-1 mt-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="font-medium">{email.subject}</span>
                    </div>
                    {email.recipient && <p className="text-sm text-muted-foreground">{email.recipient}</p>}
                    <p className="text-sm mt-2 whitespace-pre-wrap line-clamp-3">{email.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">{email.savedAt}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button size="sm" variant="ghost" onClick={() => loadEmailForEdit(email)}><Edit2 className="h-4 w-4 text-primary" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => copyEmail(email)}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteSavedEmail(email.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

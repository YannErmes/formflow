import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Copy, Save, Trash2, MessageSquare, Download, Upload, Edit2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { storage, RemarkTemplate, SavedRemark } from "@/lib/storage";
import { useLanguage } from "@/lib/useLanguage";
import { useCachedTranslation } from "@/lib/useCachedTranslation";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function extractPlaceholders(template: string): string[] {
  // Match both {placeholder} and "placeholder" formats
  const bracketMatches = template.match(/\{([^}]+)\}/g) || [];
  const quoteMatches = template.match(/"([^"]+)"/g) || [];
  const allMatches = [
    ...bracketMatches.map(m => m.slice(1, -1)),
    ...quoteMatches.map(m => m.slice(1, -1))
  ];
  return [...new Set(allMatches)];
}

function RemarkFiller({ templates, refresh }: { templates: RemarkTemplate[]; refresh: () => void }) {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mergeingIds, setMergingIds] = useState<string[]>([]);
  const [showMerge, setShowMerge] = useState(false);
  const [editableContent, setEditableContent] = useState<string>("");

  const selected = templates.find(t => t.id === selectedId);
  const placeholders = useMemo(() => selected ? extractPlaceholders(selected.template) : [], [selected]);

  const interpolated = useMemo(() => {
    if (!selected) return "";
    let text = selected.template;
    placeholders.forEach(p => {
      // Replace both {placeholder} and "placeholder" formats
      text = text.split(`{${p}}`).join(values[p] || `{${p}}`);
      text = text.split(`"${p}"`).join(values[p] || `"${p}"`);
    });
    
    // Merge additional templates
    if (mergeingIds.length > 0) {
      const mergedTexts = [text];
      mergeingIds.forEach(id => {
        const tmpl = templates.find(t => t.id === id);
        if (tmpl) {
          let mergedText = tmpl.template;
          const mPlaceholders = extractPlaceholders(tmpl.template);
          mPlaceholders.forEach(p => {
            mergedText = mergedText.split(`{${p}}`).join(values[p] || `{${p}}`);
            mergedText = mergedText.split(`"${p}"`).join(values[p] || `"${p}"`);
          });
          mergedTexts.push(mergedText);
        }
      });
      const merged = mergedTexts.join("\n\n---\n\n");
      setEditableContent(merged); // Auto-populate the editable field
      return merged;
    }
    
    setEditableContent(text); // Also populate for single template
    return text;
  }, [selected, placeholders, values, mergeingIds, templates]);

  const allFilled = placeholders.every(p => (values[p] || "").trim());

  const copyRemark = async () => {
    const textToCopy = mergeingIds.length > 0 ? editableContent : interpolated;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success(t("copiedField"));
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success(t("copiedField"));
      } catch {
        toast.error("Failed to copy");
      }
      document.body.removeChild(textArea);
    }
  };

  const saveRemark = () => {
    if (!selected) return;
    const textToSave = mergeingIds.length > 0 ? editableContent : interpolated;
    const saved: SavedRemark = {
      id: generateId(),
      templateId: selected.id,
      templateName: selected.name,
      text: textToSave,
      savedAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" }),
    };
    const all = storage.getSavedRemarks();
    all.unshift(saved);
    storage.setSavedRemarks(all);
    toast.success(t("remarkSaved"));
    setValues({});
    setSelectedId(null);
    refresh();
  };

  if (templates.length === 0) {
    return <p className="text-muted-foreground text-center py-8">{t("createSomeRemarkTemplatesFirst")}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">{t("selectRemarkTemplate")}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templates.map(t => (
            <Card
              key={t.id}
              className={`p-3 cursor-pointer transition-colors ${selectedId === t.id ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
              onClick={() => { setSelectedId(t.id); setValues({}); }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{t.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.template}</p>
            </Card>
          ))}
        </div>
      </div>

      {selected && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              {placeholders.map(p => (
                <div key={p} className="space-y-1">
                  <Label className="capitalize">{p.replace(/_/g, " ")}</Label>
                  <Input
                    value={values[p] || ""}
                    onChange={e => setValues({ ...values, [p]: e.target.value })}
                    placeholder={`${t("enter")} ${p.replace(/_/g, " ")}`}
                  />
                </div>
              ))}
            </div>

            {mergeingIds.length === 0 ? (
              <div className="p-4 rounded-md bg-muted/50">
                <Label className="text-xs text-muted-foreground mb-1 block">{t("preview")}</Label>
                <p className="text-sm whitespace-pre-wrap">{interpolated}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm">Merged Remark</Label>
                <Textarea
                  value={editableContent}
                  onChange={e => setEditableContent(e.target.value)}
                  placeholder="Merged content will appear here..."
                  className="min-h-32"
                />
              </div>
            )}

            {/* Merge Templates Section */}
            <div className="border rounded-md p-3 space-y-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowMerge(!showMerge)}
                className="w-full"
              >
                {showMerge ? "Hide" : "+ Merge with another template"}
              </Button>
              
              {showMerge && (
                <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">Select templates to merge:</p>
                  {templates.filter(t => t.id !== selectedId).map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer" onClick={() => {
                      if (mergeingIds.includes(t.id)) {
                        setMergingIds(mergeingIds.filter(id => id !== t.id));
                      } else {
                        setMergingIds([...mergeingIds, t.id]);
                      }
                    }}>
                      <input type="checkbox" checked={mergeingIds.includes(t.id)} onChange={() => {}} className="cursor-pointer" />
                      <span className="text-sm">{t.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {mergeingIds.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {mergeingIds.length} template(s) selected to merge
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={copyRemark} disabled={!allFilled} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />{t("copy")}
              </Button>
              <Button onClick={saveRemark} disabled={!allFilled} variant="secondary" className="flex-1">
                <Save className="h-4 w-4 mr-2" />{t("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function RemarkTemplateSection() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<RemarkTemplate[]>(storage.getRemarkTemplates());
  const [savedRemarks, setSavedRemarks] = useState<SavedRemark[]>(storage.getSavedRemarks());
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editRemarkText, setEditRemarkText] = useState("");
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [mergedRemarkIds, setMergedRemarkIds] = useState<string[]>([]);
  const [showMergedPreview, setShowMergedPreview] = useState(false);
  const [editableMergedContent, setEditableMergedContent] = useState("");

  const refresh = () => {
    setTemplates(storage.getRemarkTemplates());
    setSavedRemarks(storage.getSavedRemarks());
  };

  const mergedRemarkContent = useMemo(() => {
    if (mergedRemarkIds.length === 0) return "";
    const mergedTexts = mergedRemarkIds
      .map(id => savedRemarks.find(r => r.id === id)?.text)
      .filter(Boolean) as string[];
    if (mergedTexts.length === 0) return "";
    const merged = mergedTexts.join("\n\n---\n\n");
    setEditableMergedContent(merged);
    return merged;
  }, [mergedRemarkIds, savedRemarks]);

  const exportTemplates = () => {
    const data = JSON.stringify(templates, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remark-templates-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("templatesExported"));
  };

  const importTemplates = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!Array.isArray(imported)) {
          toast.error(t("invalidFileFormat"));
          return;
        }
        const merged = [...templates, ...imported];
        storage.setRemarkTemplates(merged);
        refresh();
        toast.success(`${t("imported")} ${imported.length} ${t("templates")}`);
      } catch {
        toast.error(t("failedToImportFile"));
      }
    };
    reader.readAsText(file);
  };

  const handleCreate = () => {
    if (!name.trim()) { toast.error(t("templateNameRequired")); return; }
    if (!template.trim()) { toast.error(t("templateTextRequired")); return; }
    if (extractPlaceholders(template).length === 0) { toast.error(t("addAtLeastOnePlaceholder")); return; }

    if (editingTemplateId) {
      // Update existing template
      const updated = templates.map(tmpl =>
        tmpl.id === editingTemplateId
          ? {
              ...tmpl,
              name: name.trim(),
              template: template.trim(),
            }
          : tmpl
      );
      storage.setRemarkTemplates(updated);
      toast.success(t("templateUpdated") || "Template updated");
      setEditingTemplateId(null);
    } else {
      // Create new template
      const newTemplate: RemarkTemplate = {
        id: generateId(),
        name: name.trim(),
        template: template.trim(),
        createdAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
      };
      const all = storage.getRemarkTemplates();
      all.unshift(newTemplate);
      storage.setRemarkTemplates(all);
      toast.success(t("templateCreated"));
    }
    setName(""); setTemplate("");
    refresh();
  };

  const loadTemplateForEdit = (tmpl: RemarkTemplate) => {
    setEditingTemplateId(tmpl.id);
    setName(tmpl.name);
    setTemplate(tmpl.template);
  };

  const cancelEditTemplate = () => {
    setEditingTemplateId(null);
    setName("");
    setTemplate("");
  };

  const deleteTemplate = (id: string) => {
    storage.setRemarkTemplates(templates.filter(t => t.id !== id));
    refresh();
    toast.success(t("templateDeleted"));
  };

  const deleteSavedRemark = (id: string) => {
    storage.setSavedRemarks(savedRemarks.filter(r => r.id !== id));
    refresh();
    toast.success(t("savedRemarkDeleted"));
  };

  const loadRemarkForEdit = (remark: SavedRemark) => {
    setEditingRemarkId(remark.id);
    setEditRemarkText(remark.text);
  };

  const updateSavedRemark = () => {
    if (!editingRemarkId) return;
    if (!editRemarkText.trim()) { toast.error(t("remarkTextCannotBeEmpty")); return; }

    const updated = savedRemarks.map(r =>
      r.id === editingRemarkId
        ? {
            ...r,
            text: editRemarkText.trim(),
            savedAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" }),
          }
        : r
    );
    storage.setSavedRemarks(updated);
    toast.success(t("remarkUpdated"));
    setEditingRemarkId(null);
    setEditRemarkText("");
    refresh();
  };

  const cancelEditRemark = () => {
    setEditingRemarkId(null);
    setEditRemarkText("");
  };

  return (
    <Tabs defaultValue="use" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="use">{t("useTemplate")}</TabsTrigger>
        <TabsTrigger value="create">{t("createTemplate")}</TabsTrigger>
        <TabsTrigger value="saved">{t("savedRemarks")} ({savedRemarks.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="use">
        <RemarkFiller templates={templates} refresh={refresh} />
      </TabsContent>

      <TabsContent value="create" className="space-y-4">
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
                  <CardTitle className="text-lg">{editingTemplateId ? t("editTemplate") || "Edit Template" : t("createRemarkTemplate")}</CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isCreatorOpen ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("templateNameLabel")}</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("templateNamePlaceholder")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("templateText")}</Label>
                  <Textarea
                    value={template}
                    onChange={e => setTemplate(e.target.value)}
                    placeholder={t("placeholderInstructions")}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("placeholdersDetected")}: {extractPlaceholders(template).map(p => (
                      <Badge key={p} variant="secondary" className="mx-1 text-xs">{p}</Badge>
                    ))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} className="flex-1"><Plus className="h-4 w-4 mr-2" />{editingTemplateId ? t("update") : t("createTemplate")}</Button>
                  {editingTemplateId && <Button onClick={cancelEditTemplate} variant="secondary" className="flex-1">{t("cancel")}</Button>}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {templates.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Existing Templates ({templates.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="flex items-start justify-between p-3 rounded-md bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{tmpl.name}</span>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tmpl.template}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tmpl.createdAt}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button size="sm" variant="ghost" onClick={() => loadTemplateForEdit(tmpl)}><Edit2 className="h-4 w-4 text-primary" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTemplate(tmpl.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="saved" className="space-y-3">
        {savedRemarks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("noSavedRemarks")}</p>
        ) : (
          <>
            {/* Merge Saved Remarks Section */}
            <Card className="p-4 border-purple-500/30 bg-purple-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Merge Saved Remarks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMergedPreview(!showMergedPreview)}
                  className="w-full"
                >
                  {showMergedPreview ? "Hide" : "+ Merge Multiple Remarks"}
                </Button>

                {showMergedPreview && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Select remarks to merge:</p>
                    <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
                      {savedRemarks.map(r => (
                        <div
                          key={r.id}
                          className="flex items-start gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                          onClick={() => {
                            if (mergedRemarkIds.includes(r.id)) {
                              setMergedRemarkIds(mergedRemarkIds.filter(id => id !== r.id));
                            } else {
                              setMergedRemarkIds([...mergedRemarkIds, r.id]);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={mergedRemarkIds.includes(r.id)}
                            onChange={() => {}}
                            className="cursor-pointer mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium">{r.templateName}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{r.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {mergedRemarkIds.length > 0 && (
                      <>
                        <div className="p-3 rounded-md bg-muted/50 space-y-2">
                          <Label className="text-xs text-muted-foreground">Merged Result:</Label>
                          <Textarea
                            value={editableMergedContent}
                            onChange={e => setEditableMergedContent(e.target.value)}
                            placeholder="Merged content will appear here..."
                            rows={5}
                            className="resize-y text-sm"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(editableMergedContent);
                                toast.success(t("copiedField"));
                              } catch (err) {
                                const textArea = document.createElement("textarea");
                                textArea.value = editableMergedContent;
                                document.body.appendChild(textArea);
                                textArea.select();
                                try {
                                  document.execCommand("copy");
                                  toast.success(t("copiedField"));
                                } catch {
                                  toast.error("Failed to copy");
                                }
                                document.body.removeChild(textArea);
                              }
                            }}
                            size="sm"
                            className="flex-1"
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy
                          </Button>
                          <Button
                            onClick={() => {
                              const newRemark: SavedRemark = {
                                id: generateId(),
                                templateId: "",
                                templateName: `Merged (${mergedRemarkIds.length})`,
                                text: editableMergedContent,
                                savedAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" }),
                              };
                              const all = storage.getSavedRemarks();
                              all.unshift(newRemark);
                              storage.setSavedRemarks(all);
                              toast.success("Merged remark saved!");
                              setMergedRemarkIds([]);
                              setEditableMergedContent("");
                              setShowMergedPreview(false);
                              refresh();
                            }}
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                          >
                            <Save className="h-3 w-3 mr-1" /> Save Merged
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                          {mergedRemarkIds.length} remark(s) selected
                        </p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {editingRemarkId && (
              <Card className="p-4 ring-2 ring-primary">
                <CardHeader><CardTitle className="text-sm">{t("editRemark")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={editRemarkText}
                    onChange={e => setEditRemarkText(e.target.value)}
                    placeholder={t("editRemarkPlaceholder")}
                    rows={6}
                    className="resize-y"
                  />
                  <div className="flex gap-2">
                    <Button onClick={updateSavedRemark} className="flex-1"><Save className="h-4 w-4 mr-2" />{t("update")}</Button>
                    <Button onClick={cancelEditRemark} variant="secondary" className="flex-1">{t("cancel")}</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {savedRemarks.map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <Badge variant="secondary" className="text-xs mb-1">{r.templateName}</Badge>
                    <p className="text-sm whitespace-pre-wrap">{r.text}</p>
                    <p className="text-xs text-muted-foreground mt-2">{r.savedAt}</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button size="sm" variant="ghost" onClick={() => loadRemarkForEdit(r)}><Edit2 className="h-4 w-4 text-primary" /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(r.text);
                        toast.success(t("copiedField"));
                      } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement("textarea");
                        textArea.value = r.text;
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand("copy");
                          toast.success(t("copiedField"));
                        } catch {
                          toast.error("Failed to copy");
                        }
                        document.body.removeChild(textArea);
                      }
                    }}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteSavedRemark(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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

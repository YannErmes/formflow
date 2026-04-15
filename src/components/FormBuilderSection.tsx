import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Copy, Save, Info, X, Trash2, Tag, Download, Upload, Edit2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { storage, FormField, SavedForm } from "@/lib/storage";
import { useLanguage } from "@/lib/useLanguage";
import { useCachedTranslation } from "@/lib/useCachedTranslation";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const copyToClipboard = async (text: string, successMessage = "Copied") => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success(successMessage);
    } catch {
      toast.error("Failed to copy");
    }
    document.body.removeChild(textArea);
  }
};

function FieldCreator({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FormField["type"]>("text");
  const [options, setOptions] = useState("");
  const [info, setInfo] = useState("");
  const [required, setRequired] = useState(false);
  const [requiredForTags, setRequiredForTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const allFields = storage.getFields();
  const existingTags = useMemo(() => [...new Set(allFields.flatMap(f => f.tags))].sort(), [allFields.length]);
  const unusedTags = existingTags.filter(t => !tags.includes(t));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev => {
      if (prev.includes(tag)) {
        setRequiredForTags(prevRequired => prevRequired.filter(t => t !== tag));
        return prev.filter(t => t !== tag);
      }
      return [...prev, tag];
    });
  };

  const handleSave = () => {
    try {
      if (!name.trim()) { toast.error("Field name is required"); return; }
      if (type === "dropdown" && !options.trim()) { toast.error("Add dropdown options"); return; }
      if (tags.length === 0) { toast.error("Add at least one tag"); return; }

      const currentFields = storage.getFields();
      const field: FormField = {
        id: generateId(),
        name: name.trim(),
        type,
        options: type === "dropdown" ? options.split(",").map(o => o.trim()).filter(Boolean) : undefined,
        info: info.trim(),
        required,
        requiredForTags: required ? undefined : requiredForTags,
        tags,
        order: currentFields.length,
      };

      currentFields.push(field);
      storage.setFields(currentFields);
      toast.success("Field created successfully!");
      setName(""); setType("text"); setOptions(""); setInfo(""); setRequired(false); setRequiredForTags([]); setTags([]); setTagInput("");
      onSave();
    } catch (err) {
      console.error("Error saving field:", err);
      toast.error("Failed to create field: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Create New Field</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Field Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Customer Name" />
          </div>
          <div className="space-y-2">
            <Label>Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FormField["type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Input</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {type === "dropdown" && (
          <div className="space-y-2">
            <Label>Options (comma-separated)</Label>
            <Input value={options} onChange={e => setOptions(e.target.value)} placeholder="Option 1, Option 2, Option 3" />
          </div>
        )}

        <div className="space-y-2">
          <Label>Info / Notice</Label>
          <Textarea value={info} onChange={e => setInfo(e.target.value)} placeholder="e.g. Ask customer for this" className="min-h-24 resize-y" />
        </div>

        <div className="space-y-2">
          <Label>Required field</Label>
          <div className="flex items-center gap-2">
            <Switch checked={required} onCheckedChange={(value) => {
              setRequired(value);
              if (value) setRequiredForTags([]);
            }} />
            <span>Required for all tags</span>
          </div>

          {!required && tags.length > 0 && (
            <div className="space-y-2">
              <Label>Required only for these tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant={requiredForTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setRequiredForTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select the tags for which this field is required.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          
          {unusedTags.length > 0 && (
            <div className="bg-muted/50 p-3 rounded-md space-y-2">
              <p className="text-sm text-muted-foreground font-medium">Select from existing tags:</p>
              <div className="flex flex-wrap gap-2">
                {unusedTags.map(tag => (
                  <Badge 
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Add new tag and press Enter"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addTag}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map(t => (
              <Badge key={t} variant="secondary" className="gap-1">
                {t} <X className="h-3 w-3 cursor-pointer" onClick={() => {
                  setTags(prev => prev.filter(x => x !== t));
                  setRequiredForTags(prev => prev.filter(x => x !== t));
                }} />
              </Badge>
            ))}
          </div>
        </div>

        <div className="relative w-full">
          <Button 
            onClick={(e) => {
              console.log("Create Field clicked");
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }} 
            className="w-full pointer-events-auto"
            type="button"
            style={{
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            <Plus className="h-4 w-4 mr-2" />Create Field
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldEditor({ field, onSave, onCancel }: { field: FormField; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(field.name);
  const [type, setType] = useState<FormField["type"]>(field.type);
  const [options, setOptions] = useState(field.options?.join(", ") || "");
  const [info, setInfo] = useState(field.info);
  const [required, setRequired] = useState(field.required);
  const [requiredForTags, setRequiredForTags] = useState<string[]>(field.requiredForTags || []);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(field.tags);

  const allFields = storage.getFields();
  const existingTags = useMemo(() => [...new Set(allFields.flatMap(f => f.tags))].sort(), [allFields.length]);
  const unusedTags = existingTags.filter(t => !tags.includes(t));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev => {
      if (prev.includes(tag)) {
        setRequiredForTags(prevRequired => prevRequired.filter(t => t !== tag));
        return prev.filter(t => t !== tag);
      }
      return [...prev, tag];
    });
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Field name is required"); return; }
    if (type === "dropdown" && !options.trim()) { toast.error("Add dropdown options"); return; }
    if (tags.length === 0) { toast.error("Add at least one tag"); return; }

    const fields = storage.getFields();
    const index = fields.findIndex(f => f.id === field.id);
    
    fields[index] = {
      id: field.id,
      name: name.trim(),
      type,
      options: type === "dropdown" ? options.split(",").map(o => o.trim()).filter(Boolean) : undefined,
      info: info.trim(),
      required,
      requiredForTags: required ? undefined : requiredForTags,
      tags,
    };

    storage.setFields(fields);
    toast.success("Field updated");
    onSave();
  };

  return (
    <Card className="border-2 border-primary">
      <CardHeader><CardTitle className="text-lg">Edit Field</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Field Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Customer Name" />
          </div>
          <div className="space-y-2">
            <Label>Field Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as FormField["type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text Input</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {type === "dropdown" && (
          <div className="space-y-2">
            <Label>Options (comma-separated)</Label>
            <Input value={options} onChange={e => setOptions(e.target.value)} placeholder="Option 1, Option 2, Option 3" />
          </div>
        )}

        <div className="space-y-2">
          <Label>Info / Notice</Label>
          <Textarea value={info} onChange={e => setInfo(e.target.value)} placeholder="e.g. Ask customer for this" className="min-h-24 resize-y" />
        </div>

        <div className="space-y-2">
          <Label>Required field</Label>
          <div className="flex items-center gap-2">
            <Switch checked={required} onCheckedChange={(value) => {
              setRequired(value);
              if (value) setRequiredForTags([]);
            }} />
            <span>Required for all tags</span>
          </div>

          {!required && tags.length > 0 && (
            <div className="space-y-2">
              <Label>Required only for these tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant={requiredForTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setRequiredForTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select the tags for which this field is required.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          
          {unusedTags.length > 0 && (
            <div className="bg-muted/50 p-3 rounded-md space-y-2">
              <p className="text-sm text-muted-foreground font-medium">Select from existing tags:</p>
              <div className="flex flex-wrap gap-2">
                {unusedTags.map(tag => (
                  <Badge 
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Add new tag and press Enter"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addTag}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map(t => (
              <Badge key={t} variant="secondary" className="gap-1">
                {t} <X className="h-3 w-3 cursor-pointer" onClick={() => {
                  setTags(prev => prev.filter(x => x !== t));
                  setRequiredForTags(prev => prev.filter(x => x !== t));
                }} />
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1"><Save className="h-4 w-4 mr-2" />Save Changes</Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormFiller({ fields, refresh }: { fields: FormField[]; refresh: () => void }) {
  const allTags = useMemo(() => [...new Set(fields.flatMap(f => f.tags))].sort(), [fields]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [infoPopupOpen, setInfoPopupOpen] = useState<string | null>(null);
  const [infoPopupPosition, setInfoPopupPosition] = useState({ top: 150, left: 150 });
  const [infoPopupDrag, setInfoPopupDrag] = useState<{ x: number; y: number; top: number; left: number } | null>(null);

  // Load draft on component mount
  useEffect(() => {
    const draft = storage.getFormDraft();
    if (draft.selectedTags.length > 0 || Object.keys(draft.values).length > 0 || draft.expandedFields.length > 0) {
      setSelectedTags(draft.selectedTags);
      setValues(draft.values);
      setExpandedFields(new Set(draft.expandedFields));
      toast.success("Draft restored from your last session");
    }
  }, []);

  // Save draft whenever form state changes
  useEffect(() => {
    storage.setFormDraft({
      selectedTags,
      values,
      expandedFields: Array.from(expandedFields),
    });
  }, [selectedTags, values, expandedFields]);

  const filteredFields = useMemo(
    () => {
      const filtered = selectedTags.length === 0 ? [] : fields.filter(f => selectedTags.some(t => f.tags.includes(t)));
      return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    [fields, selectedTags]
  );

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId);
      } else {
        newSet.add(fieldId);
      }
      return newSet;
    });
  };

  const requiredComplete = filteredFields
    .filter(f => {
      const fieldRequired = f.required || (f.requiredForTags?.some(tag => selectedTags.includes(tag)) ?? false);
      return fieldRequired;
    })
    .every(f => (values[f.id] || "").trim());

  const copyAll = async () => {
    if (!requiredComplete) { toast.error("Fill all required fields first"); return; }
    const text = filteredFields.map(f => `${f.name}: ${values[f.id] || ""}`).join("\n\n");
    await copyToClipboard(text, "Form copied to clipboard");
  };

  const saveForm = () => {
    if (!requiredComplete) { toast.error("Fill all required fields first"); return; }
    const saved: SavedForm = {
      id: generateId(),
      fields: filteredFields.map(f => ({ name: f.name, value: values[f.id] || "" })),
      tags: selectedTags,
      status: "pending",
      savedAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long", }),
    };
    const forms = storage.getSavedForms();
    forms.unshift(saved);
    storage.setSavedForms(forms);
    toast.success("Form saved");
    setValues({});
    setSelectedTags([]);
    setExpandedFields(new Set());
    // Clear the draft after saving
    storage.setFormDraft({
      selectedTags: [],
      values: {},
      expandedFields: [],
    });
    refresh();
  };

  const copyField = async (field: FormField) => {
    await copyToClipboard(values[field.id] || "", `Copied ${field.name}`);
  };

  useEffect(() => {
    if (!infoPopupDrag) return;
    const handleMouseMove = (e: MouseEvent) => {
      setInfoPopupPosition({
        top: Math.max(0, infoPopupDrag.top + (e.clientY - infoPopupDrag.y)),
        left: Math.max(0, infoPopupDrag.left + (e.clientX - infoPopupDrag.x)),
      });
    };
    const handleMouseUp = () => {
      setInfoPopupDrag(null);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [infoPopupDrag]);

  if (allTags.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Create some fields first to start filling forms.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Select Tags to Build Form</Label>
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              <Tag className="h-3 w-3 mr-1" />{tag}
            </Badge>
          ))}
        </div>
      </div>

      {filteredFields.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 mb-4">
            {filteredFields.map(f => {
              const isFilled = (values[f.id] || "").trim() !== "";
              const isExpanded = expandedFields.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFieldExpanded(f.id)}
                  className={`px-4 py-2 rounded-full font-medium text-sm transition-all ${
                    isExpanded
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isFilled
                      ? "bg-emerald-600 text-white border-2 border-emerald-500 shadow-sm hover:bg-emerald-700"
                      : "bg-slate-900 text-white border-2 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {f.name}
                    {(f.required || (f.requiredForTags?.length ?? 0) > 0) && (
                      <span className="text-xs text-red-300">{f.required ? "*" : "•"}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {Array.from(expandedFields).map(fieldId => {
            const f = filteredFields.find(field => field.id === fieldId);
            if (!f) return null;
            return (
              <Card key={f.id} className="p-4 border-2 border-primary">
                <div className="flex items-center gap-2 mb-3">
                  <Label className="font-medium text-base">{f.name}</Label>
                  {f.required ? (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  ) : f.requiredForTags?.length ? (
                    <Badge variant="secondary" className="text-xs">Required for {f.requiredForTags.join(", ")}</Badge>
                  ) : null}
                  {f.info && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                      setInfoPopupOpen(f.id);
                      setInfoPopupPosition({ top: 150, left: 150 });
                    }}>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </Button>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => copyField(f)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => toggleFieldExpanded(f.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {f.type === "text" && (
                  <Input value={values[f.id] || ""} onChange={e => setValues({ ...values, [f.id]: e.target.value })} placeholder={`Enter ${f.name.toLowerCase()}`} />
                )}
                {f.type === "dropdown" && (
                  <Select value={values[f.id] || ""} onValueChange={v => setValues({ ...values, [f.id]: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{f.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {f.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={values[f.id] === "true"}
                      onCheckedChange={c => setValues({ ...values, [f.id]: c ? "true" : "false" })}
                    />
                    <span className="text-sm text-muted-foreground">Check if applicable</span>
                  </div>
                )}
              </Card>
            );
          })}

          {infoPopupOpen && filteredFields.find(f => f.id === infoPopupOpen) && (
            <div
              className="fixed z-50 border-2 border-primary bg-card shadow-2xl rounded-lg overflow-hidden"
              style={{
                top: `${infoPopupPosition.top}px`,
                left: `${infoPopupPosition.left}px`,
                width: "min(90vw, 420px)",
                minHeight: "240px",
                maxHeight: "80vh",
              }}
            >
              <div
                className="flex items-center justify-between gap-2 bg-background border-b-2 border-primary px-4 py-3 cursor-move select-none"
                onMouseDown={(event) => {
                  setInfoPopupDrag({
                    x: event.clientX,
                    y: event.clientY,
                    top: infoPopupPosition.top,
                    left: infoPopupPosition.left,
                  });
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{filteredFields.find(f => f.id === infoPopupOpen)?.name}</p>
                  <p className="text-xs text-muted-foreground">Drag to move. Resize corner. Close with X.</p>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => setInfoPopupOpen(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4 overflow-auto" style={{ maxHeight: "calc(80vh - 70px)" }}>
                {filteredFields.find(f => f.id === infoPopupOpen)?.info && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{filteredFields.find(f => f.id === infoPopupOpen)?.info}</p>
                )}
                {filteredFields.find(f => f.id === infoPopupOpen)?.type === "dropdown" && filteredFields.find(f => f.id === infoPopupOpen)?.options && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Options:</p>
                    <div className="flex flex-wrap gap-1">
                      {filteredFields.find(f => f.id === infoPopupOpen)?.options?.map(opt => (
                        <Badge key={opt} variant="outline" className="text-xs">{opt}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={copyAll} disabled={!requiredComplete} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />Copy All
            </Button>
            <Button onClick={saveForm} disabled={!requiredComplete} variant="secondary" className="flex-1">
              <Save className="h-4 w-4 mr-2" />Save Form
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormBuilderSection() {
  const [fields, setFields] = useState<FormField[]>(storage.getFields());
  const [savedForms, setSavedForms] = useState<SavedForm[]>(storage.getSavedForms());
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingFormValues, setEditingFormValues] = useState<{ [key: string]: string }>({});
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [fieldFilterTags, setFieldFilterTags] = useState<string[]>([]);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);

  const refresh = () => {
    setFields(storage.getFields());
    setSavedForms(storage.getSavedForms());
    setEditingFieldId(null);
  };

  const exportFields = () => {
    const data = JSON.stringify(fields, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-fields-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fields exported");
  };

  const importFields = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const merged = [...fields, ...imported];
        storage.setFields(merged);
        refresh();
        toast.success(`Imported ${imported.length} fields`);
      } catch {
        toast.error("Failed to import file");
      }
    };
    reader.readAsText(file);
  };

  const deleteField = (id: string) => {
    const updated = fields.filter(f => f.id !== id);
    storage.setFields(updated);
    refresh();
    toast.success("Field deleted");
  };

  const deleteTag = (tagToDelete: string) => {
    // For each field, if it has only the deleted tag, keep it as placeholder
    // If it has multiple tags, remove the deleted tag from it
    const updated = fields.map(field => {
      if (!field.tags.includes(tagToDelete)) {
        return field; // Tag not in this field, no change
      }
      
      if (field.tags.length === 1) {
        // Only tag is the one being deleted - keep it as placeholder/default
        return field;
      }
      
      // Multiple tags - remove the deleted one
      return {
        ...field,
        tags: field.tags.filter(t => t !== tagToDelete),
        requiredForTags: field.requiredForTags?.filter(t => t !== tagToDelete)
      };
    });

    storage.setFields(updated);
    setFields(updated);
    setFieldFilterTags(prev => prev.filter(t => t !== tagToDelete));
    toast.success(`Tag "${tagToDelete}" deleted. Fields with only this tag kept it as placeholder.`);
  };

  const deleteSavedForm = (id: string) => {
    const updated = savedForms.filter(f => f.id !== id);
    storage.setSavedForms(updated);
    refresh();
    toast.success("Saved form deleted");
  };

  const editSavedForm = (id: string) => {
    const form = savedForms.find(f => f.id === id);
    if (form) {
      setEditingFormId(id);
      const values: { [key: string]: string } = {};
      form.fields.forEach(f => {
        values[f.name] = f.value;
      });
      setEditingFormValues(values);
    }
  };

  const saveEditedForm = () => {
    if (!editingFormId) return;
    const updated = savedForms.map(f => {
      if (f.id === editingFormId) {
        return {
          ...f,
          fields: f.fields.map(field => ({
            name: field.name,
            value: editingFormValues[field.name] || field.value
          })),
          savedAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" })
        };
      }
      return f;
    });
    storage.setSavedForms(updated);
    setSavedForms(updated);
    setEditingFormId(null);
    setEditingFormValues({});
    toast.success("Form updated");
  };

  const cancelEditForm = () => {
    setEditingFormId(null);
    setEditingFormValues({});
  };

  const defaultStatuses = ["pending", "waiting_customer", "processed", "on_hold"];
  const allStatuses = useMemo(() => [...new Set([...defaultStatuses, ...savedForms.map(f => f.status)])].sort(), [savedForms.length]);

  const updateFormStatus = (formId: string, newStatus: string) => {
    if (newStatus === "___custom___") {
      const customStatus = prompt("Enter custom status name:");
      if (!customStatus || !customStatus.trim()) return;
      const statusName = customStatus.trim().toLowerCase().replace(/\s+/g, "_");
      const updated = savedForms.map(f =>
        f.id === formId ? { ...f, status: statusName } : f
      );
      storage.setSavedForms(updated);
      refresh();
      toast.success(`Status set to "${statusName}"`);
    } else {
      const updated = savedForms.map(f =>
        f.id === formId ? { ...f, status: newStatus } : f
      );
      storage.setSavedForms(updated);
      refresh();
      toast.success(`Status updated to "${newStatus}"`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900 text-yellow-100";
      case "waiting_customer":
        return "bg-blue-900 text-blue-100";
      case "processed":
        return "bg-green-900 text-green-100";
      case "on_hold":
        return "bg-red-900 text-red-100";
      default:
        return "bg-gray-700 text-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "processed":
        return <CheckCircle className="h-3 w-3" />;
      case "waiting_customer":
      case "on_hold":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Get all tags from fields
  const allFieldTags = useMemo(() => [...new Set(fields.flatMap(f => f.tags))].sort(), [fields.length]);

  // Filter fields by selected tags
  const filteredFields = useMemo(() => {
    if (fieldFilterTags.length === 0) return fields.sort((a, b) => (a.order || 0) - (b.order || 0));
    return fields
      .filter(f => fieldFilterTags.some(t => f.tags.includes(t)))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [fields, fieldFilterTags]);

  // Move field up/down in order
  const moveField = (fieldId: string, direction: "up" | "down") => {
    const index = filteredFields.findIndex(f => f.id === fieldId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === filteredFields.length - 1)
    ) {
      return;
    }

    const newFiltered = [...filteredFields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newFiltered[index], newFiltered[targetIndex]] = [newFiltered[targetIndex], newFiltered[index]];

    // Reorder all fields maintaining non-filtered ones at the end
    const updated = fields.map(f => {
      const newIndex = newFiltered.findIndex(nf => nf.id === f.id);
      return { ...f, order: newIndex !== -1 ? newIndex : (f.order || fields.length) };
    });
    storage.setFields(updated);
    setFields(updated);
    toast.success(`Field moved ${direction}`);
  };

  return (
    <Tabs defaultValue="fill" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="fill">Fill Form</TabsTrigger>
        <TabsTrigger value="create">Create Fields</TabsTrigger>
        <TabsTrigger value="saved">Saved Forms ({savedForms.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="fill">
        <FormFiller fields={fields} refresh={refresh} />
      </TabsContent>

      <TabsContent value="create" className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={exportFields} variant="outline" className="flex-1" disabled={fields.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export Fields
          </Button>
          <label className="flex-1">
            <input 
              type="file" 
              accept=".json" 
              onChange={importFields}
              className="hidden"
            />
            <Button variant="outline" className="w-full cursor-pointer" asChild>
              <span><Upload className="h-4 w-4 mr-2" />Import Fields</span>
            </Button>
          </label>
        </div>
        
        {editingFieldId ? (
          <FieldEditor 
            field={fields.find(f => f.id === editingFieldId)!} 
            onSave={refresh}
            onCancel={() => setEditingFieldId(null)}
          />
        ) : (
          <FieldCreator onSave={refresh} />
        )}
        
        {fields.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Existing Fields ({fields.length})</CardTitle>
              </div>
              {allFieldTags.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">Filter by tags & reorder:</p>
                  <div className="flex flex-wrap gap-2">
                    {allFieldTags.map(tag => (
                      <div key={tag} className="flex items-center gap-1 group">
                        <Badge
                          variant={fieldFilterTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setFieldFilterTags(prev => 
                            prev.includes(tag) 
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          )}
                        >
                          <Tag className="h-3 w-3 mr-1" />{tag}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteTag(tag)}
                          title="Delete this tag"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {fieldFilterTags.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => setFieldFilterTags([])}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredFields.map((f, idx) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50 group">
                  <div className="flex-1">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">({f.type})</span>
                    {f.required ? (
                      <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                    ) : f.requiredForTags?.length ? (
                      <Badge variant="secondary" className="ml-2 text-xs">Required for {f.requiredForTags.join(", ")}</Badge>
                    ) : null}
                    <div className="flex gap-1 mt-1">
                      {f.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                  </div>
                  <div className="flex gap-1 items-center">
                    {fieldFilterTags.length > 0 && (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => moveField(f.id, "up")}
                          disabled={idx === 0}
                          className="h-7 px-2"
                        >
                          ↑
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => moveField(f.id, "down")}
                          disabled={idx === filteredFields.length - 1}
                          className="h-7 px-2"
                        >
                          ↓
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditingFieldId(f.id)}><Edit2 className="h-4 w-4 text-primary" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteField(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="saved" className="space-y-3">
        {editingFormId ? (
          <Card className="p-4">
            <CardHeader>
              <CardTitle className="text-lg">Edit Saved Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {savedForms.find(f => f.id === editingFormId)?.fields.map((field, idx) => (
                <div key={idx} className="space-y-2">
                  <Label className="font-bold">{field.name}</Label>
                  <Input
                    value={editingFormValues[field.name] || ""}
                    onChange={(e) => setEditingFormValues(prev => ({
                      ...prev,
                      [field.name]: e.target.value
                    }))}
                    placeholder={`Enter ${field.name}`}
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={saveEditedForm} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />Save Changes
                </Button>
                <Button onClick={cancelEditForm} variant="secondary" className="flex-1">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {savedForms.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No saved forms yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Filter: </span>
                  {allStatuses.map(status => (
                    <Badge key={status} variant="outline" className="cursor-pointer text-xs capitalize">
                      {status.replace("_", " ")} ({savedForms.filter(f => f.status === status).length})
                    </Badge>
                  ))}
                </div>
                {savedForms.map(sf => (
              <Card key={sf.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`text-xs capitalize ${getStatusColor(sf.status)} gap-1`}>
                        {getStatusIcon(sf.status)}
                        {sf.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex gap-2 items-center mb-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <Select value={sf.status} onValueChange={(newStatus) => updateFormStatus(sf.id, newStatus)}>
                        <SelectTrigger className="w-fit h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allStatuses.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">
                              {status.replace("_", " ")}
                            </SelectItem>
                          ))}
                          <SelectItem value="___custom___">+ Add Custom Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-sm text-muted-foreground">{sf.savedAt}</span>
                    <div className="flex gap-1 mt-1">{sf.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const text = sf.fields.map(f => `${f.name}: ${f.value}`).join("\n\n");
                      await copyToClipboard(text, "Copied");
                    }}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => editSavedForm(sf.id)}><Edit2 className="h-4 w-4 text-primary" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteSavedForm(sf.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  {sf.fields.map((f, i) => (
                    <div key={i}><span className="font-bold">{f.name}:</span> {f.value}</div>
                  ))}
                </div>
              </Card>
            ))}
              </>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

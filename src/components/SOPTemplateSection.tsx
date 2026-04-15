import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Info, ChevronDown, Edit, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { storage, SOPLink } from "@/lib/storage";
import { useLanguage } from "@/lib/useLanguage";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const SOPTemplateSection = () => {
  const { t } = useLanguage();
  const [links, setLinks] = useState<SOPLink[]>(storage.getSOPLinks());
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [entryType, setEntryType] = useState<"link" | "text">("link");
  const [description, setDescription] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  // Load draft on component mount
  useEffect(() => {
    const draft = storage.getSOPDraft();
    if (draft.url || draft.text || draft.description || draft.selectedKeywords.length > 0 || draft.editingId) {
      setUrl(draft.url);
      setText(draft.text);
      setEntryType(draft.entryType);
      setDescription(draft.description);
      setSelectedKeywords(draft.selectedKeywords);
      setKeywordInput(draft.keywordInput);
      setSearchQuery(draft.searchQuery);
      setEditingId(draft.editingId);
      toast.success("Draft restored from your last session");
    }
  }, []);

  // Save draft whenever form fields change
  useEffect(() => {
    storage.setSOPDraft({
      entryType,
      url,
      text,
      description,
      selectedKeywords,
      keywordInput,
      searchQuery,
      editingId,
    });
  }, [entryType, url, text, description, selectedKeywords, keywordInput, searchQuery, editingId]);

  // Get all unique keywords from existing links
  const allKeywords = useMemo(() => {
    const keywords = new Set<string>();
    links.forEach(link => link.keywords.forEach(k => keywords.add(k)));
    return Array.from(keywords).sort();
  }, [links]);

  // Filter available keywords based on search input
  const suggestedKeywords = useMemo(() => {
    if (!keywordInput.trim()) return allKeywords;
    const lower = keywordInput.toLowerCase();
    return allKeywords.filter(k => k.toLowerCase().includes(lower));
  }, [keywordInput, allKeywords]);

  // Search links based on query
  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return links;
    const lower = searchQuery.toLowerCase();
    return links.filter(link =>
      link.keywords.some(k => k.toLowerCase().includes(lower)) ||
      (link.type === "link" && link.url?.toLowerCase().includes(lower)) ||
      (link.type === "text" && link.text?.toLowerCase().includes(lower))
    );
  }, [searchQuery, links]);

  const refresh = () => {
    setLinks(storage.getSOPLinks());
  };

  const addLink = () => {
    if (entryType === "link") {
      if (!url.trim()) {
        toast.error(t("urlRequired") || "URL is required");
        return;
      }
      try {
        new URL(url); // Validate URL
      } catch {
        toast.error(t("invalidUrl") || "Invalid URL");
        return;
      }
    } else {
      if (!text.trim()) {
        toast.error(t("textRequired") || "Text is required");
        return;
      }
    }

    if (!description.trim()) {
      toast.error(t("descriptionRequired") || "Description is required");
      return;
    }
    if (selectedKeywords.length === 0) {
      toast.error(t("addAtLeastOneKeyword") || "Add at least one keyword");
      return;
    }

    if (editingId) {
      // Update existing entry
      const updated = links.map(link =>
        link.id === editingId
          ? {
              ...link,
              type: entryType,
              url: entryType === "link" ? url.trim() : undefined,
              text: entryType === "text" ? text.trim() : undefined,
              description: description.trim(),
              keywords: selectedKeywords,
            }
          : link
      );
      storage.setSOPLinks(updated);
      toast.success(t("entryUpdated") || "Entry updated");
      setEditingId(null);
    } else {
      // Create new entry
      const newEntry: SOPLink = {
        id: generateId(),
        type: entryType,
        url: entryType === "link" ? url.trim() : undefined,
        text: entryType === "text" ? text.trim() : undefined,
        description: description.trim(),
        keywords: selectedKeywords,
        createdAt: new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
      };
      const all = storage.getSOPLinks();
      all.unshift(newEntry);
      storage.setSOPLinks(all);
      toast.success(t("entryCreated") || "Entry created");
    }

    setUrl("");
    setText("");
    setEntryType("link");
    setDescription("");
    setSelectedKeywords([]);
    setKeywordInput("");
    // Clear the draft after saving
    storage.setSOPDraft({
      entryType: "link",
      url: "",
      text: "",
      description: "",
      selectedKeywords: [],
      keywordInput: "",
      searchQuery: "",
      editingId: null,
    });
    refresh();
  };

  const deleteLink = (id: string) => {
    const updated = links.filter(link => link.id !== id);
    storage.setSOPLinks(updated);
    toast.success(t("linkDeleted") || "Link deleted");
    refresh();
  };

  const editLink = (link: SOPLink) => {
    setEditingId(link.id);
    setEntryType(link.type);
    setUrl(link.url || "");
    setText(link.text || "");
    setDescription(link.description);
    setSelectedKeywords(link.keywords);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEntryType("link");
    setUrl("");
    setText("");
    setDescription("");
    setSelectedKeywords([]);
    setKeywordInput("");
    // Clear the draft when canceling
    storage.setSOPDraft({
      entryType: "link",
      url: "",
      text: "",
      description: "",
      selectedKeywords: [],
      keywordInput: "",
      searchQuery: "",
      editingId: null,
    });
  };

  const addKeyword = (keyword: string) => {
    const clean = keyword.trim().toLowerCase();
    if (clean && !selectedKeywords.includes(clean)) {
      setSelectedKeywords([...selectedKeywords, clean]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("linkCopiedClipboard") || "Link copied to clipboard");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success(t("linkCopiedClipboard") || "Link copied to clipboard");
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("textCopiedClipboard") || "Text copied to clipboard");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success(t("textCopiedClipboard") || "Text copied to clipboard");
    }
  };

  const exportSOP = () => {
    const data = JSON.stringify(links, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sop-entries-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("templatesExported") || "Exported successfully");
  };

  const importSOP = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!Array.isArray(imported)) {
          toast.error(t("invalidFileFormat") || "Invalid file format");
          return;
        }
        const merged = [...links, ...imported];
        storage.setSOPLinks(merged);
        refresh();
        toast.success(t("imported") || `Imported ${imported.length} entries`);
      } catch {
        toast.error(t("failedToImportFile") || "Failed to import file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Export/Import Buttons */}
      <div className="flex gap-2">
        <Button onClick={exportSOP} variant="outline" className="flex-1" disabled={links.length === 0}>
          <Download className="h-4 w-4 mr-2" />{t("exportTemplates") || "Export"}
        </Button>
        <label className="flex-1">
          <input 
            type="file" 
            accept=".json" 
            onChange={importSOP}
            className="hidden"
          />
          <Button variant="outline" className="w-full cursor-pointer" asChild>
            <span><Upload className="h-4 w-4 mr-2" />{t("importTemplates") || "Import"}</span>
          </Button>
        </label>
      </div>

      {/* Link Creator */}
      <Collapsible open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                <CardTitle className="text-lg">
                  {editingId ? (t("editEntry") || "Edit Entry") : (t("createEntry") || "Create SOP Entry")}
                </CardTitle>
                <ChevronDown className={`h-5 w-5 transition-transform ${isCreatorOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Type Selector */}
              <div className="space-y-2">
                <Label>{t("entryType") || "Type"}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={entryType === "link" ? "default" : "outline"}
                    onClick={() => setEntryType("link")}
                    className="flex-1"
                  >
                    {t("linkType") || "Link"}
                  </Button>
                  <Button
                    type="button"
                    variant={entryType === "text" ? "default" : "outline"}
                    onClick={() => setEntryType("text")}
                    className="flex-1"
                  >
                    {t("textType") || "Text"}
                  </Button>
                </div>
              </div>

              {/* URL Input - shown only for links */}
              {entryType === "link" && (
                <div className="space-y-2">
                  <Label>{t("urlLabel") || "Document URL"}</Label>
                  <Input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder={t("urlPlaceholder") || "https://docs.example.com/..."}
                    type="url"
                  />
                </div>
              )}

              {/* Text Input - shown only for text entries */}
              {entryType === "text" && (
                <div className="space-y-2">
                  <Label>{t("contentText") || "Text Content"}</Label>
                  <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={t("textPlaceholder") || "Enter the text content..."}
                    rows={5}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("descriptionLabel") || "Description"}</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder") || "What does this contain? E.g., 'Robot battery specifications and charging procedures'"}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("keywordsLabel") || "Keywords / Tags"}</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyword(keywordInput);
                      }
                    }}
                    placeholder={t("keywordPlaceholder") || "Type a keyword and press Enter..."}
                  />
                  <Button onClick={() => addKeyword(keywordInput)} variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Suggested Keywords */}
                {keywordInput.trim() && suggestedKeywords.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{t("suggestedKeywords") || "Suggestions:"}</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestedKeywords.map(keyword => (
                        <Badge
                          key={keyword}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/20"
                          onClick={() => addKeyword(keyword)}
                        >
                          + {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Keywords */}
                {selectedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedKeywords.map(keyword => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => removeKeyword(keyword)}
                      >
                        {keyword} ✕
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={addLink} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingId ? (t("update") || "Update") : (t("createEntry") || "Create Entry")}
                </Button>
                {editingId && (
                  <Button onClick={cancelEdit} variant="secondary" className="flex-1">
                    {t("cancel") || "Cancel"}
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Search Bar */}
      {links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("searchLinks") || "Search Links"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder") || "Search by keyword or URL... try 'battery', 'robot', etc."}
              className="text-base"
            />
            {searchQuery.trim() && (
              <p className="text-sm text-muted-foreground mt-2">
                {filteredLinks.length} {filteredLinks.length === 1 ? t("resultFound") || "result found" : t("resultsFound") || "results found"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Links/Entries Display */}
      {filteredLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {searchQuery.trim() ? `${t("searchResults") || "Search Results"} (${filteredLinks.length})` : `${t("savedLinks") || "Saved Links"} (${links.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {filteredLinks.map(entry => (
              <div key={entry.id} className="p-3 rounded-md bg-muted/50 space-y-2">
                {/* Display based on entry type */}
                {entry.type === "link" ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => window.open(entry.url, "_blank")}
                      className="text-xs bg-muted px-1.5 py-0.5 rounded flex-1 min-w-0 overflow-auto text-foreground font-mono truncate hover:bg-primary/20 transition-colors cursor-pointer"
                      title={t("clickToOpen") || "Click to open in new tab"}
                    >
                      {entry.url}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyLink(entry.url!)}
                      title={t("copyUrl") || "Copy URL"}
                      className="h-5 w-5 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background border border-border rounded p-2 text-sm whitespace-pre-wrap break-words max-h-16 overflow-y-auto">
                      {entry.text}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyText(entry.text!)}
                      title={t("copyText") || "Copy text"}
                      className="h-5 w-5 p-0 flex-shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Description tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-4 w-4 p-0">
                      <Info className="h-3 w-3 text-blue-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="whitespace-normal text-xs">{entry.description}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1">
                  {entry.keywords.map(keyword => (
                    <Badge key={keyword} variant="secondary" className="text-sm py-1 px-2 font-medium bg-primary/80 text-primary-foreground hover:bg-primary transition-colors">
                      {keyword}
                    </Badge>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => deleteLink(entry.id)} className="h-5 w-5 p-0">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => editLink(entry)} className="h-5 px-1.5 text-xs py-0">
                    {t("edit") || "Edit"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {links.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-muted-foreground">{t("noSOPEntriesYet") || "No SOP entries yet. Create your first link or text entry above!"}</p>
        </Card>
      )}

      {/* No Search Results */}
      {searchQuery.trim() && filteredLinks.length === 0 && links.length > 0 && (
        <Card className="text-center py-8">
          <p className="text-muted-foreground">
            {t("noResultsFound") || `No links found with keyword "${searchQuery}"`}
          </p>
        </Card>
      )}
    </div>
  );
};

export default SOPTemplateSection;

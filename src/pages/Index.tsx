import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Mail, MessageSquareText, BookOpen } from "lucide-react";
import FormBuilderSection from "@/components/FormBuilderSection";
import EmailTemplateSection from "@/components/EmailTemplateSection";
import RemarkTemplateSection from "@/components/RemarkTemplateSection";
import SOPTemplateSection from "@/components/SOPTemplateSection";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/useLanguage";

const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container max-w-4xl py-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("appTitle")}</h1>
              <p className="text-sm text-muted-foreground">Forms, emails & remarks — all in one place</p>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-6">
        <Tabs defaultValue="forms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="forms" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">{t("formBuilder")}</span>
              <span className="sm:hidden">Forms</span>
            </TabsTrigger>
            <TabsTrigger value="emails" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{t("emailTemplates")}</span>
              <span className="sm:hidden">Emails</span>
            </TabsTrigger>
            <TabsTrigger value="remarks" className="gap-2">
              <MessageSquareText className="h-4 w-4" />
              <span className="hidden sm:inline">{t("remarkTemplates")}</span>
              <span className="sm:hidden">Remarks</span>
            </TabsTrigger>
            <TabsTrigger value="sop" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{t("sopTemplates")}</span>
              <span className="sm:hidden">SOP</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forms"><FormBuilderSection /></TabsContent>
          <TabsContent value="emails"><EmailTemplateSection /></TabsContent>
          <TabsContent value="remarks"><RemarkTemplateSection /></TabsContent>
          <TabsContent value="sop"><SOPTemplateSection /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

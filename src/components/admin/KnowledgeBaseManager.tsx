import { useState, useEffect } from 'react';
import { GeminiStoreManager } from './GeminiStoreManager';
import { CustomRagStoreManager } from './CustomRagStoreManager';
import { TesviksorApiManager } from './TesviksorApiManager';
import { SupportProgramsEmbeddingManager } from './SupportProgramsEmbeddingManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { adminSettingsService } from '@/services/adminSettingsService';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Database, Cloud, Eye, EyeOff, Building2 } from 'lucide-react';

export function KnowledgeBaseManager() {
  const [ragMode, setRagMode] = useState<'gemini_file_search' | 'custom_rag' | 'tesviksor_api'>('gemini_file_search');
  const [showSources, setShowSources] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [mode, sources] = await Promise.all([
        adminSettingsService.getChatbotRagMode(),
        adminSettingsService.getChatbotShowSources()
      ]);
      setRagMode(mode);
      setShowSources(sources);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleModeChange(value: string) {
    const newMode = value as 'gemini_file_search' | 'custom_rag' | 'tesviksor_api';
    
    try {
      await adminSettingsService.setChatbotRagMode(newMode);
      setRagMode(newMode);
      
      toast({
        title: 'Başarılı',
        description: 'RAG sistemi değiştirildi',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'RAG sistemi değiştirilemedi',
        variant: 'destructive',
      });
    }
  }

  async function handleShowSourcesChange(checked: boolean) {
    try {
      await adminSettingsService.setChatbotShowSources(checked);
      setShowSources(checked);
      
      toast({
        title: 'Başarılı',
        description: checked ? 'Kaynak referansları gösterilecek' : 'Kaynak referansları gizlenecek',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Ayar kaydedilemedi',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ragSystems = [
    { 
      id: 'gemini_file_search', 
      label: 'Gemini', 
      icon: Sparkles,
      description: 'Google File Search API'
    },
    { 
      id: 'custom_rag', 
      label: 'Custom RAG', 
      icon: Database,
      description: 'PostgreSQL + pgvector'
    },
    { 
      id: 'tesviksor_api', 
      label: 'TeşvikSor API', 
      icon: Cloud,
      description: 'Teşvik & Yatırım API'
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with inline settings */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">RAG Sistemi</h3>
            <p className="text-xs text-muted-foreground">Chatbot bilgi kaynağını yönetin</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            {showSources ? (
              <Eye className="h-4 w-4 text-primary" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="show-sources" className="text-xs font-medium cursor-pointer">
              Kaynakları Göster
            </Label>
            <Switch
              id="show-sources"
              checked={showSources}
              onCheckedChange={handleShowSourcesChange}
              className="scale-90"
            />
          </div>
        </div>
      </div>

      {/* Tab-based RAG System Selection */}
      <Tabs value={ragMode} onValueChange={handleModeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50">
          {ragSystems.map((system) => {
            const Icon = system.icon;
            const isActive = ragMode === system.id;
            return (
              <TabsTrigger
                key={system.id}
                value={system.id}
                className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium text-sm">{system.label}</span>
                  {isActive && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                      Aktif
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:block">
                  {system.description}
                </span>
              </TabsTrigger>
            );
          })}
          <TabsTrigger
            value="site_ici_destekler"
            className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Site İçi</span>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              Destek Programları
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="gemini_file_search" className="m-0">
            <GeminiStoreManager />
          </TabsContent>

          <TabsContent value="custom_rag" className="m-0">
            <CustomRagStoreManager />
          </TabsContent>

          <TabsContent value="tesviksor_api" className="m-0">
            <TesviksorApiManager />
          </TabsContent>

          <TabsContent value="site_ici_destekler" className="m-0">
            <SupportProgramsEmbeddingManager />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

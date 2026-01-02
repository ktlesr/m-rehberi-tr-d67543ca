import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { adminSettingsService, QnaDisplayMode } from '@/services/adminSettingsService';
import { Loader2, LayoutGrid, List, Minimize2, Save } from 'lucide-react';

const AdminQnaSettings = () => {
  const [displayMode, setDisplayMode] = useState<QnaDisplayMode>('card');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const mode = await adminSettingsService.getQnaDisplayMode();
      setDisplayMode(mode);
    } catch (error) {
      console.error('Error loading QnA settings:', error);
      toast({
        title: 'Hata',
        description: 'Ayarlar yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await adminSettingsService.setQnaDisplayMode(displayMode);
      toast({
        title: 'Başarılı',
        description: 'Soru-Cevap görünüm ayarları kaydedildi.',
      });
    } catch (error) {
      console.error('Error saving QnA settings:', error);
      toast({
        title: 'Hata',
        description: 'Ayarlar kaydedilirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Soru-Cevap Ayarları"
        description="Yanıtlanmış soruların görüntülenme modunu yapılandırın."
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Görünüm Modu</CardTitle>
          <CardDescription>
            Halka açık soru-cevap sayfasında yanıtlanmış soruların nasıl görüntüleneceğini seçin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={displayMode}
            onValueChange={(value) => setDisplayMode(value as QnaDisplayMode)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Label
              htmlFor="card"
              className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 cursor-pointer transition-all ${
                displayMode === 'card'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value="card" id="card" className="sr-only" />
              <LayoutGrid className="h-12 w-12 mb-3 text-primary" />
              <span className="font-semibold text-lg">Kart Görünümü</span>
              <span className="text-sm text-muted-foreground text-center mt-2">
                Her soru ve cevap ayrı kartlarda görüntülenir. Daha detaylı ve ayrıntılı bir görünüm sağlar.
              </span>
            </Label>

            <Label
              htmlFor="accordion"
              className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 cursor-pointer transition-all ${
                displayMode === 'accordion'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value="accordion" id="accordion" className="sr-only" />
              <List className="h-12 w-12 mb-3 text-primary" />
              <span className="font-semibold text-lg">Accordion Görünümü</span>
              <span className="text-sm text-muted-foreground text-center mt-2">
                Sorular liste halinde gösterilir, tıklandığında cevap açılır. Daha kompakt bir görünüm sağlar.
              </span>
            </Label>

            <Label
              htmlFor="minimal"
              className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 cursor-pointer transition-all ${
                displayMode === 'minimal'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <RadioGroupItem value="minimal" id="minimal" className="sr-only" />
              <Minimize2 className="h-12 w-12 mb-3 text-primary" />
              <span className="font-semibold text-lg">Minimal Görünümü</span>
              <span className="text-sm text-muted-foreground text-center mt-2">
                Sade tasarım, renkli soru/cevap kutuları ile kompakt görünüm.
              </span>
            </Label>
          </RadioGroup>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminQnaSettings;

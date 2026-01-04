import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AnnouncementFormData } from '@/types/announcement';
import { institutionLogos } from '@/data/institutionLogos';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, Upload, Link as LinkIcon, FileText, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIEvidencePanel } from './AIEvidencePanel';
import { FieldEvidence, FieldIssue, AnnouncementDraftResponse } from '@/types/aiDraft';

interface AnnouncementFormProps {
  initialData?: Partial<AnnouncementFormData>;
  onSubmit: (data: AnnouncementFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AnnouncementFormData>({
    defaultValues: {
      institution_logo: initialData?.institution_logo || '',
      institution_name: initialData?.institution_name || '',
      title: initialData?.title || '',
      detail: initialData?.detail || '',
      announcement_date: initialData?.announcement_date || new Date().toISOString().split('T')[0],
      external_link: initialData?.external_link || '',
      is_active: initialData?.is_active ?? true,
      display_order: initialData?.display_order ?? 0,
    }
  });

  // AI Draft states
  const [sourceUrl, setSourceUrl] = useState('');
  const [adminHint, setAdminHint] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiEvidence, setAiEvidence] = useState<FieldEvidence[]>([]);
  const [aiIssues, setAiIssues] = useState<FieldIssue[]>([]);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const selectedLogo = watch('institution_logo');
  const isActive = watch('is_active');
  const announcementDate = watch('announcement_date');

  const selectedInstitution = institutionLogos.find(i => i.logoPath === selectedLogo);

  const handleLogoChange = (logoPath: string) => {
    setValue('institution_logo', logoPath);
    const institution = institutionLogos.find(i => i.logoPath === logoPath);
    if (institution) {
      setValue('institution_name', institution.name);
    }
  };

  // File handling
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => 
      f.type === 'application/pdf' || 
      f.type === 'text/plain' ||
      f.type.includes('word')
    );
    setAiFiles(prev => [...prev, ...newFiles].slice(0, 5));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== index));
  };

  // AI Generate function
  const handleAiGenerate = async () => {
    if (!sourceUrl && aiFiles.length === 0) {
      toast.error('Lütfen bir URL girin veya dosya yükleyin');
      return;
    }

    setIsAiGenerating(true);
    
    try {
      // Upload files to storage first
      const uploadedFiles: Array<{ name: string; path: string }> = [];
      
      for (const file of aiFiles) {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `ai-drafts/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('announcement-files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('File upload error:', uploadError);
          continue;
        }
        
        uploadedFiles.push({ name: file.name, path: filePath });
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('ai-announcement-draft', {
        body: {
          uploaded_files: uploadedFiles,
          source_url: sourceUrl || null,
          hint: adminHint || null,
        }
      });

      if (error) {
        throw error;
      }

      const response = data as AnnouncementDraftResponse;

      // Fill form fields
      if (response.filled_fields.institution_logo) {
        setValue('institution_logo', response.filled_fields.institution_logo);
      }
      if (response.filled_fields.institution_name) {
        setValue('institution_name', response.filled_fields.institution_name);
      }
      if (response.filled_fields.title) {
        setValue('title', response.filled_fields.title);
      }
      if (response.filled_fields.detail) {
        setValue('detail', response.filled_fields.detail);
      }
      if (response.filled_fields.announcement_date) {
        setValue('announcement_date', response.filled_fields.announcement_date);
      }
      if (response.filled_fields.external_link) {
        setValue('external_link', response.filled_fields.external_link);
      }

      // Store evidence and issues
      setAiEvidence(response.evidence || []);
      setAiIssues(response.issues || []);
      
      // Show evidence panel if there's any evidence
      if ((response.evidence && response.evidence.length > 0) || (response.issues && response.issues.length > 0)) {
        setShowEvidencePanel(true);
      }

      toast.success('Duyuru bilgileri AI tarafından dolduruldu');

    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('AI analizi sırasında hata oluştu');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* AI Draft Section */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 space-y-4">
          <div className="flex items-center gap-2 text-purple-700">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-semibold">AI ile Otomatik Doldur</h3>
          </div>
          
          <p className="text-sm text-gray-600">
            Bir URL yapıştırın veya PDF/belge yükleyin. AI duyuru bilgilerini otomatik çıkaracak.
          </p>

          {/* File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 transition-colors",
              isDragOver ? "border-purple-500 bg-purple-50" : "border-gray-300",
              aiFiles.length > 0 ? "pb-2" : ""
            )}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-sm text-gray-600">
                <label className="text-purple-600 hover:underline cursor-pointer">
                  Dosya seçin
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </label>
                {' '}veya sürükleyip bırakın
              </div>
              <p className="text-xs text-gray-400">PDF, TXT, DOC (max 5 dosya)</p>
            </div>

            {/* File List */}
            {aiFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {aiFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded px-2 py-1">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Source URL */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Kaynak URL</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/duyuru"
                className="pl-9"
              />
            </div>
          </div>

          {/* Admin Hint */}
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">Admin Notu (opsiyonel)</Label>
            <Textarea
              value={adminHint}
              onChange={(e) => setAdminHint(e.target.value)}
              placeholder="AI'ya yardımcı olacak ek bilgiler..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleAiGenerate}
              disabled={isAiGenerating || (!sourceUrl && aiFiles.length === 0)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isAiGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI ile Analiz Et
                </>
              )}
            </Button>

            {(aiEvidence.length > 0 || aiIssues.length > 0) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEvidencePanel(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Kanıtları Göster
              </Button>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-2">
          <Label htmlFor="institution_logo">Kurum Logosu *</Label>
          <Select value={selectedLogo} onValueChange={handleLogoChange}>
            <SelectTrigger>
              {selectedInstitution ? (
                <div className="flex items-center gap-2">
                  <img src={selectedInstitution.logoPath} alt={selectedInstitution.name} className="w-6 h-6 object-contain" />
                  <span>{selectedInstitution.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Kurum seçiniz</span>
              )}
            </SelectTrigger>
            <SelectContent>
              {institutionLogos.map((institution) => (
                <SelectItem key={institution.id} value={institution.logoPath}>
                  <div className="flex items-center gap-2">
                    <img src={institution.logoPath} alt={institution.name} className="w-6 h-6 object-contain" />
                    <span>{institution.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.institution_logo && <p className="text-sm text-destructive">Kurum logosu gereklidir</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="institution_name">Kurum Adı</Label>
          <Input
            id="institution_name"
            {...register('institution_name')}
            readOnly
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Duyuru Başlığı *</Label>
          <Input
            id="title"
            {...register('title', {
              required: 'Başlık gereklidir',
              minLength: { value: 10, message: 'Başlık en az 10 karakter olmalıdır' },
              maxLength: { value: 200, message: 'Başlık en fazla 200 karakter olabilir' }
            })}
            placeholder="Örn: İPARD III (2021-2027) Onuncu Başvuru Çağrı Dönemi İlan Edilmiştir"
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="detail">Duyuru Detayı *</Label>
          <Textarea
            id="detail"
            {...register('detail', {
              required: 'Detay gereklidir',
              minLength: { value: 50, message: 'Detay en az 50 karakter olmalıdır' }
            })}
            placeholder="Duyurunun detaylı açıklaması..."
            rows={6}
          />
          {errors.detail && <p className="text-sm text-destructive">{errors.detail.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Duyuru Tarihi *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !announcementDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {announcementDate ? format(new Date(announcementDate), "d MMMM yyyy", { locale: tr }) : <span>Tarih seçiniz</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={announcementDate ? new Date(announcementDate) : undefined}
                onSelect={(date) => setValue('announcement_date', date ? format(date, 'yyyy-MM-dd') : '')}
                disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="external_link">Harici Link (İsteğe Bağlı)</Label>
          <Input
            id="external_link"
            {...register('external_link', {
              pattern: { value: /^https?:\/\/.+/, message: 'Geçerli bir URL giriniz' }
            })}
            placeholder="https://example.com"
            type="url"
          />
          {errors.external_link && <p className="text-sm text-destructive">{errors.external_link.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_order">Görüntülenme Sırası</Label>
          <Input
            id="display_order"
            type="number"
            {...register('display_order', { valueAsNumber: true })}
            placeholder="0"
          />
          <p className="text-sm text-muted-foreground">Düşük sayılar önce görüntülenir</p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_active"
            checked={isActive}
            onCheckedChange={(checked) => setValue('is_active', checked as boolean)}
          />
          <Label htmlFor="is_active" className="cursor-pointer">
            Duyuru Aktif
          </Label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            İptal
          </Button>
        </div>
      </form>

      {/* AI Evidence Panel */}
      {showEvidencePanel && (
        <AIEvidencePanel
          evidence={aiEvidence}
          issues={aiIssues}
          missingTags={[]}
          onClose={() => setShowEvidencePanel(false)}
        />
      )}
    </>
  );
};

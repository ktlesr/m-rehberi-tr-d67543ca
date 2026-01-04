import React, { useState, useEffect } from 'react';
import { Upload, X, Plus, Check, Minus, ArrowLeft, Sparkles, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Institution, Tag, TagCategory, SupportProgram, FileAttachment } from '@/types/support';
import { DraggableFileList } from './DraggableFileList';
import { AIEvidencePanel } from './AIEvidencePanel';
import { FieldEvidence, FieldIssue, MissingTag, AIDraftResponse } from '@/types/aiDraft';

interface AdminSupportFormProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  editingProgram?: SupportProgram | null;
  isLoading?: boolean;
}

export const AdminSupportForm = ({ onSubmit, onCancel, editingProgram, isLoading }: AdminSupportFormProps) => {
  const [formData, setFormData] = useState({
    institution_id: '',
    title: '',
    description: '',
    application_deadline: '',
    eligibility_criteria: '',
    contact_info: '',
  });
  
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [categories, setCategories] = useState<TagCategory[]>([]);
  
  // AI Draft Generator states
  const [sourceUrl, setSourceUrl] = useState('');
  const [adminHint, setAdminHint] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiEvidence, setAiEvidence] = useState<FieldEvidence[]>([]);
  const [aiIssues, setAiIssues] = useState<FieldIssue[]>([]);
  const [missingTags, setMissingTags] = useState<MissingTag[]>([]);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);

  useEffect(() => {
    fetchInstitutions();
    fetchTagsAndCategories();
  }, []);

  useEffect(() => {
    if (editingProgram) {
      setFormData({
        institution_id: editingProgram.institution_id?.toString() || '',
        title: editingProgram.title,
        description: editingProgram.description,
        application_deadline: editingProgram.application_deadline || '',
        eligibility_criteria: editingProgram.eligibility_criteria || '',
        contact_info: editingProgram.contact_info || '',
      });
      setSelectedTags(editingProgram.tags.map(tag => tag.id));
      setExistingFiles(editingProgram.files || []);
      setFiles([]); // Reset new files when editing
    }
  }, [editingProgram]);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching institutions:', error);
        toast.error('Failed to load institutions');
      } else {
        setInstitutions(data || []);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast.error('Failed to load institutions');
    }
  };

  const fetchTagsAndCategories = async () => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('tag_categories')
        .select('*')
        .order('id');

      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*, category:tag_categories(*)')
        .order('name');

      if (categoriesError || tagsError) {
        console.error('Error fetching tags/categories:', categoriesError || tagsError);
        toast.error('Failed to load tags');
      } else {
        setCategories(categoriesData || []);
        
        // Group tags by category
        const grouped = (tagsData || []).reduce((acc, tag) => {
          const categoryName = tag.category?.name || 'Other';
          if (!acc[categoryName]) acc[categoryName] = [];
          acc[categoryName].push(tag);
          return acc;
        }, {} as Record<string, Tag[]>);
        
        setTagsByCategory(grouped);
      }
    } catch (error) {
      console.error('Error fetching tags/categories:', error);
      toast.error('Failed to load tags');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSelectAllInCategory = (categoryName: string) => {
    const categoryTags = tagsByCategory[categoryName] || [];
    const categoryTagIds = categoryTags.map(tag => tag.id);
    setSelectedTags(prev => [...new Set([...prev, ...categoryTagIds])]);
  };

  const handleDeselectAllInCategory = (categoryName: string) => {
    const categoryTags = tagsByCategory[categoryName] || [];
    const categoryTagIds = categoryTags.map(tag => tag.id);
    setSelectedTags(prev => prev.filter(id => !categoryTagIds.includes(id)));
  };

  const handleAddNewTag = (categoryName: string) => {
    const tagName = prompt(`Enter new tag for ${categoryName}:`);
    if (tagName && tagName.trim()) {
      // Here you would implement the logic to add a new tag to the database
      toast.success(`New tag "${tagName}" will be added to ${categoryName}`);
      // TODO: Implement actual tag creation
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const reorderFiles = (startIndex: number, endIndex: number) => {
    setFiles(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const removeExistingFile = async (fileId: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('file_attachments')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      // Remove from local state
      setExistingFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success('File removed successfully');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file');
    }
  };

  const reorderExistingFiles = async (startIndex: number, endIndex: number) => {
    const reorderedFiles = Array.from(existingFiles);
    const [removed] = reorderedFiles.splice(startIndex, 1);
    reorderedFiles.splice(endIndex, 0, removed);

    // Update display_order for all files
    const updates = reorderedFiles.map((file, index) => ({
      id: file.id,
      display_order: index + 1
    }));

    try {
      // Update database with new order
      for (const update of updates) {
        const { error } = await supabase
          .from('file_attachments')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Update local state
      setExistingFiles(reorderedFiles.map((file, index) => ({
        ...file,
        display_order: index + 1
      })));

      toast.success('Files reordered successfully');
    } catch (error) {
      console.error('Error reordering files:', error);
      toast.error('Failed to reorder files');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.institution_id || !formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    const submitData = {
      ...formData,
      institution_id: parseInt(formData.institution_id),
      tags: selectedTags,
      files: files,
      id: editingProgram?.id, // Include ID for updates
      existingFiles: existingFiles, // Include existing files for reference
    };

    onSubmit(submitData);
  };

  const resetForm = () => {
    setFormData({
      institution_id: '',
      title: '',
      description: '',
      application_deadline: '',
      eligibility_criteria: '',
      contact_info: '',
    });
    setSelectedTags([]);
    setFiles([]);
    setExistingFiles([]);
    // Reset AI states
    setSourceUrl('');
    setAdminHint('');
    setAiEvidence([]);
    setAiIssues([]);
    setMissingTags([]);
    setShowEvidencePanel(false);
  };

  // AI Draft generation handler
  const handleAiGenerate = async () => {
    if (files.length === 0 && !sourceUrl.trim()) {
      toast.error('Lütfen bir PDF dosyası yükleyin veya kaynak URL girin');
      return;
    }

    setIsAiGenerating(true);
    
    try {
      // Upload files temporarily if any
      const uploadedFileRefs: Array<{ name: string; path: string }> = [];
      
      if (files.length > 0) {
        const tempId = crypto.randomUUID();
        
        for (const file of files) {
          const path = `temp/${tempId}/${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('program-files')
            .upload(path, file);
          
          if (uploadError) {
            console.error('File upload error:', uploadError);
            continue;
          }
          
          uploadedFileRefs.push({ name: file.name, path });
        }
      }

      // Call the AI draft edge function
      const { data, error } = await supabase.functions.invoke<AIDraftResponse>('ai-support-draft', {
        body: {
          uploaded_files: uploadedFileRefs,
          source_url: sourceUrl.trim() || null,
          hint: adminHint.trim() || null,
        },
      });

      if (error) {
        console.error('AI draft error:', error);
        toast.error('AI analizi başarısız: ' + (error.message || 'Bilinmeyen hata'));
        return;
      }

      if (!data) {
        toast.error('AI yanıtı alınamadı');
        return;
      }

      // Populate form fields
      setFormData({
        institution_id: data.filled_fields.institution_id?.toString() || '',
        title: data.filled_fields.title || '',
        description: data.filled_fields.description || '',
        application_deadline: data.filled_fields.application_deadline || '',
        eligibility_criteria: data.filled_fields.eligibility_criteria || '',
        contact_info: data.filled_fields.contact_info || '',
      });

      // Set selected tags
      setSelectedTags(data.selected_tag_ids || []);

      // Store evidence and issues
      setAiEvidence(data.evidence || []);
      setAiIssues(data.issues || []);
      setMissingTags(data.missing_tags || []);

      // Show evidence panel
      setShowEvidencePanel(true);

      const issueCount = (data.issues || []).length;
      const missingCount = (data.missing_tags || []).length;
      
      if (issueCount > 0 || missingCount > 0) {
        toast.warning(`AI analizi tamamlandı! ${issueCount} uyarı, ${missingCount} eşleştirilemeyen etiket var.`);
      } else {
        toast.success('AI analizi başarıyla tamamlandı! Lütfen bilgileri kontrol edin.');
      }
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('AI analizi sırasında hata oluştu');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Applicant Type': return '👥';
      case 'Support Type': return '💰';
      case 'Benefit Type': return '🎯';
      case 'Sector': return '🏭';
      case 'Province': return '📍';
      default: return '🏷️';
    }
  };

  const getCategoryColor = (categoryName: string) => {
    switch (categoryName) {
      case 'Applicant Type': return 'from-blue-50 to-blue-100 border-blue-200';
      case 'Support Type': return 'from-green-50 to-green-100 border-green-200';
      case 'Benefit Type': return 'from-purple-50 to-purple-100 border-purple-200';
      case 'Sector': return 'from-orange-50 to-orange-100 border-orange-200';
      case 'Province': return 'from-red-50 to-red-100 border-red-200';
      default: return 'from-gray-50 to-gray-100 border-gray-200';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-fit">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri Dön
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* AI Draft Generation Section - NEW */}
            {!editingProgram && (
              <div className="p-5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-800">AI ile Otomatik Doldur</h4>
                  {showEvidencePanel && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEvidencePanel(true)}
                      className="ml-auto text-purple-600 border-purple-300"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Kanıtları Göster
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="sourceUrl" className="text-sm text-gray-700">
                      Kaynak URL (opsiyonel)
                    </Label>
                    <Input
                      id="sourceUrl"
                      placeholder="https://ornek.com/destek-programi"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminHint" className="text-sm text-gray-700">
                      İpucu (opsiyonel)
                    </Label>
                    <Input
                      id="adminHint"
                      placeholder="Örn: TÜBİTAK hibe programı"
                      value={adminHint}
                      onChange={(e) => setAdminHint(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={(files.length === 0 && !sourceUrl.trim()) || isAiGenerating}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isAiGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI Analiz Ediyor...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI ile Oluştur
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 flex-1">
                    PDF dosyası yükleyin veya kaynak URL girin. AI formu otomatik dolduracak ve etiketleri seçecek.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="institution">Select Institution *</Label>
              <Select value={formData.institution_id} onValueChange={(value) => handleInputChange('institution_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kurum Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((institution) => (
                    <SelectItem key={institution.id} value={institution.id.toString()}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deadline">Application Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.application_deadline}
                onChange={(e) => handleInputChange('application_deadline', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="title">Support Program Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter support program name"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the support program"
                rows={4}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="eligibility">Eligibility Criteria</Label>
              <Textarea
                id="eligibility"
                value={formData.eligibility_criteria}
                onChange={(e) => handleInputChange('eligibility_criteria', e.target.value)}
                placeholder="Who is eligible for this program?"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="contact">Contact Information</Label>
              <Input
                id="contact"
                value={formData.contact_info}
                onChange={(e) => handleInputChange('contact_info', e.target.value)}
                placeholder="Contact details or institution info"
              />
            </div>
          </div>

          <Separator className="my-8" />

          {/* Tags by Category */}
          <div className="space-y-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Tag Categories</h3>
            {categories.map((category, index) => (
              <div key={category.id} className="space-y-4">
                <div className={`p-6 rounded-xl border-2 bg-gradient-to-r ${getCategoryColor(category.name)} shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getCategoryIcon(category.name)}</span>
                      <h4 className="text-lg font-semibold text-gray-800">{category.name}</h4>
                      <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full">
                        {(tagsByCategory[category.name] || []).filter(tag => selectedTags.includes(tag.id)).length} selected
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllInCategory(category.name)}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeselectAllInCategory(category.name)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Minus className="w-4 h-4 mr-1" />
                        Deselect All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddNewTag(category.name)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add New
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(tagsByCategory[category.name] || []).map((tag) => (
                      <div key={tag.id} className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={selectedTags.includes(tag.id)}
                          onCheckedChange={() => handleTagToggle(tag.id)}
                        />
                        <Label
                          htmlFor={`tag-${tag.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {tag.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                {index < categories.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </div>

          <Separator className="my-8" />

          <div>
            <Label>Related Files</Label>
            
            {/* Show existing files when editing */}
            {editingProgram && existingFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Current Files</h4>
                <DraggableFileList 
                  files={existingFiles.map(file => ({ 
                    name: file.filename, 
                    size: 0, 
                    id: file.id 
                  }))}
                  onRemove={(index) => removeExistingFile(existingFiles[index].id)}
                  onReorder={reorderExistingFiles}
                  isExistingFiles={true}
                />
              </div>
            )}

            {/* Upload new files */}
            <div className="mt-4">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button type="button" variant="outline" className="cursor-pointer" asChild>
                  <div>
                    <Upload className="w-4 h-4 mr-2" />
                    {editingProgram ? 'Add More Files' : 'Upload Files'}
                  </div>
                </Button>
              </label>
              {editingProgram && files.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  New files will replace all existing files when you save
                </p>
              )}
            </div>
            
            {/* Show new files to be uploaded */}
            {files.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {editingProgram ? 'New Files (will replace current files)' : 'New Files'}
                </h4>
                <DraggableFileList 
                  files={files}
                  onRemove={removeFile}
                  onReorder={reorderFiles}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={resetForm}>
              Reset Form
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (editingProgram ? 'Updating...' : 'Creating...') : (editingProgram ? 'Update Support Program' : 'Create Support Program')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    {/* AI Evidence Panel */}
    {showEvidencePanel && (
      <AIEvidencePanel
        evidence={aiEvidence}
        issues={aiIssues}
        missingTags={missingTags}
        onClose={() => setShowEvidencePanel(false)}
      />
    )}
  </>
  );
};

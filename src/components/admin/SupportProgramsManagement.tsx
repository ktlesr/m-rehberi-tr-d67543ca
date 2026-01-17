
import React, { useState, useEffect } from 'react';
import { AdminSupportForm } from './AdminSupportForm';
import { ProgramsList } from './ProgramsList';
import { AdminPageHeader } from './AdminPageHeader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SupportProgram } from '@/types/support';
import { uploadProgramFiles, deleteFileFromStorage } from '@/utils/fileUpload';
import { Target } from 'lucide-react';

type AdminView = 'list' | 'create' | 'edit' | 'clone';

interface SupportProgramsManagementProps {
  triggerCreate?: number;
}

export const SupportProgramsManagement = ({ triggerCreate }: SupportProgramsManagementProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<AdminView>('list');
  const [editingProgram, setEditingProgram] = useState<SupportProgram | null>(null);

  // Watch for triggerCreate changes to open create form
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      handleCreateNew();
    }
  }, [triggerCreate]);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    
    try {
      console.log('Submitting support program:', data);
      
      if (data.id) {
        // Update existing program
        const { error: programError } = await supabase
          .from('support_programs')
          .update({
            institution_id: data.institution_id,
            title: data.title,
            description: data.description,
            application_deadline: data.application_deadline || null,
            eligibility_criteria: data.eligibility_criteria || null,
            contact_info: data.contact_info || null,
          })
          .eq('id', data.id);

        if (programError) throw programError;

        // Delete existing tags
        const { error: deleteTagsError } = await supabase
          .from('support_program_tags')
          .delete()
          .eq('support_program_id', data.id);

        if (deleteTagsError) throw deleteTagsError;

        // Insert new tags
        if (data.tags && data.tags.length > 0) {
          const tagInserts = data.tags.map((tagId: number) => ({
            support_program_id: data.id,
            tag_id: tagId,
          }));

          const { error: tagsError } = await supabase
            .from('support_program_tags')
            .insert(tagInserts);

          if (tagsError) throw tagsError;
        }

        // Handle file uploads for updates - if new files are uploaded, replace all existing files
        if (data.files && data.files.length > 0) {
          try {
            // Get existing files to delete from storage
            const { data: existingFiles } = await supabase
              .from('file_attachments')
              .select('file_url')
              .eq('support_program_id', data.id);

            // Delete old files from storage
            if (existingFiles && existingFiles.length > 0) {
              for (const file of existingFiles) {
                await deleteFileFromStorage(file.file_url);
              }
            }

            // Delete old file records from database
            const { error: deleteFilesError } = await supabase
              .from('file_attachments')
              .delete()
              .eq('support_program_id', data.id);

            if (deleteFilesError) throw deleteFilesError;

            // Upload new files
            await uploadProgramFiles(data.files, data.id);
            console.log('Files updated successfully');
          } catch (fileError) {
            console.error('Error updating files:', fileError);
            toast.error('Program updated but some files failed to update');
          }
        }

        // Save/update summary data if available for existing programs
        if (data.summaryData) {
          try {
            const { error: summaryError } = await supabase
              .from('support_program_summaries')
              .upsert({
                support_program_id: data.id,
                who_can_apply: data.summaryData.who_can_apply,
                supported_areas: data.summaryData.supported_areas,
                application_period: data.summaryData.application_period,
                application_location: data.summaryData.application_location,
                application_url: data.summaryData.application_url,
              });

            if (summaryError) {
              console.error('Error saving summary:', summaryError);
            } else {
              console.log('Summary data updated successfully');
            }
          } catch (summaryError) {
            console.error('Error saving summary data:', summaryError);
          }
        }

        toast.success('Support program updated successfully!');
      } else {
        // Create new program
        const { data: programData, error: programError } = await supabase
          .from('support_programs')
          .insert({
            institution_id: data.institution_id,
            title: data.title,
            description: data.description,
            application_deadline: data.application_deadline || null,
            eligibility_criteria: data.eligibility_criteria || null,
            contact_info: data.contact_info || null,
          })
          .select()
          .single();

        if (programError) throw programError;

        // Insert tags
        if (data.tags && data.tags.length > 0) {
          const tagInserts = data.tags.map((tagId: number) => ({
            support_program_id: programData.id,
            tag_id: tagId,
          }));

          const { error: tagsError } = await supabase
            .from('support_program_tags')
            .insert(tagInserts);

          if (tagsError) throw tagsError;
        }

        // Handle file uploads for new programs
        if (data.files && data.files.length > 0) {
          try {
            await uploadProgramFiles(data.files, programData.id);
            console.log('Files uploaded successfully');
          } catch (fileError) {
            console.error('Error uploading files:', fileError);
            toast.error('Program created but some files failed to upload');
          }
        }

        // Save summary data if available
        if (data.summaryData) {
          try {
            const { error: summaryError } = await supabase
              .from('support_program_summaries')
              .upsert({
                support_program_id: programData.id,
                who_can_apply: data.summaryData.who_can_apply,
                supported_areas: data.summaryData.supported_areas,
                application_period: data.summaryData.application_period,
                application_location: data.summaryData.application_location,
                application_url: data.summaryData.application_url,
              });

            if (summaryError) {
              console.error('Error saving summary:', summaryError);
            } else {
              console.log('Summary data saved successfully');
            }
          } catch (summaryError) {
            console.error('Error saving summary data:', summaryError);
          }
        }

        toast.success('Support program created successfully!');
      }

      // Return to list view
      setCurrentView('list');
      setEditingProgram(null);
    } catch (error) {
      console.error('Error saving support program:', error);
      toast.error('Failed to save support program');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (program: SupportProgram) => {
    setEditingProgram(program);
    setCurrentView('edit');
  };

  const handleCreateNew = () => {
    setEditingProgram(null);
    setCurrentView('create');
  };

  const handleClone = (program: SupportProgram) => {
    // Create a clone of the program without the ID and files
    const clonedProgram = {
      ...program,
      id: undefined, // Remove ID so it creates a new program
      title: `Copy of ${program.title}`,
      files: [], // Don't clone files
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingProgram(clonedProgram);
    setCurrentView('clone');
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingProgram(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'list':
        return (
          <ProgramsList onEdit={handleEdit} onCreateNew={handleCreateNew} onClone={handleClone} />
        );
      case 'create':
      case 'edit':
      case 'clone':
        return (
          <AdminSupportForm 
            onSubmit={handleSubmit} 
            onCancel={handleCancel}
            editingProgram={editingProgram}
            isLoading={isLoading} 
          />
        );
      default:
        return (
          <ProgramsList onEdit={handleEdit} onCreateNew={handleCreateNew} onClone={handleClone} />
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderCurrentView()}
    </div>
  );
};

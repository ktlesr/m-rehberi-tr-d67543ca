import React from 'react';
import { pdf } from '@react-pdf/renderer';
import SupportSummaryPDF from '@/components/SupportSummaryPDF';
import { supabase } from '@/integrations/supabase/client';

interface SummaryDataInput {
  who_can_apply: string | null;
  supported_areas: string | null;
  application_period: string | null;
  application_location: string | null;
  application_url: string | null;
}

export async function generateAndUploadSummaryPDF(
  programId: string,
  programTitle: string,
  institutionName: string | null,
  institutionLogo: string | null,
  summaryData: SummaryDataInput
): Promise<string | null> {
  try {
    // 1. Generate PDF blob
    const pdfBlob = await pdf(
      <SupportSummaryPDF
        programTitle={programTitle}
        institutionName={institutionName || undefined}
        institutionLogo={institutionLogo || undefined}
        whoCanApply={summaryData.who_can_apply}
        supportedAreas={summaryData.supported_areas}
        applicationPeriod={summaryData.application_period}
        applicationLocation={summaryData.application_location}
        applicationUrl={summaryData.application_url}
        updatedAt={new Date().toISOString()}
        primaryColor="#dc2626"
      />
    ).toBlob();

    // 2. Create clean filename (remove Turkish chars and special chars)
    const cleanTitle = programTitle
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    
    const fileName = `ozet-${cleanTitle}.pdf`;
    const filePath = `summaries/${programId}/${fileName}`;

    // 3. Remove old file if exists
    await supabase.storage
      .from('program-files')
      .remove([filePath]);

    // 4. Upload new PDF
    const { error: uploadError } = await supabase.storage
      .from('program-files')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('program-files')
      .getPublicUrl(filePath);

    console.log('Summary PDF uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error generating/uploading summary PDF:', error);
    return null;
  }
}

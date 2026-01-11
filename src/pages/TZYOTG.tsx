import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, FileText, Upload, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MainNavbar from '@/components/MainNavbar';
import { useRecaptcha } from '@/hooks/useRecaptcha';

const formSchema = z.object({
  vergi_kimlik_no: z.string()
    .min(10, 'VKN en az 10 haneli olmalıdır')
    .max(11, 'VKN en fazla 11 haneli olmalıdır')
    .regex(/^\d+$/, 'VKN sadece rakam içermelidir'),
  firma_adi: z.string()
    .min(1, 'Firma adı zorunludur')
    .max(255, 'Firma adı en fazla 255 karakter olabilir'),
  iletisim_kisisi: z.string()
    .min(1, 'İletişim kişisi zorunludur')
    .max(255, 'İletişim kişisi en fazla 255 karakter olabilir'),
  unvan: z.string()
    .min(1, 'Unvan zorunludur')
    .max(255, 'Unvan en fazla 255 karakter olabilir'),
  telefon: z.string()
    .regex(/^[1-9][0-9]{2}\s[0-9]{3}\s[0-9]{2}\s[0-9]{2}$/, 'Telefon numarası format: 532 123 45 67'),
  e_posta: z.string()
    .email('Geçerli bir e-posta adresi giriniz'),
  talep_icerigi: z.string()
    .min(1, 'Talep içeriği zorunludur')
    .max(1000, 'Talep içeriği en fazla 1000 karakter olabilir'),
});

type FormData = z.infer<typeof formSchema>;

const TZYOTG = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { verifyRecaptcha, isReady: recaptchaReady } = useRecaptcha();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vergi_kimlik_no: '',
      firma_adi: '',
      iletisim_kisisi: '',
      unvan: '',
      telefon: '',
      e_posta: '',
      talep_icerigi: '',
    },
  });

  // Load saved form data on component mount
  React.useEffect(() => {
    const savedData = sessionStorage.getItem('tzy_form_data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        
        // Check if data is older than 30 minutes - auto-clear stale data
        const timestamp = parsedData.timestamp;
        if (timestamp && Date.now() - timestamp > 30 * 60 * 1000) {
          sessionStorage.removeItem('tzy_form_data');
          return;
        }
        
        // Set form values (only non-sensitive fields for persistence)
        Object.keys(parsedData).forEach(key => {
          if (key !== 'files' && key !== 'timestamp' && parsedData[key]) {
            form.setValue(key as keyof FormData, parsedData[key]);
          }
        });
      } catch (error) {
        console.error('Error loading saved form data:', error);
        sessionStorage.removeItem('tzy_form_data');
      }
    }
    
    // Clear sensitive data on window/tab close
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('tzy_form_data');
      sessionStorage.removeItem('tzy_submission_success');
      sessionStorage.removeItem('tzy_submission_error');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form]);

  const watchTalepIcerigi = form.watch('talep_icerigi');

  // Check for spam submissions
  const checkSpamSubmission = async (vkn: string) => {
    const { data, error } = await supabase.rpc('check_submission_spam', {
      p_identifier: vkn,
      p_submission_type: 'pre_request',
      p_cooldown_minutes: 60
    });

    if (error) {
      console.error('Spam check error:', error);
      return false;
    }

    return data;
  };

  // Record submission for spam tracking
  const recordSubmission = async (vkn: string) => {
    await supabase.rpc('record_submission', {
      p_identifier: vkn,
      p_submission_type: 'pre_request'
    });
  };

  // Fetch existing company data by VKN
  const fetchCompanyData = async () => {
    const vkn = form.getValues('vergi_kimlik_no');
    if (!vkn || vkn.length < 10) {
      toast({
        title: "Uyarı",
        description: "Lütfen geçerli bir VKN giriniz",
        variant: "destructive"
      });
      return;
    }

    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('pre_requests')
        .select('*')
        .eq('vergi_kimlik_no', vkn)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        form.setValue('firma_adi', data.firma_adi);
        form.setValue('iletisim_kisisi', data.iletisim_kisisi);
        form.setValue('unvan', data.unvan);
        form.setValue('telefon', data.telefon);
        form.setValue('e_posta', data.e_posta);
        
        toast({
          title: "Başarılı",
          description: "Önceki bilgileriniz getirildi",
        });
      } else {
        toast({
          title: "Bilgi",
          description: "Bu VKN için kayıtlı bilgi bulunamadı",
        });
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      toast({
        title: "Hata",
        description: "Bilgiler getirilirken bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (totalSize > maxSize) {
      toast({
        title: "Hata",
        description: "Toplam dosya boyutu 50MB'ı geçemez",
        variant: "destructive"
      });
      return;
    }

    setFiles(selectedFiles);
  };

  // Upload files to Supabase Storage
  const uploadFiles = async (): Promise<string | null> => {
    if (files.length === 0) return null;

    setIsUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `pre-requests/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('program-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        return filePath;
      });

      const uploadedPaths = await Promise.all(uploadPromises);
      return uploadedPaths.join(',');
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Hata",
        description: "Dosya yükleme sırasında bir hata oluştu",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Save form data to sessionStorage (only non-sensitive fields for draft persistence)
  // Note: Email and phone are included for form UX but cleared on successful submission
  const saveFormData = (data: FormData) => {
    sessionStorage.setItem('tzy_form_data', JSON.stringify({
      vergi_kimlik_no: data.vergi_kimlik_no,
      firma_adi: data.firma_adi,
      iletisim_kisisi: data.iletisim_kisisi,
      unvan: data.unvan,
      telefon: data.telefon,
      e_posta: data.e_posta,
      talep_icerigi: data.talep_icerigi,
      files: files.map(f => ({ name: f.name, size: f.size })),
      timestamp: Date.now() // Add timestamp for auto-expiry
    }));
  };
  
  // Clear all sensitive session data
  const clearSessionData = () => {
    sessionStorage.removeItem('tzy_form_data');
    sessionStorage.removeItem('tzy_submission_success');
    sessionStorage.removeItem('tzy_submission_error');
  };

  // Form submission
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Save form data before submission
      saveFormData(data);

      // Verify reCAPTCHA first
      if (recaptchaReady) {
        const recaptchaResult = await verifyRecaptcha('pre_request');
        if (!recaptchaResult.success) {
          toast({
            title: "Hata",
            description: "Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Check for spam
      const isSpam = await checkSpamSubmission(data.vergi_kimlik_no);
      if (isSpam) {
        toast({
          title: "Uyarı",
          description: "Bu VKN ile 1 saat içinde başvuru yapılmış. Lütfen daha sonra tekrar deneyiniz.",
          variant: "destructive"
        });
        return;
      }

      // Upload files
      const documentsUrl = await uploadFiles();

      // Generate random 6-digit code for on_request_id
      const onRequestId = Math.floor(100000 + Math.random() * 900000).toString();

      // Submit form data
      const { data: insertData, error } = await supabase
        .from('pre_requests')
        .insert({
          vergi_kimlik_no: data.vergi_kimlik_no,
          on_request_id: onRequestId,
          firma_adi: data.firma_adi,
          iletisim_kisisi: data.iletisim_kisisi,
          unvan: data.unvan,
          telefon: data.telefon,
          e_posta: data.e_posta,
          talep_icerigi: data.talep_icerigi,
          documents_url: documentsUrl,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Record submission for spam tracking
      await recordSubmission(data.vergi_kimlik_no);

      // Send email notification
      try {
        const emailResponse = await supabase.functions.invoke('send-pre-request-email', {
          body: {
            to: data.e_posta,
            companyName: data.firma_adi,
            contactPerson: data.iletisim_kisisi,
            requestId: insertData.id,
            taxId: data.vergi_kimlik_no
          }
        });

        if (emailResponse.error) {
          console.error('Email sending failed:', emailResponse.error);
          // Don't fail the whole process if email fails
        }
      } catch (emailError) {
        console.error('Email function error:', emailError);
        // Don't fail the whole process if email fails
      }

      // Clear sensitive form data immediately after successful submission
      clearSessionData();
      
      // Store only non-sensitive success info briefly for success page
      sessionStorage.setItem('tzy_submission_success', JSON.stringify({
        requestId: insertData.id,
        timestamp: new Date().toISOString()
      }));

      // Navigate to success page
      navigate('/tzy/otg/basarili');
      
    } catch (error) {
      console.error('Submission error:', error);
      
      // Save error details to session storage
      sessionStorage.setItem('tzy_submission_error', JSON.stringify({
        message: error.message || 'Bilinmeyen bir hata oluştu',
        timestamp: new Date().toISOString()
      }));

      // Navigate to error page
      navigate('/tzy/otg/basarisiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link to="/tzy" className="inline-flex items-center text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri Dön
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Tedarik Zinciri Yerlileştirme
            </h1>
          </div>
          <p className="text-base sm:text-lg text-gray-600">
            Ön Talep Girişi - Tedarikçi bulmak için talebinizi oluşturun
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Firma Bilgileri ve Talep Detayları</span>
            </CardTitle>
            <CardDescription>
              Lütfen tüm alanları eksiksiz doldurunuz. Kırmızı (*) işareti olan alanlar zorunludur.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                
                {/* VKN Field with Fetch Button */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="vergi_kimlik_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vergi Kimlik Numarası *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="1234567890"
                              maxLength={11}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={fetchCompanyData}
                      disabled={isFetching}
                      className="w-full h-10"
                    >
                      {isFetching ? 'Getiriliyor...' : 'Önceki Bilgilerimi Getir'}
                    </Button>
                  </div>
                </div>

                {/* Company Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="firma_adi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firma Adı *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ABC Şirketi Ltd. Şti." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="iletisim_kisisi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İletişim Kişisi *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ahmet Yılmaz" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unvan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unvan *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Genel Müdür" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="532 123 45 67"
                            maxLength={13}
                          />
                        </FormControl>
                        <FormDescription>
                          Format: 532 123 45 67 (boşluklarla birlikte)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="e_posta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Posta *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="ornek@sirket.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Request Content */}
                <FormField
                  control={form.control}
                  name="talep_icerigi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Talep İçeriği *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Hangi ürün/hizmet için tedarikçi arıyorsunuz? Detayları açıklayınız..."
                          className="min-h-[120px]"
                          maxLength={1000}
                        />
                      </FormControl>
                      <FormDescription>
                        {watchTalepIcerigi?.length || 0}/1000 karakter
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destekleyici Dosyalar
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpeg,.jpg,.png,.docx,.xls,.xlsx,.zip,.rar"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary hover:text-primary/80">
                        Dosya seçmek için tıklayın
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        PDF, JPEG, PNG, DOCX, XLS, ZIP dosyaları kabul edilir (Maks. 50MB)
                      </p>
                    </label>
                  </div>
                  
                  {files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Seçilen Dosyalar:
                      </h4>
                      <ul className="space-y-1">
                        {files.map((file, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6 border-t">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || isUploading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TZYOTG;
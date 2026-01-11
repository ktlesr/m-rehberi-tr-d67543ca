import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, FileText, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import MainNavbar from '@/components/MainNavbar';
import { useRecaptcha } from '@/hooks/useRecaptcha';

// Turkish provinces
const PROVINCES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
  'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
  'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elâzığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Isparta',
  'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
  'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
  'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
  'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
  'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
  'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
].sort();

const formSchema = z.object({
  vergi_kimlik_no: z.string()
    .min(10, 'Vergi kimlik numarası en az 10 haneli olmalıdır')
    .max(11, 'Vergi kimlik numarası en fazla 11 haneli olmalıdır')
    .regex(/^\d+$/, 'Sadece rakam girmelisiniz'),
  firma_adi: z.string().min(1, 'Firma adı zorunludur').max(255, 'Firma adı 255 karakterden uzun olamaz'),
  iletisim_kisisi: z.string().min(1, 'İletişim kişisi zorunludur').max(255, 'İletişim kişisi 255 karakterden uzun olamaz'),
  unvan: z.string().min(1, 'Unvan zorunludur').max(255, 'Unvan 255 karakterden uzun olamaz'),
  firma_olcegi: z.enum(['Mikro', 'Küçük', 'Orta', 'Büyük'], { required_error: 'Firma ölçeği seçmelisiniz' }),
  telefon: z.string()
    .length(10, 'Telefon numarası 10 haneli olmalıdır')
    .regex(/^\d+$/, 'Sadece rakam girmelisiniz')
    .refine(val => !val.startsWith('0'), 'Telefon numarası 0 ile başlamamalıdır'),
  e_posta: z.string().email('Geçerli bir e-posta adresi girmelisiniz'),
  firma_websitesi: z.string().optional(),
  il: z.string().min(1, 'İl seçmelisiniz'),
  minimum_yerlilik_orani: z.string()
    .optional()
    .refine(val => !val || (parseInt(val) >= 0 && parseInt(val) <= 100), 'Yerlilik oranı 0-100 arası olmalıdır'),
  tedarikci_deneyim_suresi: z.string()
    .optional()
    .refine(val => !val || (parseInt(val) >= 0 && parseInt(val) <= 100), 'Deneyim süresi 0-100 arası olmalıdır'),
  notlar: z.string().max(1000, 'Notlar 1000 karakterden uzun olamaz').optional(),
});

type FormData = z.infer<typeof formSchema>;

const TZYSupplierApplication = () => {
  const { on_request_id, product_id } = useParams<{ on_request_id: string; product_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canLoadPrevious, setCanLoadPrevious] = useState(false);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [lastSubmissionCheck, setLastSubmissionCheck] = useState<Date | null>(null);
  const { verifyRecaptcha, isReady: recaptchaReady } = useRecaptcha();

  // Storage key for form persistence
  const storageKey = `tzy_supplier_form_${on_request_id}_${product_id}`;

  // Save form data to localStorage (excluding most sensitive fields)
  // Only store non-sensitive business info for draft persistence
  const saveFormData = () => {
    if (!on_request_id || !product_id) return;
    
    const formData = form.getValues();
    const fileData = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));
    
    // Only save non-sensitive business fields for form persistence
    const dataToSave = {
      formData: {
        vergi_kimlik_no: formData.vergi_kimlik_no,
        firma_adi: formData.firma_adi,
        iletisim_kisisi: formData.iletisim_kisisi,
        unvan: formData.unvan,
        firma_olcegi: formData.firma_olcegi,
        telefon: formData.telefon,
        e_posta: formData.e_posta,
        firma_websitesi: formData.firma_websitesi,
        il: formData.il,
        minimum_yerlilik_orani: formData.minimum_yerlilik_orani,
        tedarikci_deneyim_suresi: formData.tedarikci_deneyim_suresi,
        notlar: formData.notlar,
      },
      files: fileData,
      timestamp: Date.now()
    };
    
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  };

  // Restore form data from localStorage
  const restoreFormData = () => {
    if (!on_request_id || !product_id) return;
    
    try {
      const savedData = localStorage.getItem(storageKey);
      if (!savedData) return;
      
      const { formData, files: savedFiles, timestamp } = JSON.parse(savedData);
      
      // Don't restore data older than 30 minutes (changed from 24 hours for security)
      if (Date.now() - timestamp > 30 * 60 * 1000) {
        localStorage.removeItem(storageKey);
        return;
      }
      
      // Restore form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          form.setValue(key as keyof FormData, formData[key]);
        }
      });
      
      // Show info about restored files (can't restore actual File objects)
      if (savedFiles && savedFiles.length > 0) {
        toast({
          title: 'Form Verileri Geri Yüklendi',
          description: `${savedFiles.length} dosya seçimi kaydedilmişti. Lütfen dosyaları tekrar seçiniz.`,
        });
      } else {
        toast({
          title: 'Form Verileri Geri Yüklendi',
          description: 'Önceki form verileriniz geri yüklendi.',
        });
      }
    } catch (error) {
      console.error('Error restoring form data:', error);
      localStorage.removeItem(storageKey);
    }
  };

  // Clear saved form data
  const clearSavedData = () => {
    if (!on_request_id || !product_id) return;
    localStorage.removeItem(storageKey);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vergi_kimlik_no: '',
      firma_adi: '',
      iletisim_kisisi: '',
      unvan: '',
      telefon: '',
      e_posta: '',
      firma_websitesi: '',
      il: '',
      minimum_yerlilik_orani: '',
      tedarikci_deneyim_suresi: '',
      notlar: '',
    },
  });

  // Fetch product information and restore form data
  useEffect(() => {
    const fetchProductInfo = async () => {
      if (!product_id) return;
      
      const { data, error } = await supabase
        .from('products')
        .select('*, pre_requests!inner(*)')
        .eq('id', product_id)
        .single();
        
      if (error) {
        console.error('Error fetching product:', error);
        toast({
          title: 'Hata',
          description: 'Ürün bilgileri alınırken hata oluştu',
          variant: 'destructive',
        });
        return;
      }
      
      setProductInfo(data);
      
      // Restore form data after product info is loaded
      setTimeout(() => {
        restoreFormData();
      }, 100);
    };

    fetchProductInfo();
    
    // Clear sensitive data on window/tab close
    const handleBeforeUnload = () => {
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [product_id, toast]);

  // Save form data on every change
  useEffect(() => {
    const subscription = form.watch(() => {
      saveFormData();
    });
    return () => subscription.unsubscribe();
  }, [form.watch, files]);

  // Save files when they change
  useEffect(() => {
    saveFormData();
  }, [files]);

  // Check for existing company data when tax ID changes
  const checkExistingCompany = async (taxId: string) => {
    if (taxId.length < 10) {
      setCanLoadPrevious(false);
      return;
    }

    const { data, error } = await supabase
      .from('supplier_applications')
      .select('*')
      .eq('vergi_kimlik_no', taxId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking existing company:', error);
      return;
    }

    setCanLoadPrevious(data && data.length > 0);
  };

  const loadPreviousInfo = async () => {
    const taxId = form.getValues('vergi_kimlik_no');
    
    const { data, error } = await supabase
      .from('supplier_applications')
      .select('*')
      .eq('vergi_kimlik_no', taxId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error loading previous info:', error);
      toast({
        title: 'Hata',
        description: 'Önceki bilgiler yüklenirken hata oluştu',
        variant: 'destructive',
      });
      return;
    }

    if (data && data.length > 0) {
      const prevData = data[0];
      form.setValue('firma_adi', prevData.firma_adi);
      form.setValue('iletisim_kisisi', prevData.iletisim_kisisi);
      form.setValue('unvan', prevData.unvan);
      form.setValue('firma_olcegi', prevData.firma_olcegi as any);
      form.setValue('telefon', prevData.telefon);
      form.setValue('e_posta', prevData.e_posta);
      // Note: firma_websitesi might not exist in old records, that's okay
      form.setValue('il', prevData.il);
      
      toast({
        title: 'Başarılı',
        description: 'Önceki bilgiler yüklendi',
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const allowedTypes = ['pdf', 'jpeg', 'jpg', 'png', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'ai', 'psd', 'crd', 'txt', 'csv'];
    
    const validFiles = selectedFiles.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return allowedTypes.includes(extension || '');
    });

    const totalSize = [...files, ...validFiles].reduce((sum, file) => sum + file.size, 0);
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (totalSize > maxSize) {
      toast({
        title: 'Dosya Boyutu Hatası',
        description: 'Toplam dosya boyutu 50MB\'ı geçemez',
        variant: 'destructive',
      });
      return;
    }

    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: 'Dosya Formatı Hatası',
        description: 'Desteklenmeyen dosya formatı var',
        variant: 'destructive',
      });
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const checkSubmissionSpam = async () => {
    const identifier = window.navigator.userAgent + window.location.hostname;
    
    const { data: isSpam, error } = await supabase.rpc('check_submission_spam', {
      p_identifier: identifier,
      p_submission_type: 'supplier_application',
      p_cooldown_minutes: 1
    });

    if (error) {
      console.error('Error checking spam:', error);
      return false;
    }

    return isSpam;
  };

  const recordSubmission = async () => {
    const identifier = window.navigator.userAgent + window.location.hostname;
    
    await supabase.rpc('record_submission', {
      p_identifier: identifier,
      p_submission_type: 'supplier_application'
    });
  };

  const uploadFiles = async (): Promise<string | null> => {
    if (files.length === 0) return null;

    try {
      // Upload files to Supabase Storage
      const uploadedFiles = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `supplier-docs/${on_request_id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('program-files')
          .upload(fileName, file);

        if (uploadError) {
          throw uploadError;
        }

        uploadedFiles.push(fileName);
      }

      // Return the file paths as a JSON string
      return JSON.stringify(uploadedFiles);
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Verify reCAPTCHA first
      if (recaptchaReady) {
        const recaptchaResult = await verifyRecaptcha('supplier_application');
        if (!recaptchaResult.success) {
          toast({
            title: 'Hata',
            description: 'Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Check spam protection
      const isSpam = await checkSubmissionSpam();
      if (isSpam) {
        toast({
          title: 'Çok Hızlı Başvuru',
          description: 'Lütfen bir dakika bekleyip tekrar deneyin',
          variant: 'destructive',
        });
        return;
      }

      // Upload files
      const filesUrl = await uploadFiles();

      // Submit application
      // Format phone number to match database constraint: XXX XXX XX XX
      const formattedPhone = data.telefon.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4');
      
      const { error } = await supabase
        .from('supplier_applications')
        .insert({
          on_request_id: on_request_id!,
          product_id: product_id!,
          vergi_kimlik_no: data.vergi_kimlik_no,
          firma_adi: data.firma_adi,
          iletisim_kisisi: data.iletisim_kisisi,
          unvan: data.unvan,
          firma_olcegi: data.firma_olcegi,
          telefon: formattedPhone,
          e_posta: data.e_posta,
          firma_websitesi: data.firma_websitesi || null,
          il: data.il,
          minimum_yerlilik_orani: data.minimum_yerlilik_orani ? parseInt(data.minimum_yerlilik_orani) : null,
          tedarikci_deneyim_suresi: data.tedarikci_deneyim_suresi ? parseInt(data.tedarikci_deneyim_suresi) : null,
          notlar: data.notlar || null,
          dosyalar_url: filesUrl,
        });

      if (error) {
        throw error;
      }

      // Record submission for spam protection
      await recordSubmission();

      // Clear saved form data on successful submission
      clearSavedData();

      toast({
        title: 'Başarılı',
        description: 'Başvurunuz başarıyla gönderildi',
      });

      // Redirect to success page with context
      navigate('/tzy/supplier-application/success', { 
        state: { on_request_id, product_id } 
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Hata',
        description: 'Başvuru gönderilirken hata oluştu',
        variant: 'destructive',
      });
      // Redirect to error page with context
      navigate('/tzy/supplier-application/error', { 
        state: { on_request_id, product_id, error: error.message } 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    form.reset();
    setFiles([]);
    setCanLoadPrevious(false);
    clearSavedData();
  };

  if (!productInfo) {
    return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-center items-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Tedarikçi Başvuru Formu
            </CardTitle>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">Ürün Bilgileri</h3>
              <p><strong>Ürün Grubu:</strong> {productInfo.urun_grubu_adi}</p>
              <p><strong>Açıklama:</strong> {productInfo.urun_aciklamasi}</p>
              <p><strong>Firma:</strong> {productInfo.pre_requests.firma_adi}</p>
              <p><strong>Son Başvuru Tarihi:</strong> {new Date(productInfo.basvuru_son_tarihi).toLocaleDateString('tr-TR')}</p>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tax ID */}
                  <FormField
                    control={form.control}
                    name="vergi_kimlik_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vergi Kimlik Numarası *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="10 veya 11 haneli"
                            onChange={(e) => {
                              field.onChange(e);
                              checkExistingCompany(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Load Previous Info Button */}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadPreviousInfo}
                      disabled={!canLoadPrevious}
                      className="w-full"
                    >
                      Önceki Bilgilerimi Yükle
                    </Button>
                  </div>

                  {/* Company Name */}
                  <FormField
                    control={form.control}
                    name="firma_adi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firma Adı *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Contact Person */}
                  <FormField
                    control={form.control}
                    name="iletisim_kisisi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İletişim Kişisi *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="unvan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unvan *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Company Scale */}
                  <FormField
                    control={form.control}
                    name="firma_olcegi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firma Ölçeği *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Mikro">Mikro</SelectItem>
                            <SelectItem value="Küçük">Küçük</SelectItem>
                            <SelectItem value="Orta">Orta</SelectItem>
                            <SelectItem value="Büyük">Büyük</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="telefon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefon *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="5XX XXX XX XX (0 olmadan)"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="e_posta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-posta *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Website */}
                  <FormField
                    control={form.control}
                    name="firma_websitesi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Firma Websitesi</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Province */}
                  <FormField
                    control={form.control}
                    name="il"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İl *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="İl seçiniz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {PROVINCES.map((province) => (
                              <SelectItem key={province} value={province}>
                                {province}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Localization Rate */}
                  <FormField
                    control={form.control}
                    name="minimum_yerlilik_orani"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Sertifikalı Yerlilik Oranı (%)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" max="100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Experience */}
                  <FormField
                    control={form.control}
                    name="tedarikci_deneyim_suresi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bu Üründe Deneyim Süresi (Yıl)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" max="100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notlar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notlar / Ek Bilgiler</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Ek bilgiler..."
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <div className="text-sm text-gray-500 text-right">
                        {field.value?.length || 0}/1000
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Destekleyici Dosyalar
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.jpeg,.jpg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.ai,.psd,.crd,.txt,.csv"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Dosya yüklemek için tıklayın
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        Toplam boyut: 50MB, Formatlar: PDF, JPG, PNG, DOC, XLS, PPT vb.
                      </span>
                    </label>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Seçilen Dosyalar:</h4>
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'BAŞVUR'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearForm}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Formu Temizle
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

export default TZYSupplierApplication;
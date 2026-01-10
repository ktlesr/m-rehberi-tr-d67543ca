import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton'; // For better loading state
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2 } from 'lucide-react'; // Added Loader2 for saving icon
import { adminSettingsService } from '@/services/adminSettingsService';
import { IncentiveCalculationSettings } from '@/types/adminSettings';

// --- Reusable Components for this Page ---

/**
 * @description A reusable card component for a distinct settings section.
 * @param {string} title - The title of the settings card.
 * @param {string} [description] - An optional description for the card.
 * @param {React.ReactNode} children - The content (form fields) of the card.
 * @param {React.ReactNode} [footer] - The footer content, typically a save button.
 */
const SettingsCard = ({ title, description, children, footer }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <Card className="flex flex-col h-full">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="flex-grow">
      {children}
    </CardContent>
    {footer && (
      <CardFooter className="flex justify-end">
        {footer}
      </CardFooter>
    )}
  </Card>
);

/**
 * @description A styled input group for numeric values with a unit.
 * Handles Turkish number formatting (e.g., 4.355,92) properly.
 */
const NumericInputGroup = ({ id, label, value, onChange, unit }: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: 'TL' | '%';
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Format number for display (Turkish locale: 4.355,92)
  const formatForDisplay = (num: number) => {
    return num.toLocaleString('tr-TR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Parse Turkish formatted string to number
  const parseFromTurkish = (str: string): number => {
    // Remove thousand separators (dots), replace decimal comma with dot
    const cleaned = str
      .replace(/\./g, '')     // Remove all dots (thousand separators)
      .replace(',', '.');      // Replace comma with dot (decimal)
    return parseFloat(cleaned) || 0;
  };

  const handleFocus = () => {
    setIsEditing(true);
    // Show raw number with comma as decimal separator for easy editing
    setEditValue(value.toString().replace('.', ','));
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Parse the edited value and send to parent
    const numericValue = parseFromTurkish(editValue);
    onChange(numericValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and comma while editing
    const rawValue = e.target.value.replace(/[^0-9,]/g, '');
    setEditValue(rawValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          value={isEditing ? editValue : formatForDisplay(value)}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pr-12 text-right"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-muted-foreground text-sm">{unit}</span>
        </div>
      </div>
    </div>
  );
};


// --- Main Page Component ---

const AdminIncentiveSettings = () => {
  const [settings, setSettings] = useState<IncentiveCalculationSettings>({
    sgk_employer_premium_rate_manufacturing: 0,
    sgk_employer_premium_rate_other: 0,
    sgk_employee_premium_rate_manufacturing: 0,
    sgk_employee_premium_rate_other: 0,
    vat_rate: 0,
    customs_duty_rate: 0,
    sub_region_support_enabled: 0,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState({
    employer: false,
    employee: false,
    taxes: false,
    subRegion: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const data = await adminSettingsService.getIncentiveCalculationSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Hata",
          description: "Ayarlar yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [toast]); // Added toast as a dependency

  const handleInputChange = (key: keyof IncentiveCalculationSettings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (
    type: 'employer' | 'employee' | 'taxes', 
    saveFunction: () => Promise<any>,
    successMessage: string,
    errorMessage: string
    ) => {
    setIsSaving(prev => ({ ...prev, [type]: true }));
    try {
      await saveFunction();
      toast({
        title: "Başarılı",
        description: successMessage,
      });
    } catch (error) {
      console.error(`Error saving ${type} rates:`, error);
      toast({
        title: "Hata",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSubRegionToggle = async (checked: boolean) => {
    const newValue = checked ? 1 : 0;
    // Optimistically update UI
    setSettings(prev => ({ ...prev, sub_region_support_enabled: newValue }));
    
    setIsSaving(prev => ({ ...prev, subRegion: true }));
    try {
      await adminSettingsService.updateSubRegionSupport(newValue);
      toast({
        title: "Başarılı",
        description: `Alt Bölge Desteği ${checked ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`,
      });
    } catch (error) {
      console.error('Error saving sub-region support:', error);
      // Revert UI on failure
      setSettings(prev => ({ ...prev, sub_region_support_enabled: checked ? 0 : 1 }));
      toast({
        title: "Hata",
        description: "Alt Bölge Desteği ayarı kaydedilirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(prev => ({ ...prev, subRegion: false }));
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <AdminPageHeader
          title="Teşvik Hesaplama Ayarları"
          description="SGK prim oranları ve diğer hesaplama parametrelerini yönetin"
          icon={Settings}
        />
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Render 4 skeleton cards to match the layout */}
            {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-full mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                           <Skeleton className="h-4 w-1/4" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                         <div className="space-y-2">
                           <Skeleton className="h-4 w-1/4" />
                           <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Teşvik Hesaplama Ayarları"
        description="SGK prim oranları ve diğer hesaplama parametrelerini yönetin"
        icon={Settings}
      />
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          <SettingsCard
            title="SGK İşveren Sigorta Primi"
            description="İmalat ve diğer sektörler için işveren prim tutarları."
            footer={
              <Button
                onClick={() => handleSave(
                    'employer',
                    () => adminSettingsService.updateEmployerPremiumRates(
                        settings.sgk_employer_premium_rate_manufacturing,
                        settings.sgk_employer_premium_rate_other
                    ),
                    "SGK İşveren Sigorta Primi oranları güncellendi.",
                    "İşveren prim oranları kaydedilirken bir hata oluştu."
                )}
                disabled={isSaving.employer}
              >
                {isSaving.employer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving.employer ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumericInputGroup 
                    id="employer_manufacturing"
                    label="İmalat (TL)"
                    unit="TL"
                    value={settings.sgk_employer_premium_rate_manufacturing}
                    onChange={(val) => handleInputChange('sgk_employer_premium_rate_manufacturing', val)}
                />
                <NumericInputGroup 
                    id="employer_other"
                    label="Diğer (TL)"
                    unit="TL"
                    value={settings.sgk_employer_premium_rate_other}
                    onChange={(val) => handleInputChange('sgk_employer_premium_rate_other', val)}
                />
            </div>
          </SettingsCard>
          
          <SettingsCard
            title="SGK Çalışan Sigorta Primi"
            description="İmalat ve diğer sektörler için çalışan prim tutarları."
             footer={
              <Button
                onClick={() => handleSave(
                    'employee',
                    () => adminSettingsService.updateEmployeePremiumRates(
                        settings.sgk_employee_premium_rate_manufacturing,
                        settings.sgk_employee_premium_rate_other
                    ),
                    "SGK Çalışan Sigorta Primi oranları güncellendi.",
                    "Çalışan prim oranları kaydedilirken bir hata oluştu."
                )}
                disabled={isSaving.employee}
              >
                {isSaving.employee && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving.employee ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            }
          >
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumericInputGroup 
                    id="employee_manufacturing"
                    label="İmalat (TL)"
                    unit="TL"
                    value={settings.sgk_employee_premium_rate_manufacturing}
                    onChange={(val) => handleInputChange('sgk_employee_premium_rate_manufacturing', val)}
                />
                <NumericInputGroup 
                    id="employee_other"
                    label="Diğer (TL)"
                    unit="TL"
                    value={settings.sgk_employee_premium_rate_other}
                    onChange={(val) => handleInputChange('sgk_employee_premium_rate_other', val)}
                />
            </div>
          </SettingsCard>
          
          <SettingsCard
            title="Vergi Oranları"
            description="Genel KDV ve Gümrük Vergisi oranları."
             footer={
              <Button
                onClick={() => handleSave(
                    'taxes',
                    () => adminSettingsService.updateTaxRates(
                        settings.vat_rate,
                        settings.customs_duty_rate
                    ),
                    "KDV ve Gümrük Vergisi oranları güncellendi.",
                    "Vergi oranları kaydedilirken bir hata oluştu."
                )}
                disabled={isSaving.taxes}
              >
                {isSaving.taxes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving.taxes ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumericInputGroup 
                    id="vat_rate"
                    label="KDV Oranı (%)"
                    unit="%"
                    value={settings.vat_rate}
                    onChange={(val) => handleInputChange('vat_rate', val)}
                />
                <NumericInputGroup 
                    id="customs_duty_rate"
                    label="Gümrük Vergisi (%)"
                    unit="%"
                    value={settings.customs_duty_rate}
                    onChange={(val) => handleInputChange('customs_duty_rate', val)}
                />
            </div>
          </SettingsCard>

          <SettingsCard
            title="Genel Ayarlar"
            description="Uygulama genelindeki hesaplama mantığını etkileyen ayarlar."
          >
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5 pr-4">
                    <Label htmlFor="sub_region_support" className="text-base">Alt Bölge Desteği</Label>
                    <p className="text-sm text-muted-foreground">
                        Etkinleştirildiğinde, hesaplamalarda ilçe ve OSB durumu dikkate alınır.
                    </p>
                </div>
                <Switch
                    id="sub_region_support"
                    checked={settings.sub_region_support_enabled === 1}
                    onCheckedChange={handleSubRegionToggle}
                    disabled={isSaving.subRegion}
                />
            </div>
          </SettingsCard>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminIncentiveSettings;
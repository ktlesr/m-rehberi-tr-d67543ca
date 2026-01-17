import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  investmentThresholdsService, 
  InvestmentThreshold 
} from '@/services/investmentThresholdsService';
import { 
  Calculator, 
  Check, 
  Plus, 
  Star, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Settings2
} from 'lucide-react';

// Threshold field configuration
const THRESHOLD_FIELDS = [
  // Asgari Yatırım Tutarları
  { key: 'min_investment_region_1_2', label: '1-2. Bölge Asgari Yatırım', category: 'regional' },
  { key: 'min_investment_region_3_6', label: '3-6. Bölge Asgari Yatırım', category: 'regional' },
  { key: 'min_high_tech_priority', label: 'Yüksek Teknoloji Öncelikli', category: 'priority' },
  { key: 'min_mid_high_tech_priority', label: 'Orta-Yüksek Teknoloji Öncelikli', category: 'priority' },
  { key: 'min_strategic_high_tech', label: 'Stratejik Hamle - Yüksek Teknoloji', category: 'strategic' },
  { key: 'min_strategic_other', label: 'Stratejik Hamle - Diğer', category: 'strategic' },
  { key: 'min_strategic_green_digital', label: 'Yeşil/Dijital Dönüşüm', category: 'strategic' },
  { key: 'min_priority_high_tech', label: 'Öncelikli Sistemler - Yüksek Tek.', category: 'special' },
  { key: 'min_priority_mid_high_tech', label: 'Öncelikli Sistemler - Orta-Yüksek', category: 'special' },
  { key: 'min_priority_cloud', label: 'Bulut Hizmeti', category: 'special' },
  { key: 'min_financial_leasing', label: 'Finansal Kiralama', category: 'other' },
  { key: 'min_machinery_support', label: 'Makine Desteği Birim', category: 'other' },
  { key: 'completion_expert_fee', label: 'Tamamlama Ekspertiz Ücreti', category: 'other' },
  // Faiz/Kâr Payı Desteği Üst Limitleri
  { key: 'max_interest_support_tech_local', label: 'Teknoloji Hamlesi / Yerel Kalkınma', category: 'interest_limits' },
  { key: 'max_interest_support_strategic', label: 'Stratejik Hamle', category: 'interest_limits' },
  { key: 'max_interest_support_priority', label: 'Öncelikli Yatırımlar', category: 'interest_limits' },
  { key: 'max_interest_support_target', label: 'Hedef Yatırımlar', category: 'interest_limits' },
  // Makine Desteği Üst Limitleri
  { key: 'max_machinery_support_tech_local', label: 'Teknoloji Hamlesi / Yerel Kalkınma', category: 'machinery_limits' },
  { key: 'max_machinery_support_strategic', label: 'Stratejik Hamle', category: 'machinery_limits' },
  // Ek Faiz Desteği Üst Limitleri (Yeni Firmalar)
  { key: 'max_extra_interest_turkey_century', label: 'Türkiye Yüzyılı', category: 'extra_interest_limits' },
  { key: 'max_extra_interest_priority', label: 'Öncelikli Yatırımlar', category: 'extra_interest_limits' },
  { key: 'max_extra_interest_target', label: 'Hedef Yatırımlar', category: 'extra_interest_limits' },
] as const;

type ThresholdKey = typeof THRESHOLD_FIELDS[number]['key'];

// Format currency for display
function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('tr-TR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Parse Turkish number format to number
function parseTurkishNumber(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

export default function AdminYdoSettings() {
  const [thresholds, setThresholds] = useState<InvestmentThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New year dialog state
  const [showNewYearDialog, setShowNewYearDialog] = useState(false);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear() + 1);
  const [baseYear, setBaseYear] = useState<number | null>(null);
  const [ydoRate, setYdoRate] = useState<string>('');
  const [calculatedThresholds, setCalculatedThresholds] = useState<Partial<InvestmentThreshold> | null>(null);
  const [editableThresholds, setEditableThresholds] = useState<Record<ThresholdKey, string>>({} as Record<ThresholdKey, string>);
  const [notes, setNotes] = useState<string>('');

  // Load thresholds on mount
  useEffect(() => {
    loadThresholds();
  }, []);

  async function loadThresholds() {
    setLoading(true);
    try {
      const data = await investmentThresholdsService.getAllThresholds();
      setThresholds(data);
    } catch (error) {
      console.error('Error loading thresholds:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetActiveYear(year: number) {
    try {
      await investmentThresholdsService.setActiveYear(year);
      toast.success(`${year} yılı aktif olarak ayarlandı`);
      loadThresholds();
    } catch (error: any) {
      toast.error(error.message || 'Hata oluştu');
    }
  }

  async function handleDeleteYear(id: string, year: number) {
    if (!confirm(`${year} yılı verilerini silmek istediğinize emin misiniz?`)) return;
    
    try {
      await investmentThresholdsService.deleteThreshold(id);
      toast.success(`${year} yılı verileri silindi`);
      loadThresholds();
    } catch (error: any) {
      toast.error(error.message || 'Silme hatası');
    }
  }

  function handleCalculate() {
    if (!baseYear || !ydoRate) {
      toast.error('Baz yıl ve YDO oranı seçilmelidir');
      return;
    }

    const baseThreshold = thresholds.find(t => t.year === baseYear);
    if (!baseThreshold) {
      toast.error('Baz yıl verileri bulunamadı');
      return;
    }

    const rate = parseFloat(ydoRate.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) {
      toast.error('Geçerli bir YDO oranı giriniz');
      return;
    }

    const calculated = investmentThresholdsService.calculateNewYearThresholds(baseThreshold, rate);
    setCalculatedThresholds(calculated);

    // Initialize editable thresholds with calculated values
    const editable: Record<ThresholdKey, string> = {} as Record<ThresholdKey, string>;
    THRESHOLD_FIELDS.forEach(field => {
      const value = calculated[field.key as keyof typeof calculated];
      editable[field.key] = value !== null ? formatCurrency(value as number) : '';
    });
    setEditableThresholds(editable);
    
    setNotes(`${newYear} yılı değerleri - YDO %${rate.toFixed(2)} uygulanmış`);
    
    toast.success('Değerler hesaplandı, düzenleme yapabilirsiniz');
  }

  async function handleSaveNewYear() {
    if (!calculatedThresholds) {
      toast.error('Önce değerleri hesaplayın');
      return;
    }

    setSaving(true);
    try {
      // Parse editable values back to numbers
      const finalThresholds: any = {};
      THRESHOLD_FIELDS.forEach(field => {
        const value = editableThresholds[field.key];
        finalThresholds[field.key] = value ? parseTurkishNumber(value) : null;
      });

      await investmentThresholdsService.saveThresholds({
        year: newYear,
        revaluation_rate: parseFloat(ydoRate.replace(',', '.')),
        ...finalThresholds,
        is_active: false,
        effective_from: `${newYear}-01-01`,
        notes,
      });

      toast.success(`${newYear} yılı verileri kaydedildi`);
      setShowNewYearDialog(false);
      resetNewYearForm();
      loadThresholds();
    } catch (error: any) {
      toast.error(error.message || 'Kayıt hatası');
    } finally {
      setSaving(false);
    }
  }

  function resetNewYearForm() {
    setNewYear(new Date().getFullYear() + 1);
    setBaseYear(null);
    setYdoRate('');
    setCalculatedThresholds(null);
    setEditableThresholds({} as Record<ThresholdKey, string>);
    setNotes('');
  }

  function handleEditableChange(key: ThresholdKey, value: string) {
    // Format as Turkish number
    const numericValue = value.replace(/[^\d]/g, '');
    const formatted = numericValue ? formatCurrency(parseInt(numericValue)) : '';
    setEditableThresholds(prev => ({ ...prev, [key]: formatted }));
  }

  const activeThreshold = thresholds.find(t => t.is_active);
  const availableBaseYears = thresholds.map(t => t.year);

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Yeniden Değerleme Oranı (YDO) Yönetimi"
        description="Yıllık yatırım teşvik eşik değerlerini yönetin"
      />

      <div className="space-y-6">
        {/* Active Year Summary Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary fill-primary" />
                <CardTitle className="text-lg">Aktif Yıl</CardTitle>
              </div>
              {activeThreshold && (
                <Badge variant="default" className="text-lg px-3 py-1">
                  {activeThreshold.year}
                </Badge>
              )}
            </div>
            <CardDescription>
              Şu anda sistemde kullanılan eşik değerleri
            </CardDescription>
          </CardHeader>
          {loading ? (
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          ) : activeThreshold ? (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">1-2. Bölge</div>
                  <div className="font-semibold">{formatCurrency(activeThreshold.min_investment_region_1_2)} TL</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">3-6. Bölge</div>
                  <div className="font-semibold">{formatCurrency(activeThreshold.min_investment_region_3_6)} TL</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Yüksek Tek. Öncelikli</div>
                  <div className="font-semibold">{formatCurrency(activeThreshold.min_high_tech_priority)} TL</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Orta-Yüksek Tek. Öncelikli</div>
                  <div className="font-semibold">{formatCurrency(activeThreshold.min_mid_high_tech_priority)} TL</div>
                </div>
              </div>
              {activeThreshold.revaluation_rate && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>YDO: %{activeThreshold.revaluation_rate}</span>
                  <span className="mx-2">|</span>
                  <Calendar className="h-4 w-4" />
                  <span>Yürürlük: {new Date(activeThreshold.effective_from).toLocaleDateString('tr-TR')}</span>
                </div>
              )}
            </CardContent>
          ) : (
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>Aktif yıl tanımlanmamış</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Threshold Years List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Yıllık Eşik Değerleri
                </CardTitle>
                <CardDescription>
                  Tüm yıllara ait asgari yatırım tutarları ve destek limitleri
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadThresholds} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Yenile
                </Button>
                <Button onClick={() => setShowNewYearDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Yeni Yıl Ekle
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : thresholds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Henüz eşik değeri tanımlanmamış
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Yıl</TableHead>
                      <TableHead>YDO</TableHead>
                      <TableHead className="text-right">1-2. Bölge</TableHead>
                      <TableHead className="text-right">3-6. Bölge</TableHead>
                      <TableHead className="text-right">Yüksek Tek.</TableHead>
                      <TableHead className="text-right">Orta-Yüksek Tek.</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thresholds.map((t) => (
                      <TableRow key={t.id} className={t.is_active ? 'bg-primary/5' : ''}>
                        <TableCell className="font-medium">{t.year}</TableCell>
                        <TableCell>
                          {t.revaluation_rate ? `%${t.revaluation_rate}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(t.min_investment_region_1_2)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(t.min_investment_region_3_6)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(t.min_high_tech_priority)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(t.min_mid_high_tech_priority)}
                        </TableCell>
                        <TableCell>
                          {t.is_active ? (
                            <Badge variant="default" className="gap-1">
                              <Check className="h-3 w-3" /> Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pasif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {!t.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetActiveYear(t.year)}
                              >
                                <Star className="h-3 w-3 mr-1" />
                                Aktif Yap
                              </Button>
                            )}
                            {!t.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteYear(t.id, t.year)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Year Dialog */}
      <Dialog open={showNewYearDialog} onOpenChange={setShowNewYearDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Yeni Yıl Ekle
            </DialogTitle>
            <DialogDescription>
              Baz yıl üzerinden YDO uygulayarak yeni yıl eşik değerlerini hesaplayın
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Step 1: Year and Rate Selection */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newYear">Yeni Yıl</Label>
                <Input
                  id="newYear"
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(parseInt(e.target.value))}
                  min={2020}
                  max={2100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseYear">Baz Yıl</Label>
                <Select
                  value={baseYear?.toString() || ''}
                  onValueChange={(v) => setBaseYear(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBaseYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ydoRate">YDO Oranı (%)</Label>
                <div className="flex gap-2">
                  <Input
                    id="ydoRate"
                    type="text"
                    value={ydoRate}
                    onChange={(e) => setYdoRate(e.target.value)}
                    placeholder="25,49"
                  />
                  <Button onClick={handleCalculate} disabled={!baseYear || !ydoRate}>
                    <Calculator className="h-4 w-4 mr-1" />
                    Hesapla
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Calculated Values (Editable) */}
            {calculatedThresholds && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Hesaplanan değerler (düzenlenebilir)</span>
                </div>

                {/* Group by category */}
                {['regional', 'priority', 'strategic', 'special', 'other', 'interest_limits', 'machinery_limits', 'extra_interest_limits'].map((category) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium capitalize border-b pb-1">
                      {category === 'regional' && 'Bölgesel Asgari Tutarlar'}
                      {category === 'priority' && 'Öncelikli Yatırım Eşikleri'}
                      {category === 'strategic' && 'Stratejik Program Eşikleri'}
                      {category === 'special' && 'Özel Program Eşikleri'}
                      {category === 'other' && 'Diğer Tutarlar'}
                      {category === 'interest_limits' && 'Faiz/Kâr Payı Desteği Üst Limitleri'}
                      {category === 'machinery_limits' && 'Makine Desteği Üst Limitleri'}
                      {category === 'extra_interest_limits' && 'Ek Faiz Desteği Üst Limitleri (Yeni Firmalar)'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {THRESHOLD_FIELDS.filter(f => f.category === category).map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label htmlFor={field.key} className="text-xs">
                            {field.label}
                          </Label>
                          <div className="flex items-center gap-1">
                            <Input
                              id={field.key}
                              value={editableThresholds[field.key] || ''}
                              onChange={(e) => handleEditableChange(field.key, e.target.value)}
                              className="font-mono text-sm"
                            />
                            <span className="text-xs text-muted-foreground">TL</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notlar</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Açıklama ekleyin..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewYearDialog(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleSaveNewYear} 
              disabled={!calculatedThresholds || saving}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

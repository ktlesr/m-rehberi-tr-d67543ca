import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { generateUUID } from "@/lib/uuid";

const PROVINCES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Amasya",
  "Ankara",
  "Antalya",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Isparta",
  "Mersin",
  "İstanbul",
  "İzmir",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Kahramanmaraş",
  "Mardin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Rize",
  "Sakarya",
  "Samsun",
  "Siirt",
  "Sinop",
  "Sivas",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Şanlıurfa",
  "Uşak",
  "Van",
  "Yozgat",
  "Zonguldak",
  "Aksaray",
  "Bayburt",
  "Karaman",
  "Kırıkkale",
  "Batman",
  "Şırnak",
  "Bartın",
  "Ardahan",
  "Iğdır",
  "Yalova",
  "Karabük",
  "Kilis",
  "Osmaniye",
  "Düzce",
];

export const NewsletterSubscribeForm = () => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [institutions, setInstitutions] = useState<{ value: string; label: string; description?: string }[]>([]);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
  const { verifyRecaptcha, isReady: recaptchaReady } = useRecaptcha();
  const [formData, setFormData] = useState({
    adSoyad: "",
    telefon: "",
    email: "",
    il: "",
  });

  // Fetch institutions on mount
  useEffect(() => {
    const fetchInstitutions = async () => {
      const { data, error } = await supabase.from("institutions").select("id, name").order("name");

      if (!error && data) {
        const options: { value: string; label: string; description?: string }[] = data.map((inst) => ({
          value: inst.id.toString(),
          label: inst.name,
        }));
        // Add "Hepsi" option at the end
        options.push({
          value: "all",
          label: "Hepsi (Tüm Kurumlar)",
          description: "Tüm kurumların duyurularından haberdar ol",
        });
        setInstitutions(options);
      }
    };
    fetchInstitutions();
  }, []);

  // Handle "Hepsi" selection logic
  const handleInstitutionChange = (values: string[]) => {
    const hasAll = values.includes("all");
    const hadAll = selectedInstitutions.includes("all");

    if (hasAll && !hadAll) {
      // "Hepsi" just selected - select all institutions
      const allIds = institutions.filter((i) => i.value !== "all").map((i) => i.value);
      setSelectedInstitutions([...allIds, "all"]);
    } else if (!hasAll && hadAll) {
      // "Hepsi" just deselected - deselect all
      setSelectedInstitutions([]);
    } else if (hasAll) {
      // Check if all individual items are still selected
      const allIds = institutions.filter((i) => i.value !== "all").map((i) => i.value);
      const selectedWithoutAll = values.filter((v) => v !== "all");
      if (selectedWithoutAll.length < allIds.length) {
        // Some individual item was deselected, remove "all"
        setSelectedInstitutions(selectedWithoutAll);
      } else {
        setSelectedInstitutions(values);
      }
    } else {
      // Check if all individual items are now selected
      const allIds = institutions.filter((i) => i.value !== "all").map((i) => i.value);
      if (values.length === allIds.length && allIds.every((id) => values.includes(id))) {
        // All items selected, add "all"
        setSelectedInstitutions([...values, "all"]);
      } else {
        setSelectedInstitutions(values);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.adSoyad || !formData.email || !formData.il) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }

    const actualSelections = selectedInstitutions.filter((v) => v !== "all");
    if (actualSelections.length === 0) {
      toast.error("Lütfen en az bir kurum seçin");
      return;
    }

    setIsLoading(true);
    try {
      // Verify reCAPTCHA first
      if (recaptchaReady) {
        const recaptchaResult = await verifyRecaptcha('newsletter_subscribe');
        if (!recaptchaResult.success) {
          toast.error('Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.');
          setIsLoading(false);
          return;
        }
      }

      // Generate UUID client-side to avoid needing SELECT after INSERT
      const subscriberId = generateUUID();

      // Insert subscriber without .select() - using client-generated UUID
      const { error } = await supabase
        .from("bulten_uyeler")
        .insert({
          id: subscriberId,
          ad_soyad: formData.adSoyad.trim(),
          telefon: formData.telefon || null,
          email: formData.email.toLowerCase().trim(),
          il: formData.il,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Bu e-posta adresi zaten kayıtlı");
        } else {
          throw error;
        }
        return;
      }

      // Insert institution preferences using client-generated UUID
      const preferences = actualSelections.map((instId) => ({
        uye_id: subscriberId,
        institution_id: parseInt(instId),
      }));

      const { error: prefError } = await supabase.from("bulten_uye_kurum_tercihleri").insert(preferences);

      if (prefError) {
        console.error("Preference insert error:", prefError);
      }

      toast.success("Bülten kaydınız başarıyla oluşturuldu!");
      setFormData({ adSoyad: "", telefon: "", email: "", il: "" });
      setSelectedInstitutions([]);
      setOpen(false);
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Kayıt sırasında bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Bell className="w-4 h-4" />
          Desteklerden Haberdar Ol
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Destek Bülteni Aboneliği
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="adSoyad">Ad Soyad *</Label>
            <Input
              id="adSoyad"
              value={formData.adSoyad}
              onChange={(e) => setFormData((prev) => ({ ...prev, adSoyad: e.target.value }))}
              placeholder="Adınız Soyadınız"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-posta *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              value={formData.telefon}
              onChange={(e) => setFormData((prev) => ({ ...prev, telefon: e.target.value }))}
              placeholder="05XX XXX XX XX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="il">İl *</Label>
            <Select value={formData.il} onValueChange={(value) => setFormData((prev) => ({ ...prev, il: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="İl seçiniz" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {PROVINCES.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hangi kurumların desteklerinden haberdar olmak istersiniz? *</Label>
            <MultiSelect
              options={institutions}
              selected={selectedInstitutions}
              onChange={handleInstitutionChange}
              placeholder="Kurum seçiniz (birden fazla seçebilirsiniz)"
              maxDisplay={3}
            />
            <p className="text-xs text-muted-foreground">
              Sadece seçtiğiniz kurumların duyuruları size gönderilecektir.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Abone Ol"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Bu form reCAPTCHA ile korunmaktadır.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

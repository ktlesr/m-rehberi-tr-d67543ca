

# Sektör Seçimi Dinamik Suggestion Dropdown Planı

## Mevcut Durum

| Özellik | Mevcut | Hedef |
|---------|--------|-------|
| Arama Şekli | Butona basarak arama | Yazarken otomatik öneri |
| Suggestion | Yok | 2+ karakter sonrası dropdown |
| Debounce | Yok | 300ms debounce |
| Klavye Navigasyonu | Sadece Enter ile arama | ↑↓ ok tuşları + Enter |

## Çözüm Yaklaşımı

Mevcut `SectorSearchStep.tsx` bileşenine, `SearchBar.tsx`'de olduğu gibi dinamik suggestion dropdown eklenecek. **Mevcut "Ara" butonu ve tüm işlevler korunacak.**

---

## Teknik Uygulama

### Yeni Hook: `src/hooks/useSectorSuggestions.ts`

Sektör önerileri için özel bir hook oluşturulacak:

```typescript
// Temel yapı
- 2+ karakter sonrası aktif
- 300ms debounce
- sector_search tablosundan NACE kodu ve sektör adı araması
- Maksimum 8 öneri
```

### Değişiklik: `src/components/steps/SectorSearchStep.tsx`

**Eklenecek State ve Ref'ler:**
```tsx
const [showSuggestions, setShowSuggestions] = useState(false);
const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
const suggestionsRef = useRef<HTMLDivElement>(null);
const inputRef = useRef<HTMLInputElement>(null);
```

**Yeni Özellikler:**
1. `handleInputChange` fonksiyonunda suggestion fetch tetiklenecek
2. Input altına dropdown listesi eklenecek
3. Klavye navigasyonu (↑↓ + Enter + Escape)
4. Dış tıklamada dropdown kapanması

**UI Yapısı:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 [NACE kodu veya sektör adı girin...]          [  Ara  ]     │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Sektörler (5 sonuç)                                        │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 📂 Tekstil elyafının hazırlanması ve bükülmesi   [13.10]   │ │← hover/selected
│ │ 📂 Tekstil dokuma                                 [13.20]   │ │
│ │ 📂 Tekstil ürünleri imalatı                       [13.30]   │ │
│ │ 📂 ...                                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Korunacak Mevcut Özellikler

- ✅ "Ara" butonu tam çalışır durumda kalacak
- ✅ NACE kodu / sektör adı arama mantığı değişmeyecek
- ✅ Seçilen sektör kartı gösterimi korunacak
- ✅ Arama sonuç listesi (büyük liste) korunacak
- ✅ 6. Bölge özel kuralları korunacak
- ✅ Badge'ler (Hedef, Öncelikli, Teknoloji Hamlesi vb.) korunacak
- ✅ Analytics tracking korunacak

---

## Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| `src/hooks/useSectorSuggestions.ts` | Yeni oluştur |
| `src/components/steps/SectorSearchStep.tsx` | Güncelle |

---

## Kullanıcı Akışı

```
1. Kullanıcı input'a yazmaya başlar
   ↓
2. 2+ karakter sonrası 300ms bekle
   ↓
3. sector_search tablosunda arama yap
   ↓
4. Dropdown'da önerileri göster (maks 8)
   ↓
5a. Kullanıcı öneriyi tıklar → Sektör seçilir, dropdown kapanır
5b. Kullanıcı ↓↑ ile navigasyon + Enter → Sektör seçilir
5c. Kullanıcı Escape basar → Dropdown kapanır
5d. Kullanıcı "Ara" butonuna tıklar → Tam arama yapılır (mevcut davranış)
```

---

## Teknik Detaylar

### useSectorSuggestions Hook

```typescript
interface SectorSuggestion {
  id: number;
  nace_kodu: string;
  sektor: string;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  teknoloji_hamlesi: string | null;
}

// Debounce: 300ms
// Min karakter: 2
// Limit: 8 öneri
// Arama: NACE kodu VEYA sektör adı
```

### Dropdown Stilleri

- `z-50` yüksek z-index
- `bg-background` solid arka plan (şeffaf olmayacak)
- `border border-border` kenarlık
- `shadow-lg` gölge
- `max-h-64 overflow-y-auto` scroll
- Hover ve selected state'leri için `bg-accent`


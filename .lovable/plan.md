

# Yatırım Konusu Dropdown Görünüm İyileştirmesi

## Sorun

Yatırım konuları dropdown listesinde çok uzun metinler var ve bunlar:
- Ekrandan taşıyor
- Okunması zor
- Görsel olarak şık değil

## Çözüm Yaklaşımı

Dropdown içindeki uzun metinleri belirli bir karakter sayısında kesip `...` ile gösterecek, ancak **hover ile tooltip** olarak tam metni göstereceğiz. Bu sayede:
- Liste temiz ve okunabilir olacak
- Kullanıcı imleci üzerine getirdiğinde tam metni görebilecek

---

## Teknik Uygulama

### Görsel Tasarım

```
┌─────────────────────────────────────────────────────────────────┐
│ Yatırım Konusu                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [Yatırım konusu seçin                                     ▼]   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ✓ Örtüaltı ve Dikey Tarımda Kullanılan Yüksek Tekno...     │←Kısa
│ │   Simgesel Mimari ve Nitelikli Kültür Endüstrileri...       │ 
│ │   Spor/Sağlık Turizmi Yatırımları (salt hastane, diş...     │
│ │   Tıbbi ve Aromatik Bitkilerden Katma Değerli Ürünl...      │
│ └─────────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼ Hover                            │
│            ┌─────────────────────────────────────────────┐      │
│            │ Tam metin tooltip olarak görünür            │      │
│            │ "Örtüaltı ve Dikey Tarımda Kullanılan       │      │
│            │  Yüksek Teknolojili Ürünlerin ve            │      │
│            │  Aksamların Üretimi (ölçüm ve dozajlama...)"│      │
│            └─────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dosya Değişiklikleri

### 1. `src/components/IncentiveCalculatorForm.tsx`

**Satır 353-359** - SelectItem içinde truncate + tooltip eklenecek:

```tsx
{investments.map((investment) => (
  <TooltipProvider key={investment.id}>
    <Tooltip>
      <TooltipTrigger asChild>
        <SelectItem value={investment.investment_name}>
          <span className="block truncate max-w-[500px]">
            {investment.investment_name}
          </span>
        </SelectItem>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-md">
        <p>{investment.investment_name}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
))}
```

### 2. `src/components/EnhancedIncentiveCalculatorForm.tsx`

**Satır 347-353** - Aynı değişiklik:

```tsx
{investments.map((investment) => (
  <TooltipProvider key={investment.id}>
    <Tooltip>
      <TooltipTrigger asChild>
        <SelectItem value={investment.investment_name}>
          <span className="block truncate max-w-[500px]">
            {investment.investment_name}
          </span>
        </SelectItem>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-md">
        <p>{investment.investment_name}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
))}
```

### 3. `src/components/ui/select.tsx` (Opsiyonel İyileştirme)

SelectContent genişliğini kontrol için:
- `w-full min-w-[var(--radix-select-trigger-width)] max-w-[600px]` ekleme

---

## Korunacak Özellikler

- Mevcut seçim mantığı değişmeyecek
- Seçilen değer tam metin olarak saklanacak (value)
- Trigger'da seçili metin zaten `line-clamp-1` ile kesiliyor (mevcut)

---

## Özet

| Değişiklik | Açıklama |
|------------|----------|
| Truncate | 500px max genişlik, taşan metin `...` ile kesilir |
| Tooltip | Hover'da tam metin görünür |
| MaxWidth | Dropdown genişliği kontrol altında |


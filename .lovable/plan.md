

# Yatırım Konusu Dropdown Tooltip Düzeltmesi

## Sorunun Nedeni

Radix UI `Select` ve `Tooltip` bileşenleri birlikte kullanıldığında bir çakışma oluşuyor:

1. **Portal Çakışması**: `SelectContent` zaten bir portal içinde render ediliyor
2. **Event Yakalama**: `SelectItem` kendi hover/focus olaylarını yönetiyor ve `TooltipTrigger` bunları yakalayamıyor
3. **asChild Problemi**: `SelectItem` bir `button` elementi ve `TooltipTrigger asChild` ile düzgün çalışmıyor

## Çözüm Yaklaşımı

Radix Tooltip yerine **native HTML `title` attribute** kullanacağız. Bu:
- Her zaman çalışır (browser-native)
- Ek JavaScript gerektirmez
- Performans açısından daha verimli

---

## Teknik Uygulama

### Değişiklik 1: `src/components/IncentiveCalculatorForm.tsx`

**Mevcut Kod (Satır 353-370):**
```tsx
<SelectContent className="max-w-[600px]">
  {investments.map((investment) => (
    <TooltipProvider key={investment.id} delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SelectItem value={investment.investment_name}>
            <span className="block truncate max-w-[500px]">
              {investment.investment_name}
            </span>
          </SelectItem>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-md z-[100]">
          <p className="text-sm">{investment.investment_name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ))}
</SelectContent>
```

**Yeni Kod:**
```tsx
<SelectContent className="max-w-[600px]">
  {investments.map((investment) => (
    <SelectItem 
      key={investment.id} 
      value={investment.investment_name}
      title={investment.investment_name}
    >
      <span className="block truncate max-w-[500px]">
        {investment.investment_name}
      </span>
    </SelectItem>
  ))}
</SelectContent>
```

### Değişiklik 2: `src/components/EnhancedIncentiveCalculatorForm.tsx`

Aynı değişiklik bu dosyaya da uygulanacak.

---

## Sonuç

| Önceki | Yeni |
|--------|------|
| Radix Tooltip (çalışmıyor) | Native `title` attribute |
| Karmaşık component yapısı | Basit ve temiz kod |
| Event çakışması | Sorunsuz çalışma |

Native `title` tooltip'i browser tarafından gösterilir - fare ile üzerine gelindiğinde otomatik olarak tam metin görünür.


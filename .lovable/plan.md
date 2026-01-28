
# Chat Sayfası Banner Kaldırma Planı

## Kaldırılacak Bölüm

Resimde görülen ve anonim kullanıcılara gösterilen üst banner:
- "Sohbet geçmişiniz bu cihazda geçici olarak saklanıyor" metni
- "Örnek Sorgu" butonu
- "Giriş" butonu

## Değişiklik

| Dosya | Satır | İşlem |
|-------|-------|-------|
| `src/pages/Chat.tsx` | 321-351 | Banner bloğunu tamamen kaldır |

## Kaldırılacak Kod

```tsx
{/* Anonymous User Banner with Example Query Button */}
{isAnonymous && (
  <div className="bg-muted/50 border-b px-3 py-2 sm:px-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Cloud className="h-4 w-4 flex-shrink-0" />
        <span className="line-clamp-2 sm:line-clamp-1">
          Sohbet geçmişiniz bu cihazda geçici olarak saklanıyor.
        </span>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button ...>Örnek Sorgu</Button>
        <Link to="/admin/login">
          <Button ...>Giriş</Button>
        </Link>
      </div>
    </div>
  </div>
)}
```

## Temizlik

Banner kaldırıldıktan sonra kullanılmayan import'ları da temizleyeceğiz:
- `Cloud` ikonu (sadece bu banner'da kullanılıyor)
- `Link` bileşeni (sadece bu banner'da kullanılıyor)
- `Sparkles` ikonu (sadece bu banner'da kullanılıyor)
- `LogIn` ikonu (sadece bu banner'da kullanılıyor)

## Sonuç

Chat sayfası açıldığında üst kısımda ek bir banner görünmeyecek, doğrudan sohbet arayüzü gösterilecek.

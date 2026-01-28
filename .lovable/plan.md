
# Chat Sidebar Logo ve Genişlik Hizalama Planı

## Hedefler

1. Logo'nun üstten ve alttan border'a değmemesi (padding ekleme)
2. Logo, "Yeni Sohbet" butonu ve arama kutusu genişliklerinin aynı olması

## Mevcut Durum Analizi

| Bölüm | Yatay Padding | İçerik Genişliği |
|-------|---------------|------------------|
| Logo container | `px-4` (16px × 2) | `w-full` |
| Buton/Search container | `p-4` (16px × 2) | `w-full` |

Yatay padding'ler zaten eşit (`px-4` = 32px toplam), ancak logo container'da dikey padding yok.

## Değişiklik: `src/components/chat/ChatSidebar.tsx`

### Satır 51

```tsx
// Mevcut:
isCollapsed ? "p-2 justify-center" : "px-4 justify-center"

// Yeni:
isCollapsed ? "p-2 justify-center" : "p-4 justify-center"
```

`px-4` yerine `p-4` kullanarak:
- Yatay padding korunur (16px sol + 16px sağ)
- Dikey padding eklenir (16px üst + 16px alt)
- Alttaki buton/search container ile tam aynı padding değerleri

### Görsel Sonuç

```
┌──────────────────────────────────┐
│  ┌──────────────────────────┐    │  ← p-4 (16px padding)
│  │         LOGO             │    │
│  │    (genişlik: X px)      │    │
│  └──────────────────────────┘    │
├──────────────────────────────────┤  ← Border (ChatHeader ile hizalı)
│  ┌──────────────────────────┐    │  ← p-4 (16px padding)
│  │    + Yeni Sohbet         │    │  ← Buton (genişlik: X px) ✓ Hizalı
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │    🔍 Sohbet ara...      │    │  ← Input (genişlik: X px) ✓ Hizalı
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

## Avantajları

- Logo, Yeni Sohbet butonu ve Search box aynı genişlikte olacak
- Logo üstten ve alttan eşit boşluk bırakacak
- Border'a değmeyecek
- Tutarlı ve profesyonel görünüm
- Mobil ve desktop'ta aynı şekilde çalışacak

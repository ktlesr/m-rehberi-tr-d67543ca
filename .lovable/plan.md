
# "Duyurulara Dön" Butonu Yönlendirme Planı

## Mevcut Durum

| Sayfa | Route | Açıklama |
|-------|-------|----------|
| Duyuru Detayı | `/duyuru/:id` | Tek duyuru detayı |
| Ana Sayfa | `/` | Duyurular carousel olarak gösteriliyor |
| Duyuru Listesi | **Yok** | Ayrı bir sayfa mevcut değil |

"Duyurulara Dön" butonu şu anda `/` (ana sayfa) adresine yönlendiriyor çünkü tüm duyuruları listeleyen ayrı bir sayfa bulunmuyor.

## Önerilen Çözüm

Tüm duyuruları listeleyen yeni bir sayfa oluşturup, "Duyurulara Dön" butonunu bu sayfaya yönlendirmek.

---

## Teknik Uygulama Adımları

### 1. Yeni Sayfa: `src/pages/Announcements.tsx`

Tüm duyuruları listeleyen yeni bir sayfa oluşturulacak:
- Supabase'den tüm aktif duyuruları çekecek
- Tarih sırasına göre listeleyecek
- Her duyuru kartına tıklandığında `/duyuru/:id` sayfasına yönlendirecek
- Sayfalama (pagination) veya infinite scroll eklenebilir

### 2. Route Tanımı: `src/App.tsx`

Yeni sayfa için route eklenecek:
```tsx
<Route path="/duyurular" element={<Announcements />} />
```

### 3. Buton Güncelleme: `src/pages/AnnouncementDetail.tsx`

**Satır 87:**
```tsx
// Mevcut:
onClick={() => navigate('/')}

// Yeni:
onClick={() => navigate('/duyurular')}
```

**Satır 69 (hata durumu):**
```tsx
// Mevcut:
<Button onClick={() => navigate('/')} ...>
  Ana Sayfaya Dön

// Yeni:
<Button onClick={() => navigate('/duyurular')} ...>
  Duyurulara Dön
```

### 4. AnnouncementCarousel Güncelleme: `src/components/AnnouncementCarousel.tsx`

"Tüm Duyuruları Görüntüle" butonunu yeni sayfaya yönlendirecek şekilde güncellenecek.

---

## Yeni Sayfa Tasarımı (Announcements.tsx)

```
┌─────────────────────────────────────────────────────┐
│ MainNavbar                                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│   📢 Duyurular                                     │
│   Tüm güncel duyuruları buradan takip edin         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │ 🏛️ [Logo] Kurum Adı         15 Ocak 2025  │   │
│  │ Duyuru Başlığı                              │   │
│  │ Kısa özet metni...              [Detay →]  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🏛️ [Logo] Kurum Adı         10 Ocak 2025  │   │
│  │ Duyuru Başlığı                              │   │
│  │ Kısa özet metni...              [Detay →]  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│               [ Daha Fazla Yükle ]                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Footer                                              │
└─────────────────────────────────────────────────────┘
```

---

## Değiştirilecek Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/pages/Announcements.tsx` | Yeni oluştur |
| `src/App.tsx` | Route ekle |
| `src/pages/AnnouncementDetail.tsx` | navigate('/') → navigate('/duyurular') |
| `src/components/AnnouncementCarousel.tsx` | "Tüm Duyuruları Görüntüle" butonuna link ekle |

## Avantajları

- Kullanıcılar tüm duyuruları tek sayfada görebilir
- Duyuru detayından listeye dönüş mantıklı olur
- Ana sayfa carousel'i yeni sayfaya yönlendirir
- SEO açısından `/duyurular` sayfası ayrı index'lenebilir

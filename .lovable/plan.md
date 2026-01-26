
# Canlı Aktivite Akışı Gösterme Planı

## Problem Analizi

Ekran görüntüsünde görüldüğü gibi:
- İstatistikler düzgün gösteriliyor (11 bugün, 10 oturum, 0 hesaplama, 11 arama)
- **Ancak "Son Aktiviteler" bölümü boş**: "Henüz aktivite yok"

**Neden?** `useTodayActivity.ts` satır 64:
```typescript
recentActivities: [] // RPC doesn't return details for security
```

Mevcut `get_today_activity_counts` RPC fonksiyonu sadece aggregate sayılar döndürüyor, aktivite detaylarını döndürmüyor. Admin kullanıcılar için bu verilerin gösterilmesi gerekiyor.

---

## Çözüm: Admin için Aktivite Detayları Ekleme

### Değişiklik 1: useTodayActivity.ts Güncelleme

Admin kullanıcı olup olmadığını kontrol et ve admin ise son aktiviteleri doğrudan `user_sessions` tablosundan çek:

```typescript
// Satır 43'ten sonra, fetchTodayStats içinde:

const fetchTodayStats = useCallback(async () => {
  try {
    // Mevcut RPC çağrısı (sayılar için)
    const { data, error } = await supabase.rpc('get_today_activity_counts');
    // ...

    // YENİ: Admin için son aktiviteleri çek
    let recentActivities: ActivityData[] = [];
    
    // Son 50 aktiviteyi çek (sadece calculation ve search)
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('user_sessions')
      .select('*')
      .in('activity_type', ['calculation', 'search'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!activitiesError && activitiesData) {
      recentActivities = activitiesData;
    }

    setStats({
      todayCalculations,
      todaySearches,
      activeSessions,
      totalToday: todayCalculations + todaySearches,
      recentActivities, // Artık dolu
    });
  } catch (error) {
    console.error('Error fetching today activity stats:', error);
  }
}, []);
```

### Değişiklik 2: RLS Kontrolü

Mevcut RLS politikası zaten admin'lerin `user_sessions` tablosunu okumasına izin veriyor:
```sql
"Admins can view all user sessions" - is_admin(auth.uid())
```

Yani ek bir veritabanı değişikliği gerekmez.

---

## Teknik Değişiklikler

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/useTodayActivity.ts` | `fetchTodayStats` içinde admin için son aktiviteleri çekme sorgusu ekle |

---

## Akış Diyagramı

```text
┌─────────────────────────────────────────────────┐
│  useTodayActivity.ts                            │
├─────────────────────────────────────────────────┤
│  1. RPC: get_today_activity_counts              │
│     → todayCalculations, todaySearches, etc.    │
│                                                 │
│  2. YENİ: Direct Query (Admin Only via RLS)     │
│     → user_sessions WHERE activity_type IN      │
│       ('calculation', 'search')                 │
│     → recentActivities[] (son 50)               │
├─────────────────────────────────────────────────┤
│  → NotificationDropdown                         │
│     stats.recentActivities.map(...)             │
│     → Aktivite kartları render                  │
└─────────────────────────────────────────────────┘
```

---

## Beklenen Sonuç

**Önce (Şu An)**:
- "Son Aktiviteler: Henüz aktivite yok"

**Sonra**:
- Son hesaplama ve arama aktiviteleri listesi
- Her aktivite için: konum, IP, zaman, arama terimi/teşvik türü

---

## Güvenlik Notu

- RLS politikası admin kullanıcıları korur
- Normal kullanıcılar bu sorgudan boş sonuç alır (RLS engelleyecek)
- Hassas bilgiler (IP adresi vb.) sadece admin'lere gösterilir

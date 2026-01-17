# Kapsamli Erisilebilirlik Ozellikleri Ekleme Plani

## Amac
Referans gorseldeki tum erisilebilirlik ozelliklerini mevcut sisteme entegre etmek. Halihazirdaki calisanlar KORUNACAK ve yeni ozellikler EKLENECEK.

---

## Mevcut Durum (Dokunulmayacak)
- Yazi Boyutu (fontSize)
- Yuksek Kontrast (highContrast)
- Baglantilari Vurgula (highlightLinks)
- Animasyonlari Durdur (reduceMotion)
- Satir Araligi (lineSpacing)
- Kelime Araligi (wordSpacing)
- Buyuk Imlec (largeCursor)
- Okuma Kilavuzu (readingGuide)

---

## Eklenecek Yeni Ozellikler

### 1. Sesli Okuma Ozellikleri (Web Speech API)

#### 1.1 Ekran Okuyucu (screenReader)
- Sayfa icerigini bastan sona sesli okuma
- Oynat/Durdur kontrolleri
- Turkce TTS destegi

#### 1.2 Secili Alan Okuyucu (readSelectedText)
- Kullanici metin sectikten sonra secili metni oku
- Selection API kullanilacak

#### 1.3 Uzerine Gelinen Metni Oku (readOnHover)
- Mouse hover'da o elementin text'ini oku
- Debounce ile performans optimizasyonu (300ms)

### 2. Gorsel Yardimcilar

#### 2.1 Resimleri Gizle (hideImages)
- Tum `img` etiketlerini gizle
- CSS: `img { visibility: hidden !important; }`
- Dikkat dagitici gorselleri kaldirir

#### 2.2 Metni Sola Hizala (alignTextLeft)
- Tum metinleri sola hizala
- CSS: `text-align: left !important;`
- Disleksi ve okuma guclugu icin faydali

#### 2.3 Okuma Maskesi (readingMask)
- Fare imleci etrafinda karanlik bir maske
- Sadece imlec bolgesini aydinlatir
- Odaklanma guclugu cekenler icin

### 3. Font ve Renk Ozellikleri

#### 3.1 Disleksi Dostu (dyslexiaFriendly)
- OpenDyslexic veya benzeri font uygula
- Google Fonts'tan OpenDyslexic yukleme veya fallback
- Letter spacing artirimi

#### 3.2 Mavi Isik Filtresi (blueLightFilter)
- Ekrana sicak/amber ton overlay
- CSS filter: `sepia(30%) saturate(90%)`
- Goz yorgunlugunu azaltir

#### 3.3 Solgunlastirma / Grayscale (desaturation)
- Tum sayfa gri tonlara cevrilir
- CSS filter: `grayscale(100%)`

#### 3.4 Dusuk Doygunluk (lowSaturation)
- Renk doygunlugu azaltilir (%50)
- CSS filter: `saturate(0.5)`

#### 3.5 Yuksek Doygunluk (highSaturation)
- Renk doygunlugu artirilir (%150)
- CSS filter: `saturate(1.5)`

---

## Teknik Uygulama Plani

### Adim 1: AccessibilityContext Guncelleme
**Dosya:** `src/contexts/AccessibilityContext.tsx`

Yeni ayarlar interface'e eklenecek:
```typescript
interface AccessibilitySettings {
  // Mevcut olanlar (degismeyecek)
  fontSize: number;
  highContrast: boolean;
  highlightLinks: boolean;
  reduceMotion: boolean;
  lineSpacing: 'normal' | 'wide' | 'wider';
  wordSpacing: 'normal' | 'wide' | 'wider';
  largeCursor: boolean;
  readingGuide: boolean;
  
  // YENI EKLENECEKLER
  screenReader: boolean;
  readSelectedText: boolean;
  readOnHover: boolean;
  hideImages: boolean;
  alignTextLeft: boolean;
  readingMask: boolean;
  dyslexiaFriendly: boolean;
  blueLightFilter: boolean;
  desaturation: boolean;
  lowSaturation: boolean;
  highSaturation: boolean;
}
```

useEffect'e yeni CSS class toggle'lari eklenecek.

### Adim 2: AccessibilityWidget Guncelleme
**Dosya:** `src/components/AccessibilityWidget.tsx`

- Panel genisletilecek (scrollable)
- Ozellikler kategorilere ayrilacak:
  - Sesli Okuma
  - Gorsel
  - Font ve Renk
- Her yeni ozellik icin switch/toggle

### Adim 3: CSS Stilleri Ekleme
**Dosya:** `src/index.css`

```css
/* Resimleri Gizle */
.hide-images img,
.hide-images [style*="background-image"] {
  visibility: hidden !important;
  opacity: 0 !important;
}

/* Metni Sola Hizala */
.align-text-left * {
  text-align: left !important;
}

/* Disleksi Dostu */
.dyslexia-friendly * {
  font-family: OpenDyslexic, Comic Sans MS, sans-serif !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}

/* Mavi Isik Filtresi */
.blue-light-filter {
  filter: sepia(30%) saturate(90%) brightness(95%);
}

/* Solgunlastirma */
.desaturation {
  filter: grayscale(100%);
}

/* Dusuk Doygunluk */
.low-saturation {
  filter: saturate(0.5);
}

/* Yuksek Doygunluk */
.high-saturation {
  filter: saturate(1.5);
}

/* Okuma Maskesi */
.reading-mask-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  background: radial-gradient(
    ellipse 400px 150px at var(--mouse-x, 50%) var(--mouse-y, 50%),
    transparent 0%,
    rgba(0, 0, 0, 0.85) 100%
  );
}
```

### Adim 4: ReadingMask Bileseni Olusturma
**Dosya:** `src/components/ReadingMask.tsx`

Fare imlecini takip eden maske overlay.

### Adim 5: Sesli Okuma Hook'u Olusturma
**Dosya:** `src/hooks/useTextToSpeech.ts`

- Web Speech API (SpeechSynthesis) kullanimi
- Turkce ses secimi
- Start/stop/pause metodlari
- Hover okuma debounce logic

### Adim 6: App.tsx Guncelleme
Yeni bilesenler (ReadingMask vb.) App.tsx'e eklenecek.

---

## UI Tasarimi (Widget)

Panel, referans gorseldeki gibi grid layout'ta duzenlenecek:
- 2 sutunlu grid
- Her ozellik bir kart/buton olarak
- Aktif durumda highlight
- Ikonlar ile gorsel iletisim
- Turkce etiketler

### Klavye Kisayolu
Mevcut: Alt+0 (korunacak)
Yeni: Ctrl+Y de eklenebilir (referans gorseldeki gibi)

---

## Risk Degerlendirmesi

| Risk | Azaltma Stratejisi |
|------|---------------------|
| Mevcut ozelliklerin bozulmasi | Sadece YENi alanlar ekleniyor, mevcut kod degismiyor |
| localStorage uyumsuzlugu | defaultSettings spread operatoru ile eski ayarlari korur |
| Performans (hover okuma) | Debounce (300ms) ile optimize |
| TTS dil destegi | navigator.language kontrolu + Turkce fallback |
| Filter catismalari | Tek bir filter secimi veya combine logic |

---

## Test Plani

1. Mevcut 8 ozelligin hala calistigini dogrula
2. Her yeni ozelligi tek tek test et
3. localStorage'dan eski ayarlarla yukleme testi
4. TTS Turkce okuma testi
5. Okuma maskesi mouse tracking testi
6. Mobil uyumluluk kontrolu

import React from 'react';
import MainNavbar from '@/components/MainNavbar';
import Footer from '@/components/Footer';
import StandardHero from '@/components/StandardHero';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Target, 
  FlaskConical, 
  UserCheck, 
  Copyright, 
  ShieldAlert, 
  ExternalLink, 
  RefreshCw, 
  Scale, 
  CheckCircle 
} from 'lucide-react';

const TermsOfUse = () => {
  const sections = [
    {
      id: 1,
      title: "Taraflar ve Kapsam",
      icon: Users,
      content: [
        "Bu kullanım koşulları, yatirimadestek.gov.tr alan adı üzerinden sunulan tüm içerik, hizmet ve dijital uygulamaların kullanımına ilişkin şartları düzenler.",
        "Platform, test sürecinde test.yatirimadestekgov.tr alan adı veya farklı alt alan adları üzerinden hizmet verebilir. Test ortamında sunulan içerik ve fonksiyonlar, yayına alınacak nihai sistemden farklılık gösterebilir.",
        "Siteyi ziyaret eden veya site üzerinden sunulan hizmetlerden yararlanan tüm gerçek ve tüzel kişiler (\"Kullanıcı\"), bu kullanım koşullarını kabul etmiş sayılır."
      ]
    },
    {
      id: 2,
      title: "Hizmetin Amacı ve Niteliği",
      icon: Target,
      content: [
        "yatirimadestek.gov.tr;",
        "• Yatırımcılara yönelik bilgilendirme,",
        "• Kamu destekleri, teşvikler ve yatırım süreçleri hakkında yönlendirme,",
        "• Dijital analiz, hesaplama ve rehberlik araçları sunma",
        "amacıyla oluşturulmuş bir kamu bilgilendirme platformudur.",
        "Sitede yer alan bilgiler genel nitelikte olup, bağlayıcı bir taahhüt, resmi onay veya kesin teşvik hakkı doğurmaz."
      ]
    },
    {
      id: 3,
      title: "Test Ortamı Hakkında Bilgilendirme",
      icon: FlaskConical,
      content: [
        "Platformun test ortamında (test.yatirimadestekgov.tr) sunulan;",
        "• Hesaplamalar,",
        "• Analiz sonuçları,",
        "• Yapay zekâ destekli yönlendirmeler,",
        "• İçerikler ve dokümanlar",
        "örnekleme, deneme ve geliştirme amaçlıdır. Bu ortamda üretilen çıktılar hukuki, mali veya idari işlem tesisinde doğrudan esas alınamaz."
      ]
    },
    {
      id: 4,
      title: "Kullanıcı Yükümlülükleri",
      icon: UserCheck,
      content: [
        "Kullanıcı;",
        "• Siteyi hukuka, kamu düzenine ve ahlaka aykırı şekilde kullanmamayı,",
        "• Yanıltıcı, yanlış veya üçüncü kişilerin haklarını ihlal eden bilgi paylaşmamayı,",
        "• Sistemin güvenliğini, işleyişini veya bütünlüğünü bozacak eylemlerden kaçınmayı",
        "kabul eder."
      ]
    },
    {
      id: 5,
      title: "Fikri Mülkiyet Hakları",
      icon: Copyright,
      content: [
        "Sitede yer alan tüm içerikler (metinler, grafikler, tasarımlar, yazılımlar, algoritmalar, hesaplama araçları vb.), aksi açıkça belirtilmedikçe ilgili kamu kurumuna aittir.",
        "Bu içerikler;",
        "• Ticari amaçla kopyalanamaz,",
        "• Değiştirilemez,",
        "• Yeniden yayımlanamaz",
        "İlgili kurumdan yazılı izin alınmaksızın kullanılamaz."
      ]
    },
    {
      id: 6,
      title: "Sorumluluğun Sınırlandırılması",
      icon: ShieldAlert,
      content: [
        "yatirimadestek.gov.tr;",
        "• Sitede yer alan bilgilerin güncelliği, doğruluğu veya eksiksizliği konusunda mutlak garanti vermez,",
        "• Kullanıcıların site üzerinden edindiği bilgilere dayanarak aldığı kararlardan doğabilecek doğrudan veya dolaylı zararlardan sorumlu tutulamaz,",
        "• Teknik arızalar, bakım çalışmaları veya mücbir sebepler nedeniyle hizmetin kesintiye uğramasından sorumlu değildir."
      ]
    },
    {
      id: 7,
      title: "Harici Bağlantılar",
      icon: ExternalLink,
      content: [
        "Sitede üçüncü taraf internet sitelerine yönlendiren bağlantılar bulunabilir. Bu sitelerin içeriklerinden, gizlilik uygulamalarından veya hizmetlerinden yatirimadestek.gov.tr sorumlu değildir."
      ]
    },
    {
      id: 8,
      title: "Değişiklik Hakkı",
      icon: RefreshCw,
      content: [
        "Kullanım koşulları, ihtiyaçlar ve mevzuat değişiklikleri doğrultusunda önceden bildirim yapılmaksızın güncellenebilir. Güncel metin site üzerinde yayımlandığı anda yürürlüğe girer."
      ]
    },
    {
      id: 9,
      title: "Uygulanacak Hukuk ve Yetki",
      icon: Scale,
      content: [
        "Bu kullanım koşulları Türkiye Cumhuriyeti mevzuatına tabidir. Doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir."
      ]
    },
    {
      id: 10,
      title: "Yürürlük",
      icon: CheckCircle,
      content: [
        "Bu kullanım koşulları, kullanıcının siteye eriştiği anda yürürlüğe girer."
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNavbar />
      
      <StandardHero
        title="Kullanım Koşulları"
        subtitle="yatirimadestek.gov.tr platformu kullanım şartları ve koşulları"
        badge={{ text: "Yasal Bilgiler", icon: Scale }}
      />
      
      <main className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <Card 
                key={section.id} 
                className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                          {section.id}
                        </span>
                        <h2 className="text-xl font-semibold text-foreground">
                          {section.title}
                        </h2>
                      </div>
                      <div className="space-y-2 text-muted-foreground leading-relaxed">
                        {section.content.map((paragraph, pIndex) => (
                          <p 
                            key={pIndex}
                            className={paragraph.startsWith('•') ? 'pl-4' : ''}
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* reCAPTCHA Notice */}
          <Card className="border-muted bg-muted/30">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground text-center">
                Bu site reCAPTCHA tarafından korunmaktadır ve Google{' '}
                <a 
                  href="https://policies.google.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  Gizlilik Politikası
                </a>{' '}ile{' '}
                <a 
                  href="https://policies.google.com/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  Hizmet Şartları
                </a>{' '}geçerlidir.
              </p>
            </CardContent>
          </Card>
          
          {/* Last Updated Info */}
          <div className="text-center pt-8 pb-4">
            <p className="text-sm text-muted-foreground">
              Son güncelleme: {new Date().toLocaleDateString('tr-TR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TermsOfUse;

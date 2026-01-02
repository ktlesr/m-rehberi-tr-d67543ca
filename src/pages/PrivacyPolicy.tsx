import React from 'react';
import MainNavbar from '@/components/MainNavbar';
import Footer from '@/components/Footer';
import StandardHero from '@/components/StandardHero';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  Target, 
  Database, 
  Share2, 
  Cookie,
  Table,
  Lock
} from 'lucide-react';

const PrivacyPolicy = () => {
  const sections = [
    {
      id: 1,
      title: "Giriş",
      icon: Shield,
      content: [
        "İşbu Çerez Uygulamaları Politikası, T.C. Sanayi Ve Teknoloji Bakanlığı Kalkınma Ajansları Genel Müdürlüğü (Genel Müdürlük olarak anılacaktır.) tarafından yürütülen https://yatirimadestek.gov.tr/ web sitesi için geçerlidir.",
        "Genel müdürlüğümüz deneyimlerinizi geliştirmek için ilgili web sitesinde çerezler kullanabilir. Kullanılan çerezler sisteminizden ve/veya sabit diskinizden herhangi bir bilgi toplamaz. Sitemizde isim ve e-posta adresi ile tanımlanmazsınız; bununla beraber ilk girişinizde sayı ve dizinler atanır."
      ]
    },
    {
      id: 2,
      title: "Amaç",
      icon: Target,
      content: [
        "https://yatirimadestek.gov.tr olarak, kişisel verileri aşağıda sayılan amaçlar kapsamında işlemekteyiz:",
        "• Faaliyetlerimizi yürütmek,",
        "• Ziyaretçilerimizin ve üyelerimizin, sunduğumuz imkanlardan etkin bir şekilde yararlanması,",
        "• Kullanıcı adına sitemiz imkanlarından faydalanılması,",
        "• Üyelerimizin/ziyaretçilerimizin tercih ve ihtiyaçlarını tespit etmek ve verdiğimiz hizmetleri bu kapsamda şekillendirmek, güncellemek,",
        "• Ziyaretçilerin taleplerini iletebilmesi amacıyla ek olarak bilgi formlarının doldurulması,",
        "• Yasal düzenlemelerin gerektirdiği veya zorunlu kıldığı şekilde, hukuki yükümlülüklerimizi yerine getirilmesini sağlamak,",
        "• Elektronik posta ile bülten göndermek ya da üye iç mesaj bildirimler de bulunmaktır.",
        "Kalkınma Ajansları Genel Müdürlüğü, kişisel verilerinizin 6698 sayılı KVK Kanunu ve sair mevzuat hükümlerine uygun şekilde işlenmesini ve korunmasını amaçlamaktadır."
      ]
    },
    {
      id: 3,
      title: "Veri İşleme İlkeleri",
      icon: Lock,
      content: [
        "1. Kişisel verilerinizi işlenmelerini gerektiren amaç çerçevesinde ve bu amaç ile bağlantılı, sınırlı ve ölçülü şekilde,",
        "2. Sitemize bildirilen şekliyle kişisel verilerin doğruluğunu ve en güncel halini korumak kaydıyla saklanacaktır.",
        "İşbu Çerez Aydınlatma Metninde belirtilmiş olan kişisel veriler, https://yatirimadestek.gov.tr bağlantısına girmeniz ve işlem yapmanız durumunda elde edilecektir."
      ]
    },
    {
      id: 4,
      title: "İşlenen Kişisel Verileriniz",
      icon: Table,
      isTable: true,
      tableData: [
        {
          category: "Kimlik Verisi",
          description: "Ad Soyadı (ek bilgi formu gönderen ziyaretçilerden iradeleri dahilinde alınmaktadır.)"
        },
        {
          category: "İletişim Verisi",
          description: "E-Mail Adresi, Telefon Numarası (ek bilgi formu gönderen ziyaretçilerden iradeleri dahilinde alınmaktadır.)"
        },
        {
          category: "Çerez Verisi",
          description: "Google Analytics, Google Tag Manager, Google DoubleClick Ad, Google Dynamic Remarketing, Google Adwords User List, Facebook Connect, Google Adsense, Google Haritalar."
        }
      ],
      content: [
        "https://yatirimadestek.gov.tr web sitesinde veya site haricindeki alanlarda ürün ve hizmet tanıtımını yapmak için Google DoubleClick Ad, Google Dynamic Remarketing, Google Adwords kullanılabilmektedir."
      ]
    },
    {
      id: 5,
      title: "Kişisel Verilerin Toplanması ve Saklanma Usulü",
      icon: Database,
      content: [
        "Bizimle paylaştığınız Ad-Soyad, iletişim bilgisi ve çerez bilgisini; https://yatirimadestek.gov.tr internet sayfasının kullanılması ve sitemizde bulunan bilgi formlarının doldurulması ile,",
        "• Gerektiği durumda iletişim için adres ve diğer gerekli bilgileri kaydetmek,",
        "• Yasal yükümlülüklerimizi yerine getirebilmek ve yürürlükteki mevzuattan doğan haklarımızı kullanabilmek,",
        "• https://yatirimadestek.gov.tr hizmetlerini geliştirmeye ve daha efektif hale getirmeye yönelik meşru menfaati gereği web sitemizde kullanılan çerezler vasıtasıyla kişisel verilerinizi elektronik olarak toplamaktadır.",
        "Kişisel verileriniz elektronik ve/veya fiziksel ortamlarda saklanacaktır. Tarafımızca temin edilen ve saklanan kişisel verilerinizin saklandıkları ortamlarda yetkisiz erişime maruz kalmamaları, manipülasyona uğramamaları, kaybolmamaları ve zarar görmemeleri amacıyla gereken iş süreçlerinin tasarımı ile teknik güvenlik altyapı geliştirmeleri uygulanmaktadır.",
        "Kişisel verileriniz, size bildirilen amaçlar ve kapsam dışında kullanılmamak kaydı ile gerekli tüm bilgi güvenliği tedbirleri de alınarak işlenecek ve yasal saklama süresince veya böyle bir süre öngörülmemişse işleme amacının gerekli kıldığı süre boyunca saklanacak ve işlenecektir. Bu süre sona erdiğinde, kişisel verileriniz silinme, yok edilme ya da anonimleştirme yöntemleri ile veri akışlarımızdan çıkarılacaktır."
      ]
    },
    {
      id: 6,
      title: "Kişisel Verilerin Aktarılması",
      icon: Share2,
      content: [
        "Kişisel verileriniz; güvenliğiniz ve kurumun yasalar karşısındaki yükümlülüklerini yerine getirmek amacıyla 5651 sayılı İnternet Ortamında Yapılan Yayınların Düzenlenmesi ve Bu Yayınlar Yoluyla İşlenen Suçlarla Mücadele Edilmesi Hakkında Kanun, 6698 Sayılı Kişisel Verilerin Korunması Kanunu ve fakat bununla sınırlı olmamak üzere sair mevzuat hükümleri izin verdiği ve gerektirdiği ölçüde ilgili kurum veya kuruluşlar, kendi nam ve hesabına faaliyette bulunan şirketler ve temsilcilerimize Kişisel Verileri Koruma Kurumu, Bilgi Teknolojileri ve İletişim Kurumu gibi kamu tüzel kişileri ile paylaşılabilir."
      ]
    },
    {
      id: 7,
      title: "Çerez Kullanımı",
      icon: Cookie,
      content: [
        "Çerezler, ziyaret ettiğiniz internet siteleri tarafından tarayıcınıza gönderilen ve bilgisayarınızda veya mobil cihazınızda saklanan küçük metin dosyalarıdır.",
        "Web sitemizde kullanılan çerez türleri:",
        "• Zorunlu Çerezler: Web sitesinin düzgün çalışması için gerekli olan çerezlerdir.",
        "• Performans Çerezleri: Web sitesinin performansını ölçmemize yardımcı olur.",
        "• İşlevsellik Çerezleri: Size daha kişiselleştirilmiş bir deneyim sunmamızı sağlar.",
        "• Hedefleme/Reklam Çerezleri: İlgi alanlarınıza göre içerik sunmak için kullanılır.",
        "Tarayıcı ayarlarınızı değiştirerek çerezleri reddedebilir veya silebilirsiniz. Ancak bu durumda web sitesinin bazı özellikleri düzgün çalışmayabilir."
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainNavbar />
      
      <StandardHero
        title="Çerez ve Gizlilik Politikası"
        subtitle="yatirimadestek.gov.tr platformu çerez kullanımı ve kişisel verilerin korunması hakkında bilgilendirme"
        badge={{ text: "Gizlilik", icon: Shield }}
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
                      
                      {/* Table for personal data section */}
                      {section.isTable && section.tableData && (
                        <div className="mb-4 overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-muted">
                                <th className="text-left p-3 border border-border font-semibold text-foreground">Veri Kategorisi</th>
                                <th className="text-left p-3 border border-border font-semibold text-foreground">Açıklama</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.tableData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-muted/50">
                                  <td className="p-3 border border-border font-medium text-foreground whitespace-nowrap">
                                    {row.category}
                                  </td>
                                  <td className="p-3 border border-border text-muted-foreground">
                                    {row.description}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
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
          
          {/* KVKK Rights Notice */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                KVKK Kapsamındaki Haklarınız
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aşağıdaki haklara sahipsiniz:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Kişisel verilerinizin işlenip işlenmediğini öğrenme
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Kişisel verilerinizin silinmesini veya yok edilmesini isteme
                </li>
              </ul>
            </CardContent>
          </Card>

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

export default PrivacyPolicy;

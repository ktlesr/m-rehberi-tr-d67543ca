// components/IncentiveReportPDF.tsx
import React from "react";
import { Page, Text, View, Document, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { IncentiveResult } from "@/types/incentive";

// Register Roboto font from CDN
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: "bold",
    },
  ],
});

// Color palette matching reference design
const colors = {
  primary: "#0011B3",
  sectionTitle: "#1e88e5",
  sectionTitleBg: "#e3f2fd",
  textPrimary: "#212121",
  textSecondary: "#616161",
  success: "#4caf50",
  badgeBlue: "#2196f3",
  badgeGreen: "#4caf50",
  badgeRed: "#f44336",
  badgeOrange: "#ff9800",
  cardBorder: "#e0e0e0",
  infoBg: "#e8f5e9",
  infoBorder: "#4caf50",
  headerLine: "#1976d2",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 10,
    padding: 30,
    color: colors.textPrimary,
    backgroundColor: "#ffffff",
  },
  // Header styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    marginHorizontal: -30,
    marginTop: -30,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 170,
    height: 60,
    objectFit: "contain",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  reportDate: {
    fontSize: 9,
    color: "#e0e0e0",
    marginTop: 2,
  },
  // Section title styles
  sectionTitle: {
    backgroundColor: colors.sectionTitleBg,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
  },
  // Yatırım Künyesi styles
  kunyeContainer: {
    marginBottom: 0,
  },
  sectorName: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  kunyeGrid: {
    flexDirection: "row",
    gap: 20,
  },
  kunyeColumn: {
    flex: 1,
  },
  kunyeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  kunyeLabel: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  kunyeValue: {
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "right",
  },
  kunyeValueLarge: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
  },
  // Badge styles
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
    color: "white",
  },
  badgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  locationBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  // Destekler styles
  desteklerGrid: {
    flexDirection: "row",
    gap: 15,
  },
  destekCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 6,
    padding: 12,
  },
  destekCardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  destekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  destekLabel: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  destekValue: {
    fontSize: 9,
    fontWeight: "bold",
  },
  destekValueSuccess: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.success,
  },
  // Özel Şartlar info box
  infoBox: {
    marginTop: 16,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: 6,
    padding: 12,
  },
  infoBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoBoxCheckIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBoxCheckText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  infoBoxTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.success,
  },
  infoBoxText: {
    fontSize: 9,
    color: colors.textSecondary,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  infoBoxBadgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  infoBoxBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoBoxBadgeText: {
    fontSize: 8,
    color: colors.textSecondary,
  },
  infoBoxBadgeValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  // Conditions box (yellow)
  conditionsBox: {
    marginTop: 16,
    backgroundColor: "#fff8e1",
    borderWidth: 1,
    borderColor: "#ffc107",
    borderRadius: 6,
    padding: 12,
  },
  conditionsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#f57c00",
    marginBottom: 8,
  },
  conditionsText: {
    fontSize: 9,
    color: colors.textSecondary,
    lineHeight: 1.5,
  },
  // Orange info box
  infoBoxOrange: {
    marginTop: 16,
    backgroundColor: "#fff3e0",
    borderWidth: 1,
    borderColor: "#ff9800",
    borderRadius: 6,
    padding: 12,
  },
  infoBoxOrangeTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#f57c00",
    marginBottom: 8,
  },
  // Red warning box
  warningBoxRed: {
    marginTop: 16,
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#f44336",
    borderRadius: 6,
    padding: 12,
  },
  warningBoxRedTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#f44336",
    marginBottom: 8,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "#9e9e9e",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
});

// Helper function to derive support values based on business rules
const getSupportValues = (incentiveResult: IncentiveResult) => {
  const { region } = incentiveResult.location;
  const { isTarget } = incentiveResult.sector;
  const targetSupports = { taxDiscount: "20", interestSupport: "N/A", cap: "N/A" };
  if (isTarget && [4, 5, 6].includes(region)) {
    targetSupports.interestSupport = "25";
    targetSupports.cap = "15100000";
  }
  const prioritySupports = { taxDiscount: "30", interestSupport: "25", cap: "30100000" };
  return { target: targetSupports, priority: prioritySupports };
};

interface IncentiveReportProps {
  incentiveResult: IncentiveResult;
  importantInfos?: string[]; // Önemli bilgiler listesi
}

const IncentiveReportPDF: React.FC<IncentiveReportProps> = ({ incentiveResult, importantInfos = [] }) => {
  const supportValues = getSupportValues(incentiveResult);
  const specialProgram = incentiveResult.location.specialProgram;
  const hasSpecialProgram = specialProgram?.isEligible;
  const isEarthquakeZone = specialProgram?.programType === "earthquake_zone";
  const isCazibeMerkezi = specialProgram?.programType === "cazibe_merkezleri";

  // Warning conditions
  const { region, province } = incentiveResult.location;
  const { isTarget, isMidHighTech, isHighTech, isPriority } = incentiveResult.sector;
  const naceCode = incentiveResult.sector.nace_code || "";

  // Istanbul mining sectors check (NACE codes starting with 05, 06, 07, 08, 09)
  const miningNacePrefixes = ["05", "06", "07", "08", "09"];
  const isMiningSector = miningNacePrefixes.some((prefix) => naceCode.startsWith(prefix));
  const isIstanbulMining = province === "İstanbul" && isMiningSector;

  // İstanbul'da madencilik sektörleri desteklenmiyor
  const showIstanbulMiningWarning = isIstanbulMining;

  // Hedef yatırımlar için 4-5-6. bölgelerde faiz/kar payı %10 limit uyarısı
  const showInterestCapWarning = isTarget && [4, 5, 6].includes(region) && !isIstanbulMining;

  // Build importantInfos list if not passed from parent
  const computedImportantInfos: string[] =
    importantInfos.length > 0
      ? importantInfos
      : (() => {
          const infos: string[] = [];

          if (isTarget && province === "İstanbul" && !isIstanbulMining) {
            infos.push("İstanbul ilinde hedef yatırımlar için Vergi İndirimi Desteği uygulanmamaktadır.");
          }

          if (isTarget && [1, 2, 3].includes(region) && !hasSpecialProgram) {
            infos.push("Hedef sektörler için Faiz/Kar Payı Desteği 1., 2. ve 3. bölgelerde uygulanmamaktadır.");
          }

          if (isMidHighTech && !isPriority) {
            infos.push(
              "Bu yatırım orta-yüksek teknoloji yatırımı niteliğindedir. Öncelikli yatırım statüsü kazanabilmesi için İstanbul ili dışında gerçekleştirilmesi ve yatırım tutarının en az 1.255.000.000 TL olması gerekmektedir. Bu şartlar sağlanmadığı takdirde Hedef yatırım olarak değerlendirilir.",
            );
          }

          if (isHighTech && !isMidHighTech && !isPriority) {
            infos.push(
              "Bu yatırım yüksek teknoloji yatırımı niteliğindedir. Öncelikli yatırım statüsü kazanabilmesi için yatırım tutarının en az 627.000.000 TL olması gerekmektedir. Bu şartı sağlamadığı takdirde Hedef yatırım olarak değerlendirilir.",
            );
          }

          return infos;
        })();

  return (
    <Document title={`Teşvik Raporu - ${incentiveResult.sector.nace_code}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src="/logo/logo.png" style={styles.logo} />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Teşvik Sonuçları Raporu</Text>
            <Text style={styles.reportDate}>Oluşturma Tarihi: {new Date().toLocaleDateString("tr-TR")}</Text>
          </View>
        </View>

        {/* Yatırım Künyesi Section */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>YATIRIM KÜNYESİ</Text>
        </View>

        <View style={styles.kunyeContainer}>
          <Text style={styles.sectorName}>{incentiveResult.sector.name}</Text>

          <View style={styles.kunyeGrid}>
            {/* Left Column */}
            <View style={styles.kunyeColumn}>
              <View style={styles.kunyeRow}>
                <Text style={styles.kunyeLabel}>NACE Kodu</Text>
                <Text style={[styles.badge, { backgroundColor: colors.badgeBlue }]}>
                  {incentiveResult.sector.nace_code}
                </Text>
              </View>
              <View style={styles.kunyeRow}>
                <Text style={styles.kunyeLabel}>Alt Bölge</Text>
                <Text style={styles.kunyeValue}>{incentiveResult.location.subregion || "-"}</Text>
              </View>
              <View style={styles.kunyeRow}>
                <Text style={styles.kunyeLabel}>Min. Yatırım Tutarı</Text>
                {isMidHighTech || isHighTech ? (
                  <View>
                    <Text style={styles.kunyeValue}>
                      Hedef: {incentiveResult.sector.minInvestment?.toLocaleString("tr-TR")} TL
                    </Text>
                    <Text style={[styles.kunyeValue, { color: colors.success, marginTop: 2 }]}>
                      Öncelikli: {isMidHighTech ? "1.255.000.000 TL" : "627.000.000 TL"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.kunyeValueLarge}>
                    {incentiveResult.sector.minInvestment?.toLocaleString("tr-TR")} TL
                  </Text>
                )}
              </View>
            </View>

            {/* Right Column */}
            <View style={styles.kunyeColumn}>
              <View style={styles.kunyeRow}>
                <Text style={styles.kunyeLabel}>Lokasyon</Text>
                <View style={styles.locationBadgeRow}>
                  <Text style={styles.kunyeValue}>
                    {incentiveResult.location.province} / {incentiveResult.location.district}
                  </Text>
                  {isEarthquakeZone && (
                    <Text style={[styles.badge, { backgroundColor: colors.badgeRed }]}>Deprem Bölgesi</Text>
                  )}
                  {isCazibeMerkezi && (
                    <Text style={[styles.badge, { backgroundColor: colors.badgeOrange }]}>Cazibe Merkezi</Text>
                  )}
                </View>
              </View>
              <View style={styles.kunyeRow}>
                <Text style={styles.kunyeLabel}>Bölge</Text>
                <Text style={styles.kunyeValue}>{incentiveResult.location.region}. Bölge</Text>
              </View>
              <View style={styles.kunyeRow}>
                <Text style={styles.kunyeLabel}>OSB/EB</Text>
                <Text style={styles.kunyeValue}>{incentiveResult.location.osb_status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Destekler Section */}
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>DESTEKLER</Text>
        </View>

        <View style={styles.desteklerGrid}>
          {/* Genel Destekler Card */}
          <View style={styles.destekCard}>
            <Text style={styles.destekCardTitle}>Genel Destekler</Text>
            <View style={styles.destekRow}>
              <Text style={styles.destekLabel}>KDV İstisnası</Text>
              <Text style={styles.destekValueSuccess}>{incentiveResult.supports.vat_exemption ? "EVET" : "HAYIR"}</Text>
            </View>
            <View style={styles.destekRow}>
              <Text style={styles.destekLabel}>Gümrük Vergisi Muafiyeti</Text>
              <Text style={styles.destekValueSuccess}>
                {incentiveResult.supports.customs_exemption ? "EVET" : "HAYIR"}
              </Text>
            </View>
            <View style={styles.destekRow}>
              <Text style={styles.destekLabel}>Yatırım Yeri Tahsisi</Text>
              <Text style={styles.destekValueSuccess}>EVET</Text>
            </View>
          </View>

          {/* Hedef Yatırım Destekleri Kartı */}
          {(isTarget || isMidHighTech || isHighTech) && (
            <View style={styles.destekCard}>
              <Text style={styles.destekCardTitle}>Hedef Yatırım Destekleri</Text>
              <View style={styles.destekRow}>
                <Text style={styles.destekLabel}>SGK Destek Süresi</Text>
                <Text style={styles.destekValue}>{incentiveResult.location.sgk_duration}</Text>
              </View>
              <View style={styles.destekRow}>
                <Text style={styles.destekLabel}>Vergi İndirimi (YKO)</Text>
                <Text style={styles.destekValue}>%{supportValues.target.taxDiscount}</Text>
              </View>
              <View style={styles.destekRow}>
                <Text style={styles.destekLabel}>Faiz/Kâr Payı Oranı</Text>
                <Text style={styles.destekValue}>
                  {supportValues.target.interestSupport !== "N/A" ? `%${supportValues.target.interestSupport}` : "-"}
                </Text>
              </View>
              <View style={styles.destekRow}>
                <Text style={styles.destekLabel}>Faiz/Kâr Payı Limiti</Text>
                <Text style={styles.destekValue}>
                  {supportValues.target.cap !== "N/A"
                    ? `${parseFloat(supportValues.target.cap).toLocaleString("tr-TR")} TL`
                    : "-"}
                </Text>
              </View>
            </View>
          )}

          {/* Öncelikli Yatırım Destekleri Kartı */}
          {(isPriority || isMidHighTech || isHighTech) && (
            <View style={styles.destekCard}>
              <Text style={[styles.destekCardTitle, { color: colors.success }]}>
                {isMidHighTech
                  ? "Öncelikli Yatırım Destekleri"
                  : isHighTech
                    ? "Öncelikli Yatırım Destekleri"
                    : "Öncelikli Yatırım Destekleri"}
              </Text>
              <View style={styles.destekRow}>
                <Text style={styles.destekLabel}>SGK Destek Süresi</Text>
                <Text style={styles.destekValue}>{incentiveResult.location.sgk_duration}</Text>
              </View>
              <View style={styles.destekRow}>
                <Text style={styles.destekLabel}>Vergi İndirimi (YKO)</Text>
                <Text style={styles.destekValue}>%{supportValues.priority.taxDiscount}</Text>
              </View>
              <View style={styles.destekRow}>
                <Text style={styles.destekLabel}>Faiz/Kâr Payı Oranı</Text>
                <Text style={styles.destekValue}>%{supportValues.priority.interestSupport}</Text>
              </View>
              <View style={styles.destekRow}>
                <Text style={styles.destekLabel}>Faiz/Kâr Payı Limiti</Text>
                <Text style={styles.destekValue}>
                  {parseFloat(supportValues.priority.cap).toLocaleString("tr-TR")} TL
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Özel Şartlar Section */}
        {hasSpecialProgram && (
          <>
            <View style={styles.sectionTitle}>
              <Text style={styles.sectionTitleText}>Özel Şartlar</Text>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoBoxHeader}>
                <View style={styles.infoBoxCheckIcon}>
                  <Text style={styles.infoBoxCheckText}>✓</Text>
                </View>
                <Text style={styles.infoBoxTitle}>
                  {isEarthquakeZone ? "Deprem Bölgesi Teşviki Uygulandı" : "Cazibe Merkezi Teşviki Uygulandı"}
                </Text>
              </View>
              <Text style={styles.infoBoxText}>
                {specialProgram?.description ||
                  (isEarthquakeZone
                    ? "Bu yatırım deprem bölgesinde yapılacağından, teşvik hesaplamaları deprem bölgesi teşviklerine göre güncellenmiştir."
                    : "Bu yatırım cazibe merkezi kapsamında olduğundan, teşvik hesaplamaları cazibe merkezi teşviklerine göre güncellenmiştir.")}
              </Text>
              <View style={styles.infoBoxBadgeRow}>
                <View style={styles.infoBoxBadge}>
                  <Text style={styles.infoBoxBadgeText}>Orijinal</Text>
                  <Text style={styles.infoBoxBadgeValue}>
                    {specialProgram?.originalRegion || incentiveResult.location.originalRegion}. Bölge
                  </Text>
                </View>
                <View style={styles.infoBoxBadge}>
                  <Text style={styles.infoBoxBadgeText}>Uygulanan</Text>
                  <Text style={styles.infoBoxBadgeValue}>
                    {specialProgram?.appliedRegion || incentiveResult.location.region}. Bölge
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Conditions Box (if sector has conditions) */}
        {incentiveResult.sector.conditions && (
          <View style={styles.conditionsBox}>
            <Text style={styles.conditionsTitle}>Özel Şartlar ve Koşullar</Text>
            <Text style={styles.conditionsText}>{incentiveResult.sector.conditions}</Text>
          </View>
        )}

        {/* Birleşik Önemli Bilgi Kutusu */}
        {computedImportantInfos.length > 0 && (
          <View style={styles.infoBoxOrange}>
            <Text style={styles.infoBoxOrangeTitle}>Önemli Bilgi</Text>
            {computedImportantInfos.map((info, idx) => (
              <Text key={idx} style={[styles.conditionsText, { marginBottom: 4 }]}>
                • {info}
              </Text>
            ))}
          </View>
        )}

        {/* İstanbul Madencilik Uyarısı (Kırmızı Kutu) */}
        {showIstanbulMiningWarning && (
          <View style={styles.warningBoxRed}>
            <Text style={styles.warningBoxRedTitle}>Önemli Uyarı</Text>
            <Text style={styles.conditionsText}>Seçilen sektör İstanbul ilinde desteklenmemektedir.</Text>
          </View>
        )}

        {/* Faiz/Kar Payı %10 Limit Uyarısı (Sarı Kutu) */}
        {showInterestCapWarning && (
          <View style={styles.conditionsBox}>
            <Text style={styles.conditionsTitle}>Önemli Uyarı</Text>
            <Text style={styles.conditionsText}>
              Faiz/Kar Payı Desteği toplam sabit yatırım tutarının %10'unu geçemez.
            </Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Bu rapor sistem tarafından otomatik olarak oluşturulmuştur. Detaylı bilgi için ilgili kurumlara başvurunuz.
        </Text>
      </Page>
    </Document>
  );
};

export default IncentiveReportPDF;

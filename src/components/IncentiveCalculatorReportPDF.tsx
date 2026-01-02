import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { IncentiveCalculatorResults, IncentiveCalculatorInputs } from "@/types/incentiveCalculator";

// Roboto for Turkish chars
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

const colors = {
  headerBlue: "#1146B7", // header mavi (görsele yakın)
  white: "#FFFFFF",
  text: "#1F2937",
  muted: "#6B7280",
  primary: "#0B4DBA",        // koyu mavi (sol şerit + yazı)
  sectionTitleBg: "#E7F3FF", // çok açık mavi bant (görsel gibi)
  // Daha açık gri (kutu arka planı)
  panelBg: "#F7F8FA",
  panelBorder: "#E8ECF2",
  rowDivider: "#E5E7EB",

  // Title band (görseldeki açık mavi bant)
  titleBandBg: "#E7F3FF",
  titleBandStrip: "#0B4DBA",
  titleBandText: "#0B4DBA",

  totalGreen: "#16A34A",

  footerBg: "#F3F4F6",
  footerBorder: "#E5E7EB",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    fontFamily: "Roboto",
    padding: 0,
  },

  // HEADER
  header: {
    backgroundColor: colors.headerBlue,
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Yeşil çerçeve yok: sadece hafif border
  logoBox: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLogo: {
    width: 240,
    height: 52,
    objectFit: "contain",
  },

  headerRight: {
    alignItems: "flex-end",
    maxWidth: 320,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 9,
    color: "rgba(255,255,255,0.70)",
  },

  // BODY
  body: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 92, // footer alanı
  },

  // SECTION TITLE BAND (görsel gibi)

  sectionTitle: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.sectionTitleBg,
  paddingVertical: 10,     // bant yüksekliği
  paddingHorizontal: 12,
  marginTop: 18,
  marginBottom: 12,
  },

  sectionTitleStrip: {
    width: 4,                // soldaki dikey mavi şerit
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    marginRight: 12,
  },

  sectionTitleText: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.primary,
  },

  sectionTitleBand: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.titleBandBg,
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
 

  // PANEL (gri büyük kutu — daha açık)
  panel: {
    backgroundColor: colors.panelBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
  },

  // Üst özet (Toplam sabit / toplam makine)
  topSummaryRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  topSummaryItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
  },
  topSummaryItemRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "flex-end",
  },
  topSummaryLabel: {
    fontSize: 9.5,
    color: colors.muted,
    marginRight: 8,
  },
  topSummaryValue: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: colors.text,
  },

  // Two column layout
  twoCol: {
    flexDirection: "row",
  },
  colLeft: {
    flex: 1,
    paddingRight: 10,
  },
  colRight: {
    flex: 1,
    paddingLeft: 10,
  },

  kvRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  kvLabel: {
    width: 160,
    fontSize: 9.5,
    color: colors.muted,
  },
  kvValue: {
    flex: 1,
    fontSize: 9.8,
    color: colors.text,
    fontWeight: "bold",
  },
  kvValueRight: {
    flex: 1,
    fontSize: 9.8,
    color: colors.text,
    fontWeight: "bold",
    textAlign: "right",
  },

  // SUPPORT LIST (görseldeki gibi sade satırlar)
  list: {
    backgroundColor: colors.panelBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingTop: 6,
    paddingBottom: 6,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.rowDivider,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listLabel: {
    fontSize: 10,
    color: colors.muted,
    flex: 1,
  },
  listValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "right",
  },

  // Total bar (altta çizgi + yeşil değer)
  totalBar: {
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#9CA3AF",
    paddingTop: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.text,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.totalGreen,
  },

  // Warning (varsa)
  warningBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#B91C1C",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 9.5,
    color: colors.text,
    lineHeight: 1.35,
  },

  // FOOTER (gri kutu)
  footer: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 20,
    backgroundColor: colors.footerBg,
    borderWidth: 1,
    borderColor: colors.footerBorder,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  footerText: {
    fontSize: 7.5,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 1.4,
  },
});

interface IncentiveCalculatorReportProps {
  results: IncentiveCalculatorResults;
  inputs: IncentiveCalculatorInputs;
}

export const IncentiveCalculatorReportPDF: React.FC<IncentiveCalculatorReportProps> = ({ results, inputs }) => {
  const formatCurrency = (amount: number): string => `${amount.toLocaleString("tr-TR")} TL`;

  const getSupportPreferenceText = (preference: string): string =>
    preference === "Interest/Profit Share Support" ? "Faiz/Kar Payı Desteği" : "Makine Desteği";

  const getIncentiveTypeText = (type: string): string => {
    switch (type) {
      case "Technology Initiative":
        return "Teknoloji Hamlesi";
      case "Local Development Initiative":
        return "Yerel Kalkınma Hamlesi";
      case "Strategic Initiative":
        return "Stratejik Hamle";
      default:
        return type;
    }
  };

  const getTaxReductionText = (preference: string): string => (preference === "Yes" ? "Evet" : "Hayır");

  const totalMachineryCost = inputs.importedMachineryCost + inputs.domesticMachineryCost;

  const totalSupport =
    results.sgkEmployerPremiumSupport +
    results.sgkEmployeePremiumSupport +
    results.taxReductionInvestmentContribution +
    results.machinerySupportAmount +
    results.interestProfitShareSupportAmount +
    results.vatExemptionAmount +
    results.customsExemptionAmount;

  const reportDate = new Date();
  const formattedDate = reportDate.toLocaleDateString("tr-TR");
  const formattedTime = reportDate.toLocaleTimeString("tr-TR");

  return (
    <Document title={`Teşvik Hesaplama Raporu - ${inputs.province} - ${formattedDate}`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              {/* Bu görseli senin birleşik logo görselinle değiştirmen en temiz sonuç verir */}
              <Image style={styles.headerLogo} src="/logo/logo.png" />
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Türkiye Yüzyılı Teşvikleri Hesaplama Raporu</Text>
            <Text style={styles.headerSubtitle}>Yatırım Teşvik Sistemi - Hesaplama Sonuçları</Text>
            <Text style={styles.headerDate}>
              Rapor Tarihi: {formattedDate} {formattedTime}
            </Text>
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {/* WARNINGS */}
          {results.warningMessages?.length ? (
            <View style={{ marginBottom: 12 }}>
              {results.warningMessages.map((w, i) => (
                <View key={i} style={styles.warningBox}>
                  <Text style={styles.warningTitle}>Önemli Uyarı</Text>
                  <Text style={styles.warningText}>{w}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* YATIRIM KÜNYESİ - başlık bandı */}
          <View style={styles.sectionTitle}>
            <View style={styles.sectionTitleStrip} />
            <Text style={styles.sectionTitleText}>YATIRIM KÜNYESİ</Text>
          </View>

          <View style={styles.panel}>
            {/* Üst özet satırı */}
            <View style={styles.topSummaryRow}>
              <View style={styles.topSummaryItemLeft}>
                <Text style={styles.topSummaryLabel}>Toplam Sabit Yatırım Tutarı:</Text>
                <Text style={styles.topSummaryValue}>{formatCurrency(results.totalFixedInvestment)}</Text>
              </View>

              <View style={styles.topSummaryItemRight}>
                <Text style={styles.topSummaryLabel}>Toplam Makine Maliyeti:</Text>
                <Text style={styles.topSummaryValue}>{formatCurrency(totalMachineryCost)}</Text>
              </View>
            </View>

            {/* 2 sütun künye */}
            <View style={styles.twoCol}>
              <View style={styles.colLeft}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Teşvik Türü:</Text>
                  <Text style={styles.kvValue}>{getIncentiveTypeText(inputs.incentiveType)}</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Yatırım İli:</Text>
                  <Text style={styles.kvValue}>{inputs.province}</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Çalışan Sayısı:</Text>
                  <Text style={styles.kvValue}>{inputs.numberOfEmployees} kişi</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Arsa Maliyeti:</Text>
                  <Text style={styles.kvValue}>{formatCurrency(inputs.landCost)}</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>İnşaat Maliyeti:</Text>
                  <Text style={styles.kvValue}>{formatCurrency(inputs.constructionCost)}</Text>
                </View>
              </View>

              <View style={styles.colRight}>
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>İthal Makine Maliyeti:</Text>
                  <Text style={styles.kvValueRight}>{formatCurrency(inputs.importedMachineryCost)}</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Yerli Makine Maliyeti:</Text>
                  <Text style={styles.kvValueRight}>{formatCurrency(inputs.domesticMachineryCost)}</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Diğer Giderler:</Text>
                  <Text style={styles.kvValueRight}>{formatCurrency(inputs.otherExpenses)}</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Destek Tercihi:</Text>
                  <Text style={styles.kvValueRight}>{getSupportPreferenceText(inputs.supportPreference)}</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Vergi İndirimi Desteği:</Text>
                  <Text style={styles.kvValueRight}>{getTaxReductionText(inputs.taxReductionSupport)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* TOPLAM DESTEK ÖZETİ - başlık bandı */}
          
            <View style={styles.sectionTitle}>
              <View style={styles.sectionTitleStrip} />
              <Text style={styles.sectionTitleText}>TOPLAM DESTEK ÖZETİ</Text>
            </View>
          

            <View style={styles.list}>
              <View style={styles.listRow}>
                <Text style={styles.listLabel}>SGK İşveren Primi Desteği:</Text>
                <Text style={styles.listValue}>{formatCurrency(results.sgkEmployerPremiumSupport)}</Text>
              </View>

              <View style={styles.listRow}>
                <Text style={styles.listLabel}>SGK İşçi Primi Desteği:</Text>
                <Text style={styles.listValue}>{formatCurrency(results.sgkEmployeePremiumSupport)}</Text>
              </View>

              <View style={styles.listRow}>
                <Text style={styles.listLabel}>Vergi İndirimi / Yatırıma Katkı:</Text>
                <Text style={styles.listValue}>{formatCurrency(results.taxReductionInvestmentContribution)}</Text>
              </View>

              {results.machinerySupportAmount > 0 && (
                <View style={styles.listRow}>
                  <Text style={styles.listLabel}>Makine Desteği:</Text>
                  <Text style={styles.listValue}>{formatCurrency(results.machinerySupportAmount)}</Text>
                </View>
              )}

              {results.interestProfitShareSupportAmount > 0 && (
                <View style={styles.listRow}>
                  <Text style={styles.listLabel}>Faiz/Kar Payı Desteği:</Text>
                  <Text style={styles.listValue}>{formatCurrency(results.interestProfitShareSupportAmount)}</Text>
                </View>
              )}

              <View style={styles.listRow}>
                <Text style={styles.listLabel}>KDV Muafiyeti:</Text>
                <Text style={styles.listValue}>{formatCurrency(results.vatExemptionAmount)}</Text>
              </View>

              <View style={[styles.listRow, styles.listRowLast]}>
                <Text style={styles.listLabel}>Gümrük Vergisi Muafiyeti:</Text>
                <Text style={styles.listValue}>{formatCurrency(results.customsExemptionAmount)}</Text>
              </View>

              <View style={styles.totalBar}>
                <Text style={styles.totalLabel}>Toplam Parasal Destek:</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalSupport)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Bu rapor Türkiye Yüzyılı Kalkınma Hamlesi çerçevesinde hazırlanmış olup, yalnızca bilgilendirme amaçlıdır.
            Kesin sonuçlar için resmi kurumlara başvurunuz.{"\n"}
            Rapor tarihi: {formattedDate} {formattedTime}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default IncentiveCalculatorReportPDF;

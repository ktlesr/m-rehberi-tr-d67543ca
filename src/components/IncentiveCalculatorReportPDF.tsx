import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { IncentiveCalculatorResults, IncentiveCalculatorInputs } from "@/types/incentiveCalculator";

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
  headerBlue: "#0B3FAE", // görsele yakın mavi
  white: "#FFFFFF",
  text: "#1F2937",
  muted: "#6B7280",
  linkBlue: "#1D4ED8",
  panelBg: "#F3F4F6",
  panelBorder: "#E5E7EB",
  rowDivider: "#E5E7EB",
  totalGreen: "#16A34A",
  footerBg: "#F3F4F6",
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
  logoBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerLogo: {
    width: 170,
    height: 46,
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

  // BODY WRAPPER
  body: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 88, // footer için alan
  },

  // SECTION TITLE (görseldeki gibi mavi metin, alt çizgi hissi)
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.linkBlue,
    marginBottom: 8,
  },

  // PANEL (gri büyük kutu)
  panel: {
    backgroundColor: colors.panelBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
  },

  // KÜNYE ÜST ÖZET (Toplam Sabit / Toplam Makine)
  topSummaryRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  topSummaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
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

  // KÜNYE 2 SÜTUN
  twoCol: {
    flexDirection: "row",
  },
  col: {
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
    width: 150,
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

  // DESTEK LİSTESİ
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
    paddingVertical: 7,
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

  // TOPLAM SATIRI (görseldeki gibi alt tarafta ayrı satır + yeşil değer)
  totalBar: {
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#9CA3AF", // görseldeki koyu çizgi hissi
    paddingTop: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 12,
    color: colors.totalGreen,
    fontWeight: "bold",
  },

  // UYARI (görselde çok belirgin değil; sade tuttum)
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

  // FOOTER (görseldeki gri kutu gibi)
  footer: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 20,
    backgroundColor: colors.footerBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
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
              {/* İstersen buraya 2 logo koymak için iki Image yan yana ekleyebilirsin */}
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

          {/* YATIRIM KÜNYESİ */}
          <Text style={styles.sectionTitle}>Yatırım Künyesi</Text>
          <View style={styles.panel}>
            {/* Üst özet (görselde tek satırda iki bilgi) */}
            <View style={styles.topSummaryRow}>
              <View style={styles.topSummaryItem}>
                <Text style={styles.topSummaryLabel}>Toplam Sabit Yatırım Tutarı:</Text>
                <Text style={styles.topSummaryValue}>{formatCurrency(results.totalFixedInvestment)}</Text>
              </View>

              <View style={[styles.topSummaryItem, { justifyContent: "flex-end" }]}>
                <Text style={styles.topSummaryLabel}>Toplam Makine Maliyeti:</Text>
                <Text style={styles.topSummaryValue}>{formatCurrency(totalMachineryCost)}</Text>
              </View>
            </View>

            {/* Alt künye: 2 sütun */}
            <View style={styles.twoCol}>
              <View style={styles.col}>
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

          {/* TOPLAM DESTEK ÖZETİ */}
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Toplam Destek Özeti</Text>

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

              {/* Görseldeki gibi alt toplam bar */}
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

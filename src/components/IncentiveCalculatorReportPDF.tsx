import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import {
  IncentiveCalculatorResults,
  IncentiveCalculatorInputs,
} from "@/types/incentiveCalculator";

// Register Roboto fonts for better Turkish character support
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

// Color palette matching the design system
const colors = {
  primary: "#0011B3", // Deep Blue
  primaryLight: "#e3f2fd",
  sectionTitle: "#1565c0",
  sectionTitleBg: "#e3f2fd",
  textPrimary: "#212121",
  textSecondary: "#616161",
  success: "#2e7d32",
  successBg: "#e8f5e9",
  warning: "#f9a825",
  warningBg: "#fffde7",
  danger: "#c62828",
  dangerBg: "#ffebee",
  info: "#0288d1",
  infoBg: "#e1f5fe",
  gray: "#9e9e9e",
  lightGray: "#f5f5f5",
  white: "#ffffff",
  border: "#e0e0e0",
  badgeBlue: "#1976d2",
  badgeGreen: "#388e3c",
  badgeOrange: "#f57c00",
  badgeRed: "#d32f2f",
};

// Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: colors.white,
    padding: 0,
    fontFamily: "Roboto",
  },
  // Header
  header: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLogos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 50,
    height: 50,
    objectFit: "contain",
  },
  headerTextContainer: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
  },
  // Content wrapper
  contentWrapper: {
    padding: 24,
  },
  // Section
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: colors.sectionTitleBg,
    padding: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.sectionTitle,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.sectionTitle,
  },
  // Künye Grid
  kunyeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  kunyeItem: {
    width: "50%",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  kunyeBox: {
    backgroundColor: colors.lightGray,
    borderRadius: 4,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  kunyeLabel: {
    fontSize: 8,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  kunyeValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  // Support list
  supportList: {
    backgroundColor: colors.lightGray,
    borderRadius: 6,
    padding: 12,
  },
  supportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  supportRowLast: {
    borderBottomWidth: 0,
  },
  supportLabel: {
    fontSize: 10,
    color: colors.textPrimary,
    flex: 1,
  },
  supportValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "right",
  },
  // Total row
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primary,
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.white,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.white,
  },
  // Warning/Info boxes
  infoBox: {
    marginTop: 12,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: 6,
    padding: 10,
  },
  infoBoxTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.info,
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 9,
    color: colors.textPrimary,
    lineHeight: 1.4,
  },
  warningBox: {
    marginTop: 12,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 6,
    padding: 10,
  },
  warningBoxTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.badgeOrange,
    marginBottom: 4,
  },
  warningBoxText: {
    fontSize: 9,
    color: colors.textPrimary,
    lineHeight: 1.4,
  },
  dangerBox: {
    marginTop: 12,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.badgeRed,
    borderRadius: 6,
    padding: 10,
  },
  dangerBoxTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.badgeRed,
    marginBottom: 4,
  },
  dangerBoxText: {
    fontSize: 9,
    color: colors.textPrimary,
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.lightGray,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 7,
    color: colors.gray,
    textAlign: "center",
    lineHeight: 1.5,
  },
  // Badge styles
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.white,
  },
});

interface IncentiveCalculatorReportProps {
  results: IncentiveCalculatorResults;
  inputs: IncentiveCalculatorInputs;
}

export const IncentiveCalculatorReportPDF: React.FC<
  IncentiveCalculatorReportProps
> = ({ results, inputs }) => {
  const formatCurrency = (amount: number): string => {
    return `${amount.toLocaleString("tr-TR")} TL`;
  };

  const getSupportPreferenceText = (preference: string): string => {
    return preference === "Interest/Profit Share Support"
      ? "Faiz/Kar Payı Desteği"
      : "Makine Desteği";
  };

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

  const getTaxReductionText = (preference: string): string => {
    return preference === "Yes" ? "Evet" : "Hayır";
  };

  const totalMachineryCost =
    inputs.importedMachineryCost + inputs.domesticMachineryCost;

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
    <Document
      title={`Teşvik Hesaplama Raporu - ${inputs.province} - ${formattedDate}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLogos}>
            <Image style={styles.headerLogo} src="/logo/logo.png" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Türkiye Yüzyılı Teşvikleri Hesaplama Raporu
            </Text>
            <Text style={styles.headerSubtitle}>
              Yatırım Teşvik Sistemi - Hesaplama Sonuçları
            </Text>
            <Text style={styles.headerDate}>
              Rapor Tarihi: {formattedDate} {formattedTime}
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentWrapper}>
          {/* Warning Messages */}
          {results.warningMessages && results.warningMessages.length > 0 && (
            <View style={styles.section}>
              {results.warningMessages.map((warning, index) => (
                <View key={index} style={styles.dangerBox}>
                  <Text style={styles.dangerBoxTitle}>Önemli Uyarı</Text>
                  <Text style={styles.dangerBoxText}>{warning}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Yatırım Künyesi */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yatırım Künyesi</Text>
            </View>
            <View style={styles.kunyeGrid}>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>
                    Toplam Sabit Yatırım Tutarı
                  </Text>
                  <Text style={styles.kunyeValue}>
                    {formatCurrency(results.totalFixedInvestment)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Toplam Makine Maliyeti</Text>
                  <Text style={styles.kunyeValue}>
                    {formatCurrency(totalMachineryCost)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Teşvik Türü</Text>
                  <Text style={styles.kunyeValue}>
                    {getIncentiveTypeText(inputs.incentiveType)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Yatırım İli</Text>
                  <Text style={styles.kunyeValue}>{inputs.province}</Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Çalışan Sayısı</Text>
                  <Text style={styles.kunyeValue}>
                    {inputs.numberOfEmployees} kişi
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Arsa Maliyeti</Text>
                  <Text style={styles.kunyeValue}>
                    {formatCurrency(inputs.landCost)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>İnşaat Maliyeti</Text>
                  <Text style={styles.kunyeValue}>
                    {formatCurrency(inputs.constructionCost)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>İthal Makine Maliyeti</Text>
                  <Text style={styles.kunyeValue}>
                    {formatCurrency(inputs.importedMachineryCost)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Yerli Makine Maliyeti</Text>
                  <Text style={styles.kunyeValue}>
                    {formatCurrency(inputs.domesticMachineryCost)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Diğer Giderler</Text>
                  <Text style={styles.kunyeValue}>
                    {formatCurrency(inputs.otherExpenses)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Destek Tercihi</Text>
                  <Text style={styles.kunyeValue}>
                    {getSupportPreferenceText(inputs.supportPreference)}
                  </Text>
                </View>
              </View>
              <View style={styles.kunyeItem}>
                <View style={styles.kunyeBox}>
                  <Text style={styles.kunyeLabel}>Vergi İndirimi Tercihi</Text>
                  <Text style={styles.kunyeValue}>
                    {getTaxReductionText(inputs.taxReductionSupport)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Toplam Destek Özeti */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Toplam Destek Özeti</Text>
            </View>
            <View style={styles.supportList}>
              <View style={styles.supportRow}>
                <Text style={styles.supportLabel}>
                  SGK İşveren Primi Desteği
                </Text>
                <Text style={styles.supportValue}>
                  {formatCurrency(results.sgkEmployerPremiumSupport)}
                </Text>
              </View>
              <View style={styles.supportRow}>
                <Text style={styles.supportLabel}>SGK İşçi Primi Desteği</Text>
                <Text style={styles.supportValue}>
                  {formatCurrency(results.sgkEmployeePremiumSupport)}
                </Text>
              </View>
              <View style={styles.supportRow}>
                <Text style={styles.supportLabel}>
                  Vergi İndirimi / Yatırıma Katkı
                </Text>
                <Text style={styles.supportValue}>
                  {formatCurrency(results.taxReductionInvestmentContribution)}
                </Text>
              </View>
              {results.machinerySupportAmount > 0 && (
                <View style={styles.supportRow}>
                  <Text style={styles.supportLabel}>Makine Desteği</Text>
                  <Text style={styles.supportValue}>
                    {formatCurrency(results.machinerySupportAmount)}
                  </Text>
                </View>
              )}
              {results.interestProfitShareSupportAmount > 0 && (
                <View style={styles.supportRow}>
                  <Text style={styles.supportLabel}>Faiz/Kar Payı Desteği</Text>
                  <Text style={styles.supportValue}>
                    {formatCurrency(results.interestProfitShareSupportAmount)}
                  </Text>
                </View>
              )}
              <View style={styles.supportRow}>
                <Text style={styles.supportLabel}>KDV Muafiyeti (%20)</Text>
                <Text style={styles.supportValue}>
                  {formatCurrency(results.vatExemptionAmount)}
                </Text>
              </View>
              <View style={[styles.supportRow, styles.supportRowLast]}>
                <Text style={styles.supportLabel}>
                  Gümrük Vergisi Muafiyeti (%2)
                </Text>
                <Text style={styles.supportValue}>
                  {formatCurrency(results.customsExemptionAmount)}
                </Text>
              </View>

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Toplam Parasal Destek</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(totalSupport)}
                </Text>
              </View>
            </View>
          </View>

          {/* Tax Reduction Info */}
          {inputs.taxReductionSupport === "No" && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Bilgilendirme</Text>
              <Text style={styles.infoBoxText}>
                Vergi İndirimi Desteği tercih edilmediği için diğer desteklerin
                (Faiz/Kar Payı ve Makine) üst limitlerinde artış uygulanmıştır.
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Bu rapor Türkiye Yüzyılı Kalkınma Hamlesi çerçevesinde hazırlanmış
            olup, yalnızca bilgilendirme amaçlıdır. Kesin sonuçlar için resmi
            kurumlara başvurunuz.{"\n"}
            Rapor tarihi: {formattedDate} {formattedTime}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default IncentiveCalculatorReportPDF;

import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { IncentiveCalculatorResults, IncentiveCalculatorInputs } from "@/types/incentiveCalculator";

/* ---------------- FONT ---------------- */
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

/* ---------------- COLORS ---------------- */
const colors = {
  headerBlue: "#1146B7",

  primary: "#0B4DBA",
  sectionTitleBg: "#E7F3FF",

  text: "#1F2937",
  muted: "#6B7280",

  // DAHA AÇIK GRİ
  panelBg: "#F9FAFB",
  panelBorder: "#E5E7EB",
  rowDivider: "#E5E7EB",

  totalGreen: "#16A34A",

  footerBg: "#F3F4F6",
  footerBorder: "#E5E7EB",
};

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    fontFamily: "Roboto",
  },

  /* HEADER */
  header: {
    backgroundColor: colors.headerBlue,
    paddingVertical: 22,
    paddingHorizontal: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* ❌ NO BORDER – NO GREEN FRAME */
  logoBox: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  headerLogo: {
    width: 260,
    height: 54,
    objectFit: "contain",
  },

  headerRight: {
    alignItems: "flex-end",
    maxWidth: 320,
  },

  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  headerSubtitle: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
  },

  headerDate: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  /* BODY */
  body: {
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 90,
  },

  /* SECTION TITLE – BİREBİR */
  sectionTitleBand: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.sectionTitleBg,

    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 0,

    marginTop: 16,
    marginBottom: 12,
  },

  sectionTitleStrip: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: colors.primary,
    marginRight: 14,
  },

  sectionTitleText: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.primary,
  },

  /* PANEL */
  panel: {
    backgroundColor: colors.panelBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
  },

  /* SUMMARY */
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
    marginRight: 6,
  },

  topSummaryValue: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: colors.text,
  },

  /* TWO COL */
  twoCol: {
    flexDirection: "row",
  },

  colLeft: {
    flex: 1,
    paddingRight: 12,
  },

  colRight: {
    flex: 1,
    paddingLeft: 12,
  },

  kvRow: {
    flexDirection: "row",
    marginBottom: 6,
  },

  kvLabel: {
    width: 160,
    fontSize: 9.5,
    color: colors.muted,
  },

  kvValue: {
    fontSize: 9.8,
    fontWeight: "bold",
    color: colors.text,
    flex: 1,
  },

  kvValueRight: {
    fontSize: 9.8,
    fontWeight: "bold",
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },

  /* LIST */
  list: {
    backgroundColor: colors.panelBg,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingVertical: 6,
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

  /* TOTAL */
  totalBar: {
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#9CA3AF",
    paddingTop: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
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

  /* FOOTER */
  footer: {
    position: "absolute",
    left: 26,
    right: 26,
    bottom: 20,
    backgroundColor: colors.footerBg,
    borderWidth: 1,
    borderColor: colors.footerBorder,
    padding: 10,
  },

  footerText: {
    fontSize: 7.5,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 1.4,
  },
});

/* ---------------- COMPONENT ---------------- */
interface IncentiveCalculatorReportProps {
  results: IncentiveCalculatorResults;
  inputs: IncentiveCalculatorInputs;
}

const IncentiveCalculatorReportPDF: React.FC<IncentiveCalculatorReportProps> = ({ results, inputs }) => {
  const formatCurrency = (v: number) => `${v.toLocaleString("tr-TR")} TL`;

  const totalMachineryCost = inputs.importedMachineryCost + inputs.domesticMachineryCost;

  const totalSupport =
    results.sgkEmployerPremiumSupport +
    results.sgkEmployeePremiumSupport +
    results.taxReductionInvestmentContribution +
    results.machinerySupportAmount +
    results.interestProfitShareSupportAmount +
    results.vatExemptionAmount +
    results.customsExemptionAmount;

  const now = new Date();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              <Image style={styles.headerLogo} src="/logo/logo.png" />
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Türkiye Yüzyılı Teşvikleri Hesaplama Raporu</Text>
            <Text style={styles.headerSubtitle}>Yatırım Teşvik Sistemi - Hesaplama Sonuçları</Text>
            <Text style={styles.headerDate}>
              Rapor Tarihi: {now.toLocaleDateString("tr-TR")} {now.toLocaleTimeString("tr-TR")}
            </Text>
          </View>
        </View>

        {/* BODY */}
        <View style={styles.body}>
          {/* YATIRIM KÜNYESİ */}
          <View style={styles.sectionTitleBand}>
            <View style={styles.sectionTitleStrip} />
            <Text style={styles.sectionTitleText}>Yatırım Künyesi</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.topSummaryRow}>
              <View style={styles.topSummaryItemLeft}>
                <Text style={styles.topSummaryLabel}>Toplam Sabit Yatırım:</Text>
                <Text style={styles.topSummaryValue}>{formatCurrency(results.totalFixedInvestment)}</Text>
              </View>

              <View style={styles.topSummaryItemRight}>
                <Text style={styles.topSummaryLabel}>Toplam Makine:</Text>
                <Text style={styles.topSummaryValue}>{formatCurrency(totalMachineryCost)}</Text>
              </View>
            </View>
          </View>

          {/* TOPLAM DESTEK */}
          <View style={styles.sectionTitleBand}>
            <View style={styles.sectionTitleStrip} />
            <Text style={styles.sectionTitleText}>Toplam Destek Özeti</Text>
          </View>

          <View style={styles.list}>
            <View style={styles.listRow}>
              <Text style={styles.listLabel}>SGK İşveren Primi Desteği</Text>
              <Text style={styles.listValue}>{formatCurrency(results.sgkEmployerPremiumSupport)}</Text>
            </View>

            <View style={[styles.listRow, styles.listRowLast]}>
              <Text style={styles.listLabel}>Toplam Parasal Destek</Text>
              <Text style={styles.listValue}>{formatCurrency(totalSupport)}</Text>
            </View>

            <View style={styles.totalBar}>
              <Text style={styles.totalLabel}>GENEL TOPLAM</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalSupport)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Bu rapor yalnızca bilgilendirme amaçlıdır. Kesin sonuçlar için resmi kurumlara başvurunuz.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default IncentiveCalculatorReportPDF;

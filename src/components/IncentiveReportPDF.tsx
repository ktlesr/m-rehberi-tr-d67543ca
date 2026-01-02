// components/IncentiveReportPDF.tsx
import React from "react";
import { Page, Text, View, Document, StyleSheet, Font } from "@react-pdf/renderer";
import { IncentiveResult } from "@/types/incentive"; // Adjusted import

// IMPORTANT: Register a font that supports Turkish characters.
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: "/fonts/NotoSans-Regular.ttf" }, // Update path as needed
    { src: "/fonts/NotoSans-Bold.ttf", fontWeight: "bold" },
  ],
});

// A professional and clean color palette
const colors = {
  primary: "#0d47a1",
  secondary: "#1976d2",
  textPrimary: "#212121",
  textSecondary: "#757575",
  border: "#e0e0e0",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto Sans",
    fontSize: 10,
    padding: 30,
    color: colors.textPrimary,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: colors.primary,
    color: "white",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 25,
    borderRadius: 5,
    textAlign: "center",
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  reportDate: {
    fontSize: 9,
    color: "#bbdefb",
    marginTop: 4,
  },
  sectorInfo: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  sectorName: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
  },
  naceCode: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "bold",
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: "bold",
    color: "white",
  },
  columnsContainer: {
    flexDirection: "row",
    gap: 20,
  },
  column: {
    flex: 1,
    flexDirection: "column",
    gap: 15,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    // Ensure cards in a column don't break across pages individually
    breakInside: "avoid",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  label: {
    color: colors.textSecondary,
  },
  value: {
    fontWeight: "bold",
    textAlign: "right",
  },
  valueLarge: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.primary,
  },
  // Styles for the new info boxes
  infoBox: {
    marginTop: 15,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  conditionsBox: {
    backgroundColor: "#fef9e7", // Light yellow
    borderColor: "#f1c40f",
  },
  alertBox: {
    backgroundColor: "#fdedec", // Light red
    borderColor: "#e74c3c",
  },
  infoBoxTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  conditionsTitle: {
    color: "#f39c12", // Orange
  },
  alertTitle: {
    color: "#c0392b", // Red
  },
  infoBoxText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "#bdbdbd",
    fontSize: 8,
  },
});

// Helper function to derive support values based on business rules
const getSupportValues = (incentiveResult: IncentiveResult) => {
  const { region } = incentiveResult.location;
  const { isTarget } = incentiveResult.sector;
  const targetSupports = { taxDiscount: "20", interestSupport: "N/A", cap: "N/A" };
  if (isTarget && [4, 5, 6].includes(region)) {
    targetSupports.interestSupport = "25";
    targetSupports.cap = "12000000";
  }
  const prioritySupports = { taxDiscount: "30", interestSupport: "25", cap: "24000000" };
  return { target: targetSupports, priority: prioritySupports };
};

interface IncentiveReportProps {
  incentiveResult: IncentiveResult;
}

const IncentiveReportPDF: React.FC<IncentiveReportProps> = ({ incentiveResult }) => {
  const supportValues = getSupportValues(incentiveResult);

  return (
    <Document title={`Teşvik Raporu - ${incentiveResult.sector.nace_code}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.reportTitle}>Teşvik Sonuçları Raporu</Text>
          <Text style={styles.reportDate}>Oluşturma Tarihi: {new Date().toLocaleDateString("tr-TR")}</Text>
        </View>

        <View style={styles.sectorInfo}>
          <Text style={styles.sectorName}>{incentiveResult.sector.name}</Text>
          <Text style={styles.naceCode}>NACE Kodu: {incentiveResult.sector.nace_code}</Text>
          <View style={styles.badgeContainer}>
            {incentiveResult.sector.isTarget && (
              <Text style={[styles.badge, { backgroundColor: "#e65100" }]}>Hedef Yatırım</Text>
            )}
            {(incentiveResult.sector.isPriority ||
              incentiveResult.sector.isHighTech ||
              incentiveResult.sector.isMidHighTech) && (
              <Text style={[styles.badge, { backgroundColor: "#43a047" }]}>
                {incentiveResult.sector.isHighTech || incentiveResult.sector.isMidHighTech
                  ? "Öncelikli ve Yüksek/Orta-Yüksek Teknoloji"
                  : "Öncelikli Yatırım"}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.columnsContainer}>
          {/* LEFT COLUMN */}
          <View style={styles.column}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yatırım Künyesi</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Lokasyon</Text>
                <Text style={styles.value}>
                  {incentiveResult.location.province} / {incentiveResult.location.district}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Bölge</Text>
                <Text style={styles.value}>{incentiveResult.location.region}. Bölge</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Alt Bölge</Text>
                <Text style={styles.value}>{incentiveResult.location.subregion || "Yok"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Min. Yatırım Tutarı</Text>
                <Text style={styles.valueLarge}>
                  {incentiveResult.sector.minInvestment?.toLocaleString("tr-TR")} TL
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Genel Destekler</Text>
              <View style={styles.row}>
                <Text style={styles.label}>KDV İstisnası</Text>
                <Text style={[styles.value, { color: incentiveResult.supports.vat_exemption ? "#43a047" : "#d32f2f" }]}>
                  {incentiveResult.supports.vat_exemption ? "EVET" : "HAYIR"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Gümrük Muafiyeti</Text>
                <Text
                  style={[styles.value, { color: incentiveResult.supports.customs_exemption ? "#43a047" : "#d32f2f" }]}
                >
                  {incentiveResult.supports.customs_exemption ? "EVET" : "HAYIR"}
                </Text>
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN */}
          <View style={styles.column}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yatırım Türü Destekleri</Text>

              {incentiveResult.sector.isTarget && (
                <View>
                  <Text style={{ fontWeight: "bold", marginBottom: 5, fontSize: 11 }}>Hedef Yatırım Destekleri</Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>SGK Destek Süresi</Text>
                    <Text style={styles.value}>{incentiveResult.location.sgk_duration}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Vergi İndirimi (YKO)</Text>
                    <Text style={styles.value}>%{supportValues.target.taxDiscount}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Faiz/Kâr Payı Oranı</Text>
                    <Text style={styles.value}>
                      {supportValues.target.interestSupport !== "N/A"
                        ? `%${supportValues.target.interestSupport}`
                        : "N/A"}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Faiz/Kâr Payı Limiti</Text>
                    <Text style={styles.value}>
                      {supportValues.target.cap !== "N/A"
                        ? `${parseFloat(supportValues.target.cap).toLocaleString("tr-TR")} TL`
                        : "N/A"}
                    </Text>
                  </View>
                </View>
              )}

              {(incentiveResult.sector.isPriority ||
                incentiveResult.sector.isHighTech ||
                incentiveResult.sector.isMidHighTech) && (
                <View style={{ marginTop: incentiveResult.sector.isTarget ? 15 : 0 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 5, fontSize: 11 }}>
                    {incentiveResult.sector.isHighTech || incentiveResult.sector.isMidHighTech
                      ? "Öncelikli ve Yüksek/Orta-Yüksek Teknoloji Yatırım Destekleri"
                      : "Öncelikli Yatırım Destekleri"}
                  </Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>SGK Destek Süresi</Text>
                    <Text style={styles.value}>{incentiveResult.location.sgk_duration}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Vergi İndirimi (YKO)</Text>
                    <Text style={styles.value}>%{supportValues.priority.taxDiscount}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Faiz/Kâr Payı Oranı</Text>
                    <Text style={styles.value}>%{supportValues.priority.interestSupport}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Faiz/Kâr Payı Limiti</Text>
                    <Text style={styles.value}>
                      {parseFloat(supportValues.priority.cap).toLocaleString("tr-TR")} TL
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* --- NEW SECTIONS ADDED BELOW --- */}

        {/* Özel Şartlar ve Koşullar Box (Conditional) */}
        {incentiveResult.sector.conditions && (
          <View style={[styles.infoBox, styles.conditionsBox]}>
            <Text style={[styles.infoBoxTitle, styles.conditionsTitle]}>Özel Şartlar ve Koşullar</Text>
            <Text style={styles.infoBoxText}>{incentiveResult.sector.conditions}</Text>
          </View>
        )}

        {/* Önemli Bilgi Alert Box (Conditional) */}
        {incentiveResult.sector.isTarget && [1, 2, 3].includes(incentiveResult.location.region) && (
          <View style={[styles.infoBox, styles.alertBox]}>
            <Text style={[styles.infoBoxTitle, styles.alertTitle]}>Önemli Bilgi</Text>
            <Text style={styles.infoBoxText}>
              Hedef sektörler için Faiz/Kar Payı Desteği 1., 2. ve 3. bölgelerde uygulanmamaktadır.
            </Text>
          </View>
        )}

        <Text style={styles.footer}>
          Bu rapor sistem tarafından otomatik olarak oluşturulmuştur. Detaylı bilgi için ilgili kurumlara başvurunuz.
        </Text>
      </Page>
    </Document>
  );
};

export default IncentiveReportPDF;

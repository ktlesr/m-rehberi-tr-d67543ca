import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 'bold' },
  ],
});

interface SupportSummaryPDFProps {
  programTitle: string;
  institutionName?: string;
  institutionLogo?: string;
  whoCanApply: string | null;
  supportedAreas: string | null;
  applicationPeriod: string | null;
  applicationLocation: string | null;
  applicationUrl?: string | null;
  updatedAt: string;
  primaryColor?: string;
}

// Create styles
const createStyles = (primaryColor: string) => StyleSheet.create({
  page: {
    fontFamily: 'NotoSans',
    fontSize: 9,
    padding: 0,
    backgroundColor: '#ffffff',
  },
  
  // Header Banner
  headerBand: {
    backgroundColor: primaryColor,
    paddingVertical: 6,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  headerUrl: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  
  // Logo and Title Section
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottom: `1px solid ${primaryColor}`,
  },
  logoContainer: {
    width: 60,
    height: 60,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  programTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    color: primaryColor,
  },
  logoRight: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
  },
  
  // Content area
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 50, // Space for footer
    flex: 1,
  },
  
  // Section styles
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    backgroundColor: primaryColor,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderRadius: 2,
  },
  sectionHeaderText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionContent: {
    paddingHorizontal: 5,
  },
  contentText: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: '#333333',
    marginBottom: 2,
  },
  bulletPoint: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: '#333333',
    marginBottom: 2,
    marginLeft: 8,
  },
  link: {
    fontSize: 8.5,
    color: primaryColor,
    textDecoration: 'underline',
  },
  
  // Footer Banner
  footerBand: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: primaryColor,
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#ffffff',
  },
  footerRight: {
    fontSize: 8,
    color: '#ffffff',
  },
});

// Helper function to parse content into bullet points
const parseContent = (content: string | null): string[] => {
  if (!content) return [];
  
  // Split by newlines and filter empty lines
  const lines = content.split('\n').filter(line => line.trim());
  
  return lines.map(line => {
    // Remove bullet characters at start
    return line.replace(/^[•\-\*]\s*/, '').trim();
  });
};

const SupportSummaryPDF: React.FC<SupportSummaryPDFProps> = ({
  programTitle,
  institutionName,
  institutionLogo,
  whoCanApply,
  supportedAreas,
  applicationPeriod,
  applicationLocation,
  applicationUrl,
  updatedAt,
  primaryColor = '#dc2626', // Default red color
}) => {
  const styles = createStyles(primaryColor);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  // Parse content for bullet points
  const whoCanApplyLines = parseContent(whoCanApply);
  const supportedAreasLines = parseContent(supportedAreas);
  const applicationPeriodLines = parseContent(applicationPeriod);
  const applicationLocationLines = parseContent(applicationLocation);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Banner */}
        <View style={styles.headerBand}>
          <Text style={styles.headerUrl}>www.yatirimadestek.gov.tr</Text>
        </View>
        
        {/* Logo and Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.logoContainer}>
            <Image src="/logo/logo.png" style={styles.logo} />
          </View>
          <View style={styles.titleCenter}>
            <Text style={styles.programTitle}>{programTitle.toUpperCase()}</Text>
            <Text style={styles.subtitle}>ÖZET BİLGİ FORMU</Text>
          </View>
          {institutionLogo ? (
            <Image src={institutionLogo} style={styles.logoRight} />
          ) : (
            <View style={styles.logoPlaceholder} />
          )}
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          {/* Section 1: Kimler Yararlanabilir? */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>1) Kimler Yararlanabilir?</Text>
            </View>
            <View style={styles.sectionContent}>
              {whoCanApplyLines.length > 0 ? (
                whoCanApplyLines.map((line, index) => (
                  <Text key={index} style={styles.bulletPoint}>• {line}</Text>
                ))
              ) : (
                <Text style={styles.contentText}>Bilgi bulunamadı.</Text>
              )}
            </View>
          </View>
          
          {/* Section 2: Desteklenen Alanlar ve Destek Unsurları */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>2) Desteklenen Alanlar ve Destek Unsurları Nelerdir?</Text>
            </View>
            <View style={styles.sectionContent}>
              {supportedAreasLines.length > 0 ? (
                supportedAreasLines.map((line, index) => (
                  <Text key={index} style={styles.bulletPoint}>• {line}</Text>
                ))
              ) : (
                <Text style={styles.contentText}>Bilgi bulunamadı.</Text>
              )}
            </View>
          </View>
          
          {/* Section 3: Başvuru Dönemi */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>3) Başvuru Dönemi Ne Zamandır?</Text>
            </View>
            <View style={styles.sectionContent}>
              {applicationPeriodLines.length > 0 ? (
                applicationPeriodLines.map((line, index) => (
                  <Text key={index} style={styles.bulletPoint}>• {line}</Text>
                ))
              ) : (
                <Text style={styles.contentText}>Bilgi bulunamadı.</Text>
              )}
            </View>
          </View>
          
          {/* Section 4: Başvuru Yeri */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>4) Başvuru Yeri Neresidir?</Text>
            </View>
            <View style={styles.sectionContent}>
              {applicationLocationLines.length > 0 ? (
                applicationLocationLines.map((line, index) => (
                  <Text key={index} style={styles.bulletPoint}>• {line}</Text>
                ))
              ) : (
                <Text style={styles.contentText}>Bilgi bulunamadı.</Text>
              )}
              {applicationUrl && (
                <Text style={styles.link}>{applicationUrl}</Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Footer Banner */}
        <View style={styles.footerBand} fixed>
          <Text style={styles.footerText}>Son Güncelleme: {formatDate(updatedAt)}</Text>
          <Text style={styles.footerText}>www.yatirimadestek.gov.tr</Text>
          <Text 
            style={styles.footerRight} 
            render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} 
          />
        </View>
      </Page>
    </Document>
  );
};

export default SupportSummaryPDF;

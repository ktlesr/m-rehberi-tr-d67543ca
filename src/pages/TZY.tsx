import React from "react";
import { Link } from "react-router-dom";
import { Building2, FileText, List, UserCheck, Search, Handshake, CheckCircle, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MainNavbar from "@/components/MainNavbar";
import StandardHero from "@/components/StandardHero";

const TZY = () => {
  const flowSteps = [
    {
      icon: Building2,
      title: "Alıcı Firma",
      description: "Tedarikçi Bulmak İçin Ön Talep Oluşturur",
      color: "text-blue-600",
    },
    {
      icon: FileText,
      title: "Değerlendirme",
      description: "Ön Talep Bakanlıkça Değerlendirilir",
      color: "text-purple-600",
    },
    {
      icon: List,
      title: "Listeleme",
      description: "Onaylı Talepler Listelenir",
      color: "text-green-600",
    },
    {
      icon: UserCheck,
      title: "Başvuru",
      description: "Yerli Tedarikçi Listeden Seçtiği Ürün İçin Başvuru Yapar",
      color: "text-orange-600",
    },
    {
      icon: Search,
      title: "İnceleme",
      description: "Başvurular Kalkınma Ajansları Tarafından İncelenir",
      color: "text-blue-600",
    },
    {
      icon: Handshake,
      title: "Eşleştirme",
      description: "Alıcı Firma ile Tedarikçi Firma Buluşturulur",
      color: "text-indigo-600",
    },
    {
      icon: CheckCircle,
      title: "Anlaşma",
      description: "Alıcı Firma ve Tedarikçi Firma Anlaşma Sağlar",
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MainNavbar />

      <StandardHero
        title="Tedarik Zinciri Yerlileştirme"
        description="Yerli tedarikçiler ile alıcı firmaları buluşturan, ekonomik büyümeyi destekleyen dijital platform. Güvenilir iş ortaklıkları kurun, yerel ekonomiyi güçlendirin."
        badge={{
          text: "Dijital Eşleştirme Platformu",
          icon: LinkIcon,
        }}
      />

      {/* Modern Flow Diagram */}
      <section className="py-8 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Süreç Akışı</h2>

          {/* Desktop - Horizontal Stepper */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 to-blue-300"></div>

              <div className="relative flex justify-between">
                {flowSteps.map((step, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center max-w-[140px] animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Step Circle */}
                    <div
                      className={`relative z-10 w-24 h-24 rounded-full bg-white border-4 border-gray-200 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 ${step.color}`}
                    >
                      <step.icon className="h-8 w-8" />
                    </div>

                    {/* Step Number */}
                    <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center -mt-3 mb-3 z-20">
                      {index + 1}
                    </div>

                    {/* Step Content */}
                    <div className="text-center">
                      <h3 className="font-semibold text-sm mb-2 text-gray-900">{step.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile - Vertical Timeline */}
          <div className="lg:hidden">
            <div className="relative max-w-md mx-auto">
              {/* Vertical Line */}
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-200 to-blue-300"></div>

              <div className="space-y-8">
                {flowSteps.map((step, index) => (
                  <div
                    key={index}
                    className="relative flex items-start animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Step Circle */}
                    <div
                      className={`relative z-10 w-12 h-12 rounded-full bg-white border-3 border-gray-200 flex items-center justify-center shadow-md ${step.color} flex-shrink-0`}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>

                    {/* Step Number Badge */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center z-20">
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="ml-6 flex-1 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                      <h3 className="font-semibold text-base mb-2 text-gray-900">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Hangi Kategoridesiniz?</h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            İhtiyacınıza uygun seçeneği seçerek hemen başlayın
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Tedarikçi Bul Button */}
            <Card className="p-8 hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-blue-300 animate-fade-in">
              <div className="text-blue-600 mb-4">
                <Search className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Tedarikçi Bul</h3>
              <p className="text-gray-600 mb-6">
                İhtiyacınız olan ürün veya hizmet için güvenilir yerli tedarikçiler bulun
              </p>
              <Link to="/tzyotg">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
                >
                  Tedarikçi Aramaya Başla
                </Button>
              </Link>
            </Card>

            {/* Tedarikçi Ol Button */}
            <Card
              className="p-8 hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-blue-300 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="text-blue-600 mb-4">
                <Building2 className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Tedarikçi Ol</h3>
              <p className="text-gray-600 mb-6">Firmanızı kaydedin ve büyük projelerde tedarikçi olarak yer alın</p>
              <Link to="/tzyil">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
                >
                  Tedarikçi Olarak Başvur
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Neden Tedarik Zinciri Yerlileştirme?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="animate-fade-in">
              <div className="text-blue-600 mb-4">
                <CheckCircle className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Güvenilir İş Ortaklıkları</h3>
              <p className="text-gray-600">Kalkınma ajansları tarafından incelenen, güvenilir tedarikçilerle çalışın</p>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="text-blue-600 mb-4">
                <Handshake className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Kolay Eşleştirme</h3>
              <p className="text-gray-600">İhtiyacınıza uygun tedarikçilerle hızlı ve kolay eşleşin</p>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="text-blue-600 mb-4">
                <Building2 className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Yerel Ekonomi</h3>
              <p className="text-gray-600">Yerli üretimi destekleyerek ekonomik büyümeye katkıda bulunun</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TZY;

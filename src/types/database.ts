
export interface SectorSearchData {
  id: number;
  nace_kodu: string;
  sektor: string;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  teknoloji_hamlesi: string | null;  // "EVET" or "HAYIR" or null
  sartlar: string | null;
  bolge_1: number;
  bolge_2: number;
  bolge_3: number;
  bolge_4: number;
  bolge_5: number;
  bolge_6: number;
  created_at: string;
  updated_at: string;
}

export interface ProvinceRegionMap {
  id: number;
  province_name: string;
  region_number: number;
  created_at: string;
}

export interface LocationSupport {
  id: number;
  il: string;
  ilce: string;
  alt_bolge: string | null;
  kdv_istisnasi: boolean;
  gumruk_muafiyeti: boolean;
  oncelikli_vergi_indirimi_yko: string | null;
  oncelikli_faiz_karpayi_do: string | null;
  oncelikli_faiz_karpayi_ust_limit_tutari: string | null;
  oncelikli_faiz_karpayi_syt_orani: string | null;
  hedef_vergi_indirimi_yko: string | null;
  hedef_faiz_karpayi_do: string | null;
  hedef_faiz_karpayi_ust_limit_tutari: string | null;
  hedef_faiz_karpayi_syt_orani: string | null;
  sgk_destek_suresi: string | null;
  created_at: string;
  updated_at: string;
}

export interface SgkDuration {
  province: string;
  district: string;
  sgk_duration: number | null;
  osb_status: boolean;
  bolge: number;
  alt_bolge: number;
}

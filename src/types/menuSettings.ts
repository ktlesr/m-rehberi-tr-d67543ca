export interface MenuItemVisibility {
  admin: boolean;
  registered: boolean;
  anonymous: boolean;
}

export interface MenuVisibilitySettings {
  menu_item_destek_arama: MenuItemVisibility;
  menu_item_tesvik_araclari: MenuItemVisibility;
  menu_item_soru_cevap: MenuItemVisibility;
  menu_item_tedarik_zinciri: MenuItemVisibility;
  menu_item_yatirim_firsatlari: MenuItemVisibility;
  menu_item_yatirimci_sozlugu: MenuItemVisibility;
  menu_item_basvuru_sureci: MenuItemVisibility;
  menu_item_chat: MenuItemVisibility;
}

export interface AdminMenuVisibilitySettings {
  admin_menu_dashboard: MenuItemVisibility;
  admin_menu_qa_management: MenuItemVisibility;
  admin_menu_knowledge_base: MenuItemVisibility;
  admin_menu_form_builder: MenuItemVisibility;
  admin_menu_feasibility_reports: MenuItemVisibility;
  admin_menu_support_programs: MenuItemVisibility;
  admin_menu_announcements: MenuItemVisibility;
  admin_menu_legislation: MenuItemVisibility;
  admin_menu_glossary: MenuItemVisibility;
  admin_menu_profile: MenuItemVisibility;
  admin_menu_user_management: MenuItemVisibility;
  admin_menu_email_management: MenuItemVisibility;
  admin_menu_supply_chain: MenuItemVisibility;
  admin_menu_analytics: MenuItemVisibility;
  // NOTE: admin_menu_settings removed - Settings menu is always visible to prevent lockout
}

// Domain-specific menu settings
export interface DomainMenuSettings {
  id: string;
  domain: string;
  menu_type: "frontend" | "admin";
  settings: MenuVisibilitySettings | AdminMenuVisibilitySettings;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_VISIBILITY: MenuItemVisibility = {
  admin: true,
  registered: false,
  anonymous: false,
};

export const DEFAULT_ADMIN_VISIBILITY: MenuItemVisibility = {
  admin: true,
  registered: false,
  anonymous: false,
};

export interface MenuItem {
  title: string;
  url: string;
  settingKey: keyof MenuVisibilitySettings;
  description: string;
}

export interface AdminMenuItem {
  title: string;
  href: string;
  settingKey: keyof AdminMenuVisibilitySettings;
  description: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    title: "Destek Arama",
    url: "/searchsupport",
    settingKey: "menu_item_destek_arama",
    description: "Kullanıcılar destek programlarını arayabilir",
  },
  {
    title: "9903 | Teşvik Robotu",
    url: "/incentive-tools",
    settingKey: "menu_item_tesvik_araclari",
    description: "Teşvik hesaplama araçları ve bilgiler",
  },
  {
    title: "Soru & Cevap",
    url: "/qna",
    settingKey: "menu_item_soru_cevap",
    description: "Sık sorulan sorular ve cevaplar",
  },
  {
    title: "Tedarik Zinciri Yönetimi",
    url: "/tzy",
    settingKey: "menu_item_tedarik_zinciri",
    description: "Tedarik zinciri yönetim sistemi",
  },
  {
    title: "Yatırım Fırsatları",
    url: "/yatirim-firsatlari",
    settingKey: "menu_item_yatirim_firsatlari",
    description: "Mevcut yatırım fırsatları",
  },
  {
    title: "Yatırımcı Sözlüğü",
    url: "/investor-glossary",
    settingKey: "menu_item_yatirimci_sozlugu",
    description: "Yatırım terimleri sözlüğü",
  },
  {
    title: "Başvuru Süreci",
    url: "/basvuru-sureci",
    settingKey: "menu_item_basvuru_sureci",
    description: "Başvuru adımları ve süreçleri",
  },
  {
    title: "AI Destek",
    url: "/chat",
    settingKey: "menu_item_chat",
    description: "Yapay zeka destekli tam sayfa sohbet",
  },
];

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    settingKey: "admin_menu_dashboard",
    description: "Ana yönetim paneli",
  },
  {
    title: "Soru & Cevap",
    href: "/admin/qa-management",
    settingKey: "admin_menu_qa_management",
    description: "Soru cevap yönetimi",
  },
  {
    title: "AI Chatbot Bilgi Bankası",
    href: "/admin/knowledge-base",
    settingKey: "admin_menu_knowledge_base",
    description: "Chatbot bilgi tabanı yönetimi",
  },
  {
    title: "Form Builder",
    href: "/admin/form-builder",
    settingKey: "admin_menu_form_builder",
    description: "Özel form oluşturma ve yönetimi",
  },
  {
    title: "Fizibilite Raporları",
    href: "/admin/feasibility-reports",
    settingKey: "admin_menu_feasibility_reports",
    description: "Fizibilite raporu yönetimi",
  },
  {
    title: "Destek Programları",
    href: "/admin/support-programs",
    settingKey: "admin_menu_support_programs",
    description: "Destek programı yönetimi",
  },
  {
    title: "Duyuru Yönetimi",
    href: "/admin/announcements",
    settingKey: "admin_menu_announcements",
    description: "Duyuru oluşturma ve düzenleme",
  },
  {
    title: "Mevzuat Yönetimi",
    href: "/admin/legislation",
    settingKey: "admin_menu_legislation",
    description: "Mevzuat belgesi yönetimi",
  },
  {
    title: "Yatırımcı Sözlüğü",
    href: "/admin/glossary-management",
    settingKey: "admin_menu_glossary",
    description: "Sözlük terim yönetimi",
  },
  {
    title: "Profilim",
    href: "/profile",
    settingKey: "admin_menu_profile",
    description: "Kullanıcı profili",
  },
  {
    title: "Kullanıcı ve Rol Yönetimi",
    href: "/admin/user-management",
    settingKey: "admin_menu_user_management",
    description: "Kullanıcı ve rol yönetimi",
  },
  {
    title: "E-posta Yönetimi",
    href: "/admin/email-management",
    settingKey: "admin_menu_email_management",
    description: "E-posta bildirim yönetimi",
  },
  {
    title: "Tedarik Zinciri",
    href: "/admin/tzyotl",
    settingKey: "admin_menu_supply_chain",
    description: "Tedarik zinciri yönetimi",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    settingKey: "admin_menu_analytics",
    description: "İstatistik ve analiz",
  },
  // NOTE: Settings menu is NOT in this list - it's always visible to prevent lockout
];

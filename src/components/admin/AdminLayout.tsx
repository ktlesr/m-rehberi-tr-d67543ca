
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AdminTopbar } from './AdminTopbar';
import { useAuth } from '@/contexts/AuthContext';
import { menuVisibilityService } from '@/services/menuVisibilityService';
import { AdminMenuVisibilitySettings, ADMIN_MENU_ITEMS } from '@/types/menuSettings';
import { Separator } from '@/components/ui/separator';
import { 
  Home, 
  MessageSquare, 
  FileText, 
  Mail, 
  Book, 
  BarChart3, 
  Settings,
  Target,
  Link as LinkIcon,
  ChevronDown,
  ChevronRight,
  Scale,
  Bot,
  Megaphone,
  Users,
  User,
  FileEdit
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Map navigation hrefs to setting keys
// NOTE: /admin/settings is NOT mapped - Settings menu is always visible to prevent lockout
const hrefToSettingKey: Record<string, keyof AdminMenuVisibilitySettings> = {
  '/admin': 'admin_menu_dashboard',
  '/admin/qa-management': 'admin_menu_qa_management',
  '/admin/knowledge-base': 'admin_menu_knowledge_base',
  '/admin/form-builder': 'admin_menu_form_builder',
  '/admin/feasibility-reports': 'admin_menu_feasibility_reports',
  '/admin/support-programs': 'admin_menu_support_programs',
  '/admin/announcements': 'admin_menu_announcements',
  '/admin/legislation': 'admin_menu_legislation',
  '/admin/glossary-management': 'admin_menu_glossary',
  '/profile': 'admin_menu_profile',
  '/admin/user-management': 'admin_menu_user_management',
  '/admin/email-management': 'admin_menu_email_management',
  '/admin/tzyotl': 'admin_menu_supply_chain',
  '/admin/analytics': 'admin_menu_analytics',
};

// Main navigation items
const mainNavigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Soru & Cevap', href: '/admin/qa-management', icon: MessageSquare },
  { name: 'AI Chatbot Bilgi Bankası', href: '/admin/knowledge-base', icon: Bot },
  { name: 'Form Builder', href: '/admin/form-builder', icon: FileEdit },
  { name: 'Fizibilite Raporları', href: '/admin/feasibility-reports', icon: FileText },
  { name: 'Destek Programları', href: '/admin/support-programs', icon: Target },
  { name: 'Duyuru Yönetimi', href: '/admin/announcements', icon: Megaphone },
  { name: 'Bülten Üyeleri', href: '/admin/newsletter-subscribers', icon: Mail },
  { name: 'Mevzuat Yönetimi', href: '/admin/legislation', icon: Scale },
  { name: 'Yatırımcı Sözlüğü', href: '/admin/glossary-management', icon: Book },
  { name: 'Kullanıcı ve Rol Yönetimi', href: '/admin/user-management', icon: Users },
  { name: 'E-posta Yönetimi', href: '/admin/email-management', icon: Mail },
  { 
    name: 'Tedarik Zinciri', 
    href: '/admin/tzyotl', 
    icon: LinkIcon,
    subItems: [
      { name: 'Ön Talep Listesi', href: '/admin/tzyotl' },
      { name: 'Ürün Talep Listesi', href: '/admin/tzyutl' },
      { name: 'Tedarikçi Başvuru Listesi', href: '/admin/tzy-supplier-applications' },
      { name: 'E-posta Logları', href: '/admin/tzy-email-logs' }
    ]
  },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

// Bottom navigation items (below separator)
const bottomNavigation = [
  {
    name: 'Ayarlar',
    href: '/admin/settings',
    icon: Settings,
    subItems: [
      { name: 'Teşvik Hesaplama Ayarları', href: '/admin/settings/incentive-calculation' },
      { name: 'Menü Görünürlük Ayarları', href: '/admin/settings/menu-visibility' },
      { name: 'Soru-Cevap Ayarları', href: '/admin/settings/qna' },
      { name: 'YDO Yönetimi', href: '/admin/settings/ydo' },
    ]
  },
  { name: 'Profilim', href: '/profile', icon: User },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, isAdmin, isAdminLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [menuSettings, setMenuSettings] = useState<AdminMenuVisibilitySettings | null>(null);
  const [isMenuSettingsLoading, setIsMenuSettingsLoading] = useState(true);

  const isRegistered = !!profile;

  useEffect(() => {
    const loadMenuSettings = async () => {
      setIsMenuSettingsLoading(true);
      try {
        // Get effective settings for current domain (domain-specific or global)
        const { settings } = await menuVisibilityService.getEffectiveMenuSettings('admin');
        setMenuSettings(settings as AdminMenuVisibilitySettings);
      } catch (error) {
        console.error('Error loading admin menu settings:', error);
      } finally {
        setIsMenuSettingsLoading(false);
      }
    };
    loadMenuSettings();
  }, []);

  // Filter navigation based on visibility settings
  // Settings menu (/admin/settings) is always visible to prevent lockout
  // While loading, show all items to prevent sidebar flash/disappearing
  const shouldShowMenuItem = (href: string): boolean => {
    // Settings menu is always visible to admins to prevent lockout
    if (href === '/admin/settings') return true;
    
    // While loading menu settings or admin status, show all items
    if (isMenuSettingsLoading || isAdminLoading) return true;
    
    if (!menuSettings) return true;
    const settingKey = hrefToSettingKey[href];
    if (!settingKey) return true;
    const visibility = menuSettings[settingKey];
    if (!visibility) return true;
    if (isAdmin && visibility.admin) return true;
    if (isRegistered && visibility.registered) return true;
    if (!isRegistered && visibility.anonymous) return true;
    return false;
  };

  const filteredMainNav = mainNavigation.filter(item => shouldShowMenuItem(item.href));
  const filteredBottomNav = bottomNavigation.filter(item => shouldShowMenuItem(item.href));

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderNavItem = (item: typeof mainNavigation[0]) => {
    if (item.subItems) {
      const isExpanded = expandedMenu === item.name;
      const hasActiveSubItem = item.subItems.some(subItem => location.pathname === subItem.href);
      const isActive = hasActiveSubItem || location.pathname === item.href;
      
      return (
        <div key={item.name}>
          <button
            onClick={() => setExpandedMenu(isExpanded ? null : item.name)}
            className={cn(
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-700 hover:bg-primary/5 hover:text-primary',
              'group flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200'
            )}
          >
            <div className="flex items-center">
              <item.icon
                className={cn(
                  isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary',
                  'mr-3 flex-shrink-0 h-5 w-5'
                )}
              />
              {item.name}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform duration-200" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-8 mt-2 space-y-1 animate-slide-up">
              {item.subItems.map((subItem) => {
                const isSubActive = location.pathname === subItem.href;
                return (
                  <Link
                    key={subItem.name}
                    to={subItem.href}
                    className={cn(
                      isSubActive
                        ? 'bg-primary/10 text-primary border-l-2 border-primary'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-2 border-transparent',
                      'block px-3 py-2 text-sm rounded-r-md transition-all duration-200'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {subItem.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    } else {
      const isActive = location.pathname === item.href;
      return (
        <Link
          key={item.name}
          to={item.href}
          className={cn(
            isActive
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-700 hover:bg-primary/5 hover:text-primary',
            'group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200'
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <item.icon
            className={cn(
              isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary',
              'mr-3 flex-shrink-0 h-5 w-5'
            )}
          />
          {item.name}
        </Link>
      );
    }
  };

  return (
    <div className="dashboard-container min-h-screen bg-gray-50">
      <AdminTopbar 
        isMobileMenuOpen={isMobileMenuOpen}
        toggleMobileMenu={toggleMobileMenu}
        onLogout={handleLogout}
      />
      
      <div className="flex">
        {/* Sidebar - Fixed to viewport height */}
        <div className={cn(
          "md:flex md:w-72 md:flex-col md:fixed md:top-16 md:bottom-0 md:left-0",
          isMobileMenuOpen ? "fixed inset-0 top-16 z-40 bg-white" : "hidden"
        )}>
          <div className="flex flex-col h-full bg-white border-r border-border shadow-sm">
            {/* Header */}
            <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-border/50">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
                  <Settings className="h-4 w-4 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
              </div>
            </div>
            
            {/* Scrollable Main Navigation */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-transparent">
              {filteredMainNav.map(renderNavItem)}
            </nav>
            
            {/* Fixed Bottom Navigation */}
            {filteredBottomNav.length > 0 && (
              <div className="flex-shrink-0 border-t border-border/50 bg-white">
                <nav className="px-4 py-4 space-y-2">
                  {filteredBottomNav.map(renderNavItem)}
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Main content - with left margin for fixed sidebar */}
        <div className="flex flex-col flex-1 md:ml-72 pt-16">
          <main className="flex-1 p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export { AdminLayout };

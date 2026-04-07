import { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Users, 
  Gift, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X,
  CheckCircle
} from 'lucide-react';
import DashboardHome from '@/components/admin/DashboardHome';
import GuestManagement from '@/components/admin/GuestManagement';
import GiftManagement from '@/components/admin/GiftManagement';
import ConfirmedList from '@/components/admin/ConfirmedList';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/admin/confirmed', label: 'Confirmados', icon: CheckCircle },
    { path: '/admin/guests', label: 'Convidados', icon: Users },
    { path: '/admin/gifts', label: 'Presentes', icon: Gift },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg soft-shadow"
        data-testid="mobile-menu-toggle"
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`admin-sidebar fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="text-center py-6 border-b border-brand-peach/30 mb-4">
            <Heart className="h-8 w-8 mx-auto text-brand-pink fill-brand-peach mb-2" />
            <h1 className="font-cursive text-2xl text-brand-pink">William & Mallu</h1>
            <p className="text-xs text-brand-text-muted mt-1">Painel Administrativo</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`admin-nav-item flex items-center gap-3 px-4 py-3 ${
                  isActive(item.path, item.exact) ? 'active' : ''
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-sans text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="border-t border-brand-peach/30 pt-4">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-3 text-brand-text-muted hover:text-red-600 hover:bg-red-50"
              data-testid="logout-btn"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-sans text-sm">Sair</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-8 lg:ml-0 min-h-screen">
        <div className="max-w-6xl mx-auto pt-12 lg:pt-0">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="confirmed" element={<ConfirmedList />} />
            <Route path="guests" element={<GuestManagement />} />
            <Route path="gifts" element={<GiftManagement />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

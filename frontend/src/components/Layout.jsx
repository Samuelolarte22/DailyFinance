import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  CreditCard, 
  Target,
  BarChart3,
  User,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  Eye,
  ArrowLeft
} from "lucide-react";
import AnimatedLogo from "./AnimatedLogo";

const Layout = ({ children }) => {
  const { user, logout, isImpersonating, impersonatedUser, stopImpersonation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transacciones", href: "/transactions", icon: ArrowLeftRight },
    { name: "Deudas", href: "/debts", icon: CreditCard },
    { name: "Ahorros", href: "/savings", icon: Target },
    { name: "Reportes", href: "/reports", icon: BarChart3 },
    { name: "Comunidad", href: "/community", icon: Users },
  ];

  // Add admin link if user is admin
  if (user?.is_admin) {
    navigation.push({ name: "Admin", href: "/admin", icon: ShieldCheck });
  }

  const isActive = (href) => location.pathname === href;

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleStopImpersonation = async () => {
    await stopImpersonation();
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[#141b2d]">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="sticky top-0 z-[60] bg-amber-500 text-black py-2 px-4" data-testid="impersonation-banner">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Modo Asesor: Viendo como {impersonatedUser?.name || user?.name}
              </span>
              <span className="text-xs opacity-75">({impersonatedUser?.email || user?.email})</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="bg-black/10 border-black/30 text-black hover:bg-black/20 h-7 text-xs"
              onClick={handleStopImpersonation}
              data-testid="stop-impersonation-btn"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Volver al Panel Admin
            </Button>
          </div>
        </div>
      )}
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#141b2d]/90 backdrop-blur-md border-b border-[#2a3444]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-3">
              <AnimatedLogo size="small" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`rounded-md transition-all ${
                      isActive(item.href) 
                        ? "bg-[#D4AF37]/10 text-[#D4AF37]" 
                        : "text-gray-400 hover:text-white hover:bg-[#1a2332]"
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* User Menu & Mobile Toggle */}
            <div className="flex items-center gap-2">
              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-[#2a3444]">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.picture} alt={user?.name} />
                      <AvatarFallback className="bg-[#D4AF37] text-[#141b2d] text-xs font-semibold">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-[#1a2332] border-[#2a3444]" align="end">
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.picture} alt={user?.name} />
                      <AvatarFallback className="bg-[#D4AF37] text-[#141b2d] text-xs font-semibold">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-white">{user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-[#2a3444]" />
                  <DropdownMenuItem asChild className="text-gray-300 focus:text-white focus:bg-[#2a3444]">
                    <Link to="/profile" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Mi Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#2a3444]" />
                  <DropdownMenuItem 
                    className="text-red-400 focus:text-red-300 focus:bg-[#2a3444] cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Toggle */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-[#1a2332] border-[#2a3444]">
                  <div className="flex flex-col gap-2 mt-8">
                    {navigation.map((item) => (
                      <Link 
                        key={item.name} 
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className={`w-full justify-start rounded-md ${
                            isActive(item.href) 
                              ? "bg-[#D4AF37]/10 text-[#D4AF37]" 
                              : "text-gray-400 hover:text-white hover:bg-[#2a3444]"
                          }`}
                        >
                          <item.icon className="w-5 h-5 mr-3" />
                          {item.name}
                        </Button>
                      </Link>
                    ))}
                    <div className="border-t border-[#2a3444] my-4" />
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start rounded-md text-gray-400 hover:text-white hover:bg-[#2a3444]">
                        <User className="w-5 h-5 mr-3" />
                        Mi Perfil
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start rounded-md text-red-400 hover:text-red-300 hover:bg-[#2a3444]"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5 mr-3" />
                      Cerrar sesión
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a3444] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <AnimatedLogo size="small" />
            <p className="text-sm text-gray-400 text-center sm:text-right">
              Decisiones financieras inteligentes, resultados reales
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

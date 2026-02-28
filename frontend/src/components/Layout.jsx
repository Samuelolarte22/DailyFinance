import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Wallet, 
  LayoutDashboard, 
  ArrowLeftRight, 
  CreditCard, 
  Target,
  BarChart3,
  User,
  LogOut,
  Menu,
  ShieldCheck
} from "lucide-react";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transacciones", href: "/transactions", icon: ArrowLeftRight },
    { name: "Deudas", href: "/debts", icon: CreditCard },
    { name: "Ahorros", href: "/savings", icon: Target },
    { name: "Reportes", href: "/reports", icon: BarChart3 },
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

  return (
    <div className="min-h-screen bg-background noise-bg">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg hidden sm:block" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                DailyFinance
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    size="sm"
                    className={`rounded-full transition-all ${
                      isActive(item.href) 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground"
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
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.picture} alt={user?.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.picture} alt={user?.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Mi Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive cursor-pointer"
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
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="flex flex-col gap-2 mt-8">
                    {navigation.map((item) => (
                      <Link 
                        key={item.name} 
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant={isActive(item.href) ? "secondary" : "ghost"}
                          className={`w-full justify-start rounded-xl ${
                            isActive(item.href) 
                              ? "bg-primary/10 text-primary" 
                              : "text-muted-foreground"
                          }`}
                        >
                          <item.icon className="w-5 h-5 mr-3" />
                          {item.name}
                        </Button>
                      </Link>
                    ))}
                    <div className="border-t border-border my-4" />
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start rounded-xl">
                        <User className="w-5 h-5 mr-3" />
                        Mi Perfil
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start rounded-xl text-destructive"
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
      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Wallet className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">
                DailyFinance © 2026
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center sm:text-right">
              Tu aliado en finanzas personales
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

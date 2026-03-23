import { useAuth } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { 
  User, 
  Mail, 
  LogOut,
  Shield,
  Calendar
} from "lucide-react";

const Profile = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="profile-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          Mi <span className="gold-text">Perfil</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Gestiona tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Card */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="profile-card">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-24 h-24 border-2 border-[#D4AF37]">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-[#D4AF37] text-[#141b2d] text-2xl font-bold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                {user?.name}
              </h2>
              <p className="text-gray-400">{user?.email}</p>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#D4AF37]/10 text-[#D4AF37] text-sm font-medium border border-[#D4AF37]/30">
                  <Shield className="w-3 h-3" />
                  {user?.is_admin ? 'Administrador' : 'Usuario activo'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="bg-[#1a2332] border-[#2a3444]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              <User className="w-5 h-5 text-[#D4AF37]" />
              Información de cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-400">Correo</span>
              </div>
              <span className="text-sm font-medium text-white">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-400">Miembro desde</span>
              </div>
              <span className="text-sm font-medium text-white">
                {formatDate(user?.created_at)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-400">Perfil completado</span>
              </div>
              <span className={`text-sm font-medium ${user?.has_completed_survey ? 'text-green-400' : 'text-red-400'}`}>
                {user?.has_completed_survey ? 'Sí' : 'No'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#2a3444]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              <span className="text-[#D4AF37] text-xl font-bold">LD</span>
              Sobre LD Finance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
              <h4 className="font-medium mb-2 text-white">Tu asesor financiero personal</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                LD Finance te ayuda a organizar tus finanzas personales, 
                controlar tus gastos y alcanzar tus metas de ahorro de manera 
                simple y efectiva.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
              <p className="text-sm text-gray-500">
                <strong className="text-gray-300">Funcionalidades:</strong> Control de ingresos y gastos por mes, 
                gestión de deudas, metas de ahorro, reportes detallados y 
                asesoría personalizada.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logout */}
      <Card className="bg-[#1a2332] border-red-500/30">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-white">Cerrar sesión</h3>
              <p className="text-sm text-gray-500">
                Salir de tu cuenta de LD Finance
              </p>
            </div>
            <Button 
              variant="outline" 
              className="rounded-md border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;

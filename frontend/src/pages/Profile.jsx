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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
          Mi Perfil
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Card */}
      <Card data-testid="profile-card">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                {user?.name}
              </h2>
              <p className="text-muted-foreground">{user?.email}</p>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Shield className="w-3 h-3" />
                  Participante Beta
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Epilogue, sans-serif' }}>
              <User className="w-5 h-5" />
              Información de cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Correo</span>
              </div>
              <span className="text-sm font-medium">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Miembro desde</span>
              </div>
              <span className="text-sm font-medium">
                {formatDate(user?.created_at)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Encuesta completada</span>
              </div>
              <span className={`text-sm font-medium ${user?.has_completed_survey ? 'text-income' : 'text-expense'}`}>
                {user?.has_completed_survey ? 'Sí' : 'No'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
              Sobre el proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="font-medium mb-2">Beta Cerrada - Investigación</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gracias por participar en la evaluación del sistema de gestión 
                financiera. Tu uso de la aplicación contribuye a la investigación 
                sobre el impacto de herramientas digitales en la educación financiera 
                de estudiantes universitarios.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30">
              <p className="text-xs text-muted-foreground">
                <strong>Título del estudio:</strong> Evaluación de un sistema de gestión 
                de información financiera para la organización de gastos en estudiantes 
                universitarios: estudio en una beta cerrada
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Institución:</strong> Universidad Ean - Facultad de Ingeniería
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logout */}
      <Card className="border-destructive/30">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-medium">Cerrar sesión</h3>
              <p className="text-sm text-muted-foreground">
                Salir de tu cuenta de StudentFinance
              </p>
            </div>
            <Button 
              variant="outline" 
              className="rounded-full border-destructive text-destructive hover:bg-destructive/10"
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

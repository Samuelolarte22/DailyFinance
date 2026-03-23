import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  TrendingUp, 
  PiggyBank, 
  CreditCard, 
  BarChart3, 
  ChevronRight,
  Shield,
  Wallet,
  LineChart,
  ArrowRight
} from "lucide-react";

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (user.has_completed_survey) {
        navigate("/dashboard");
      } else {
        navigate("/survey");
      }
    }
  }, [user, loading, navigate]);

  const handleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Control de Ingresos",
      description: "Registra y visualiza todos tus ingresos organizados por mes."
    },
    {
      icon: CreditCard,
      title: "Gestión de Gastos",
      description: "Categoriza tus gastos mensuales y analiza tus patrones."
    },
    {
      icon: PiggyBank,
      title: "Metas de Ahorro",
      description: "Establece objetivos y monitorea tu progreso visualmente."
    },
    {
      icon: BarChart3,
      title: "Reportes Detallados",
      description: "Analiza tu evolución financiera mes a mes."
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141b2d]">
        <div className="animate-pulse text-[#D4AF37]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141b2d] overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#141b2d]/90 backdrop-blur-md border-b border-[#D4AF37]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="text-[#D4AF37] text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                LD
              </div>
              <span className="text-white font-medium text-lg">Finance</span>
            </div>
            <Button 
              onClick={handleLogin}
              className="btn-gold rounded-md px-6"
              data-testid="login-btn"
            >
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#141b2d] via-[#1a2332] to-[#141b2d]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#D4AF37]/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Bienvenido a{" "}
              <span className="gold-text">LD Finance</span>
            </h1>
            
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Tu socio estratégico para la gestión de finanzas personales. 
              Organiza tus ingresos, controla tus gastos y alcanza tus metas financieras.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="btn-gold rounded-md px-8 py-6 text-base"
                data-testid="hero-cta-btn"
              >
                Comenzar ahora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-md px-8 py-6 text-base border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Ver características
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-[#1a2332]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fadeIn">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Herramientas <span className="gold-text">Profesionales</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu dinero de manera inteligente y alcanzar tus objetivos financieros.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="card-hover bg-[#1a2332] border-[#2a3444] animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <h3 className="font-semibold text-lg text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                Simplifica tu <span className="gold-text">vida financiera</span>
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 animate-fadeIn">
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <LineChart className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1 text-white">Visualización por meses</h3>
                    <p className="text-sm text-gray-400">Organiza tus ingresos y gastos mes a mes para un mejor control.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1 text-white">Asesoría personalizada</h3>
                    <p className="text-sm text-gray-400">Recibe orientación de expertos para mejorar tus finanzas.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1 text-white">Control total</h3>
                    <p className="text-sm text-gray-400">Gestiona deudas, ahorros y transacciones desde un solo lugar.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-[#1a2332] rounded-2xl p-8 border border-[#2a3444]">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#141b2d] border border-[#2a3444]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      </div>
                      <span className="text-gray-300">Ingresos del mes</span>
                    </div>
                    <span className="font-mono font-semibold text-green-400">+$3,500,000</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#141b2d] border border-[#2a3444]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-red-400" />
                      </div>
                      <span className="text-gray-300">Gastos del mes</span>
                    </div>
                    <span className="font-mono font-semibold text-red-400">-$2,100,000</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
                        <PiggyBank className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <span className="text-white font-medium">Balance</span>
                    </div>
                    <span className="font-mono font-bold text-[#D4AF37] text-xl">+$1,400,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-[#1a2332]/50">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Comienza a transformar tus <span className="gold-text">finanzas</span> hoy
          </h2>
          <p className="text-gray-400">
            Únete y toma el control de tu situación financiera con las herramientas profesionales de LD Finance.
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="btn-gold rounded-md px-10 py-6 text-base"
            data-testid="cta-btn"
          >
            Crear cuenta gratis
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#2a3444]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[#D4AF37] text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>LD</span>
            <span className="text-gray-400 text-sm">Finance © 2026</span>
          </div>
          <p className="text-xs text-gray-500">
            Tu aliado en finanzas personales
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

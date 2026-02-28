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
  Sparkles,
  Target,
  Shield,
  Wallet,
  LineChart
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
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Control de Ingresos",
      description: "Registra y visualiza todos tus ingresos para entender mejor tu flujo de dinero.",
      color: "bg-income"
    },
    {
      icon: CreditCard,
      title: "Gestión de Gastos",
      description: "Categoriza tus gastos y descubre en qué se va tu dinero cada mes.",
      color: "bg-expense"
    },
    {
      icon: PiggyBank,
      title: "Metas de Ahorro",
      description: "Establece objetivos de ahorro y monitorea tu progreso visualmente.",
      color: "bg-savings"
    },
    {
      icon: BarChart3,
      title: "Reportes Detallados",
      description: "Analiza tu evolución financiera con reportes comparativos.",
      color: "bg-debt"
    }
  ];

  const benefits = [
    {
      icon: Sparkles,
      title: "Fácil de usar",
      description: "Interfaz intuitiva y amigable"
    },
    {
      icon: Target,
      title: "Objetivos claros",
      description: "Define y alcanza tus metas financieras"
    },
    {
      icon: Shield,
      title: "Seguro",
      description: "Tus datos financieros protegidos"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-bg overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                DailyFinance
              </span>
            </div>
            <Button 
              onClick={handleLogin}
              className="rounded-full font-medium btn-press"
              data-testid="login-btn"
            >
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Background blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-income/30 blob float opacity-50" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-savings/20 blob float opacity-40" style={{ animationDelay: '-3s' }} />
        <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-debt/20 blob float opacity-30" style={{ animationDelay: '-5s' }} />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fadeIn">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Tu asesor financiero personal
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                Toma el control de tus{" "}
                <span className="gradient-text">finanzas personales</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Organiza tus gastos, controla tus deudas y alcanza tus metas de ahorro 
                con nuestra plataforma de gestión financiera.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={handleLogin}
                  className="rounded-full font-medium text-base px-8 btn-press"
                  data-testid="hero-cta-btn"
                >
                  Comenzar gratis
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="rounded-full font-medium text-base px-8"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver características
                </Button>
              </div>
            </div>

            <div className="relative animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80"
                  alt="Gestión financiera"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              </div>
              
              {/* Floating card */}
              <Card className="absolute -bottom-6 -left-6 p-4 shadow-lg animate-slideIn card-hover" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-income flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-income" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance mensual</p>
                    <p className="font-semibold font-mono">+$2,450.00</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fadeIn">
            <h2 className="text-3xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'Epilogue, sans-serif' }}>
              Todo lo que necesitas para tus finanzas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Herramientas completas para gestionar tu dinero de manera inteligente y alcanzar tus objetivos.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="card-hover card-shine border-border/60 animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center`}>
                    <feature.icon className="w-6 h-6 text-foreground/80" />
                  </div>
                  <h3 className="font-semibold text-lg" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
                alt="Análisis financiero"
                className="rounded-2xl shadow-xl"
              />
            </div>

            <div className="space-y-8">
              <h2 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                Simplifica tu vida financiera
              </h2>
              
              <div className="space-y-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4 animate-fadeIn" style={{ animationDelay: `${index * 0.15}s` }}>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <benefit.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <LineChart className="w-6 h-6 text-primary" />
                    <p className="font-medium" style={{ fontFamily: 'Epilogue, sans-serif' }}>
                      Asesoría financiera personalizada
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recibe orientación de expertos para mejorar tus hábitos financieros 
                    y alcanzar tus metas más rápido.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Comienza a transformar tus finanzas hoy
          </h2>
          <p className="text-muted-foreground">
            Únete a miles de personas que ya están mejorando su salud financiera 
            con DailyFinance.
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            className="rounded-full font-medium text-base px-8 btn-press"
            data-testid="cta-btn"
          >
            Crear cuenta gratis
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Wallet className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">
              DailyFinance © 2026
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tu aliado en finanzas personales
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

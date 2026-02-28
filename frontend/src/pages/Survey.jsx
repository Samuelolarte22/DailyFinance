import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "../App";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { 
  Wallet, 
  ChevronRight, 
  ChevronLeft,
  DollarSign,
  TrendingDown,
  Target,
  HelpCircle
} from "lucide-react";

const Survey = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    monthly_income: "",
    monthly_expenses: "",
    current_savings: "",
    total_debt: "",
    financial_knowledge: 3,
    main_financial_goal: "",
    biggest_challenge: ""
  });

  const totalSteps = 4;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API}/survey`,
        {
          monthly_income: parseFloat(formData.monthly_income) || 0,
          monthly_expenses: parseFloat(formData.monthly_expenses) || 0,
          current_savings: parseFloat(formData.current_savings) || 0,
          total_debt: parseFloat(formData.total_debt) || 0,
          financial_knowledge: formData.financial_knowledge,
          main_financial_goal: formData.main_financial_goal,
          biggest_challenge: formData.biggest_challenge
        },
        { withCredentials: true }
      );
      
      setUser({ ...user, has_completed_survey: true });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Survey submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.monthly_income !== "" && formData.monthly_expenses !== "";
      case 2:
        return formData.current_savings !== "" && formData.total_debt !== "";
      case 3:
        return formData.financial_knowledge > 0;
      case 4:
        return formData.main_financial_goal !== "" && formData.biggest_challenge !== "";
      default:
        return false;
    }
  };

  const knowledgeLevels = [
    { value: 1, label: "Muy bajo", description: "No conozco conceptos financieros básicos" },
    { value: 2, label: "Bajo", description: "Conozco algunos conceptos pero no los aplico" },
    { value: 3, label: "Medio", description: "Entiendo lo básico y trato de aplicarlo" },
    { value: 4, label: "Alto", description: "Tengo buen conocimiento y lo aplico regularmente" },
    { value: 5, label: "Muy alto", description: "Domino los conceptos y gestiono bien mis finanzas" }
  ];

  const financialGoals = [
    "Ahorrar para emergencias",
    "Pagar deudas existentes",
    "Ahorrar para un objetivo específico",
    "Mejorar mis hábitos de gasto",
    "Aprender sobre inversiones",
    "Otro"
  ];

  const financialChallenges = [
    "No llego a fin de mes",
    "Gasto más de lo que gano",
    "No puedo ahorrar nada",
    "Tengo muchas deudas",
    "No sé en qué gasto mi dinero",
    "Falta de disciplina financiera",
    "Otro"
  ];

  return (
    <div className="min-h-screen bg-background noise-bg py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl" style={{ fontFamily: 'Epilogue, sans-serif' }}>
              DailyFinance
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Perfil Financiero
          </h1>
          <p className="text-muted-foreground">
            Cuéntanos sobre tu situación financiera para personalizar tu experiencia.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Paso {step} de {totalSteps}</span>
            <span className="text-sm font-medium">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Income & Expenses */}
        {step === 1 && (
          <Card className="animate-fadeIn" data-testid="survey-step-1">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-income flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Ingresos y Gastos</CardTitle>
                  <CardDescription>Tu flujo de dinero mensual</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="monthly_income">Ingreso mensual aproximado (COP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="monthly_income"
                    type="number"
                    placeholder="0"
                    className="pl-8 font-mono"
                    value={formData.monthly_income}
                    onChange={(e) => handleInputChange("monthly_income", e.target.value)}
                    data-testid="input-monthly-income"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Incluye mesada, trabajo, becas, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly_expenses">Gasto mensual aproximado (COP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="monthly_expenses"
                    type="number"
                    placeholder="0"
                    className="pl-8 font-mono"
                    value={formData.monthly_expenses}
                    onChange={(e) => handleInputChange("monthly_expenses", e.target.value)}
                    data-testid="input-monthly-expenses"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Transporte, alimentación, ocio, etc.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Savings & Debt */}
        {step === 2 && (
          <Card className="animate-fadeIn" data-testid="survey-step-2">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-savings flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Ahorros y Deudas</CardTitle>
                  <CardDescription>Tu patrimonio actual</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current_savings">Ahorros actuales (COP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="current_savings"
                    type="number"
                    placeholder="0"
                    className="pl-8 font-mono"
                    value={formData.current_savings}
                    onChange={(e) => handleInputChange("current_savings", e.target.value)}
                    data-testid="input-current-savings"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_debt">Deuda total actual (COP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="total_debt"
                    type="number"
                    placeholder="0"
                    className="pl-8 font-mono"
                    value={formData.total_debt}
                    onChange={(e) => handleInputChange("total_debt", e.target.value)}
                    data-testid="input-total-debt"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Préstamos, tarjetas de crédito, deudas con amigos/familia, etc.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Financial Knowledge */}
        {step === 3 && (
          <Card className="animate-fadeIn" data-testid="survey-step-3">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-debt flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Conocimiento Financiero</CardTitle>
                  <CardDescription>Autoevaluación de tu nivel</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Label className="mb-4 block">¿Cómo calificarías tu conocimiento sobre finanzas personales?</Label>
              <RadioGroup
                value={formData.financial_knowledge.toString()}
                onValueChange={(value) => handleInputChange("financial_knowledge", parseInt(value))}
                className="space-y-3"
              >
                {knowledgeLevels.map((level) => (
                  <div 
                    key={level.value}
                    className={`flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer ${
                      formData.financial_knowledge === level.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleInputChange("financial_knowledge", level.value)}
                  >
                    <RadioGroupItem value={level.value.toString()} id={`level-${level.value}`} />
                    <div className="flex-1">
                      <Label htmlFor={`level-${level.value}`} className="font-medium cursor-pointer">
                        {level.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                    <span className="text-2xl font-bold text-primary font-mono">{level.value}</span>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Goals & Challenges */}
        {step === 4 && (
          <Card className="animate-fadeIn" data-testid="survey-step-4">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Objetivos y Retos</CardTitle>
                  <CardDescription>¿Qué quieres lograr?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>¿Cuál es tu principal objetivo financiero?</Label>
                <RadioGroup
                  value={formData.main_financial_goal}
                  onValueChange={(value) => handleInputChange("main_financial_goal", value)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {financialGoals.map((goal) => (
                    <div 
                      key={goal}
                      className={`flex items-center space-x-2 p-3 rounded-xl border transition-all cursor-pointer ${
                        formData.main_financial_goal === goal 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleInputChange("main_financial_goal", goal)}
                    >
                      <RadioGroupItem value={goal} id={`goal-${goal}`} />
                      <Label htmlFor={`goal-${goal}`} className="text-sm cursor-pointer">{goal}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>¿Cuál es tu mayor reto financiero actualmente?</Label>
                <RadioGroup
                  value={formData.biggest_challenge}
                  onValueChange={(value) => handleInputChange("biggest_challenge", value)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {financialChallenges.map((challenge) => (
                    <div 
                      key={challenge}
                      className={`flex items-center space-x-2 p-3 rounded-xl border transition-all cursor-pointer ${
                        formData.biggest_challenge === challenge 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => handleInputChange("biggest_challenge", challenge)}
                    >
                      <RadioGroupItem value={challenge} id={`challenge-${challenge}`} />
                      <Label htmlFor={`challenge-${challenge}`} className="text-sm cursor-pointer">{challenge}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <Button 
              variant="outline" 
              onClick={() => setStep(step - 1)}
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="rounded-full btn-press"
              data-testid="survey-next-btn"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="rounded-full btn-press"
              data-testid="survey-submit-btn"
            >
              {loading ? "Guardando..." : "Completar encuesta"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Survey;

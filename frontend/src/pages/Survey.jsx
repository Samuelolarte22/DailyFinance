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
  ChevronRight, 
  ChevronLeft,
  DollarSign,
  TrendingDown,
  Target,
  HelpCircle
} from "lucide-react";
import CurrencyInput from "../components/CurrencyInput";

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
          monthly_income: parseInt(formData.monthly_income) || 0,
          monthly_expenses: parseInt(formData.monthly_expenses) || 0,
          current_savings: parseInt(formData.current_savings) || 0,
          total_debt: parseInt(formData.total_debt) || 0,
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
    <div className="min-h-screen bg-[#141b2d] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-[#D4AF37] text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              LD
            </span>
            <span className="text-white font-medium text-xl">Finance</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Perfil <span className="gold-text">Financiero</span>
          </h1>
          <p className="text-gray-400">
            Cuéntanos sobre tu situación financiera para personalizar tu experiencia.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Paso {step} de {totalSteps}</span>
            <span className="text-sm font-medium text-[#D4AF37]">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-[#2a3444] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all duration-500 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Income & Expenses */}
        {step === 1 && (
          <Card className="animate-fadeIn bg-[#1a2332] border-[#2a3444]" data-testid="survey-step-1">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Ingresos y Gastos</CardTitle>
                  <CardDescription className="text-gray-400">Tu flujo de dinero mensual</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300" htmlFor="monthly_income">Ingreso mensual aproximado (COP)</Label>
                <CurrencyInput
                  className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.monthly_income}
                  onChange={(v) => handleInputChange("monthly_income", v)}
                  data-testid="input-monthly-income"
                />
                <p className="text-xs text-gray-500">
                  Incluye salario, mesada, becas, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300" htmlFor="monthly_expenses">Gasto mensual aproximado (COP)</Label>
                <CurrencyInput
                  className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.monthly_expenses}
                  onChange={(v) => handleInputChange("monthly_expenses", v)}
                  data-testid="input-monthly-expenses"
                />
                <p className="text-xs text-gray-500">
                  Transporte, alimentacion, ocio, etc.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Savings & Debt */}
        {step === 2 && (
          <Card className="animate-fadeIn bg-[#1a2332] border-[#2a3444]" data-testid="survey-step-2">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <CardTitle className="text-white">Ahorros y Deudas</CardTitle>
                  <CardDescription className="text-gray-400">Tu patrimonio actual</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-gray-300" htmlFor="current_savings">Ahorros actuales (COP)</Label>
                <CurrencyInput
                  className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.current_savings}
                  onChange={(v) => handleInputChange("current_savings", v)}
                  data-testid="input-current-savings"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300" htmlFor="total_debt">Deuda total actual (COP)</Label>
                <CurrencyInput
                  className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.total_debt}
                  onChange={(v) => handleInputChange("total_debt", v)}
                  data-testid="input-total-debt"
                />
                <p className="text-xs text-gray-500">
                  Prestamos, tarjetas de credito, deudas con amigos/familia, etc.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Financial Knowledge */}
        {step === 3 && (
          <Card className="animate-fadeIn bg-[#1a2332] border-[#2a3444]" data-testid="survey-step-3">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Conocimiento Financiero</CardTitle>
                  <CardDescription className="text-gray-400">Autoevaluación de tu nivel</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Label className="mb-4 block text-gray-300">¿Cómo calificarías tu conocimiento sobre finanzas personales?</Label>
              <RadioGroup
                value={formData.financial_knowledge.toString()}
                onValueChange={(value) => handleInputChange("financial_knowledge", parseInt(value))}
                className="space-y-3"
              >
                {knowledgeLevels.map((level) => (
                  <div 
                    key={level.value}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
                      formData.financial_knowledge === level.value 
                        ? "border-[#D4AF37] bg-[#D4AF37]/10" 
                        : "border-[#2a3444] bg-[#141b2d] hover:border-[#D4AF37]/50"
                    }`}
                    onClick={() => handleInputChange("financial_knowledge", level.value)}
                  >
                    <RadioGroupItem value={level.value.toString()} id={`level-${level.value}`} className="border-[#D4AF37] text-[#D4AF37]" />
                    <div className="flex-1">
                      <Label htmlFor={`level-${level.value}`} className="font-medium cursor-pointer text-white">
                        {level.label}
                      </Label>
                      <p className="text-sm text-gray-500">{level.description}</p>
                    </div>
                    <span className="text-2xl font-bold text-[#D4AF37] font-mono">{level.value}</span>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Goals & Challenges */}
        {step === 4 && (
          <Card className="animate-fadeIn bg-[#1a2332] border-[#2a3444]" data-testid="survey-step-4">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <CardTitle className="text-white">Objetivos y Retos</CardTitle>
                  <CardDescription className="text-gray-400">¿Qué quieres lograr?</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-gray-300">¿Cuál es tu principal objetivo financiero?</Label>
                <RadioGroup
                  value={formData.main_financial_goal}
                  onValueChange={(value) => handleInputChange("main_financial_goal", value)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {financialGoals.map((goal) => (
                    <div 
                      key={goal}
                      className={`flex items-center space-x-2 p-3 rounded-lg border transition-all cursor-pointer ${
                        formData.main_financial_goal === goal 
                          ? "border-[#D4AF37] bg-[#D4AF37]/10" 
                          : "border-[#2a3444] bg-[#141b2d] hover:border-[#D4AF37]/50"
                      }`}
                      onClick={() => handleInputChange("main_financial_goal", goal)}
                    >
                      <RadioGroupItem value={goal} id={`goal-${goal}`} className="border-[#D4AF37] text-[#D4AF37]" />
                      <Label htmlFor={`goal-${goal}`} className="text-sm cursor-pointer text-gray-300">{goal}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">¿Cuál es tu mayor reto financiero actualmente?</Label>
                <RadioGroup
                  value={formData.biggest_challenge}
                  onValueChange={(value) => handleInputChange("biggest_challenge", value)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {financialChallenges.map((challenge) => (
                    <div 
                      key={challenge}
                      className={`flex items-center space-x-2 p-3 rounded-lg border transition-all cursor-pointer ${
                        formData.biggest_challenge === challenge 
                          ? "border-[#D4AF37] bg-[#D4AF37]/10" 
                          : "border-[#2a3444] bg-[#141b2d] hover:border-[#D4AF37]/50"
                      }`}
                      onClick={() => handleInputChange("biggest_challenge", challenge)}
                    >
                      <RadioGroupItem value={challenge} id={`challenge-${challenge}`} className="border-[#D4AF37] text-[#D4AF37]" />
                      <Label htmlFor={`challenge-${challenge}`} className="text-sm cursor-pointer text-gray-300">{challenge}</Label>
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
              className="rounded-md border-[#2a3444] text-gray-300 hover:bg-[#2a3444] hover:text-white"
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
              className="btn-gold rounded-md"
              data-testid="survey-next-btn"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="btn-gold rounded-md"
              data-testid="survey-submit-btn"
            >
              {loading ? "Guardando..." : "Completar perfil"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Survey;

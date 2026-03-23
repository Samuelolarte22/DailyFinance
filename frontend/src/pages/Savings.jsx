import { useState, useEffect } from "react";
import { API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { 
  Plus, 
  PiggyBank, 
  Trash2,
  DollarSign,
  Target,
  Sparkles
} from "lucide-react";
import { Toaster, toast } from "sonner";

const Savings = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    deadline: ""
  });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await axios.get(`${API}/savings`, {
        withCredentials: true
      });
      setGoals(response.data);
    } catch (error) {
      console.error("Error fetching savings goals:", error);
      toast.error("Error al cargar metas de ahorro");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.target_amount) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    try {
      await axios.post(
        `${API}/savings`,
        {
          name: formData.name,
          target_amount: parseFloat(formData.target_amount),
          current_amount: formData.current_amount ? parseFloat(formData.current_amount) : 0,
          deadline: formData.deadline || null
        },
        { withCredentials: true }
      );

      toast.success("Meta de ahorro creada");
      setDialogOpen(false);
      setFormData({
        name: "",
        target_amount: "",
        current_amount: "",
        deadline: ""
      });
      fetchGoals();
    } catch (error) {
      console.error("Error creating savings goal:", error);
      toast.error("Error al crear meta");
    }
  };

  const handleContribution = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    try {
      await axios.put(
        `${API}/savings/${selectedGoal.goal_id}/contribute`,
        { amount: parseFloat(contributionAmount) },
        { withCredentials: true }
      );

      toast.success("Aporte registrado");
      setContributionDialogOpen(false);
      setContributionAmount("");
      setSelectedGoal(null);
      fetchGoals();
    } catch (error) {
      console.error("Error making contribution:", error);
      toast.error("Error al registrar aporte");
    }
  };

  const handleDelete = async (goalId) => {
    try {
      await axios.delete(`${API}/savings/${goalId}`, {
        withCredentials: true
      });
      toast.success("Meta eliminada");
      fetchGoals();
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Error al eliminar meta");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateProgress = (current, target) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  const totalSaved = goals.reduce((acc, g) => acc + g.current_amount, 0);
  const totalTarget = goals.reduce((acc, g) => acc + g.target_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[#D4AF37]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="savings-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Metas de <span className="gold-text">Ahorro</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Define tus objetivos y construye tu futuro financiero (vista global)
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-gold rounded-md" data-testid="add-goal-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-[#1a2332] border-[#2a3444]">
            <DialogHeader>
              <DialogTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                Crear meta de ahorro
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nombre de la meta</Label>
                <Input
                  placeholder="Ej: Viaje de vacaciones"
                  className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="goal-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Monto objetivo (COP)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-8 font-mono bg-[#141b2d] border-[#2a3444] text-white"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                      data-testid="target-amount-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Ahorro inicial (COP)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-8 font-mono bg-[#141b2d] border-[#2a3444] text-white"
                      value={formData.current_amount}
                      onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                      data-testid="initial-amount-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Fecha límite (opcional)</Label>
                <Input
                  type="date"
                  className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  data-testid="deadline-input"
                />
              </div>

              <Button type="submit" className="w-full btn-gold rounded-md" data-testid="submit-goal-btn">
                Crear meta
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30" data-testid="savings-summary-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
              <PiggyBank className="w-7 h-7 text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400">Total ahorrado</p>
              <p className="text-3xl font-bold font-mono text-[#D4AF37]">
                {formatCurrency(totalSaved)}
              </p>
              {totalTarget > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {calculateProgress(totalSaved, totalTarget)}% de tus metas completadas
                </p>
              )}
            </div>
          </div>
          {totalTarget > 0 && (
            <div className="mt-4 h-3 bg-[#2a3444] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] transition-all duration-500"
                style={{ width: `${calculateProgress(totalSaved, totalTarget)}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.length > 0 ? (
          goals.map((goal) => {
            const progress = calculateProgress(goal.current_amount, goal.target_amount);
            const isCompleted = progress >= 100;
            
            return (
              <Card 
                key={goal.goal_id} 
                className={`card-hover bg-[#1a2332] relative overflow-hidden ${isCompleted ? 'border-[#D4AF37]' : 'border-[#2a3444]'}`}
                data-testid={`goal-item-${goal.goal_id}`}
              >
                {isCompleted && (
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#D4AF37] text-[#141b2d] text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      Completada
                    </div>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{goal.name}</h3>
                      {goal.deadline && (
                        <p className="text-xs text-gray-500">
                          Meta: {goal.deadline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Circular Progress */}
                  <div className="flex items-center justify-center my-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-[#2a3444]"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="url(#goldGradient)"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                          className="transition-all duration-500"
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#D4AF37" />
                            <stop offset="100%" stopColor="#F4D03F" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold font-mono text-white">{progress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Ahorrado</span>
                      <span className="font-mono font-medium text-[#D4AF37]">
                        {formatCurrency(goal.current_amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Meta</span>
                      <span className="font-mono text-white">
                        {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Restante</span>
                      <span className="font-mono text-gray-400">
                        {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount))}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-md border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setContributionDialogOpen(true);
                      }}
                      data-testid={`contribute-goal-${goal.goal_id}`}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Aportar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDelete(goal.goal_id)}
                      data-testid={`delete-goal-${goal.goal_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="sm:col-span-2 lg:col-span-3 bg-[#1a2332] border-[#2a3444]">
            <CardContent className="py-12 text-center">
              <PiggyBank className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-600" />
              <p className="text-gray-500">No tienes metas de ahorro</p>
              <p className="text-sm text-gray-600 mt-1">
                Empieza a planificar tu futuro financiero
              </p>
              <Button 
                variant="link" 
                className="mt-2 text-[#D4AF37]"
                onClick={() => setDialogOpen(true)}
              >
                Crear primera meta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contribution Dialog */}
      <Dialog open={contributionDialogOpen} onOpenChange={setContributionDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a2332] border-[#2a3444]">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Agregar aporte
            </DialogTitle>
          </DialogHeader>
          {selectedGoal && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
                <p className="font-medium text-white">{selectedGoal.name}</p>
                <p className="text-sm text-gray-500">
                  Ahorrado: {formatCurrency(selectedGoal.current_amount)} de {formatCurrency(selectedGoal.target_amount)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-300">Monto a aportar (COP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-8 font-mono bg-[#141b2d] border-[#2a3444] text-white"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    data-testid="contribution-amount-input"
                  />
                </div>
              </div>

              <Button 
                onClick={handleContribution} 
                className="w-full btn-gold rounded-md"
                data-testid="confirm-contribution-btn"
              >
                Confirmar aporte
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Savings;

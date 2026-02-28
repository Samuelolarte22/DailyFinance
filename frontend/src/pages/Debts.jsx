import { useState, useEffect } from "react";
import { API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { 
  Plus, 
  CreditCard, 
  Trash2,
  DollarSign,
  TrendingDown
} from "lucide-react";
import { Toaster, toast } from "sonner";

const Debts = () => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    total_amount: "",
    current_amount: "",
    interest_rate: "",
    due_date: ""
  });

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      const response = await axios.get(`${API}/debts`, {
        withCredentials: true
      });
      setDebts(response.data);
    } catch (error) {
      console.error("Error fetching debts:", error);
      toast.error("Error al cargar deudas");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.total_amount || !formData.current_amount) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    try {
      await axios.post(
        `${API}/debts`,
        {
          name: formData.name,
          total_amount: parseFloat(formData.total_amount),
          current_amount: parseFloat(formData.current_amount),
          interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
          due_date: formData.due_date || null
        },
        { withCredentials: true }
      );

      toast.success("Deuda registrada");
      setDialogOpen(false);
      setFormData({
        name: "",
        total_amount: "",
        current_amount: "",
        interest_rate: "",
        due_date: ""
      });
      fetchDebts();
    } catch (error) {
      console.error("Error creating debt:", error);
      toast.error("Error al crear deuda");
    }
  };

  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    try {
      await axios.put(
        `${API}/debts/${selectedDebt.debt_id}/pay`,
        { amount: parseFloat(paymentAmount) },
        { withCredentials: true }
      );

      toast.success("Pago registrado");
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedDebt(null);
      fetchDebts();
    } catch (error) {
      console.error("Error making payment:", error);
      toast.error("Error al registrar pago");
    }
  };

  const handleDelete = async (debtId) => {
    try {
      await axios.delete(`${API}/debts/${debtId}`, {
        withCredentials: true
      });
      toast.success("Deuda eliminada");
      fetchDebts();
    } catch (error) {
      console.error("Error deleting debt:", error);
      toast.error("Error al eliminar deuda");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateProgress = (total, current) => {
    const paid = total - current;
    return Math.round((paid / total) * 100);
  };

  const totalDebt = debts.reduce((acc, d) => acc + d.current_amount, 0);
  const totalOriginal = debts.reduce((acc, d) => acc + d.total_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="debts-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Gestión de Deudas
          </h1>
          <p className="text-muted-foreground mt-1">
            Controla y reduce tus deudas paso a paso
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full btn-press" data-testid="add-debt-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva deuda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
                Registrar deuda
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la deuda</Label>
                <Input
                  placeholder="Ej: Préstamo universitario"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="debt-name-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto total original (COP)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-8 font-mono"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                      data-testid="total-amount-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Monto pendiente (COP)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-8 font-mono"
                      value={formData.current_amount}
                      onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                      data-testid="current-amount-input"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tasa de interés (%) - Opcional</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    data-testid="interest-rate-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha de vencimiento - Opcional</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    data-testid="due-date-input"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full rounded-full btn-press" data-testid="submit-debt-btn">
                Registrar deuda
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="bg-debt/20 border-debt/30" data-testid="debt-summary-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-debt flex items-center justify-center">
              <CreditCard className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Deuda total pendiente</p>
              <p className="text-3xl font-bold font-mono text-debt">
                {formatCurrency(totalDebt)}
              </p>
              {totalOriginal > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Has pagado el {calculateProgress(totalOriginal, totalDebt)}% del total original
                </p>
              )}
            </div>
          </div>
          {totalOriginal > 0 && (
            <Progress 
              value={calculateProgress(totalOriginal, totalDebt)} 
              className="mt-4 h-3"
            />
          )}
        </CardContent>
      </Card>

      {/* Debts List */}
      <div className="space-y-4">
        {debts.length > 0 ? (
          debts.map((debt) => {
            const progress = calculateProgress(debt.total_amount, debt.current_amount);
            return (
              <Card key={debt.debt_id} className="card-hover" data-testid={`debt-item-${debt.debt_id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-debt/30 flex items-center justify-center">
                        <TrendingDown className="w-6 h-6 text-debt" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{debt.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {debt.interest_rate > 0 && (
                            <span>{debt.interest_rate}% interés</span>
                          )}
                          {debt.due_date && (
                            <span>• Vence: {debt.due_date}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setSelectedDebt(debt);
                          setPaymentDialogOpen(true);
                        }}
                        disabled={debt.current_amount <= 0}
                        data-testid={`pay-debt-${debt.debt_id}`}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Pagar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(debt.debt_id)}
                        data-testid={`delete-debt-${debt.debt_id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progreso de pago</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Pagado: {formatCurrency(debt.total_amount - debt.current_amount)}
                      </span>
                      <span className="font-mono font-semibold text-debt">
                        Pendiente: {formatCurrency(debt.current_amount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">No tienes deudas registradas</p>
              <p className="text-sm text-muted-foreground mt-1">
                ¡Excelente! Mantén tus finanzas saludables
              </p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setDialogOpen(true)}
              >
                Registrar una deuda
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
              Registrar pago
            </DialogTitle>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="font-medium">{selectedDebt.name}</p>
                <p className="text-sm text-muted-foreground">
                  Pendiente: {formatCurrency(selectedDebt.current_amount)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Monto a pagar (COP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-8 font-mono"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedDebt.current_amount}
                    data-testid="payment-amount-input"
                  />
                </div>
              </div>

              <Button 
                onClick={handlePayment} 
                className="w-full rounded-full btn-press"
                data-testid="confirm-payment-btn"
              >
                Confirmar pago
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Debts;

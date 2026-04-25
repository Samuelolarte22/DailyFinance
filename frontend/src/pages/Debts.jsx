import React, { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Plus, 
  CreditCard, 
  Trash2,
  DollarSign,
  TrendingDown,
  Calendar,
  Info
} from "lucide-react";
import { Toaster, toast } from "sonner";
import CurrencyInput from "../components/CurrencyInput";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from "recharts";

const COLORS = ["#D4AF37", "#F4D03F", "#1a5276", "#2980b9", "#8e44ad", "#c0392b", "#27ae60", "#e67e22", "#2c3e50", "#16a085"];

const Debts = () => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [editDebtId, setEditDebtId] = useState(null);
  const [editDebtAmount, setEditDebtAmount] = useState("");
  const [snowball, setSnowball] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [formData, setFormData] = useState({
    name: "",
    total_amount: "",
    current_amount: "",
    interest_rate: "",
    num_installments: "",
    due_date: ""
  });

  useEffect(() => {
    fetchDebts();
    fetchSnowball();
  }, []);

  const fetchDebts = async () => {
    try {
      const response = await axios.get(`${API}/debts`, { withCredentials: true });
      setDebts(response.data);
    } catch (error) {
      console.error("Error fetching debts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSnowball = async () => {
    try {
      const response = await axios.get(`${API}/debts/snowball`, { withCredentials: true });
      setSnowball(response.data);
    } catch (error) {
      console.error("Error fetching snowball:", error);
    }
  };

  // Calculate min payment preview from form data
  const getCalculatedMinPayment = () => {
    const P = parseInt(formData.current_amount) || 0;
    const n = parseInt(formData.num_installments) || 0;
    const annual = parseFloat(formData.interest_rate) || 0;
    if (P <= 0 || n <= 0) return 0;
    if (annual > 0) {
      const r = annual / 100 / 12;
      return Math.round(P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
    }
    return Math.round(P / n);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.total_amount || !formData.current_amount) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }
    try {
      await axios.post(`${API}/debts`, {
        name: formData.name,
        total_amount: parseInt(formData.total_amount) || 0,
        current_amount: parseInt(formData.current_amount) || 0,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
        num_installments: formData.num_installments ? parseInt(formData.num_installments) : 0,
        due_date: formData.due_date || null
      }, { withCredentials: true });

      toast.success("Deuda registrada");
      setDialogOpen(false);
      setFormData({ name: "", total_amount: "", current_amount: "", interest_rate: "", num_installments: "", due_date: "" });
      fetchDebts();
      fetchSnowball();
    } catch (error) {
      toast.error("Error al crear deuda");
    }
  };

  const handlePayment = async () => {
    const amount = parseInt(paymentAmount) || 0;
    if (amount <= 0) {
      toast.error("Ingresa un monto valido");
      return;
    }
    try {
      await axios.put(`${API}/debts/${selectedDebt.debt_id}/pay`, 
        { amount }, { withCredentials: true });
      toast.success("Pago registrado");
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedDebt(null);
      fetchDebts();
      fetchSnowball();
    } catch (error) {
      toast.error("Error al registrar pago");
    }
  };

  const handleDelete = async (debtId) => {
    try {
      await axios.delete(`${API}/debts/${debtId}`, { withCredentials: true });
      toast.success("Deuda eliminada");
      fetchDebts();
      fetchSnowball();
    } catch (error) {
      toast.error("Error al eliminar deuda");
    }
  };

  const handleEditDebtAmount = async (debtId) => {
    if (!editDebtAmount) return;
    try {
      await axios.put(`${API}/debts/${debtId}/edit`, { current_amount: parseInt(editDebtAmount) }, { withCredentials: true });
      toast.success("Monto actualizado");
      setEditDebtId(null);
      setEditDebtAmount("");
      fetchDebts();
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  };

  const calculateProgress = (total, current) => {
    const paid = total - current;
    return Math.round((paid / total) * 100);
  };

  const totalDebt = debts.reduce((acc, d) => acc + d.current_amount, 0);
  const totalOriginal = debts.reduce((acc, d) => acc + d.total_amount, 0);
  const totalMinPayment = debts.reduce((acc, d) => acc + (d.min_payment || 0), 0);

  const pieData = debts
    .filter(d => d.current_amount > 0)
    .map(d => ({ name: d.name, value: d.current_amount }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[#D4AF37]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="debts-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Gestion de <span className="gold-text">Deudas</span>
          </h1>
          <p className="text-gray-400 mt-1">Metodo Bola de Nieve - Controla y reduce tus deudas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-gold rounded-md" data-testid="add-debt-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva deuda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-[#1a2332] border-[#2a3444]">
            <DialogHeader>
              <DialogTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                Registrar deuda
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nombre (ej: VISA, Banco)</Label>
                <Input placeholder="Ej: VISA" className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="debt-name-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Deuda total original</Label>
                  <CurrencyInput className="bg-[#141b2d] border-[#2a3444] text-white"
                    value={formData.total_amount} onChange={(v) => setFormData({ ...formData, total_amount: v })}
                    data-testid="total-amount-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Balance actual</Label>
                  <CurrencyInput className="bg-[#141b2d] border-[#2a3444] text-white"
                    value={formData.current_amount} onChange={(v) => setFormData({ ...formData, current_amount: v })}
                    data-testid="current-amount-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Numero de cuotas</Label>
                  <Input type="number" placeholder="Ej: 36" className="font-mono bg-[#141b2d] border-[#2a3444] text-white"
                    value={formData.num_installments} onChange={(e) => setFormData({ ...formData, num_installments: e.target.value })}
                    data-testid="num-installments-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Tasa interes anual (%)</Label>
                  <Input type="number" step="0.1" placeholder="Ej: 28.5" className="font-mono bg-[#141b2d] border-[#2a3444] text-white"
                    value={formData.interest_rate} onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    data-testid="interest-rate-input" />
                </div>
              </div>
              {/* Auto-calculated min payment */}
              {getCalculatedMinPayment() > 0 && (
                <div className="p-3 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                  <p className="text-xs text-gray-400 mb-1">Pago minimo mensual calculado:</p>
                  <p className="text-lg font-bold font-mono text-[#D4AF37]" data-testid="calculated-payment">
                    {formatCurrency(getCalculatedMinPayment())}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-gray-300">Fecha de vencimiento (opcional)</Label>
                <Input type="date" className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  data-testid="due-date-input" />
              </div>
              <Button type="submit" className="w-full btn-gold rounded-md" data-testid="submit-debt-btn">
                Registrar deuda
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1a2332] border border-[#2a3444]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d]">Resumen</TabsTrigger>
          <TabsTrigger value="snowball" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d]">Bola de Nieve</TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d]">Mis Deudas</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {debts.length > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#1a2332] border-[#D4AF37]/30">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-gray-400 mb-2">Pago Minimo Mensual</p>
                    <p className="text-3xl font-bold font-mono text-[#D4AF37]" data-testid="total-min-payment">
                      {formatCurrency(totalMinPayment)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a2332] border-purple-500/30">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-gray-400 mb-2">Deuda Total Actual</p>
                    <p className="text-3xl font-bold font-mono text-purple-400" data-testid="total-debt-display">
                      {formatCurrency(totalDebt)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a2332] border-green-500/30">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-gray-400 mb-2">Meses para pagar</p>
                    <p className="text-3xl font-bold font-mono text-green-400" data-testid="months-to-payoff">
                      {snowball?.months_to_payoff || "~"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Pie Chart + Debt Summary */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-[#1a2332] border-[#2a3444]">
                  <CardHeader>
                    <CardTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Distribucion de Deudas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pieData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                              paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                              {pieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)}
                              contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2a3444', borderRadius: '8px', color: '#fff' }}
                              labelStyle={{ color: '#fff' }}
                              itemStyle={{ color: '#fff' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">No hay deudas activas</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-[#1a2332] border-[#2a3444]">
                  <CardHeader>
                    <CardTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Detalle por Deuda
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                    {debts.filter(d => d.current_amount > 0).map((d, i) => (
                      <div key={d.debt_id} className="flex items-center gap-3 p-3 rounded-lg bg-[#141b2d] border border-[#2a3444]">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{d.name}</p>
                          <p className="text-xs text-gray-500">{d.interest_rate || 0}% interes | Pago min: {formatCurrency(d.min_payment || 0)}</p>
                        </div>
                        <p className="font-mono font-semibold text-white shrink-0">{formatCurrency(d.current_amount)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Snowball Info */}
              <Card className="bg-[#D4AF37]/5 border-[#D4AF37]/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Info className="w-6 h-6 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Metodo "Bola de Nieve"</p>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        Es una estrategia de reduccion de deuda en la que se paga la deuda en orden de menor a mayor, 
                        ganando impulso a medida que elimina cada saldo restante. Cuando la deuda mas pequeña se paga en su totalidad, 
                        transfiere el pago minimo que estaba haciendo de esa deuda al siguiente pago de deuda mas pequeño.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-[#1a2332] border-[#2a3444]">
              <CardContent className="py-12 text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-600" />
                <p className="text-gray-500">No tienes deudas registradas</p>
                <Button variant="link" className="mt-2 text-[#D4AF37]" onClick={() => setDialogOpen(true)}>
                  Registrar una deuda
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SNOWBALL TAB */}
        <TabsContent value="snowball" className="space-y-6 mt-4">
          {snowball && snowball.debts.length > 0 ? (
            <>
              <Card className="bg-[#1a2332] border-[#2a3444]">
                <CardHeader>
                  <CardTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Proyeccion Bola de Nieve - Mes a Mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="snowball-table">
                      <thead>
                        <tr className="border-b border-[#2a3444]">
                          <th className="text-left p-2 text-[#D4AF37] font-semibold sticky left-0 bg-[#1a2332] z-10">Mes</th>
                          {snowball.debts.map((d, i) => (
                            <th key={d.debt_id} colSpan={2} className="text-center p-2 font-semibold" style={{ color: COLORS[i % COLORS.length] }}>
                              {d.name}
                            </th>
                          ))}
                        </tr>
                        <tr className="border-b border-[#2a3444]">
                          <th className="text-left p-2 text-gray-500 sticky left-0 bg-[#1a2332] z-10"></th>
                          {snowball.debts.map(d => (
                            <React.Fragment key={`header-${d.debt_id}`}>
                              <th className="text-center p-2 text-gray-500 text-xs">Pago</th>
                              <th className="text-center p-2 text-gray-500 text-xs">Balance</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {snowball.schedule.map((row) => (
                          <tr key={row.month} className="border-b border-[#2a3444]/50 hover:bg-[#141b2d]/50">
                            <td className="p-2 font-mono text-[#D4AF37] sticky left-0 bg-[#1a2332] z-10">{row.month}</td>
                            {snowball.debts.map(d => {
                              const cell = row[d.debt_id] || { payment: 0, balance: 0 };
                              return (
                                <React.Fragment key={`${row.month}-${d.debt_id}`}>
                                  <td className="text-center p-2 font-mono text-gray-300 text-xs">
                                    {cell.payment > 0 ? formatCurrency(cell.payment) : "-"}
                                  </td>
                                  <td className={`text-center p-2 font-mono text-xs ${cell.balance === 0 ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
                                    {cell.balance === 0 && cell.payment === 0 ? "-" : formatCurrency(cell.balance)}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-[#1a2332] border-[#2a3444]">
              <CardContent className="py-12 text-center">
                <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-600" />
                <p className="text-gray-500">Agrega deudas con pago minimo para ver la proyeccion</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* LIST TAB */}
        <TabsContent value="list" className="space-y-4 mt-4">
          {/* Summary */}
          <Card className="bg-purple-500/10 border-purple-500/30" data-testid="debt-summary-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Deuda total pendiente</p>
                  <p className="text-3xl font-bold font-mono text-purple-400">{formatCurrency(totalDebt)}</p>
                  {totalOriginal > 0 && (
                    <p className="text-sm text-gray-500 mt-1">Has pagado el {calculateProgress(totalOriginal, totalDebt)}% del total original</p>
                  )}
                </div>
              </div>
              {totalOriginal > 0 && (
                <div className="mt-4 h-3 bg-[#2a3444] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                    style={{ width: `${calculateProgress(totalOriginal, totalDebt)}%` }} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Debts List */}
          {debts.length > 0 ? (
            debts.map((debt) => {
              const progress = calculateProgress(debt.total_amount, debt.current_amount);
              return (
                <Card key={debt.debt_id} className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid={`debt-item-${debt.debt_id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <TrendingDown className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-white">{debt.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                            {debt.interest_rate > 0 && <span>{debt.interest_rate}% interes</span>}
                            {debt.min_payment > 0 && <span>| Min: {formatCurrency(debt.min_payment)}</span>}
                            {debt.due_date && <span>| Vence: {debt.due_date}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm"
                          className="rounded-md border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                          onClick={() => { setSelectedDebt(debt); setPaymentDialogOpen(true); }}
                          disabled={debt.current_amount <= 0} data-testid={`pay-debt-${debt.debt_id}`}>
                          <DollarSign className="w-4 h-4 mr-1" />Pagar
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDelete(debt.debt_id)} data-testid={`delete-debt-${debt.debt_id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Progreso de pago</span>
                        <span className="font-mono text-white">{progress}%</span>
                      </div>
                      <div className="h-3 bg-[#2a3444] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                          style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Pagado: {formatCurrency(debt.total_amount - debt.current_amount)}</span>
                        {editDebtId === debt.debt_id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-xs">Pendiente:</span>
                            <CurrencyInput value={editDebtAmount} onChange={setEditDebtAmount}
                              className="bg-[#141b2d] border-[#2a3444] text-white w-24 h-6 text-xs"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleEditDebtAmount(debt.debt_id); if (e.key === 'Escape') setEditDebtId(null); }} />
                            <button onClick={() => handleEditDebtAmount(debt.debt_id)} className="text-green-400 text-xs">OK</button>
                            <button onClick={() => setEditDebtId(null)} className="text-gray-500 text-xs">X</button>
                          </div>
                        ) : (
                          <span className="font-mono font-semibold text-purple-400 cursor-pointer hover:underline"
                            onClick={() => { setEditDebtId(debt.debt_id); setEditDebtAmount(String(debt.current_amount)); }}
                            title="Click para editar" data-testid={`edit-debt-${debt.debt_id}`}>
                            Pendiente: {formatCurrency(debt.current_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-[#1a2332] border-[#2a3444]">
              <CardContent className="py-12 text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-600" />
                <p className="text-gray-500">No tienes deudas registradas</p>
                <Button variant="link" className="mt-2 text-[#D4AF37]" onClick={() => setDialogOpen(true)}>
                  Registrar una deuda
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a2332] border-[#2a3444]">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>Registrar pago</DialogTitle>
          </DialogHeader>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
                <p className="font-medium text-white">{selectedDebt.name}</p>
                <p className="text-sm text-gray-500">Pendiente: {formatCurrency(selectedDebt.current_amount)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Monto a pagar (COP)</Label>
                <CurrencyInput className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={paymentAmount} onChange={setPaymentAmount}
                  data-testid="payment-amount-input" />
              </div>
              <Button onClick={handlePayment} className="w-full btn-gold rounded-md" data-testid="confirm-payment-btn">
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

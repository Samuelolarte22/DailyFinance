import React, { useState, useEffect } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank,
  ArrowUpRight, ArrowDownRight, ChevronRight, ChevronLeft,
  Calendar as CalendarIcon, Target, Plus, X, Check,
  Landmark, BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import AdvisorChat from "../components/AdvisorChat";
import CurrencyInput from "../components/CurrencyInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Toaster, toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgetComparison, setBudgetComparison] = useState([]);
  const [incomeBudgetComparison, setIncomeBudgetComparison] = useState([]);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editCommentRecurring, setEditCommentRecurring] = useState(false);
  const [annualOverview, setAnnualOverview] = useState([]);
  const [budgetViewMode, setBudgetViewMode] = useState("monthly"); // "monthly" or "biweekly"
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // Pocket dialog
  const [pocketDialogOpen, setPocketDialogOpen] = useState(false);
  const [newPocketName, setNewPocketName] = useState("");
  const [fundPocketId, setFundPocketId] = useState(null);
  const [fundAmount, setFundAmount] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    fetchBudgetComparison();
  }, [selectedMonth]);

  useEffect(() => {
    const refresh = () => { fetchDashboard(); fetchBudgetComparison(); };
    window.addEventListener("transaction-created", refresh);
    return () => window.removeEventListener("transaction-created", refresh);
  }, [selectedMonth]);

  const fetchDashboard = async () => {
    try {
      const [dashRes, reportsRes] = await Promise.all([
        axios.get(`${API}/dashboard`, { withCredentials: true }),
        axios.get(`${API}/reports`, { withCredentials: true }).catch(() => ({ data: {} }))
      ]);
      setDashboardData(dashRes.data);
      setAnnualOverview(reportsRes.data?.annual_overview || []);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetComparison = async () => {
    try {
      const [expRes, incRes] = await Promise.all([
        axios.get(`${API}/budgets/comparison?month=${selectedMonth}&budget_type=expense`, { withCredentials: true }),
        axios.get(`${API}/budgets/comparison?month=${selectedMonth}&budget_type=income`, { withCredentials: true })
      ]);
      setBudgetComparison(expRes.data);
      setIncomeBudgetComparison(incRes.data);
    } catch (error) {
      console.error("Error fetching budget comparison:", error);
    }
  };

  const handleSaveBudget = async (category, amount, budgetType = "expense", comment = null, commentRecurring = false, biweeklyData = null) => {
    if (!amount || parseInt(amount) <= 0) return;
    try {
      const payload = {
        category, projected_amount: parseInt(amount), budget_type: budgetType,
        month: selectedMonth
      };
      if (comment !== null) {
        payload.comment = comment;
        payload.comment_recurring = commentRecurring;
      }
      if (biweeklyData) {
        payload.period_type = "biweekly";
        if (biweeklyData.q1_projected !== undefined) payload.q1_projected = parseInt(biweeklyData.q1_projected) || 0;
        if (biweeklyData.q1_done !== undefined) payload.q1_done = biweeklyData.q1_done;
        if (biweeklyData.q2_projected !== undefined) payload.q2_projected = parseInt(biweeklyData.q2_projected) || 0;
        if (biweeklyData.q2_done !== undefined) payload.q2_done = biweeklyData.q2_done;
      }
      await axios.post(`${API}/budgets`, payload, { withCredentials: true });
      toast.success("Presupuesto guardado");
      setEditingBudget(null);
      setEditAmount("");
      fetchBudgetComparison();
    } catch (error) {
      toast.error("Error al guardar presupuesto");
    }
  };

  const handleCreatePocket = async () => {
    if (!newPocketName.trim()) return;
    try {
      await axios.post(`${API}/pockets`, { name: newPocketName.trim() }, { withCredentials: true });
      toast.success("Bolsillo creado");
      setNewPocketName("");
      setPocketDialogOpen(false);
      fetchDashboard();
    } catch (error) {
      toast.error("Error al crear bolsillo");
    }
  };

  const handleFundPocket = async (pocketId) => {
    if (!fundAmount || parseInt(fundAmount) <= 0) return;
    try {
      await axios.post(`${API}/pockets/${pocketId}/fund`, { amount: parseInt(fundAmount) }, { withCredentials: true });
      toast.success("Bolsillo fondeado");
      setFundPocketId(null);
      setFundAmount("");
      fetchDashboard();
    } catch (error) {
      toast.error("Error al fondear bolsillo");
    }
  };

  const handleDeletePocket = async (pocketId) => {
    try {
      await axios.delete(`${API}/pockets/${pocketId}`, { withCredentials: true });
      toast.success("Bolsillo eliminado");
      fetchDashboard();
    } catch (error) {
      toast.error("Error al eliminar bolsillo");
    }
  };

  const handleWithdrawPocket = async (pocketId) => {
    if (!fundAmount || parseInt(fundAmount) <= 0) return;
    try {
      await axios.post(`${API}/pockets/${pocketId}/withdraw`, { amount: parseInt(fundAmount) }, { withCredentials: true });
      toast.success("Fondos retirados");
      setFundPocketId(null);
      setFundAmount("");
      fetchDashboard();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Error al retirar");
    }
  };

  const handleEditPocketBalance = async (pocketId) => {
    if (!fundAmount) return;
    try {
      await axios.put(`${API}/pockets/${pocketId}/edit`, { balance: parseInt(fundAmount) }, { withCredentials: true });
      toast.success("Balance actualizado");
      setFundPocketId(null);
      setFundAmount("");
      fetchDashboard();
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (direction) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const getMonthlyData = () => {
    if (!dashboardData?.recent_transactions) return { income: 0, expenses: 0, transactions: [] };
    const allTransactions = dashboardData.all_transactions || dashboardData.recent_transactions;
    const monthlyTransactions = allTransactions
      .filter(txn => txn.date.substring(0, 7) === selectedMonth)
      .sort((a, b) => b.date.localeCompare(a.date));
    const income = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses, transactions: monthlyTransactions.slice(0, 3) };
  };

  // Projected totals
  const totalExpenseProjected = budgetComparison.reduce((s, i) => s + i.projected, 0);
  const totalIncomeProjected = incomeBudgetComparison.reduce((s, i) => s + i.projected, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[#D4AF37]">Cargando...</div>
      </div>
    );
  }

  const monthlyData = getMonthlyData();
  const pockets = dashboardData?.pockets || [];

  return (
    <div className="space-y-6 animate-fadeIn pb-20" data-testid="dashboard">
      <Toaster position="top-right" richColors />
      
      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          Hola, <span className="gold-text">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-gray-400 mt-1">Resumen de tus finanzas</p>
      </div>

      {/* Month Selector */}
      <Card className="bg-[#1a2332] border-[#2a3444]">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-white hover:bg-[#2a3444]">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-base font-semibold text-white capitalize">{getMonthName(selectedMonth)}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} className="text-gray-400 hover:text-white hover:bg-[#2a3444]">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scorecards: Real + Projected */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid="monthly-income-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">Ingresos del mes</p>
            <p className="text-xl font-bold font-mono text-green-400">{formatCurrency(monthlyData.income)}</p>
            {totalIncomeProjected > 0 && (
              <p className="text-[10px] text-gray-500 font-mono mt-1">Esperado: {formatCurrency(totalIncomeProjected)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid="monthly-expenses-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">Gastos del mes</p>
            <p className="text-xl font-bold font-mono text-red-400">{formatCurrency(monthlyData.expenses)}</p>
            {totalExpenseProjected > 0 && (
              <p className="text-[10px] text-gray-500 font-mono mt-1">Proyectado: {formatCurrency(totalExpenseProjected)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover bg-[#1a2332] border-[#D4AF37]/30" data-testid="monthly-balance-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#D4AF37]" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-0.5">Disponible del mes</p>
            <p className={`text-xl font-bold font-mono ${monthlyData.balance >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>
              {formatCurrency(monthlyData.balance)}
            </p>
            <p className="text-[10px] text-gray-500 font-mono mt-1">
              Global: {formatCurrency(dashboardData?.available_balance ?? 0)}
              {(dashboardData?.total_in_pockets || 0) > 0 && ` | Bolsillos: ${formatCurrency(dashboardData.total_in_pockets)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Global Stats (Debts & Savings) */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid="total-debt-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Deuda total</p>
              <p className="text-lg font-bold font-mono text-purple-400 truncate">{formatCurrency(dashboardData?.total_debt || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid="total-savings-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Ahorros totales</p>
              <p className="text-lg font-bold font-mono text-[#D4AF37] truncate">{formatCurrency(dashboardData?.total_savings || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Digital Pockets */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="pockets-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white flex items-center gap-2 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Landmark className="w-5 h-5 text-[#D4AF37]" />
            Bolsillos
          </CardTitle>
          <Dialog open={pocketDialogOpen} onOpenChange={setPocketDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="btn-gold h-7 text-xs rounded-md" data-testid="add-pocket-btn">
                <Plus className="w-3 h-3 mr-1" /> Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm bg-[#1a2332] border-[#2a3444]">
              <DialogHeader><DialogTitle className="text-white">Nuevo bolsillo</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nombre del bolsillo" className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={newPocketName} onChange={(e) => setNewPocketName(e.target.value)} data-testid="pocket-name-input" />
                <Button className="w-full btn-gold" onClick={handleCreatePocket} data-testid="save-pocket-btn">Crear bolsillo</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {pockets.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pockets.map(p => (
                <div key={p.pocket_id} className="group p-3 rounded-lg bg-[#141b2d] border border-[#2a3444] relative" data-testid={`pocket-${p.pocket_id}`}>
                  <button onClick={() => handleDeletePocket(p.pocket_id)}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-xs text-gray-400 truncate">{p.name}</p>
                  <p className={`text-sm font-bold font-mono mt-0.5 ${p.balance >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>
                    {formatCurrency(p.balance)}
                  </p>
                  {fundPocketId === p.pocket_id ? (
                    <div className="mt-2 space-y-1">
                      <CurrencyInput value={fundAmount} onChange={setFundAmount}
                        className="bg-[#1a2332] border-[#2a3444] text-white h-6 text-xs w-full"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleFundPocket(p.pocket_id); }} />
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleFundPocket(p.pocket_id)} className="text-[9px] text-green-400 hover:underline">Agregar</button>
                        <span className="text-gray-600 text-[9px]">|</span>
                        <button onClick={() => handleWithdrawPocket(p.pocket_id)} className="text-[9px] text-amber-400 hover:underline">Retirar</button>
                        <span className="text-gray-600 text-[9px]">|</span>
                        <button onClick={() => handleEditPocketBalance(p.pocket_id)} className="text-[9px] text-blue-400 hover:underline">Fijar</button>
                        <span className="text-gray-600 text-[9px]">|</span>
                        <button onClick={() => { setFundPocketId(null); setFundAmount(""); }} className="text-[9px] text-gray-500 hover:underline">X</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setFundPocketId(p.pocket_id)}
                      className="text-[10px] text-[#D4AF37] hover:underline mt-1 block">
                      Editar balance
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-3">Crea bolsillos para organizar tu dinero</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions - last 3 */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="monthly-transactions-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            Ultimas transacciones
          </CardTitle>
          <Link to="/transactions">
            <Button variant="ghost" size="sm" className="text-[#D4AF37] hover:text-[#D4AF37]/80 text-xs">Ver todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {monthlyData.transactions?.length > 0 ? (
            <div className="space-y-2">
              {monthlyData.transactions.slice(0, 3).map((txn, index) => (
                <div key={txn.transaction_id || index}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[#141b2d] border border-[#2a3444]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${txn.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {txn.type === 'income' ? <ArrowUpRight className="w-4 h-4 text-green-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{txn.category}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(txn.date)}</p>
                  </div>
                  <p className={`font-mono text-sm font-medium ${txn.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-gray-500">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay transacciones este mes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget: Projected vs Actual — Table Format */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="budget-comparison-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
              <Target className="w-5 h-5 text-[#D4AF37]" />
              Proyectado vs Real
            </CardTitle>
            <div className="flex gap-0.5 bg-[#141b2d] rounded-lg p-0.5 border border-[#2a3444]" data-testid="budget-view-toggle">
              <button onClick={() => setBudgetViewMode("monthly")}
                className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${budgetViewMode === "monthly" ? 'bg-[#D4AF37] text-[#141b2d] font-medium' : 'text-gray-400 hover:text-white'}`}>
                Mensual
              </button>
              <button onClick={() => setBudgetViewMode("biweekly")}
                className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${budgetViewMode === "biweekly" ? 'bg-[#D4AF37] text-[#141b2d] font-medium' : 'text-gray-400 hover:text-white'}`}>
                Quincenal
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {budgetViewMode === "monthly" ? (
          <Tabs defaultValue="expenses">
            <TabsList className="bg-[#141b2d] border border-[#2a3444] h-8 mb-3">
              <TabsTrigger value="expenses" className="text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d] h-6 px-3">Gastos</TabsTrigger>
              <TabsTrigger value="income" className="text-xs data-[state=active]:bg-green-500 data-[state=active]:text-white h-6 px-3">Ingresos</TabsTrigger>
            </TabsList>

            {/* Expense Table */}
            <TabsContent value="expenses">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="expense-budget-table">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-[#2a3444]">
                      <th className="text-left py-2 pr-2 font-medium">Categoria</th>
                      <th className="text-right py-2 px-2 font-medium">Proyectado</th>
                      <th className="text-right py-2 px-2 font-medium">Real</th>
                      <th className="text-right py-2 pl-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetComparison.map((item) => {
                      const isOver = item.projected > 0 ? item.actual > item.projected : item.actual > 0;
                      const isEditing = editingBudget === `expense-${item.category}`;
                      return (
                        <React.Fragment key={item.category}>
                          <tr className="group border-b border-[#2a3444]/50 hover:bg-[#141b2d]/50" data-testid={`budget-row-${item.category}`}>
                            <td className="py-2.5 pr-2 text-white font-medium relative">
                              {item.category}
                              {item.comment && !isEditing && (
                                <span className="ml-1.5 relative inline-flex" title={item.comment}>
                                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]/60 inline-block cursor-help peer" />
                                  <span className="absolute bottom-full left-0 mb-1.5 hidden peer-hover:block bg-[#1a2332] border border-[#D4AF37]/30 text-xs text-gray-300 p-2 rounded-lg shadow-xl whitespace-pre-wrap max-w-[200px] z-50">
                                    {item.comment}
                                    {item.comment_recurring && <span className="block text-[9px] text-[#D4AF37] mt-1">Recurrente</span>}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <CurrencyInput value={editAmount} onChange={setEditAmount}
                                    className="bg-[#141b2d] border-[#2a3444] text-white w-24 h-6 text-xs"
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(item.category, editAmount, "expense", editComment, editCommentRecurring); }} />
                                  <button onClick={() => handleSaveBudget(item.category, editAmount, "expense", editComment, editCommentRecurring)} className="text-green-400"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setEditingBudget(null)} className="text-gray-500"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <span className="font-mono text-gray-400 cursor-pointer hover:text-[#D4AF37] transition-colors"
                                  onClick={() => { setEditingBudget(`expense-${item.category}`); setEditAmount(String(item.projected)); setEditComment(item.comment || ""); setEditCommentRecurring(item.comment_recurring || false); }}>
                                  {item.projected > 0 ? formatCurrency(item.projected) : <span className="text-gray-600 italic text-xs">Definir</span>}
                                </span>
                              )}
                            </td>
                            <td className={`py-2.5 px-2 text-right font-mono font-medium ${isOver ? 'text-red-400' : 'text-green-400'}`}>
                              {item.actual > 0 ? formatCurrency(item.actual) : <span className="text-gray-600">—</span>}
                            </td>
                            <td className="py-2.5 pl-2 text-right">
                              {item.projected > 0 ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isOver ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                  {isOver ? `-${formatCurrency(Math.abs(item.difference))}` : `+${formatCurrency(item.difference)}`}
                                </span>
                              ) : item.actual > 0 ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Sin tope</span>
                              ) : (
                                <span className="text-gray-600 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                          {isEditing && (
                            <tr className="border-b border-[#D4AF37]/20 bg-[#D4AF37]/5">
                              <td colSpan="4" className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <input type="text" placeholder="Comentario (ej: incluye servicios)..."
                                    className="flex-1 bg-[#141b2d] border border-[#2a3444] text-white text-xs rounded px-2 py-1 placeholder-gray-600"
                                    value={editComment} onChange={(e) => setEditComment(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(item.category, editAmount, "expense", editComment, editCommentRecurring); }}
                                    data-testid={`budget-comment-input-${item.category}`} />
                                  <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer whitespace-nowrap">
                                    <input type="checkbox" checked={editCommentRecurring} onChange={(e) => setEditCommentRecurring(e.target.checked)}
                                      className="w-3 h-3 rounded border-[#2a3444]" data-testid={`budget-comment-recurring-${item.category}`} />
                                    Recurrente
                                  </label>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {budgetComparison.length === 0 && (
                      <tr><td colSpan="4" className="py-6 text-center text-gray-600 text-sm">Sin categorias de gasto</td></tr>
                    )}
                  </tbody>
                  {budgetComparison.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-[#D4AF37]/30 text-xs font-medium">
                        <td className="py-2 text-gray-400">Total</td>
                        <td className="py-2 px-2 text-right font-mono text-gray-400">{formatCurrency(totalExpenseProjected)}</td>
                        <td className="py-2 px-2 text-right font-mono text-red-400">{formatCurrency(budgetComparison.reduce((s, i) => s + i.actual, 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </TabsContent>

            {/* Income Table */}
            <TabsContent value="income">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="income-budget-table">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-[#2a3444]">
                      <th className="text-left py-2 pr-2 font-medium">Categoria</th>
                      <th className="text-right py-2 px-2 font-medium">Esperado</th>
                      <th className="text-right py-2 px-2 font-medium">Recibido</th>
                      <th className="text-right py-2 pl-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeBudgetComparison.map((item) => {
                      const isUnder = item.projected > 0 ? item.actual < item.projected : false;
                      const isEditing = editingBudget === `income-${item.category}`;
                      return (
                        <React.Fragment key={item.category}>
                          <tr className="group border-b border-[#2a3444]/50 hover:bg-[#141b2d]/50" data-testid={`income-row-${item.category}`}>
                            <td className="py-2.5 pr-2 text-white font-medium">
                              {item.category}
                              {item.comment && !isEditing && (
                                <span className="ml-1.5 relative inline-flex" title={item.comment}>
                                  <span className="w-2 h-2 rounded-full bg-green-400/60 inline-block cursor-help peer" />
                                  <span className="absolute bottom-full left-0 mb-1.5 hidden peer-hover:block bg-[#1a2332] border border-green-500/30 text-xs text-gray-300 p-2 rounded-lg shadow-xl whitespace-pre-wrap max-w-[200px] z-50">
                                    {item.comment}
                                    {item.comment_recurring && <span className="block text-[9px] text-green-400 mt-1">Recurrente</span>}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <CurrencyInput value={editAmount} onChange={setEditAmount}
                                    className="bg-[#141b2d] border-[#2a3444] text-white w-24 h-6 text-xs"
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(item.category, editAmount, "income", editComment, editCommentRecurring); }} />
                                  <button onClick={() => handleSaveBudget(item.category, editAmount, "income", editComment, editCommentRecurring)} className="text-green-400"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setEditingBudget(null)} className="text-gray-500"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <span className="font-mono text-gray-400 cursor-pointer hover:text-green-400 transition-colors"
                                  onClick={() => { setEditingBudget(`income-${item.category}`); setEditAmount(String(item.projected)); setEditComment(item.comment || ""); setEditCommentRecurring(item.comment_recurring || false); }}>
                                  {item.projected > 0 ? formatCurrency(item.projected) : <span className="text-gray-600 italic text-xs">Definir</span>}
                                </span>
                              )}
                            </td>
                          <td className={`py-2.5 px-2 text-right font-mono font-medium ${isUnder ? 'text-red-400' : 'text-green-400'}`}>
                            {item.actual > 0 ? formatCurrency(item.actual) : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            {item.projected > 0 ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isUnder ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {isUnder ? `-${formatCurrency(Math.abs(item.difference))}` : `+${formatCurrency(item.difference)}`}
                              </span>
                            ) : item.actual > 0 ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Sin meta</span>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                          {isEditing && (
                            <tr className="border-b border-green-500/20 bg-green-500/5">
                              <td colSpan="4" className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <input type="text" placeholder="Comentario..."
                                    className="flex-1 bg-[#141b2d] border border-[#2a3444] text-white text-xs rounded px-2 py-1 placeholder-gray-600"
                                    value={editComment} onChange={(e) => setEditComment(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(item.category, editAmount, "income", editComment, editCommentRecurring); }}
                                    data-testid={`income-comment-input-${item.category}`} />
                                  <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer whitespace-nowrap">
                                    <input type="checkbox" checked={editCommentRecurring} onChange={(e) => setEditCommentRecurring(e.target.checked)}
                                      className="w-3 h-3 rounded border-[#2a3444]" />
                                    Recurrente
                                  </label>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {incomeBudgetComparison.length === 0 && (
                      <tr><td colSpan="4" className="py-6 text-center text-gray-600 text-sm">Sin categorias de ingreso</td></tr>
                    )}
                  </tbody>
                  {incomeBudgetComparison.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-green-500/30 text-xs font-medium">
                        <td className="py-2 text-gray-400">Total</td>
                        <td className="py-2 px-2 text-right font-mono text-gray-400">{formatCurrency(totalIncomeProjected)}</td>
                        <td className="py-2 px-2 text-right font-mono text-green-400">{formatCurrency(incomeBudgetComparison.reduce((s, i) => s + i.actual, 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </TabsContent>
          </Tabs>
          ) : (
          /* Biweekly View */
          <div className="overflow-x-auto" data-testid="biweekly-budget-table">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-gray-500 border-b border-[#2a3444]">
                  <th className="text-left py-2 pr-1 font-medium">Categoria</th>
                  <th className="text-right py-2 px-1 font-medium">Proy. Q1</th>
                  <th className="text-center py-2 px-1 font-medium w-6">OK</th>
                  <th className="text-right py-2 px-1 font-medium">Real Q1</th>
                  <th className="text-right py-2 px-1 font-medium">Proy. Q2</th>
                  <th className="text-center py-2 px-1 font-medium w-6">OK</th>
                  <th className="text-right py-2 px-1 font-medium">Real Q2</th>
                  <th className="text-right py-2 pl-1 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {budgetComparison.map(item => {
                  const isEdQ1 = editingBudget === `bw-q1-${item.category}`;
                  const isEdQ2 = editingBudget === `bw-q2-${item.category}`;
                  const q1Real = Math.round(item.actual * 0.5); // approximate split
                  const q2Real = item.actual - q1Real;
                  const totalProj = (item.q1_projected || 0) + (item.q2_projected || 0);
                  const isOver = totalProj > 0 ? item.actual > totalProj : item.actual > 0;
                  return (
                    <tr key={item.category} className="border-b border-[#2a3444]/30 hover:bg-[#141b2d]/50">
                      <td className="py-2 pr-1 text-white font-medium text-xs">{item.category}</td>
                      <td className="py-2 px-1 text-right">
                        {isEdQ1 ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <CurrencyInput value={editAmount} onChange={setEditAmount}
                              className="bg-[#141b2d] border-[#2a3444] text-white w-16 h-5 text-[10px]"
                              onKeyDown={(e) => { if (e.key === 'Enter') { handleSaveBudget(item.category, item.projected || editAmount, "expense", null, false, { q1_projected: editAmount }); } }} />
                            <button onClick={() => handleSaveBudget(item.category, item.projected || editAmount, "expense", null, false, { q1_projected: editAmount })} className="text-green-400"><Check className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <span className="font-mono text-gray-400 cursor-pointer hover:text-[#D4AF37]"
                            onClick={() => { setEditingBudget(`bw-q1-${item.category}`); setEditAmount(String(item.q1_projected || 0)); }}>
                            {item.q1_projected ? formatCurrency(item.q1_projected) : <span className="text-gray-600">—</span>}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-1 text-center">
                        <input type="checkbox" checked={item.q1_done || false}
                          onChange={(e) => handleSaveBudget(item.category, item.projected || 1, "expense", null, false, { q1_done: e.target.checked, q1_projected: item.q1_projected || 0 })}
                          className="w-3 h-3 rounded accent-[#D4AF37]" />
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-gray-300">{q1Real > 0 ? formatCurrency(q1Real) : '—'}</td>
                      <td className="py-2 px-1 text-right">
                        {isEdQ2 ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <CurrencyInput value={editAmount} onChange={setEditAmount}
                              className="bg-[#141b2d] border-[#2a3444] text-white w-16 h-5 text-[10px]"
                              onKeyDown={(e) => { if (e.key === 'Enter') { handleSaveBudget(item.category, item.projected || editAmount, "expense", null, false, { q2_projected: editAmount }); } }} />
                            <button onClick={() => handleSaveBudget(item.category, item.projected || editAmount, "expense", null, false, { q2_projected: editAmount })} className="text-green-400"><Check className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <span className="font-mono text-gray-400 cursor-pointer hover:text-[#D4AF37]"
                            onClick={() => { setEditingBudget(`bw-q2-${item.category}`); setEditAmount(String(item.q2_projected || 0)); }}>
                            {item.q2_projected ? formatCurrency(item.q2_projected) : <span className="text-gray-600">—</span>}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-1 text-center">
                        <input type="checkbox" checked={item.q2_done || false}
                          onChange={(e) => handleSaveBudget(item.category, item.projected || 1, "expense", null, false, { q2_done: e.target.checked, q2_projected: item.q2_projected || 0 })}
                          className="w-3 h-3 rounded accent-[#D4AF37]" />
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-gray-300">{q2Real > 0 ? formatCurrency(q2Real) : '—'}</td>
                      <td className="py-2 pl-1 text-right">
                        {totalProj > 0 ? (
                          <span className={`text-[9px] px-1 py-0.5 rounded-full ${isOver ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                            {isOver ? 'Excede' : 'OK'}
                          </span>
                        ) : <span className="text-gray-600 text-[10px]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Gasto Real por Mes - Annual Overview */}
      {annualOverview.length > 0 && (
        <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="annual-overview-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
              <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
              Gasto Real por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="annual-overview-table">
                <thead>
                  <tr className="text-xs text-[#D4AF37] border-b border-[#D4AF37]/30 bg-[#D4AF37]/5">
                    <th className="text-left py-2 pr-2 font-semibold pl-2">Mes</th>
                    <th className="text-right py-2 px-2 font-semibold">Ingresos</th>
                    <th className="text-right py-2 px-2 font-semibold">Gastos</th>
                    <th className="text-right py-2 px-2 font-semibold">Ahorro</th>
                    <th className="text-right py-2 px-2 font-semibold">Deudas</th>
                    <th className="text-right py-2 pl-2 font-semibold pr-2">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {annualOverview.map((row) => {
                    const isCurrentMonth = row.month === selectedMonth;
                    const hasData = row.income > 0 || row.expenses > 0;
                    return (
                      <tr key={row.month} className={`border-b border-[#2a3444]/30 ${isCurrentMonth ? 'bg-[#D4AF37]/5 font-semibold' : ''} ${!hasData ? 'opacity-40' : ''}`}>
                        <td className="py-2 pl-2 pr-2 text-white">{row.label}</td>
                        <td className="py-2 px-2 text-right font-mono text-green-400">{hasData ? formatCurrency(row.income) : '$0'}</td>
                        <td className="py-2 px-2 text-right font-mono text-red-400">{hasData ? formatCurrency(row.expenses) : '$0'}</td>
                        <td className="py-2 px-2 text-right font-mono text-[#D4AF37]">{row.savings > 0 ? formatCurrency(row.savings) : '$0'}</td>
                        <td className="py-2 px-2 text-right font-mono text-purple-400">{row.debts > 0 ? formatCurrency(row.debts) : '$0'}</td>
                        <td className={`py-2 pl-2 pr-2 text-right font-mono font-medium ${row.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {hasData ? formatCurrency(row.net) : '$0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#D4AF37]/30 text-xs font-bold">
                    <td className="py-2 pl-2 text-[#D4AF37]">Total Anual</td>
                    <td className="py-2 px-2 text-right font-mono text-green-400">{formatCurrency(annualOverview.reduce((s, r) => s + r.income, 0))}</td>
                    <td className="py-2 px-2 text-right font-mono text-red-400">{formatCurrency(annualOverview.reduce((s, r) => s + r.expenses, 0))}</td>
                    <td className="py-2 px-2 text-right font-mono text-[#D4AF37]">{formatCurrency(annualOverview.reduce((s, r) => s + r.savings, 0))}</td>
                    <td className="py-2 px-2 text-right font-mono text-purple-400">{formatCurrency(annualOverview.reduce((s, r) => s + r.debts, 0))}</td>
                    <td className="py-2 pl-2 pr-2 text-right font-mono text-[#D4AF37]">{formatCurrency(annualOverview.reduce((s, r) => s + r.net, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Link to="/debts">
          <Card className="card-hover bg-[#1a2332] border-[#2a3444] cursor-pointer" data-testid="debts-quick-link">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-purple-400" /></div>
              <div><p className="text-sm font-medium text-white">Deudas</p><p className="text-xs text-gray-500">{dashboardData?.debts_count || 0} registradas</p></div>
              <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/savings">
          <Card className="card-hover bg-[#1a2332] border-[#2a3444] cursor-pointer" data-testid="savings-quick-link">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center"><PiggyBank className="w-5 h-5 text-[#D4AF37]" /></div>
              <div><p className="text-sm font-medium text-white">Metas de Ahorro</p><p className="text-xs text-gray-500">{dashboardData?.savings_goals_count || 0} activas</p></div>
              <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/reports">
          <Card className="card-hover bg-[#1a2332] border-[#2a3444] cursor-pointer" data-testid="reports-quick-link">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-[#D4AF37]" /></div>
              <div><p className="text-sm font-medium text-white">Reportes</p><p className="text-xs text-gray-500">Ver comparativas</p></div>
              <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Expense Pie Chart by Category */}
      <CategoryPieChart transactions={dashboardData?.all_transactions || []} selectedMonth={selectedMonth} formatCurrency={formatCurrency} />

      {/* Advisor Chat */}
      <AdvisorChat selectedMonth={selectedMonth} />
    </div>
  );
};

const CHART_COLORS = [
  "#D4AF37", "#ef4444", "#22c55e", "#8b5cf6", "#f97316",
  "#06b6d4", "#ec4899", "#eab308", "#14b8a6", "#6366f1",
  "#f43f5e", "#84cc16"
];

const CategoryPieChart = ({ transactions, selectedMonth, formatCurrency }) => {
  const monthlyExpenses = (transactions || [])
    .filter(t => t.type === "expense" && t.date?.substring(0, 7) === selectedMonth);

  const categoryTotals = {};
  let total = 0;
  for (const t of monthlyExpenses) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    total += t.amount;
  }

  const data = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-[#1a2332] border border-[#2a3444] rounded-lg px-3 py-2 shadow-xl">
        <p className="text-white text-sm font-medium">{d.name}</p>
        <p className="text-[#D4AF37] font-mono text-sm">{formatCurrency(d.value)}</p>
        <p className="text-gray-400 text-xs">{d.pct}% del total</p>
      </div>
    );
  };

  return (
    <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="category-pie-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
          <PiggyBank className="w-5 h-5 text-[#D4AF37]" />
          Gastos por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-48 h-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={72}
                  paddingAngle={2} strokeWidth={0}>
                  {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 min-w-0" data-testid={`pie-legend-${d.name}`}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-xs text-gray-300 truncate">{d.name}</span>
                <span className="text-xs font-mono text-gray-500 ml-auto shrink-0">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-3 font-mono">
          Total: {formatCurrency(total)}
        </p>
      </CardContent>
    </Card>
  );
};

export default Dashboard;

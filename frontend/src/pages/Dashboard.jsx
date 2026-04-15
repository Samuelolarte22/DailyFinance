import { useState, useEffect } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, PiggyBank,
  ArrowUpRight, ArrowDownRight, ChevronRight, ChevronLeft,
  Calendar as CalendarIcon, Target, Plus, X, Check, Pencil,
  Landmark
} from "lucide-react";
import { Link } from "react-router-dom";
import AdvisorChat from "../components/AdvisorChat";
import CurrencyInput from "../components/CurrencyInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Toaster, toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgetComparison, setBudgetComparison] = useState([]);
  const [incomeBudgetComparison, setIncomeBudgetComparison] = useState([]);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // Floating transaction dialog
  const [txnDialogOpen, setTxnDialogOpen] = useState(false);
  const [txnForm, setTxnForm] = useState({
    type: "expense", category: "", amount: "", description: "",
    date: new Date(), bank: "", pocket_id: "", savings_goal_id: "", debt_id: ""
  });
  const [banks, setBanks] = useState([]);
  // Pocket dialog
  const [pocketDialogOpen, setPocketDialogOpen] = useState(false);
  const [newPocketName, setNewPocketName] = useState("");
  const [fundPocketId, setFundPocketId] = useState(null);
  const [fundAmount, setFundAmount] = useState("");

  useEffect(() => {
    fetchDashboard();
    fetchCategories();
    fetchBanks();
  }, []);

  useEffect(() => {
    fetchBudgetComparison();
  }, [selectedMonth]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`, { withCredentials: true });
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, { withCredentials: true });
      if (response.data.expense) setExpenseCategories(response.data.expense);
      if (response.data.income) setIncomeCategories(response.data.income);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await axios.get(`${API}/banks`, { withCredentials: true });
      setBanks(response.data);
    } catch (error) { console.error(error); }
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

  const handleSaveBudget = async (category, amount, budgetType = "expense") => {
    if (!amount || parseInt(amount) <= 0) return;
    try {
      await axios.post(`${API}/budgets`, {
        category, projected_amount: parseInt(amount), budget_type: budgetType
      }, { withCredentials: true });
      toast.success("Presupuesto guardado");
      setEditingBudget(null);
      setEditAmount("");
      fetchBudgetComparison();
    } catch (error) {
      toast.error("Error al guardar presupuesto");
    }
  };

  const handleSubmitTransaction = async (e) => {
    e.preventDefault();
    if (!txnForm.category || !txnForm.amount) {
      toast.error("Completa categoria y monto");
      return;
    }
    try {
      const payload = {
        type: txnForm.type,
        category: txnForm.category,
        amount: parseInt(txnForm.amount),
        description: txnForm.description,
        date: format(txnForm.date, "yyyy-MM-dd"),
        bank: txnForm.bank || undefined,
        pocket_id: txnForm.pocket_id || undefined,
        savings_goal_id: txnForm.savings_goal_id || undefined,
        debt_id: txnForm.debt_id || undefined
      };
      await axios.post(`${API}/transactions`, payload, { withCredentials: true });
      toast.success("Transaccion registrada");
      setTxnDialogOpen(false);
      setTxnForm({ type: "expense", category: "", amount: "", description: "", date: new Date(), bank: "", pocket_id: "", savings_goal_id: "", debt_id: "" });
      fetchDashboard();
      fetchBudgetComparison();
    } catch (error) {
      toast.error("Error al guardar");
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
    const monthlyTransactions = allTransactions.filter(txn => txn.date.substring(0, 7) === selectedMonth);
    const income = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses, transactions: monthlyTransactions.slice(0, 5) };
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
  const debts = dashboardData?.debts || [];
  const savingsGoals = dashboardData?.savings_goals || [];
  const currentCategories = txnForm.type === "income" ? incomeCategories : expenseCategories;

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
            <p className="text-xs text-gray-500 mb-0.5">Balance del mes</p>
            <p className={`text-xl font-bold font-mono ${monthlyData.balance >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>
              {formatCurrency(monthlyData.balance)}
            </p>
            {(totalIncomeProjected > 0 || totalExpenseProjected > 0) && (
              <p className="text-[10px] text-gray-500 font-mono mt-1">Proy: {formatCurrency(totalIncomeProjected - totalExpenseProjected)}</p>
            )}
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
                    <div className="flex items-center gap-1 mt-2">
                      <CurrencyInput value={fundAmount} onChange={setFundAmount}
                        className="bg-[#1a2332] border-[#2a3444] text-white h-6 text-xs w-20" />
                      <button onClick={() => handleFundPocket(p.pocket_id)} className="text-green-400 hover:text-green-300">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setFundPocketId(null); setFundAmount(""); }} className="text-gray-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setFundPocketId(p.pocket_id)}
                      className="text-[10px] text-[#D4AF37] hover:underline mt-1 block">
                      + Fondear
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

      {/* Recent Transactions */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="monthly-transactions-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            Transacciones de {getMonthName(selectedMonth)}
          </CardTitle>
          <Link to="/transactions">
            <Button variant="ghost" size="sm" className="text-[#D4AF37] hover:text-[#D4AF37]/80 text-xs">Ver todas</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {monthlyData.transactions?.length > 0 ? (
            <div className="space-y-2">
              {monthlyData.transactions.map((txn, index) => (
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
          <CardTitle className="text-white flex items-center gap-2 text-base" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Target className="w-5 h-5 text-[#D4AF37]" />
            Proyectado vs Real
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                      return (
                        <tr key={item.category} className="group border-b border-[#2a3444]/50 hover:bg-[#141b2d]/50" data-testid={`budget-row-${item.category}`}>
                          <td className="py-2.5 pr-2 text-white font-medium">{item.category}</td>
                          <td className="py-2.5 px-2 text-right">
                            {editingBudget === `expense-${item.category}` ? (
                              <div className="flex items-center justify-end gap-1">
                                <CurrencyInput value={editAmount} onChange={setEditAmount}
                                  className="bg-[#141b2d] border-[#2a3444] text-white w-24 h-6 text-xs" />
                                <button onClick={() => handleSaveBudget(item.category, editAmount)} className="text-green-400"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingBudget(null)} className="text-gray-500"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <span className="font-mono text-gray-400 cursor-pointer hover:text-[#D4AF37] transition-colors"
                                onClick={() => { setEditingBudget(`expense-${item.category}`); setEditAmount(String(item.projected)); }}>
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
                      return (
                        <tr key={item.category} className="group border-b border-[#2a3444]/50 hover:bg-[#141b2d]/50" data-testid={`income-row-${item.category}`}>
                          <td className="py-2.5 pr-2 text-white font-medium">{item.category}</td>
                          <td className="py-2.5 px-2 text-right">
                            {editingBudget === `income-${item.category}` ? (
                              <div className="flex items-center justify-end gap-1">
                                <CurrencyInput value={editAmount} onChange={setEditAmount}
                                  className="bg-[#141b2d] border-[#2a3444] text-white w-24 h-6 text-xs" />
                                <button onClick={() => handleSaveBudget(item.category, editAmount, "income")} className="text-green-400"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingBudget(null)} className="text-gray-500"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <span className="font-mono text-gray-400 cursor-pointer hover:text-green-400 transition-colors"
                                onClick={() => { setEditingBudget(`income-${item.category}`); setEditAmount(String(item.projected)); }}>
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
        </CardContent>
      </Card>

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

      {/* Advisor Chat */}
      <AdvisorChat selectedMonth={selectedMonth} />

      {/* ========== FLOATING TRANSACTION BUTTON + DIALOG ========== */}
      <Dialog open={txnDialogOpen} onOpenChange={setTxnDialogOpen}>
        <DialogTrigger asChild>
          <button className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#D4AF37] text-[#141b2d] shadow-lg shadow-[#D4AF37]/25 hover:bg-[#D4AF37]/90 transition-all flex items-center justify-center"
            data-testid="floating-add-txn-btn">
            <Plus className="w-7 h-7" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-[#1a2332] border-[#2a3444] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>Nueva transaccion</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            {/* Type */}
            <Tabs value={txnForm.type} onValueChange={(v) => setTxnForm({ ...txnForm, type: v, category: "", savings_goal_id: "", debt_id: "" })}>
              <TabsList className="grid w-full grid-cols-2 bg-[#141b2d]">
                <TabsTrigger value="income" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400" data-testid="ftxn-income-tab">
                  <ArrowUpRight className="w-4 h-4 mr-1" /> Ingreso
                </TabsTrigger>
                <TabsTrigger value="expense" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400" data-testid="ftxn-expense-tab">
                  <ArrowDownRight className="w-4 h-4 mr-1" /> Gasto
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Categoria</Label>
              <Select value={txnForm.category} onValueChange={(v) => setTxnForm({ ...txnForm, category: v })}>
                <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white" data-testid="ftxn-category">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                  {currentCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-gray-300 focus:bg-[#2a3444] focus:text-white">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Monto (COP)</Label>
              <CurrencyInput className="bg-[#141b2d] border-[#2a3444] text-white"
                value={txnForm.amount} onChange={(v) => setTxnForm({ ...txnForm, amount: v })} data-testid="ftxn-amount" />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Descripcion (opcional)</Label>
              <Input placeholder="Ej: Almuerzo" className="bg-[#141b2d] border-[#2a3444] text-white"
                value={txnForm.description} onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })} data-testid="ftxn-desc" />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left bg-[#141b2d] border-[#2a3444] text-white hover:bg-[#2a3444]" data-testid="ftxn-date">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(txnForm.date, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#1a2332] border-[#2a3444]" align="start">
                  <Calendar mode="single" selected={txnForm.date} onSelect={(d) => d && setTxnForm({ ...txnForm, date: d })} initialFocus className="bg-[#1a2332]" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Bank */}
            {banks.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-xs">Banco (opcional)</Label>
                <Select value={txnForm.bank || "none"} onValueChange={(v) => setTxnForm({ ...txnForm, bank: v === "none" ? "" : v })}>
                  <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {banks.map(b => <SelectItem key={b.bank_id} value={b.name}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pocket selector (for expenses) */}
            {txnForm.type === "expense" && pockets.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-xs">Usar bolsillo (opcional)</Label>
                <Select value={txnForm.pocket_id || "none"} onValueChange={(v) => setTxnForm({ ...txnForm, pocket_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white" data-testid="ftxn-pocket">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                    <SelectItem value="none">Sin bolsillo</SelectItem>
                    {pockets.map(p => (
                      <SelectItem key={p.pocket_id} value={p.pocket_id}>
                        {p.name} ({formatCurrency(p.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Savings / Debt target (for expenses) */}
            {txnForm.type === "expense" && (savingsGoals.length > 0 || debts.length > 0) && (
              <div className="space-y-2 p-3 rounded-lg border border-[#2a3444]">
                <p className="text-xs text-gray-400 font-medium">Destino especial (opcional)</p>
                {savingsGoals.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-[10px]">Aportar a ahorro</Label>
                    <Select value={txnForm.savings_goal_id || "none"} onValueChange={(v) => setTxnForm({ ...txnForm, savings_goal_id: v === "none" ? "" : v, debt_id: "" })}>
                      <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white h-8 text-xs" data-testid="ftxn-savings">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                        <SelectItem value="none">Ninguno</SelectItem>
                        {savingsGoals.map(g => (
                          <SelectItem key={g.goal_id} value={g.goal_id}>
                            {g.name} ({formatCurrency(g.current_amount)}/{formatCurrency(g.target_amount)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {debts.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-[10px]">Pagar deuda</Label>
                    <Select value={txnForm.debt_id || "none"} onValueChange={(v) => setTxnForm({ ...txnForm, debt_id: v === "none" ? "" : v, savings_goal_id: "" })}>
                      <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white h-8 text-xs" data-testid="ftxn-debt">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                        <SelectItem value="none">Ninguna</SelectItem>
                        {debts.map(d => (
                          <SelectItem key={d.debt_id} value={d.debt_id}>
                            {d.name} (Saldo: {formatCurrency(d.current_amount)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full btn-gold rounded-md" data-testid="ftxn-submit">
              Guardar transaccion
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

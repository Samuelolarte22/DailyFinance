import { useState, useEffect } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Target,
  Plus,
  X,
  Check
} from "lucide-react";
import { Link } from "react-router-dom";
import AdvisorChat from "../components/AdvisorChat";
import CurrencyInput from "../components/CurrencyInput";
import { Toaster, toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgetComparison, setBudgetComparison] = useState([]);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudgetCat, setNewBudgetCat] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchDashboard();
    fetchCategories();
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
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBudgetComparison = async () => {
    try {
      const response = await axios.get(`${API}/budgets/comparison?month=${selectedMonth}`, { withCredentials: true });
      setBudgetComparison(response.data);
    } catch (error) {
      console.error("Error fetching budget comparison:", error);
    }
  };

  const handleSaveBudget = async (category, amount) => {
    if (!amount || parseInt(amount) <= 0) return;
    try {
      await axios.post(`${API}/budgets`, {
        category,
        projected_amount: parseInt(amount)
      }, { withCredentials: true });
      toast.success("Presupuesto guardado");
      setEditingBudget(null);
      setEditAmount("");
      setShowAddBudget(false);
      setNewBudgetCat("");
      setNewBudgetAmount("");
      fetchBudgetComparison();
    } catch (error) {
      toast.error("Error al guardar presupuesto");
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    try {
      await axios.delete(`${API}/budgets/${budgetId}`, { withCredentials: true });
      toast.success("Presupuesto eliminado");
      fetchBudgetComparison();
    } catch (error) {
      toast.error("Error al eliminar presupuesto");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (direction) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + direction;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  // Filter transactions by selected month
  const getMonthlyData = () => {
    if (!dashboardData?.recent_transactions) {
      return { income: 0, expenses: 0, transactions: [] };
    }

    // Get all transactions (we need to fetch all, not just recent)
    const allTransactions = dashboardData.all_transactions || dashboardData.recent_transactions;
    
    const monthlyTransactions = allTransactions.filter(txn => {
      const txnDate = txn.date.substring(0, 7);
      return txnDate === selectedMonth;
    });

    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
      transactions: monthlyTransactions.slice(0, 5)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[#D4AF37]">Cargando...</div>
      </div>
    );
  }

  const monthlyData = getMonthlyData();

  return (
    <div className="space-y-8 animate-fadeIn" data-testid="dashboard">
      <Toaster position="top-right" richColors />
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Hola, <span className="gold-text">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Resumen de tus finanzas
          </p>
        </div>
        <Link to="/transactions">
          <Button className="btn-gold rounded-md" data-testid="add-transaction-btn">
            Nueva transacción
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Month Selector */}
      <Card className="bg-[#1a2332] border-[#2a3444]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => changeMonth(-1)}
              className="text-gray-400 hover:text-white hover:bg-[#2a3444]"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-lg font-semibold text-white capitalize">
                {getMonthName(selectedMonth)}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => changeMonth(1)}
              className="text-gray-400 hover:text-white hover:bg-[#2a3444]"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {/* Monthly Income */}
        <Card className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid="monthly-income-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Ingresos del mes</p>
            <p className="text-2xl font-bold font-mono text-green-400">
              {formatCurrency(monthlyData.income)}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid="monthly-expenses-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <ArrowDownRight className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm text-gray-400 mb-1">Gastos del mes</p>
            <p className="text-2xl font-bold font-mono text-red-400">
              {formatCurrency(monthlyData.expenses)}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Balance */}
        <Card className="card-hover bg-[#1a2332] border-[#D4AF37]/30" data-testid="monthly-balance-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-[#D4AF37]" />
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-1">Balance del mes</p>
            <p className={`text-2xl font-bold font-mono ${
              monthlyData.balance >= 0 ? 'text-[#D4AF37]' : 'text-red-400'
            }`}>
              {formatCurrency(monthlyData.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Global Stats (Debts & Savings) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <Card className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid="total-debt-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Deuda total (global)</p>
                <p className="text-2xl font-bold font-mono text-purple-400">
                  {formatCurrency(dashboardData?.total_debt || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover bg-[#1a2332] border-[#2a3444]" data-testid="total-savings-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                <PiggyBank className="w-7 h-7 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Ahorros totales (global)</p>
                <p className="text-2xl font-bold font-mono text-[#D4AF37]">
                  {formatCurrency(dashboardData?.total_savings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions of Selected Month */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="monthly-transactions-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Transacciones de {getMonthName(selectedMonth)}
          </CardTitle>
          <Link to="/transactions">
            <Button variant="ghost" size="sm" className="text-[#D4AF37] hover:text-[#D4AF37]/80">
              Ver todas
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {monthlyData.transactions?.length > 0 ? (
            <div className="space-y-3">
              {monthlyData.transactions.map((txn, index) => (
                <div 
                  key={txn.transaction_id || index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[#141b2d] border border-[#2a3444] transaction-item"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    txn.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {txn.type === 'income' ? (
                      <ArrowUpRight className={`w-5 h-5 ${txn.type === 'income' ? 'text-green-400' : 'text-red-400'}`} />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{txn.category}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(txn.date)}
                    </p>
                  </div>
                  <p className={`font-mono font-medium ${
                    txn.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay transacciones en este mes</p>
              <Link to="/transactions">
                <Button variant="link" className="mt-2 text-[#D4AF37]">
                  Agregar transacción
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget: Projected vs Actual */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="budget-comparison-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Target className="w-5 h-5 text-[#D4AF37]" />
            Proyectado vs Real
          </CardTitle>
          <Button size="sm" variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
            onClick={() => setShowAddBudget(!showAddBudget)} data-testid="add-budget-btn">
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add new budget inline */}
          {showAddBudget && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20">
              <select value={newBudgetCat} onChange={(e) => setNewBudgetCat(e.target.value)}
                className="bg-[#141b2d] border border-[#2a3444] text-white text-sm rounded-md px-3 py-2 flex-1"
                data-testid="budget-category-select">
                <option value="">Categoria...</option>
                {expenseCategories
                  .filter(c => !budgetComparison.find(b => b.category === c && b.projected > 0))
                  .map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <CurrencyInput value={newBudgetAmount} onChange={setNewBudgetAmount}
                placeholder="Proyectado" className="bg-[#141b2d] border-[#2a3444] text-white w-36"
                data-testid="budget-amount-input" />
              <Button size="icon" className="btn-gold shrink-0"
                onClick={() => { if (newBudgetCat) handleSaveBudget(newBudgetCat, newBudgetAmount); }}
                data-testid="save-budget-btn">
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-gray-500 shrink-0"
                onClick={() => { setShowAddBudget(false); setNewBudgetCat(""); setNewBudgetAmount(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {budgetComparison.length > 0 ? (
            budgetComparison
              .filter(item => item.projected > 0 || item.actual > 0)
              .map((item) => {
                const pct = item.projected > 0 ? Math.min((item.actual / item.projected) * 100, 150) : 0;
                const isOver = item.over_budget;
                return (
                  <div key={item.category} className="group p-3 rounded-lg bg-[#141b2d] border border-[#2a3444]"
                    data-testid={`budget-item-${item.category}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{item.category}</span>
                      <div className="flex items-center gap-2">
                        {editingBudget === item.category ? (
                          <div className="flex items-center gap-1">
                            <CurrencyInput value={editAmount} onChange={setEditAmount}
                              className="bg-[#1a2332] border-[#2a3444] text-white w-28 h-7 text-xs" />
                            <button onClick={() => handleSaveBudget(item.category, editAmount)}
                              className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingBudget(null)}
                              className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { setEditingBudget(item.category); setEditAmount(String(item.projected)); }}
                              className="text-xs text-gray-600 hover:text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity">
                              Editar
                            </button>
                            {item.budget_id && (
                              <button onClick={() => handleDeleteBudget(item.budget_id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3 text-gray-600 hover:text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 bg-[#2a3444] rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-red-400/80' : 'bg-green-400/80'
                      }`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        Proyectado: <span className="font-mono text-gray-400">{formatCurrency(item.projected)}</span>
                      </span>
                      <span className={`font-mono font-medium ${isOver ? 'text-red-400' : 'text-green-400'}`}>
                        Gastado: {formatCurrency(item.actual)}
                      </span>
                    </div>
                    {item.projected > 0 && (
                      <div className="mt-1 text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isOver ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                        }`}>
                          {isOver ? `Excedido: ${formatCurrency(Math.abs(item.difference))}` : `Disponible: ${formatCurrency(item.difference)}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <div className="py-6 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-600" />
              <p className="text-sm text-gray-600">No hay presupuestos configurados</p>
              <p className="text-xs text-gray-700 mt-1">Agrega un presupuesto para cada categoria de gasto</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/debts">
          <Card className="card-hover bg-[#1a2332] border-[#2a3444] cursor-pointer" data-testid="debts-quick-link">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-white">Deudas</p>
                <p className="text-sm text-gray-500">
                  {dashboardData?.debts_count || 0} registradas
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/savings">
          <Card className="card-hover bg-[#1a2332] border-[#2a3444] cursor-pointer" data-testid="savings-quick-link">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <p className="font-medium text-white">Metas de Ahorro</p>
                <p className="text-sm text-gray-500">
                  {dashboardData?.savings_goals_count || 0} activas
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports">
          <Card className="card-hover bg-[#1a2332] border-[#2a3444] cursor-pointer" data-testid="reports-quick-link">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <p className="font-medium text-white">Reportes</p>
                <p className="text-sm text-gray-500">
                  Ver comparativas
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Advisor Chat */}
      <AdvisorChat selectedMonth={selectedMonth} />
    </div>
  );
};

export default Dashboard;

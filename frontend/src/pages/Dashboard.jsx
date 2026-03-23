import { useState, useEffect } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
  Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import AdvisorChat from "../components/AdvisorChat";

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API}/dashboard`, {
          withCredentials: true
        });
        setDashboardData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

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

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
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Generate chart data from recent transactions
  const generateChartData = () => {
    if (!dashboardData?.recent_transactions) return [];
    
    const transactions = [...dashboardData.recent_transactions].reverse();
    let runningBalance = dashboardData.balance - transactions.reduce((acc, t) => 
      t.type === 'income' ? acc + t.amount : acc - t.amount, 0
    );
    
    return transactions.map(t => {
      runningBalance += t.type === 'income' ? t.amount : -t.amount;
      return {
        date: formatDate(t.date),
        balance: runningBalance,
        type: t.type
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const chartData = generateChartData();

  return (
    <div className="space-y-8 animate-fadeIn" data-testid="dashboard">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Hola, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí tienes el resumen de tus finanzas
          </p>
        </div>
        <Link to="/transactions">
          <Button className="rounded-full btn-press" data-testid="add-transaction-btn">
            Nueva transacción
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 stagger-children">
        {/* Balance */}
        <Card className="card-hover" data-testid="balance-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              {dashboardData?.balance >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-income" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-expense" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">Balance</p>
            <p className={`text-xl lg:text-2xl font-bold font-mono ${
              dashboardData?.balance >= 0 ? 'text-income' : 'text-expense'
            }`}>
              {formatCurrency(dashboardData?.balance || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Income */}
        <Card className="card-hover" data-testid="income-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-income flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Ingresos</p>
            <p className="text-xl lg:text-2xl font-bold font-mono text-income">
              {formatCurrency(dashboardData?.total_income || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card className="card-hover" data-testid="expenses-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-expense flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Gastos</p>
            <p className="text-xl lg:text-2xl font-bold font-mono text-expense">
              {formatCurrency(dashboardData?.total_expenses || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Savings */}
        <Card className="card-hover" data-testid="savings-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-savings flex items-center justify-center">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Ahorros</p>
            <p className="text-xl lg:text-2xl font-bold font-mono text-savings">
              {formatCurrency(dashboardData?.total_savings || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Recent Transactions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2" data-testid="chart-card">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
              Evolución del Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      stroke="#94A3B8"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="#94A3B8"
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Balance']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#059669" 
                      fillOpacity={1} 
                      fill="url(#colorBalance)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Agrega transacciones para ver tu evolución</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card data-testid="recent-transactions-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
              Últimas transacciones
            </CardTitle>
            <Link to="/transactions">
              <Button variant="ghost" size="sm" className="text-primary">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboardData?.recent_transactions?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recent_transactions.map((txn, index) => (
                  <div 
                    key={txn.transaction_id || index}
                    className="flex items-center gap-3 transaction-item"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      txn.type === 'income' ? 'bg-income' : 'bg-expense'
                    }`}>
                      {txn.type === 'income' ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{txn.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(txn.date)}
                      </p>
                    </div>
                    <p className={`font-mono font-medium ${
                      txn.type === 'income' ? 'text-income' : 'text-expense'
                    }`}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay transacciones aún</p>
                <Link to="/transactions">
                  <Button variant="link" className="mt-2">
                    Agregar primera transacción
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/debts">
          <Card className="card-hover cursor-pointer" data-testid="debts-quick-link">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-debt flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium">Deudas</p>
                <p className="text-sm text-muted-foreground">
                  {dashboardData?.debts_count || 0} registradas
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/savings">
          <Card className="card-hover cursor-pointer" data-testid="savings-quick-link">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-savings flex items-center justify-center">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium">Metas de Ahorro</p>
                <p className="text-sm text-muted-foreground">
                  {dashboardData?.savings_goals_count || 0} activas
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>

        <Link to="/reports">
          <Card className="card-hover cursor-pointer" data-testid="reports-quick-link">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Reportes</p>
                <p className="text-sm text-muted-foreground">
                  Ver comparativas
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;

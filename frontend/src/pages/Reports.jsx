import { useState, useEffect } from "react";
import { API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  BarChart3,
  PiggyBank,
  CreditCard
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get(`${API}/reports`, {
          withCredentials: true
        });
        setReportData(response.data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Transform monthly data for chart
  const getChartData = () => {
    if (!reportData?.monthly_breakdown) return [];
    
    return Object.entries(reportData.monthly_breakdown).map(([month, data]) => ({
      month: month.slice(5), // Get MM from YYYY-MM
      income: data.income,
      expense: data.expense
    })).slice(-6); // Last 6 months
  };

  const calculateChange = (before, after) => {
    if (before === 0) return after > 0 ? 100 : 0;
    return Math.round(((after - before) / before) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const chartData = getChartData();
  const hasBefore = reportData?.before?.monthly_income > 0;

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="reports-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
          Reportes Financieros
        </h1>
        <p className="text-muted-foreground mt-1">
          Compara tu situación financiera antes y después de usar el sistema
        </p>
      </div>

      {/* Before/After Comparison */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Before Card */}
        <Card className="border-muted" data-testid="before-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              Antes (Encuesta Inicial)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasBefore ? (
              <>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-income/50 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-sm">Ingreso mensual</span>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatCurrency(reportData?.before?.monthly_income || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-expense/50 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <span className="text-sm">Gasto mensual</span>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatCurrency(reportData?.before?.monthly_expenses || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-debt/50 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <span className="text-sm">Deuda total</span>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatCurrency(reportData?.before?.total_debt || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-savings/50 flex items-center justify-center">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <span className="text-sm">Ahorros</span>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatCurrency(reportData?.before?.total_savings || 0)}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No hay datos de la encuesta inicial</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* After Card */}
        <Card className="border-primary" data-testid="after-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Después (Situación Actual)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-income/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-income flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm">Ingresos totales</span>
              </div>
              <span className="font-mono font-semibold text-income">
                {formatCurrency(reportData?.after?.total_income || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-expense/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-expense flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <span className="text-sm">Gastos totales</span>
              </div>
              <span className="font-mono font-semibold text-expense">
                {formatCurrency(reportData?.after?.total_expenses || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-debt/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-debt flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-sm">Deuda actual</span>
              </div>
              <span className="font-mono font-semibold text-debt">
                {formatCurrency(reportData?.after?.total_debt || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-savings/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-savings flex items-center justify-center">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <span className="text-sm">Ahorros actuales</span>
              </div>
              <span className="font-mono font-semibold text-savings">
                {formatCurrency(reportData?.after?.total_savings || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">Balance neto</span>
              </div>
              <span className={`font-mono font-bold text-lg ${
                (reportData?.after?.balance || 0) >= 0 ? 'text-income' : 'text-expense'
              }`}>
                {formatCurrency(reportData?.after?.balance || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Insights */}
      {hasBefore && (
        <Card data-testid="insights-card">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
              Análisis Comparativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Debt Change */}
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground mb-2">Cambio en Deuda</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {formatCurrency(reportData?.before?.total_debt || 0)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono font-semibold text-debt">
                    {formatCurrency(reportData?.after?.total_debt || 0)}
                  </span>
                </div>
                {reportData?.before?.total_debt > 0 && (
                  <p className={`text-sm mt-2 ${
                    (reportData?.after?.total_debt || 0) < reportData.before.total_debt 
                      ? 'text-income' 
                      : 'text-expense'
                  }`}>
                    {(reportData?.after?.total_debt || 0) < reportData.before.total_debt ? '↓' : '↑'}
                    {Math.abs(calculateChange(
                      reportData.before.total_debt, 
                      reportData?.after?.total_debt || 0
                    ))}%
                  </p>
                )}
              </div>

              {/* Savings Change */}
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground mb-2">Cambio en Ahorros</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {formatCurrency(reportData?.before?.total_savings || 0)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono font-semibold text-savings">
                    {formatCurrency(reportData?.after?.total_savings || 0)}
                  </span>
                </div>
                {reportData?.before?.total_savings >= 0 && (
                  <p className={`text-sm mt-2 ${
                    (reportData?.after?.total_savings || 0) > reportData.before.total_savings 
                      ? 'text-income' 
                      : 'text-expense'
                  }`}>
                    {(reportData?.after?.total_savings || 0) > reportData.before.total_savings ? '↑' : '↓'}
                    {Math.abs(calculateChange(
                      reportData.before.total_savings || 1, 
                      reportData?.after?.total_savings || 0
                    ))}%
                  </p>
                )}
              </div>

              {/* Transactions Count */}
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground mb-2">Transacciones</p>
                <p className="text-2xl font-bold font-mono">
                  {reportData?.transactions_count || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">registradas</p>
              </div>

              {/* Goals Count */}
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground mb-2">Metas de Ahorro</p>
                <p className="text-2xl font-bold font-mono">
                  {reportData?.savings_goals_count || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Chart */}
      <Card data-testid="monthly-chart-card">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Ingresos vs Gastos por Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3444" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    stroke="#2a3444"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    stroke="#2a3444"
                    tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      formatCurrency(value), 
                      name === 'income' ? 'Ingresos' : 'Gastos'
                    ]}
                    contentStyle={{
                      backgroundColor: '#1a2332',
                      border: '1px solid #2a3444',
                      borderRadius: '12px',
                      padding: '12px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="income" name="income" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`income-${index}`} fill="hsl(142, 70%, 45%)" />
                    ))}
                  </Bar>
                  <Bar dataKey="expense" name="expense" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`expense-${index}`} fill="hsl(0, 75%, 55%)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Agrega transacciones para ver el gráfico mensual</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-income" />
          <span>Ingresos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-expense" />
          <span>Gastos</span>
        </div>
      </div>
    </div>
  );
};

export default Reports;

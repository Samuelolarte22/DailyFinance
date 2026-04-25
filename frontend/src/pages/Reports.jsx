import { useState, useEffect } from "react";
import { API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { 
  TrendingUp, TrendingDown, BarChart3, Target, Calendar
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, Legend
} from 'recharts';

const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timelineData, setTimelineData] = useState([]);
  const [timelinePeriod, setTimelinePeriod] = useState("month");
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, [timelinePeriod]);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/reports`, { withCredentials: true });
      setReportData(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    setTimelineLoading(true);
    try {
      const response = await axios.get(`${API}/reports/timeline?period=${timelinePeriod}`, { withCredentials: true });
      setTimelineData(response.data.timeline || []);
    } catch (error) {
      console.error("Error fetching timeline:", error);
    } finally {
      setTimelineLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(amount);
  };

  const getChartData = () => {
    if (!reportData?.monthly_breakdown) return [];
    return Object.entries(reportData.monthly_breakdown).map(([month, data]) => ({
      month: month.slice(5),
      income: data.income,
      expense: data.expense
    })).slice(-6);
  };

  const CustomTimelineTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#1a2332] border border-[#2a3444] rounded-lg px-4 py-3 shadow-xl">
        <p className="text-white text-sm font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-mono" style={{ color: p.color }}>
            {p.name === "debt" ? "Deuda" : "Ahorro"}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="reports-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
          Reportes Financieros
        </h1>
        <p className="text-muted-foreground mt-1">
          Analiza tus finanzas con graficos interactivos
        </p>
      </div>

      {/* Debt vs Savings Timeline Chart */}
      <Card data-testid="timeline-chart-card">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Epilogue, sans-serif' }}>
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              Deuda vs Ahorro en el Tiempo
            </CardTitle>
            <div className="flex gap-1 bg-[#141b2d] rounded-lg p-0.5 border border-[#2a3444]">
              {[
                { key: "week", label: "Semana" },
                { key: "month", label: "Mes" },
                { key: "year", label: "Ano" }
              ].map(f => (
                <button key={f.key}
                  onClick={() => setTimelinePeriod(f.key)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    timelinePeriod === f.key 
                      ? 'bg-[#D4AF37] text-[#141b2d] font-medium' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid={`timeline-filter-${f.key}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Evolucion historica de tus deudas y ahorros
          </p>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="animate-pulse">Cargando datos...</div>
            </div>
          ) : timelineData.length > 1 ? (
            <>
              {/* Current Summary */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-[10px] text-gray-400 mb-0.5">Deuda Actual</p>
                  <p className="font-mono font-bold text-red-400 text-lg" data-testid="current-debt-value">
                    {formatCurrency(reportData?.after?.total_debt || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-[10px] text-gray-400 mb-0.5">Ahorro Actual</p>
                  <p className="font-mono font-bold text-green-400 text-lg" data-testid="current-savings-value">
                    {formatCurrency(reportData?.after?.total_savings || 0)}
                  </p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3444" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#2a3444" />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#2a3444"
                      tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                    <Tooltip content={<CustomTimelineTooltip />} />
                    <Legend formatter={(v) => v === "debt" ? "Deuda" : "Ahorro"} 
                      wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                    <Line type="monotone" dataKey="debt" name="debt"
                      stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 4 }}
                      activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="savings" name="savings"
                      stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }}
                      activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Agrega deudas, ahorros y transacciones para ver la grafica</p>
                <p className="text-xs mt-1 text-gray-500">Se necesitan al menos 2 periodos de datos</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annual Budget Comparison */}
      {reportData?.annual_comparison && (
        <Card data-testid="annual-comparison-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Epilogue, sans-serif' }}>
              <Target className="w-5 h-5 text-[#D4AF37]" />
              Proyectado vs Real — Anual {reportData.annual_comparison.year}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Presupuesto mensual x 12 comparado con el total gastado/recibido en el ano
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-3 rounded-xl bg-red-500/10 text-center">
                <p className="text-[10px] text-gray-400 mb-1">Gastos Proyectados</p>
                <p className="font-mono font-semibold text-sm text-gray-300">
                  {formatCurrency(reportData.annual_comparison.totals?.expense_projected || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 text-center">
                <p className="text-[10px] text-gray-400 mb-1">Gastos Reales</p>
                <p className="font-mono font-semibold text-sm text-red-400">
                  {formatCurrency(reportData.annual_comparison.totals?.expense_actual || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 text-center">
                <p className="text-[10px] text-gray-400 mb-1">Ingresos Esperados</p>
                <p className="font-mono font-semibold text-sm text-gray-300">
                  {formatCurrency(reportData.annual_comparison.totals?.income_projected || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 text-center">
                <p className="text-[10px] text-gray-400 mb-1">Ingresos Reales</p>
                <p className="font-mono font-semibold text-sm text-green-400">
                  {formatCurrency(reportData.annual_comparison.totals?.income_actual || 0)}
                </p>
              </div>
            </div>

            <Tabs defaultValue="expenses">
              <TabsList className="bg-[#141b2d] border border-[#2a3444] h-8 mb-3">
                <TabsTrigger value="expenses" className="text-xs data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d] h-6 px-3">
                  Gastos
                </TabsTrigger>
                <TabsTrigger value="income" className="text-xs data-[state=active]:bg-green-500 data-[state=active]:text-white h-6 px-3">
                  Ingresos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="expenses" className="space-y-2">
                {reportData.annual_comparison.expenses?.filter(i => i.annual_projected > 0 || i.annual_actual > 0).length > 0 ? (
                  reportData.annual_comparison.expenses
                    .filter(item => item.annual_projected > 0 || item.annual_actual > 0)
                    .map((item) => {
                      const pct = item.annual_projected > 0
                        ? Math.min((item.annual_actual / item.annual_projected) * 100, 100)
                        : (item.annual_actual > 0 ? 100 : 0);
                      const isOver = item.over_budget;
                      return (
                        <div key={item.category} className="p-3 rounded-lg bg-[#141b2d] border border-[#2a3444]"
                          data-testid={`annual-expense-${item.category}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">{item.category}</span>
                            {item.annual_projected > 0 && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                isOver ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                              }`}>
                                {isOver
                                  ? `Excedido: ${formatCurrency(Math.abs(item.difference))}`
                                  : `Disponible: ${formatCurrency(item.difference)}`}
                              </span>
                            )}
                            {item.annual_projected === 0 && item.annual_actual > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                                Sin presupuesto
                              </span>
                            )}
                          </div>
                          <div className="h-2 bg-[#2a3444] rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              isOver ? 'bg-red-400/80' : 'bg-green-400/80'
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                              Proyectado: <span className="font-mono text-gray-400">{formatCurrency(item.annual_projected)}</span>
                              <span className="text-gray-600 ml-1">({formatCurrency(item.monthly_projected)}/mes)</span>
                            </span>
                            <span className={`font-mono font-medium ${isOver ? 'text-red-400' : 'text-green-400'}`}>
                              Real: {formatCurrency(item.annual_actual)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-6 text-center text-gray-500">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay gastos registrados este ano</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="income" className="space-y-2">
                {reportData.annual_comparison.income?.filter(i => i.annual_projected > 0 || i.annual_actual > 0).length > 0 ? (
                  reportData.annual_comparison.income
                    .filter(item => item.annual_projected > 0 || item.annual_actual > 0)
                    .map((item) => {
                      const pct = item.annual_projected > 0
                        ? Math.min((item.annual_actual / item.annual_projected) * 100, 100)
                        : (item.annual_actual > 0 ? 100 : 0);
                      const isUnder = item.over_budget;
                      return (
                        <div key={item.category} className="p-3 rounded-lg bg-[#141b2d] border border-[#2a3444]"
                          data-testid={`annual-income-${item.category}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">{item.category}</span>
                            {item.annual_projected > 0 && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                isUnder ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                              }`}>
                                {isUnder
                                  ? `Falta: ${formatCurrency(Math.abs(item.difference))}`
                                  : `Superado: +${formatCurrency(item.difference)}`}
                              </span>
                            )}
                            {item.annual_projected === 0 && item.annual_actual > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                                Sin meta anual
                              </span>
                            )}
                          </div>
                          <div className="h-2 bg-[#2a3444] rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              isUnder ? 'bg-red-400/80' : 'bg-green-400/80'
                            }`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                              Esperado: <span className="font-mono text-gray-400">{formatCurrency(item.annual_projected)}</span>
                              <span className="text-gray-600 ml-1">({formatCurrency(item.monthly_projected)}/mes)</span>
                            </span>
                            <span className={`font-mono font-medium ${isUnder ? 'text-red-400' : 'text-green-400'}`}>
                              Recibido: {formatCurrency(item.annual_actual)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-6 text-center text-gray-500">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay ingresos registrados este ano</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Stacked Distribution Chart - Distribución de Gasto x Mes */}
      <Card data-testid="stacked-chart-card">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Distribucion de Gasto x Mes
          </CardTitle>
          <p className="text-xs text-muted-foreground">Composicion porcentual por mes (Ingresos, Gastos, Ahorro, Deudas)</p>
        </CardHeader>
        <CardContent>
          {reportData?.stacked_chart?.some(d => d.income > 0 || d.expenses > 0) ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData.stacked_chart} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3444" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} stroke="#2a3444" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} stroke="#2a3444"
                    tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-[#1a2332] border border-[#2a3444] rounded-lg px-4 py-3 shadow-xl text-sm">
                          <p className="text-white font-medium mb-1">{label}</p>
                          {payload.map((p, i) => (
                            <p key={i} style={{ color: p.fill }} className="font-mono">
                              {p.name}: {p.value}%
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend formatter={(v) => {
                    const m = { income_pct: 'Ingresos', expenses_pct: 'Gastos', savings_pct: 'Ahorro', debts_pct: 'Deudas' };
                    return m[v] || v;
                  }} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income_pct" name="income_pct" stackId="a" fill="#D4AF37" />
                  <Bar dataKey="expenses_pct" name="expenses_pct" stackId="a" fill="#8B4513" />
                  <Bar dataKey="savings_pct" name="savings_pct" stackId="a" fill="#A0845C" />
                  <Bar dataKey="debts_pct" name="debts_pct" stackId="a" fill="#C8B070" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Agrega transacciones para ver la distribucion</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;

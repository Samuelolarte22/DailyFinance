import { useState, useEffect } from "react";
import { API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  CalendarIcon,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Toaster, toast } from "sonner";
import CurrencyInput from "../components/CurrencyInput";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState({
    type: "expense",
    category: "",
    amount: "",
    description: "",
    date: new Date(),
    bank: "",
    pocket_id: "",
    savings_goal_id: "",
    debt_id: ""
  });
  const [banks, setBanks] = useState([]);
  const [isShared, setIsShared] = useState(false);
  const [sharedWith, setSharedWith] = useState("");
  const [myPercentage, setMyPercentage] = useState("50");
  const [connections, setConnections] = useState([]);
  const [pockets, setPockets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [debts, setDebts] = useState([]);

  const [incomeCategories, setIncomeCategories] = useState([
    "Salario", "Mesada", "Beca", "Trabajo freelance", "Regalo", "Venta", "Otro ingreso"
  ]);
  const [expenseCategories, setExpenseCategories] = useState([
    "Alimentacion", "Transporte", "Entretenimiento", "Educacion", "Salud", 
    "Ropa", "Tecnologia", "Servicios", "Suscripciones", "Otro gasto"
  ]);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
    fetchBanks();
    fetchConnections();
    fetchPocketsAndGoals();
  }, []);

  useEffect(() => {
    const refresh = () => fetchTransactions();
    window.addEventListener("transaction-created", refresh);
    return () => window.removeEventListener("transaction-created", refresh);
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await axios.get(`${API}/connections`, { withCredentials: true });
      setConnections(response.data);
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await axios.get(`${API}/banks`, { withCredentials: true });
      setBanks(response.data);
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, { withCredentials: true });
      if (response.data.income) setIncomeCategories(response.data.income);
      if (response.data.expense) setExpenseCategories(response.data.expense);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchPocketsAndGoals = async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        axios.get(`${API}/dashboard`, { withCredentials: true }),
        axios.get(`${API}/pockets`, { withCredentials: true })
      ]);
      setPockets(pRes.data?.pockets || dRes.data || []);
      setSavingsGoals(pRes.data?.savings_goals || []);
      setDebts(pRes.data?.debts || []);
    } catch (error) {
      console.error("Error fetching pockets/goals:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`, {
        withCredentials: true
      });
      setTransactions(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Error al cargar transacciones");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    try {
      if (isShared && sharedWith) {
        // Create shared transaction
        await axios.post(`${API}/transactions/shared`, {
          type: formData.type,
          category: formData.category,
          amount: parseInt(formData.amount) || 0,
          description: formData.description || null,
          date: formData.date.toISOString(),
          bank: formData.bank || null,
          shared_with: sharedWith,
          my_percentage: parseFloat(myPercentage),
          friend_percentage: 100 - parseFloat(myPercentage)
        }, { withCredentials: true });
        toast.success("Transaccion compartida creada");
      } else {
        await axios.post(`${API}/transactions`, {
          type: formData.type,
          category: formData.category,
          amount: parseInt(formData.amount) || 0,
          description: formData.description || null,
          date: formData.date.toISOString(),
          bank: formData.bank || null,
          pocket_id: formData.pocket_id || null,
          savings_goal_id: formData.savings_goal_id || null,
          debt_id: formData.debt_id || null
        }, { withCredentials: true });
        toast.success("Transaccion agregada");
      }

      setDialogOpen(false);
      setFormData({
        type: "expense",
        category: "",
        amount: "",
        description: "",
        date: new Date(),
        bank: "",
        pocket_id: "",
        savings_goal_id: "",
        debt_id: ""
      });
      setIsShared(false);
      setSharedWith("");
      setMyPercentage("50");
      fetchTransactions();
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Error al crear transacción");
    }
  };

  const handleDelete = async (transactionId) => {
    try {
      await axios.delete(`${API}/transactions/${transactionId}`, {
        withCredentials: true
      });
      toast.success("Transacción eliminada");
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Error al eliminar transacción");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
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

  // Filter by month and type
  const filteredTransactions = transactions.filter(txn => {
    const txnMonth = txn.date.substring(0, 7);
    const monthMatch = txnMonth === selectedMonth;
    const typeMatch = filterType === "all" || txn.type === filterType;
    return monthMatch && typeMatch;
  });

  // Calculate monthly totals
  const monthlyIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const monthlyExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const categories = formData.type === "income" ? incomeCategories : expenseCategories;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[#D4AF37]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="transactions-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Transacciones
          </h1>
          <p className="text-gray-400 mt-1">
            Registra y gestiona tus ingresos y gastos
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-gold rounded-md" data-testid="add-transaction-dialog-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-[#1a2332] border-[#2a3444] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                Agregar transacción
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Transaction Type Tabs */}
              <Tabs 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value, category: "" })}
              >
                <TabsList className="grid w-full grid-cols-2 bg-[#141b2d]">
                  <TabsTrigger value="income" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400" data-testid="income-tab">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Ingreso
                  </TabsTrigger>
                  <TabsTrigger value="expense" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400" data-testid="expense-tab">
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    Gasto
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-gray-300">Categoría</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white" data-testid="category-select">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                    {categories.map((cat, index) => (
                      <SelectItem key={cat} value={cat} className="text-gray-300 focus:bg-[#2a3444] focus:text-white" data-testid={`category-option-${index}`}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-gray-300">Monto (COP)</Label>
                <CurrencyInput
                  className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.amount}
                  onChange={(v) => setFormData({ ...formData, amount: v })}
                  data-testid="amount-input"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-gray-300">Descripción (opcional)</Label>
                <Input
                  placeholder="Ej: Almuerzo con amigos"
                  className="bg-[#141b2d] border-[#2a3444] text-white"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="description-input"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label className="text-gray-300">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-[#141b2d] border-[#2a3444] text-white hover:bg-[#2a3444]"
                      data-testid="date-picker-btn"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.date, "PPP", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#1a2332] border-[#2a3444]" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData({ ...formData, date })}
                      initialFocus
                      className="bg-[#1a2332]"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Bank (optional) */}
              {banks.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Banco (opcional)</Label>
                  <Select value={formData.bank} onValueChange={(value) => setFormData({ ...formData, bank: value === "none" ? "" : value })}>
                    <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white" data-testid="bank-select">
                      <SelectValue placeholder="Sin especificar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {banks.map(b => (
                        <SelectItem key={b.bank_id} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Shared Transaction */}
              {connections.length > 0 && (
                <div className="space-y-3 p-3 rounded-lg border border-[#2a3444]">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)}
                      className="rounded border-[#2a3444]" id="shared-check" />
                    <Label htmlFor="shared-check" className="text-gray-300 text-sm cursor-pointer">
                      Compartir con alguien
                    </Label>
                  </div>
                  {isShared && (
                    <div className="space-y-3">
                      <Select value={sharedWith} onValueChange={setSharedWith}>
                        <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white" data-testid="shared-with-select">
                          <SelectValue placeholder="Seleccionar contacto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {connections.map(c => (
                            <SelectItem key={c.user_id} value={c.user_id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="space-y-1">
                        <Label className="text-gray-300 text-xs">Mi porcentaje: {myPercentage}%</Label>
                        <input type="range" min="1" max="99" value={myPercentage}
                          onChange={(e) => setMyPercentage(e.target.value)}
                          className="w-full accent-[#D4AF37]" data-testid="percentage-slider" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Yo: {myPercentage}%</span>
                          <span>Otro: {100 - parseInt(myPercentage)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pocket selector (for expenses) */}
              {formData.type === "expense" && pockets.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-300 text-xs">Usar bolsillo (opcional)</Label>
                  <Select value={formData.pocket_id || "none"} onValueChange={(v) => setFormData({ ...formData, pocket_id: v === "none" ? "" : v })}>
                    <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white" data-testid="txn-pocket-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                      <SelectItem value="none">Sin bolsillo</SelectItem>
                      {pockets.map(p => (
                        <SelectItem key={p.pocket_id} value={p.pocket_id}>
                          {p.name} (${new Intl.NumberFormat('es-CO').format(p.balance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Savings / Debt (for expenses) */}
              {formData.type === "expense" && (savingsGoals.length > 0 || debts.length > 0) && (
                <div className="space-y-2 p-3 rounded-lg border border-[#2a3444]">
                  <p className="text-xs text-gray-400 font-medium">Destino especial (opcional)</p>
                  {savingsGoals.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-gray-400 text-[10px]">Aportar a ahorro</Label>
                      <Select value={formData.savings_goal_id || "none"} onValueChange={(v) => setFormData({ ...formData, savings_goal_id: v === "none" ? "" : v, debt_id: "" })}>
                        <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                          <SelectItem value="none">Ninguno</SelectItem>
                          {savingsGoals.map(g => <SelectItem key={g.goal_id} value={g.goal_id}>{g.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {debts.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-gray-400 text-[10px]">Pagar deuda</Label>
                      <Select value={formData.debt_id || "none"} onValueChange={(v) => setFormData({ ...formData, debt_id: v === "none" ? "" : v, savings_goal_id: "" })}>
                        <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                          <SelectItem value="none">Ninguna</SelectItem>
                          {debts.map(d => <SelectItem key={d.debt_id} value={d.debt_id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full btn-gold rounded-md" data-testid="submit-transaction-btn">
                Guardar transacción
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
              <CalendarIcon className="w-5 h-5 text-[#D4AF37]" />
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

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-[#1a2332] border-[#2a3444]">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Ingresos</p>
            <p className="text-xs sm:text-lg font-bold font-mono text-green-400 truncate">{formatCurrency(monthlyIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#2a3444]">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Gastos</p>
            <p className="text-xs sm:text-lg font-bold font-mono text-red-400 truncate">{formatCurrency(monthlyExpenses)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#D4AF37]/30">
          <CardContent className="p-3 sm:p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Balance</p>
            <p className={`text-xs sm:text-lg font-bold font-mono truncate ${monthlyIncome - monthlyExpenses >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>
              {formatCurrency(monthlyIncome - monthlyExpenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 bg-[#1a2332] border-[#2a3444] text-white" data-testid="filter-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a2332] border-[#2a3444]">
            <SelectItem value="all" className="text-gray-300 focus:bg-[#2a3444] focus:text-white">Todas</SelectItem>
            <SelectItem value="income" className="text-gray-300 focus:bg-[#2a3444] focus:text-white">Ingresos</SelectItem>
            <SelectItem value="expense" className="text-gray-300 focus:bg-[#2a3444] focus:text-white">Gastos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500 ml-2">
          {filteredTransactions.length} transacciones
        </span>
      </div>

      {/* Transactions List */}
      <Card className="bg-[#1a2332] border-[#2a3444]">
        <CardHeader>
          <CardTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            Historial de {getMonthName(selectedMonth)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((txn) => (
                <div 
                  key={txn.transaction_id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-[#141b2d] border border-[#2a3444] hover:border-[#D4AF37]/30 transition-colors group"
                  data-testid={`transaction-item-${txn.transaction_id}`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                    txn.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {txn.type === 'income' ? (
                      <ArrowUpRight className="w-6 h-6 text-green-400" />
                    ) : (
                      <ArrowDownRight className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{txn.category}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        txn.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {txn.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </div>
                    {txn.description && (
                      <p className="text-sm text-gray-500 truncate">{txn.description}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      {formatDate(txn.date)}
                      {txn.bank && <span className="ml-2 text-gray-500">| {txn.bank}</span>}
                    </p>
                  </div>
                  
                  <p className={`font-mono font-semibold text-lg ${
                    txn.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDelete(txn.transaction_id)}
                    data-testid={`delete-transaction-${txn.transaction_id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <ArrowUpRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay transacciones en este mes</p>
              <Button 
                variant="link" 
                className="mt-2 text-[#D4AF37]"
                onClick={() => setDialogOpen(true)}
              >
                Agregar primera transacción
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;

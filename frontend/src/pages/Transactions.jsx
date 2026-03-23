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
    date: new Date()
  });

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
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, { withCredentials: true });
      if (response.data.income) setIncomeCategories(response.data.income);
      if (response.data.expense) setExpenseCategories(response.data.expense);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
      await axios.post(
        `${API}/transactions`,
        {
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          date: formData.date.toISOString()
        },
        { withCredentials: true }
      );

      toast.success("Transacción agregada");
      setDialogOpen(false);
      setFormData({
        type: "expense",
        category: "",
        amount: "",
        description: "",
        date: new Date()
      });
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
          <DialogContent className="sm:max-w-md bg-[#1a2332] border-[#2a3444]">
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-8 font-mono bg-[#141b2d] border-[#2a3444] text-white"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    data-testid="amount-input"
                  />
                </div>
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
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#1a2332] border-[#2a3444]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Ingresos</p>
            <p className="text-lg font-bold font-mono text-green-400">{formatCurrency(monthlyIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#2a3444]">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Gastos</p>
            <p className="text-lg font-bold font-mono text-red-400">{formatCurrency(monthlyExpenses)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-[#D4AF37]/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Balance</p>
            <p className={`text-lg font-bold font-mono ${monthlyIncome - monthlyExpenses >= 0 ? 'text-[#D4AF37]' : 'text-red-400'}`}>
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

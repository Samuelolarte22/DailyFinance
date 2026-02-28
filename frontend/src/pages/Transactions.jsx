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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Toaster, toast } from "sonner";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [formData, setFormData] = useState({
    type: "expense",
    category: "",
    amount: "",
    description: "",
    date: new Date()
  });

  const incomeCategories = [
    "Salario", "Mesada", "Beca", "Trabajo freelance", "Regalo", "Venta", "Otro ingreso"
  ];

  const expenseCategories = [
    "Alimentación", "Transporte", "Entretenimiento", "Educación", "Salud", 
    "Ropa", "Tecnología", "Servicios", "Suscripciones", "Otro gasto"
  ];

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  const filteredTransactions = transactions.filter(txn => {
    if (filterType === "all") return true;
    return txn.type === filterType;
  });

  const categories = formData.type === "income" ? incomeCategories : expenseCategories;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="transactions-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Transacciones
          </h1>
          <p className="text-muted-foreground mt-1">
            Registra y gestiona tus ingresos y gastos
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full btn-press" data-testid="add-transaction-dialog-btn">
              <Plus className="w-4 h-4 mr-2" />
              Nueva transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
                Agregar transacción
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Transaction Type Tabs */}
              <Tabs 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value, category: "" })}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="income" data-testid="income-tab">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Ingreso
                  </TabsTrigger>
                  <TabsTrigger value="expense" data-testid="expense-tab">
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    Gasto
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger data-testid="category-select">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat, index) => (
                      <SelectItem key={cat} value={cat} data-testid={`category-option-${index}`}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Monto (COP)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    className="pl-8 font-mono"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    data-testid="amount-input"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Input
                  placeholder="Ej: Almuerzo con amigos"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="description-input"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="date-picker-btn"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.date, "PPP", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData({ ...formData, date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button type="submit" className="w-full rounded-full btn-press" data-testid="submit-transaction-btn">
                Guardar transacción
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40" data-testid="filter-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="income">Ingresos</SelectItem>
            <SelectItem value="expense">Gastos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Historial de transacciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((txn) => (
                <div 
                  key={txn.transaction_id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                  data-testid={`transaction-item-${txn.transaction_id}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    txn.type === 'income' ? 'bg-income' : 'bg-expense'
                  }`}>
                    {txn.type === 'income' ? (
                      <ArrowUpRight className="w-6 h-6" />
                    ) : (
                      <ArrowDownRight className="w-6 h-6" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{txn.category}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        txn.type === 'income' ? 'bg-income/50' : 'bg-expense/50'
                      }`}>
                        {txn.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </div>
                    {txn.description && (
                      <p className="text-sm text-muted-foreground truncate">{txn.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(txn.date)}
                    </p>
                  </div>
                  
                  <p className={`font-mono font-semibold text-lg ${
                    txn.type === 'income' ? 'text-income' : 'text-expense'
                  }`}>
                    {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </p>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(txn.transaction_id)}
                    data-testid={`delete-transaction-${txn.transaction_id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <ArrowUpRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay transacciones registradas</p>
              <Button 
                variant="link" 
                className="mt-2"
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

import { useState, useEffect } from "react";
import { API } from "../App";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon } from "lucide-react";
import CurrencyInput from "./CurrencyInput";
import { toast } from "sonner";

const FloatingTransaction = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "expense", category: "", amount: "", description: "",
    date: new Date(), bank: "", pocket_id: "", savings_goal_id: "", debt_id: ""
  });
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [banks, setBanks] = useState([]);
  const [pockets, setPockets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [debts, setDebts] = useState([]);

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    try {
      const [catRes, bankRes, dashRes] = await Promise.all([
        axios.get(`${API}/categories`, { withCredentials: true }),
        axios.get(`${API}/banks`, { withCredentials: true }),
        axios.get(`${API}/dashboard`, { withCredentials: true })
      ]);
      setExpenseCategories(catRes.data.expense || []);
      setIncomeCategories(catRes.data.income || []);
      setBanks(bankRes.data || []);
      setPockets(dashRes.data.pockets || []);
      setSavingsGoals(dashRes.data.savings_goals || []);
      setDebts(dashRes.data.debts || []);
    } catch (error) {
      console.error(error);
    }
  };

  const formatCurrency = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount) { toast.error("Completa categoria y monto"); return; }
    try {
      await axios.post(`${API}/transactions`, {
        type: form.type,
        category: form.category,
        amount: parseInt(form.amount),
        description: form.description || undefined,
        date: format(form.date, "yyyy-MM-dd"),
        bank: form.bank || undefined,
        pocket_id: form.pocket_id || undefined,
        savings_goal_id: form.savings_goal_id || undefined,
        debt_id: form.debt_id || undefined
      }, { withCredentials: true });
      toast.success("Transaccion registrada");
      setOpen(false);
      setForm({ type: "expense", category: "", amount: "", description: "", date: new Date(), bank: "", pocket_id: "", savings_goal_id: "", debt_id: "" });
      // Notify other components to refresh
      window.dispatchEvent(new Event("transaction-created"));
    } catch (error) {
      toast.error("Error al guardar");
    }
  };

  const currentCats = form.type === "income" ? incomeCategories : expenseCategories;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#D4AF37] text-[#141b2d] shadow-lg shadow-[#D4AF37]/25 hover:bg-[#D4AF37]/90 hover:scale-105 transition-all flex items-center justify-center"
          data-testid="floating-add-txn-btn">
          <Plus className="w-7 h-7" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-[#1a2332] border-[#2a3444] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white" style={{ fontFamily: 'Playfair Display, serif' }}>Nueva transaccion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "", savings_goal_id: "", debt_id: "" })}>
            <TabsList className="grid w-full grid-cols-2 bg-[#141b2d]">
              <TabsTrigger value="income" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400" data-testid="ftxn-income-tab">
                <ArrowUpRight className="w-4 h-4 mr-1" /> Ingreso
              </TabsTrigger>
              <TabsTrigger value="expense" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400" data-testid="ftxn-expense-tab">
                <ArrowDownRight className="w-4 h-4 mr-1" /> Gasto
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs">Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white" data-testid="ftxn-category">
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                {currentCats.map(c => <SelectItem key={c} value={c} className="text-gray-300 focus:bg-[#2a3444] focus:text-white">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs">Monto (COP)</Label>
            <CurrencyInput className="bg-[#141b2d] border-[#2a3444] text-white"
              value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} data-testid="ftxn-amount" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs">Descripcion (opcional)</Label>
            <Input placeholder="Ej: Almuerzo" className="bg-[#141b2d] border-[#2a3444] text-white"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="ftxn-desc" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs">Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left bg-[#141b2d] border-[#2a3444] text-white hover:bg-[#2a3444]" data-testid="ftxn-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(form.date, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#1a2332] border-[#2a3444]" align="start">
                <Calendar mode="single" selected={form.date} onSelect={(d) => d && setForm({ ...form, date: d })} initialFocus className="bg-[#1a2332]" />
              </PopoverContent>
            </Popover>
          </div>

          {banks.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Banco (opcional)</Label>
              <Select value={form.bank || "none"} onValueChange={(v) => setForm({ ...form, bank: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {banks.map(b => <SelectItem key={b.bank_id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.type === "expense" && pockets.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">Usar bolsillo (opcional)</Label>
              <Select value={form.pocket_id || "none"} onValueChange={(v) => setForm({ ...form, pocket_id: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white" data-testid="ftxn-pocket">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                  <SelectItem value="none">Sin bolsillo</SelectItem>
                  {pockets.map(p => <SelectItem key={p.pocket_id} value={p.pocket_id}>{p.name} ({formatCurrency(p.balance)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.type === "expense" && (savingsGoals.length > 0 || debts.length > 0) && (
            <div className="space-y-2 p-3 rounded-lg border border-[#2a3444]">
              <p className="text-xs text-gray-400 font-medium">Destino especial (opcional)</p>
              {savingsGoals.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-gray-400 text-[10px]">Aportar a ahorro</Label>
                  <Select value={form.savings_goal_id || "none"} onValueChange={(v) => setForm({ ...form, savings_goal_id: v === "none" ? "" : v, debt_id: "" })}>
                    <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white h-8 text-xs" data-testid="ftxn-savings"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                      <SelectItem value="none">Ninguno</SelectItem>
                      {savingsGoals.map(g => <SelectItem key={g.goal_id} value={g.goal_id}>{g.name} ({formatCurrency(g.current_amount)}/{formatCurrency(g.target_amount)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {debts.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-gray-400 text-[10px]">Pagar deuda</Label>
                  <Select value={form.debt_id || "none"} onValueChange={(v) => setForm({ ...form, debt_id: v === "none" ? "" : v, savings_goal_id: "" })}>
                    <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white h-8 text-xs" data-testid="ftxn-debt"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                      <SelectItem value="none">Ninguna</SelectItem>
                      {debts.map(d => <SelectItem key={d.debt_id} value={d.debt_id}>{d.name} (Saldo: {formatCurrency(d.current_amount)})</SelectItem>)}
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
  );
};

export default FloatingTransaction;

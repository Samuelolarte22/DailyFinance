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
import { Plus, ArrowUpRight, ArrowDownRight, Calendar as CalendarIcon, Calculator, Users, Mic, MicOff, Loader2 } from "lucide-react";
import CurrencyInput from "./CurrencyInput";
import { toast } from "sonner";

const QuickCalculator = ({ onResult }) => {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);

  const input = (val) => {
    if (fresh) { setDisplay(val); setFresh(false); }
    else setDisplay(display === "0" ? val : display + val);
  };

  const operate = (nextOp) => {
    const current = parseFloat(display) || 0;
    if (prev !== null && op) {
      let result = prev;
      if (op === "+") result = prev + current;
      if (op === "-") result = prev - current;
      if (op === "*") result = prev * current;
      if (op === "/") result = current !== 0 ? prev / current : 0;
      setPrev(result);
      setDisplay(String(Math.round(result)));
    } else {
      setPrev(current);
    }
    setOp(nextOp);
    setFresh(true);
  };

  const calculate = () => {
    operate(null);
    setOp(null);
    setFresh(true);
  };

  const clear = () => { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); };

  const useValue = () => {
    const val = Math.round(parseFloat(display) || 0);
    onResult(String(val));
  };

  const btnClass = "h-8 text-xs font-mono rounded bg-[#141b2d] border border-[#2a3444] text-white hover:bg-[#2a3444] transition-colors";
  const opClass = "h-8 text-xs font-mono rounded bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/30 transition-colors";

  return (
    <div className="space-y-2 p-3 rounded-lg border border-[#D4AF37]/30 bg-[#141b2d]/50" data-testid="quick-calculator">
      <div className="bg-[#0d1117] rounded px-3 py-2 text-right font-mono text-lg text-white border border-[#2a3444]" data-testid="calc-display">
        {new Intl.NumberFormat('es-CO').format(parseFloat(display) || 0)}
        {op && <span className="text-[#D4AF37] ml-1 text-sm">{op}</span>}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {["7","8","9","/","4","5","6","*","1","2","3","-","0","00",".","+"].map(key => (
          <button key={key} type="button"
            className={["/","*","-","+"].includes(key) ? opClass : btnClass}
            onClick={() => ["/","*","-","+"].includes(key) ? operate(key) : input(key)}
            data-testid={`calc-btn-${key}`}>
            {key}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" className={`${btnClass} bg-red-500/10 text-red-400 border-red-500/30`} onClick={clear} data-testid="calc-btn-clear">C</button>
        <button type="button" className={`${opClass}`} onClick={calculate} data-testid="calc-btn-equals">=</button>
        <button type="button"
          className="h-8 text-xs font-medium rounded bg-[#D4AF37] text-[#141b2d] hover:bg-[#D4AF37]/90 transition-colors"
          onClick={useValue} data-testid="calc-btn-use">
          Usar
        </button>
      </div>
    </div>
  );
};

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
  const [connections, setConnections] = useState([]);
  const [isShared, setIsShared] = useState(false);
  const [sharedWith, setSharedWith] = useState("");
  const [myPercentage, setMyPercentage] = useState("50");
  const [showCalc, setShowCalc] = useState(false);
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    try {
      const [catRes, bankRes, dashRes, connRes] = await Promise.all([
        axios.get(`${API}/categories`, { withCredentials: true }),
        axios.get(`${API}/banks`, { withCredentials: true }),
        axios.get(`${API}/dashboard`, { withCredentials: true }),
        axios.get(`${API}/connections`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);
      setExpenseCategories(catRes.data.expense || []);
      setIncomeCategories(catRes.data.income || []);
      setBanks(bankRes.data || []);
      setPockets(dashRes.data.pockets || []);
      setSavingsGoals(dashRes.data.savings_goals || []);
      setDebts(dashRes.data.debts || []);
      setConnections(connRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(blob);
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setVoiceTranscript("");
      toast.info("Grabando... habla ahora");
    } catch (err) {
      toast.error("No se pudo acceder al microfono");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "voice.webm");
      
      const res = await axios.post(`${API}/voice/parse-transaction`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      const { transcript, parsed, error } = res.data;
      setVoiceTranscript(transcript || "");
      
      if (parsed) {
        // Auto-fill form with parsed data
        const newForm = { ...form };
        if (parsed.type) newForm.type = parsed.type;
        if (parsed.category) newForm.category = parsed.category;
        if (parsed.amount) newForm.amount = String(parsed.amount);
        if (parsed.description) newForm.description = parsed.description;
        if (parsed.date) {
          try { newForm.date = new Date(parsed.date + "T12:00:00"); } catch (e) { /* keep current */ }
        }
        setForm(newForm);
        toast.success("Datos extraidos del audio");
      } else {
        toast.error(error || "No se pudieron extraer datos");
      }
    } catch (err) {
      toast.error("Error al procesar audio");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount) { toast.error("Completa categoria y monto"); return; }
    try {
      if (isShared && sharedWith) {
        await axios.post(`${API}/transactions/shared`, {
          type: form.type,
          category: form.category,
          amount: parseInt(form.amount),
          description: form.description || undefined,
          date: format(form.date, "yyyy-MM-dd"),
          bank: form.bank || undefined,
          shared_with: sharedWith,
          my_percentage: parseFloat(myPercentage),
          friend_percentage: 100 - parseFloat(myPercentage)
        }, { withCredentials: true });
        toast.success("Transaccion compartida creada");
      } else {
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
      }
      setOpen(false);
      setForm({ type: "expense", category: "", amount: "", description: "", date: new Date(), bank: "", pocket_id: "", savings_goal_id: "", debt_id: "" });
      setIsShared(false);
      setSharedWith("");
      setMyPercentage("50");
      setShowCalc(false);
      window.dispatchEvent(new Event("transaction-created"));
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Error al guardar");
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
        
        {/* Voice Input */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[#2a3444] bg-[#141b2d]/50" data-testid="voice-input-section">
          <button type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
              isRecording ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' 
              : isProcessing ? 'bg-[#2a3444] text-gray-500'
              : 'bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30'
            }`}
            data-testid="voice-record-btn">
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> 
              : isRecording ? <MicOff className="w-5 h-5" /> 
              : <Mic className="w-5 h-5" />}
          </button>
          <div className="flex-1 min-w-0">
            {isRecording && (
              <p className="text-xs text-red-400 animate-pulse">Grabando... toca para detener</p>
            )}
            {isProcessing && (
              <p className="text-xs text-[#D4AF37]">Procesando audio...</p>
            )}
            {!isRecording && !isProcessing && !voiceTranscript && (
              <p className="text-xs text-gray-500">Di algo como: <span className="italic text-gray-400">"Gaste 15 mil en Uber hoy"</span></p>
            )}
            {voiceTranscript && !isRecording && !isProcessing && (
              <p className="text-xs text-green-400 truncate" title={voiceTranscript}>"{voiceTranscript}"</p>
            )}
          </div>
        </div>

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
            <div className="flex items-center justify-between">
              <Label className="text-gray-300 text-xs">Monto (COP)</Label>
              <button type="button" onClick={() => setShowCalc(!showCalc)}
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors ${showCalc ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#2a3444] text-gray-400 hover:text-white'}`}
                data-testid="ftxn-calc-toggle">
                <Calculator className="w-3 h-3" />
                Calculadora
              </button>
            </div>
            {showCalc && (
              <QuickCalculator onResult={(val) => setForm({ ...form, amount: val })} />
            )}
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
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left bg-[#141b2d] border-[#2a3444] text-white hover:bg-[#2a3444]" data-testid="ftxn-date">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(form.date, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#1a2332] border-[#2a3444] z-[100]" align="start" side="bottom" sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}>
                <Calendar mode="single" selected={form.date} onSelect={(d) => { if (d) { setForm({ ...form, date: d }); setCalendarOpen(false); } }} className="bg-[#1a2332]" />
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

          {/* Shared Transaction */}
          {connections.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg border border-[#2a3444]">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)}
                  className="rounded border-[#2a3444]" id="ftxn-shared-check" data-testid="ftxn-shared-check" />
                <Label htmlFor="ftxn-shared-check" className="text-gray-300 text-xs cursor-pointer flex items-center gap-1">
                  <Users className="w-3 h-3" /> Compartir con alguien
                </Label>
              </div>
              {isShared && (
                <div className="space-y-2">
                  <Select value={sharedWith} onValueChange={setSharedWith}>
                    <SelectTrigger className="bg-[#141b2d] border-[#2a3444] text-white h-8 text-xs" data-testid="ftxn-shared-with">
                      <SelectValue placeholder="Seleccionar contacto..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-[#2a3444]">
                      {connections.map(c => <SelectItem key={c.user_id} value={c.user_id} className="text-gray-300">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-[10px]">Mi porcentaje: {myPercentage}%</Label>
                    <input type="range" min="1" max="99" value={myPercentage}
                      onChange={(e) => setMyPercentage(e.target.value)}
                      className="w-full accent-[#D4AF37]" data-testid="ftxn-percentage-slider" />
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Yo: {myPercentage}%</span>
                      <span>Otro: {100 - parseInt(myPercentage)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pocket / Savings / Debt (only when NOT shared) */}
          {!isShared && form.type === "expense" && pockets.length > 0 && (
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

          {!isShared && form.type === "expense" && (savingsGoals.length > 0 || debts.length > 0) && (
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
            {isShared ? "Compartir transaccion" : "Guardar transaccion"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FloatingTransaction;

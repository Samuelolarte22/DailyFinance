import { useState, useEffect } from "react";
import { API, useAuth } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
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
} from "../components/ui/dialog";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Plus,
  BarChart3,
  Search,
  ShieldCheck,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Toaster, toast } from "sonner";

const Admin = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [formData, setFormData] = useState({
    type: "expense",
    category: "",
    amount: "",
    description: ""
  });

  const incomeCategories = [
    "Salario", "Mesada", "Beca", "Trabajo freelance", "Regalo", "Ajuste admin", "Otro ingreso"
  ];

  const expenseCategories = [
    "Alimentación", "Transporte", "Entretenimiento", "Educación", "Salud", 
    "Ropa", "Tecnología", "Servicios", "Ajuste admin", "Otro gasto"
  ];

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [summaryRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/summary`, { withCredentials: true }),
        axios.get(`${API}/admin/users`, { withCredentials: true })
      ]);
      setSummary(summaryRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      if (error.response?.status === 403) {
        toast.error("No tienes permisos de administrador");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    try {
      const response = await axios.get(`${API}/admin/users/${userId}`, {
        withCredentials: true
      });
      setUserDetail(response.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error("Error fetching user detail:", error);
      toast.error("Error al cargar detalles del usuario");
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    try {
      await axios.post(
        `${API}/admin/users/${selectedUser}/transactions`,
        {
          user_id: selectedUser,
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description || `Registrado por asesor: ${user?.name}`
        },
        { withCredentials: true }
      );

      toast.success("Transacción registrada exitosamente");
      setTransactionDialogOpen(false);
      setFormData({ type: "expense", category: "", amount: "", description: "" });
      fetchUserDetail(selectedUser);
      fetchAdminData();
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Error al crear transacción");
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const response = await axios.put(
        `${API}/admin/users/${userId}/toggle-admin`,
        {},
        { withCredentials: true }
      );
      toast.success(response.data.message);
      fetchUserDetail(userId);
      fetchAdminData();
    } catch (error) {
      console.error("Error toggling admin:", error);
      toast.error(error.response?.data?.detail || "Error al cambiar rol de admin");
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmText !== "ELIMINAR") {
      toast.error("Debes escribir ELIMINAR para confirmar");
      return;
    }

    try {
      const response = await axios.delete(
        `${API}/admin/users/${selectedUser}`,
        { withCredentials: true }
      );
      toast.success(response.data.message);
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
      setSelectedUser(null);
      setUserDetail(null);
      fetchAdminData();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.detail || "Error al eliminar usuario");
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
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = formData.type === "income" ? incomeCategories : expenseCategories;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Cargando panel de administración...</div>
      </div>
    );
  }

  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
        <p className="text-muted-foreground">No tienes permisos de administrador para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="admin-page">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: 'Epilogue, sans-serif' }}>
            Panel de Administración
          </h1>
          <p className="text-muted-foreground">
            Gestiona y asesora a los usuarios del sistema
          </p>
        </div>
      </div>

      {/* Global Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" data-testid="admin-summary">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Usuarios</p>
                <p className="text-xl font-bold font-mono">{summary?.total_users || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-income flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ingresos totales</p>
                <p className="text-lg font-bold font-mono text-income">
                  {formatCurrency(summary?.financial_totals?.total_income || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-expense flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gastos totales</p>
                <p className="text-lg font-bold font-mono text-expense">
                  {formatCurrency(summary?.financial_totals?.total_expenses || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-debt flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deuda total</p>
                <p className="text-lg font-bold font-mono text-debt">
                  {formatCurrency(summary?.financial_totals?.total_debt || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-savings flex items-center justify-center">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ahorro total</p>
                <p className="text-lg font-bold font-mono text-savings">
                  {formatCurrency(summary?.financial_totals?.total_savings || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Resumen de usuarios</p>
                <p className="text-sm text-muted-foreground">
                  {summary?.users_with_survey || 0} de {summary?.total_users || 0} usuarios completaron su perfil financiero
                </p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm text-muted-foreground">Conocimiento financiero promedio</p>
              <p className="text-2xl font-bold font-mono text-primary">
                {summary?.averages?.avg_financial_knowledge || 0}/5
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List & Detail */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
              Usuarios ({filteredUsers.length})
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-users-input"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.user_id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedUser === u.user_id 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => fetchUserDetail(u.user_id)}
                  data-testid={`user-item-${u.user_id}`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={u.picture} alt={u.name} />
                    <AvatarFallback className="bg-primary/20 text-sm">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono ${
                      u.financial_summary?.balance >= 0 ? 'text-income' : 'text-expense'
                    }`}>
                      {formatCurrency(u.financial_summary?.balance || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {u.financial_summary?.transactions_count || 0} txns
                    </p>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron usuarios
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Detail */}
        <Card className="lg:col-span-2">
          {userDetail ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={userDetail.user?.picture} alt={userDetail.user?.name} />
                    <AvatarFallback className="bg-primary/20">
                      {getInitials(userDetail.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
                      {userDetail.user?.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{userDetail.user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {userDetail.user?.has_completed_survey && (
                        <Badge variant="secondary" className="text-xs">Perfil completado</Badge>
                      )}
                      {userDetail.user?.is_admin && (
                        <Badge className="text-xs bg-primary">Admin</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {userDetail.user?.user_id !== user?.user_id && (
                    <>
                      <Button 
                        variant={userDetail.user?.is_admin ? "outline" : "secondary"}
                        className="rounded-full"
                        onClick={() => handleToggleAdmin(userDetail.user?.user_id)}
                        data-testid="toggle-admin-btn"
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {userDetail.user?.is_admin ? "Quitar Admin" : "Hacer Admin"}
                      </Button>
                      <Button 
                        variant="outline"
                        className="rounded-full border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteDialogOpen(true)}
                        data-testid="delete-user-btn"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </>
                  )}
                  <Button 
                    className="rounded-full btn-press"
                    onClick={() => setTransactionDialogOpen(true)}
                    data-testid="admin-add-transaction-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar transacción
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="summary">
                  <TabsList className="mb-4">
                    <TabsTrigger value="summary">Resumen</TabsTrigger>
                    <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                    <TabsTrigger value="survey">Encuesta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-income/20 text-center">
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                        <p className="font-mono font-semibold text-income">
                          {formatCurrency(userDetail.summary?.total_income || 0)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-expense/20 text-center">
                        <p className="text-xs text-muted-foreground">Gastos</p>
                        <p className="font-mono font-semibold text-expense">
                          {formatCurrency(userDetail.summary?.total_expenses || 0)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-debt/20 text-center">
                        <p className="text-xs text-muted-foreground">Deuda</p>
                        <p className="font-mono font-semibold text-debt">
                          {formatCurrency(userDetail.summary?.total_debt || 0)}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-savings/20 text-center">
                        <p className="text-xs text-muted-foreground">Ahorros</p>
                        <p className="font-mono font-semibold text-savings">
                          {formatCurrency(userDetail.summary?.total_savings || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <p className="text-sm text-muted-foreground">Balance neto</p>
                      <p className={`text-3xl font-bold font-mono ${
                        userDetail.summary?.balance >= 0 ? 'text-income' : 'text-expense'
                      }`}>
                        {formatCurrency(userDetail.summary?.balance || 0)}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="transactions">
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {userDetail.transactions?.length > 0 ? (
                        userDetail.transactions.map((txn) => (
                          <div 
                            key={txn.transaction_id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{txn.category}</p>
                                {txn.created_by_admin && (
                                  <Badge variant="outline" className="text-xs">Admin</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(txn.date)}
                                {txn.description && ` • ${txn.description}`}
                              </p>
                            </div>
                            <p className={`font-mono font-semibold ${
                              txn.type === 'income' ? 'text-income' : 'text-expense'
                            }`}>
                              {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Sin transacciones registradas
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="survey">
                    {userDetail.survey ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-muted/30">
                            <p className="text-xs text-muted-foreground mb-1">Ingreso mensual inicial</p>
                            <p className="font-mono font-semibold">
                              {formatCurrency(userDetail.survey.monthly_income)}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-muted/30">
                            <p className="text-xs text-muted-foreground mb-1">Gasto mensual inicial</p>
                            <p className="font-mono font-semibold">
                              {formatCurrency(userDetail.survey.monthly_expenses)}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-muted/30">
                            <p className="text-xs text-muted-foreground mb-1">Deuda inicial</p>
                            <p className="font-mono font-semibold">
                              {formatCurrency(userDetail.survey.total_debt)}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-muted/30">
                            <p className="text-xs text-muted-foreground mb-1">Ahorros iniciales</p>
                            <p className="font-mono font-semibold">
                              {formatCurrency(userDetail.survey.current_savings)}
                            </p>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Conocimiento financiero</p>
                          <p className="font-semibold">{userDetail.survey.financial_knowledge}/5</p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Objetivo principal</p>
                          <p className="font-medium">{userDetail.survey.main_financial_goal}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Mayor reto</p>
                          <p className="font-medium">{userDetail.survey.biggest_challenge}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        El usuario no ha completado la encuesta diagnóstica
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Eye className="w-12 h-12 mb-4 opacity-50" />
              <p>Selecciona un usuario para ver sus detalles</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Epilogue, sans-serif' }}>
              Agregar transacción como asesor
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <Tabs 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value, category: "" })}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Ingreso
                </TabsTrigger>
                <TabsTrigger value="expense">
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Gasto
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select 
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger data-testid="admin-category-select">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat, index) => (
                    <SelectItem key={cat} value={cat} data-testid={`admin-category-${index}`}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                  data-testid="admin-amount-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción/Nota</Label>
              <Input
                placeholder="Nota del asesor..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="admin-description-input"
              />
            </div>

            <Button type="submit" className="w-full rounded-full btn-press" data-testid="admin-submit-btn">
              Registrar transacción
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;

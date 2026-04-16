import { useState, useEffect } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Bell, 
  Search,
  ArrowLeftRight,
  Clock,
  UserCheck
} from "lucide-react";
import { Toaster, toast } from "sonner";

const Community = () => {
  const { user } = useAuth();
  const [communityUsers, setCommunityUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingShared, setPendingShared] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [usersRes, connsRes, notifsRes, sharedRes] = await Promise.all([
        axios.get(`${API}/community/users`, { withCredentials: true }),
        axios.get(`${API}/connections`, { withCredentials: true }),
        axios.get(`${API}/notifications`, { withCredentials: true }),
        axios.get(`${API}/transactions/shared`, { withCredentials: true })
      ]);
      setCommunityUsers(usersRes.data);
      setConnections(connsRes.data);
      setNotifications(notifsRes.data);
      setPendingShared(sharedRes.data);
    } catch (error) {
      console.error("Error fetching community data:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (toUserId) => {
    try {
      await axios.post(`${API}/connections/request`, { to_user_id: toUserId }, { withCredentials: true });
      toast.success("Solicitud enviada");
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al enviar solicitud");
    }
  };

  const acceptConnection = async (connId) => {
    try {
      await axios.put(`${API}/connections/${connId}/accept`, {}, { withCredentials: true });
      toast.success("Conexion aceptada");
      fetchAll();
    } catch (error) {
      toast.error("Error al aceptar conexion");
    }
  };

  const rejectConnection = async (connId) => {
    try {
      await axios.put(`${API}/connections/${connId}/reject`, {}, { withCredentials: true });
      toast.success("Solicitud rechazada");
      fetchAll();
    } catch (error) {
      toast.error("Error al rechazar solicitud");
    }
  };

  const acceptSharedTxn = async (sharedId) => {
    try {
      await axios.put(`${API}/transactions/shared/${sharedId}/accept`, {}, { withCredentials: true });
      toast.success("Transaccion aceptada");
      fetchAll();
    } catch (error) {
      toast.error("Error al aceptar transaccion");
    }
  };

  const rejectSharedTxn = async (sharedId) => {
    try {
      await axios.put(`${API}/transactions/shared/${sharedId}/reject`, {}, { withCredentials: true });
      toast.success("Transaccion rechazada");
      fetchAll();
    } catch (error) {
      toast.error("Error al rechazar transaccion");
    }
  };

  const markRead = async () => {
    try {
      await axios.put(`${API}/notifications/read`, {}, { withCredentials: true });
      fetchAll();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  };

  const filteredUsers = communityUsers.filter(u =>
    (u.is_public || u.connection_status === "accepted") &&
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = communityUsers.filter(u => 
    u.connection_status === "pending" && u.connection_initiated_by !== user?.user_id
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-[#D4AF37]">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="community-page">
      <Toaster position="top-right" richColors />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          <span className="gold-text">Comunidad</span>
        </h1>
        <p className="text-gray-400 mt-1">Conecta con otros usuarios y comparte gastos</p>
      </div>

      <Tabs defaultValue="users" onValueChange={(tab) => { if (tab === "notifications" && unreadCount > 0) markRead(); }}>
        <TabsList className="bg-[#1a2332] border border-[#2a3444]">
          <TabsTrigger value="users" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d]">
            <Users className="w-4 h-4 mr-1" /> Usuarios
          </TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d]">
            <UserCheck className="w-4 h-4 mr-1" /> Conexiones ({connections.length})
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d] relative">
            <Bell className="w-4 h-4 mr-1" /> Notificaciones
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="shared" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#141b2d]">
            <ArrowLeftRight className="w-4 h-4 mr-1" /> Compartidos ({pendingShared.length})
          </TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input placeholder="Buscar usuarios..." className="pl-10 bg-[#1a2332] border-[#2a3444] text-white"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="user-search" />
          </div>

          {pendingRequests.length > 0 && (
            <Card className="bg-[#D4AF37]/5 border-[#D4AF37]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#D4AF37]">Solicitudes pendientes ({pendingRequests.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingRequests.map(u => (
                  <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-[#1a2332] border border-[#2a3444]">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.picture} />
                      <AvatarFallback className="bg-[#D4AF37]/20 text-[#D4AF37]">{u.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name}</p>
                    </div>
                    <Button size="sm" className="btn-gold" onClick={() => acceptConnection(u.connection_id)} data-testid={`accept-conn-${u.user_id}`}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-400" onClick={() => rejectConnection(u.connection_id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {filteredUsers.length > 0 ? filteredUsers.map(u => (
              <div key={u.user_id} className="flex items-center gap-3 p-4 rounded-lg bg-[#1a2332] border border-[#2a3444]"
                data-testid={`user-card-${u.user_id}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.picture} />
                  <AvatarFallback className="bg-[#D4AF37]/20 text-[#D4AF37]">{u.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{u.name}</p>
                </div>
                {u.connection_status === "accepted" ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400">Conectado</span>
                ) : u.connection_status === "pending" && u.connection_initiated_by === user?.user_id ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pendiente
                  </span>
                ) : u.connection_status !== "pending" ? (
                  <Button size="sm" variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    onClick={() => sendRequest(u.user_id)} data-testid={`connect-${u.user_id}`}>
                    <UserPlus className="w-4 h-4 mr-1" /> Conectar
                  </Button>
                ) : null}
              </div>
            )) : (
              <div className="py-8 text-center">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-600" />
                <p className="text-gray-500">No se encontraron usuarios</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* CONNECTIONS TAB */}
        <TabsContent value="connections" className="space-y-4 mt-4">
          {connections.length > 0 ? connections.map(friend => (
            <div key={friend.user_id} className="flex items-center gap-3 p-4 rounded-lg bg-[#1a2332] border border-[#2a3444]"
              data-testid={`friend-${friend.user_id}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={friend.picture} />
                <AvatarFallback className="bg-[#D4AF37]/20 text-[#D4AF37]">{friend.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{friend.name}</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400">Conectado</span>
            </div>
          )) : (
            <div className="py-8 text-center">
              <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-600" />
              <p className="text-gray-500">No tienes conexiones aun</p>
              <p className="text-xs text-gray-600 mt-1">Busca usuarios y enviales una solicitud</p>
            </div>
          )}
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" className="border-[#2a3444] text-gray-400"
              onClick={markRead} data-testid="mark-read-btn">
              Marcar todas como leidas
            </Button>
          )}
          {notifications.length > 0 ? notifications.map(n => (
            <div key={n.notification_id} className={`p-4 rounded-lg border ${
              n.read ? 'bg-[#1a2332] border-[#2a3444]' : 'bg-[#D4AF37]/5 border-[#D4AF37]/20'
            }`} data-testid={`notif-${n.notification_id}`}>
              <p className="text-sm text-white">{n.message}</p>
              <p className="text-xs text-gray-600 mt-1">
                {new Date(n.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )) : (
            <div className="py-8 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-600" />
              <p className="text-gray-500">No tienes notificaciones</p>
            </div>
          )}
        </TabsContent>

        {/* SHARED TRANSACTIONS TAB */}
        <TabsContent value="shared" className="space-y-4 mt-4">
          {pendingShared.length > 0 ? pendingShared.map(s => (
            <Card key={s.shared_id} className="bg-[#1a2332] border-[#2a3444]" data-testid={`shared-${s.shared_id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-400">{s.creator_name} quiere compartir:</p>
                    <p className="font-medium text-white mt-1">
                      {s.category} - {formatCurrency(s.total_amount)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Tu parte: {formatCurrency(s.friend_amount)} ({s.friend_percentage}%)
                    </p>
                    {s.description && <p className="text-xs text-gray-600 mt-1">{s.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="btn-gold" onClick={() => acceptSharedTxn(s.shared_id)}
                      data-testid={`accept-shared-${s.shared_id}`}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-400"
                      onClick={() => rejectSharedTxn(s.shared_id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="py-8 text-center">
              <ArrowLeftRight className="w-10 h-10 mx-auto mb-3 opacity-30 text-gray-600" />
              <p className="text-gray-500">No tienes transacciones compartidas pendientes</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Community;

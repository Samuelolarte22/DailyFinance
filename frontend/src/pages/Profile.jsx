import { useState, useEffect } from "react";
import { useAuth, API } from "../App";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { 
  User, 
  Mail, 
  LogOut,
  Shield,
  Calendar,
  Gift,
  Percent,
  Building2,
  Plus,
  X,
  Trash2,
  FileText,
  Upload,
  Download,
  Users
} from "lucide-react";
import { Toaster, toast } from "sonner";

const Profile = () => {
  const { user, logout } = useAuth();
  const [banks, setBanks] = useState([]);
  const [newBankName, setNewBankName] = useState("");
  const [showAddBank, setShowAddBank] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBanks();
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/documents`, { withCredentials: true });
      setDocuments(response.data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Archivo demasiado grande (max 5MB)");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(`${API}/documents/upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Documento subido");
      fetchDocuments();
    } catch (error) {
      toast.error("Error al subir documento");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await axios.get(`${API}/documents/${fileId}/download`, {
        withCredentials: true,
        responseType: "blob"
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Error al descargar documento");
    }
  };

  const handleDeleteDoc = async (fileId) => {
    try {
      await axios.delete(`${API}/documents/${fileId}`, { withCredentials: true });
      toast.success("Documento eliminado");
      fetchDocuments();
    } catch (error) {
      toast.error("Error al eliminar documento");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fetchBanks = async () => {
    try {
      const response = await axios.get(`${API}/banks`, { withCredentials: true });
      setBanks(response.data);
    } catch (error) {
      console.error("Error fetching banks:", error);
    }
  };

  const handleAddBank = async () => {
    if (!newBankName.trim()) return;
    try {
      await axios.post(`${API}/banks`, { name: newBankName.trim() }, { withCredentials: true });
      toast.success("Banco agregado");
      setNewBankName("");
      setShowAddBank(false);
      fetchBanks();
    } catch (error) {
      toast.error("Error al agregar banco");
    }
  };

  const handleDeleteBank = async (bankId) => {
    try {
      await axios.delete(`${API}/banks/${bankId}`, { withCredentials: true });
      toast.success("Banco eliminado");
      fetchBanks();
    } catch (error) {
      toast.error("Error al eliminar banco");
    }
  };

  const toggleVisibility = async () => {
    try {
      const res = await axios.put(`${API}/profile/visibility`, {}, { withCredentials: true });
      toast.success(res.data.is_public ? "Perfil ahora es publico" : "Perfil ahora es privado");
    } catch (error) {
      toast.error("Error al cambiar visibilidad");
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="profile-page">
      <Toaster position="top-right" richColors />
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          Mi <span className="gold-text">Perfil</span>
        </h1>
        <p className="text-gray-400 mt-1">
          Gestiona tu cuenta y preferencias
        </p>
      </div>

      {/* Profile Card */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="profile-card">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-24 h-24 border-2 border-[#D4AF37]">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-[#D4AF37] text-[#141b2d] text-2xl font-bold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                {user?.name}
              </h2>
              <p className="text-gray-400">{user?.email}</p>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#D4AF37]/10 text-[#D4AF37] text-sm font-medium border border-[#D4AF37]/30">
                  <Shield className="w-3 h-3" />
                  {user?.is_admin ? 'Administrador' : 'Usuario activo'}
                </span>
                <Button size="sm" variant="outline"
                  className={`rounded-md text-xs ${user?.is_public ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' : 'border-[#2a3444] text-gray-400 hover:bg-[#2a3444]'}`}
                  onClick={toggleVisibility} data-testid="toggle-visibility-btn">
                  <Users className="w-3 h-3 mr-1" />
                  {user?.is_public ? 'Perfil publico' : 'Perfil privado'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="bg-[#1a2332] border-[#2a3444]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              <User className="w-5 h-5 text-[#D4AF37]" />
              Información de cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-400">Correo</span>
              </div>
              <span className="text-sm font-medium text-white">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-400">Miembro desde</span>
              </div>
              <span className="text-sm font-medium text-white">
                {formatDate(user?.created_at)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-400">Perfil completado</span>
              </div>
              <span className={`text-sm font-medium ${user?.has_completed_survey ? 'text-green-400' : 'text-red-400'}`}>
                {user?.has_completed_survey ? 'Sí' : 'No'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-[#2a3444]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              <span className="text-[#D4AF37] text-xl font-bold">LD</span>
              Sobre LD Finance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30">
              <h4 className="font-medium mb-2 text-white">Tu asesor financiero personal</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                LD Finance te ayuda a organizar tus finanzas personales, 
                controlar tus gastos y alcanzar tus metas de ahorro de manera 
                simple y efectiva.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#141b2d] border border-[#2a3444]">
              <p className="text-sm text-gray-500">
                <strong className="text-gray-300">Funcionalidades:</strong> Control de ingresos y gastos por mes, 
                gestión de deudas, metas de ahorro, reportes detallados y 
                asesoría personalizada.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banks */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="banks-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Building2 className="w-5 h-5 text-[#D4AF37]" />
            Mis Bancos
          </CardTitle>
          <Button size="sm" variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
            onClick={() => setShowAddBank(!showAddBank)} data-testid="add-bank-btn">
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddBank && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20">
              <Input placeholder="Nombre del banco" className="flex-1 bg-[#141b2d] border-[#2a3444] text-white"
                value={newBankName} onChange={(e) => setNewBankName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddBank(); }}
                data-testid="bank-name-input" />
              <Button size="sm" className="btn-gold" onClick={handleAddBank} data-testid="save-bank-btn">Guardar</Button>
              <Button size="icon" variant="ghost" className="text-gray-500" onClick={() => setShowAddBank(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          {banks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {banks.map(bank => (
                <div key={bank.bank_id} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141b2d] border border-[#2a3444]">
                  <Building2 className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-white text-sm">{bank.name}</span>
                  <button onClick={() => handleDeleteBank(bank.bank_id)} className="text-gray-600 hover:text-red-400 ml-1"
                    data-testid={`delete-bank-${bank.bank_id}`}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No tienes bancos registrados. Agrega los bancos que usas para tus transacciones.</p>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="documents-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            <FileText className="w-5 h-5 text-[#D4AF37]" />
            Mis Documentos
          </CardTitle>
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={handleUpload}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt" />
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors"
              data-testid="upload-doc-btn">
              <Upload className="w-4 h-4" />
              {uploading ? "Subiendo..." : "Subir"}
            </div>
          </label>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length > 0 ? (
            documents.map(doc => (
              <div key={doc.file_id} className="flex items-center gap-3 p-3 rounded-lg bg-[#141b2d] border border-[#2a3444] group"
                data-testid={`doc-${doc.file_id}`}>
                <FileText className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{doc.original_filename}</p>
                  <p className="text-xs text-gray-600">{formatFileSize(doc.size)}</p>
                </div>
                <button onClick={() => handleDownload(doc.file_id, doc.original_filename)}
                  className="text-gray-500 hover:text-[#D4AF37] transition-colors"
                  data-testid={`download-doc-${doc.file_id}`}>
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteDoc(doc.file_id)}
                  className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  data-testid={`delete-doc-${doc.file_id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="py-6 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-600" />
              <p className="text-sm text-gray-600">No hay documentos subidos</p>
              <p className="text-xs text-gray-700 mt-1">Sube certificados y documentos importantes (max 5MB)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card className="bg-[#1a2332] border-[#D4AF37]/30" data-testid="benefits-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Gift className="w-5 h-5 text-[#D4AF37]" />
            Beneficios LD Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="font-medium text-white">10% de descuento</p>
              <p className="text-sm text-gray-400">en compras en Pagano bar & Bistro</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="font-medium text-white">10% de descuento</p>
              <p className="text-sm text-gray-400">en compras en Comercio 3 esencias</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="font-medium text-white">15% de descuento</p>
              <p className="text-sm text-gray-400">en Opticas Visoc</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="bg-[#1a2332] border-red-500/30">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-white">Cerrar sesión</h3>
              <p className="text-sm text-gray-500">
                Salir de tu cuenta de LD Finance
              </p>
            </div>
            <Button 
              variant="outline" 
              className="rounded-md border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;

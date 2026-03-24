import { useState, useEffect, useRef } from "react";
import { API } from "../App";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { MessageCircle, Send, CheckSquare, ListTodo } from "lucide-react";

const AdvisorChat = ({ selectedMonth }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTask, setIsTask] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    isInitialLoad.current = true;
    fetchMessages();
  }, [selectedMonth]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages?month=${selectedMonth}`, { withCredentials: true });
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await axios.post(`${API}/messages`, {
        content: newMessage,
        is_task: isTask,
        month: selectedMonth
      }, { withCredentials: true });
      setNewMessage("");
      setIsTask(false);
      fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const toggleComplete = async (messageId) => {
    try {
      await axios.put(`${API}/messages/${messageId}/complete`, {}, { withCredentials: true });
      fetchMessages();
    } catch (error) {
      console.error("Error toggling completion:", error);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="advisor-chat">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          <MessageCircle className="w-5 h-5 text-[#D4AF37]" />
          Chat con Asesor
        </CardTitle>
        <p className="text-xs text-gray-500">Mensajes y tareas del mes actual</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Messages area */}
        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1" data-testid="messages-list">
          {loading ? (
            <div className="text-center text-gray-500 py-4 animate-pulse">Cargando mensajes...</div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.message_id}
                className={`p-3 rounded-lg ${
                  msg.sender_role === 'admin' 
                    ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/20 ml-0 mr-4' 
                    : 'bg-[#141b2d] border border-[#2a3444] ml-4 mr-0'
                }`}
                data-testid={`message-${msg.message_id}`}
              >
                <div className="flex items-start gap-2">
                  {msg.is_task && (
                    <button onClick={() => toggleComplete(msg.message_id)} className="mt-0.5 shrink-0"
                      data-testid={`task-toggle-${msg.message_id}`}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        msg.is_completed 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-gray-500 hover:border-[#D4AF37]'
                      }`}>
                        {msg.is_completed && <CheckSquare className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        msg.sender_role === 'admin' ? 'text-[#D4AF37]' : 'text-gray-400'
                      }`}>
                        {msg.sender_role === 'admin' ? 'Asesor' : 'Tu'}
                      </span>
                      {msg.is_task && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37]">Tarea</span>
                      )}
                      <span className="text-[10px] text-gray-600">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className={`text-sm ${
                      msg.is_completed 
                        ? 'line-through text-gray-600' 
                        : 'text-gray-300'
                    }`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-600" />
              <p className="text-sm text-gray-600">No hay mensajes este mes</p>
              <p className="text-xs text-gray-700 mt-1">Escribe una pregunta para tu asesor financiero</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-[#2a3444]">
          <button type="button" onClick={() => setIsTask(!isTask)}
            className={`p-2 rounded-md transition-all shrink-0 ${
              isTask ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
            }`}
            title={isTask ? "Enviando como tarea" : "Enviar como tarea"}
            data-testid="toggle-task-btn">
            <ListTodo className="w-4 h-4" />
          </button>
          <Input placeholder={isTask ? "Escribe una tarea..." : "Escribe un mensaje..."}
            className="flex-1 bg-[#141b2d] border-[#2a3444] text-white text-sm"
            value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            data-testid="chat-input" />
          <Button type="submit" size="icon" className="btn-gold shrink-0" disabled={!newMessage.trim()}
            data-testid="send-message-btn">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdvisorChat;

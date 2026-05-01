import { useState, useRef, useEffect } from "react";
import { API } from "../App";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";

const AiFinancialChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `aichat_${Date.now()}`);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/ai/chat`, {
        message: userMsg,
        session_id: sessionId
      }, { withCredentials: true });

      setMessages(prev => [...prev, { role: "assistant", text: res.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", text: "Lo siento, hubo un error. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Cuanto he gastado este mes?",
    "En que categoria gasto mas?",
    "Como van mis ahorros?",
    "Que me recomiendas para ahorrar?"
  ];

  return (
    <Card className="bg-[#1a2332] border-[#2a3444]" data-testid="ai-financial-chat">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          LD Assist
        </CardTitle>
        <p className="text-xs text-gray-500">Tu asistente financiero personal</p>
      </CardHeader>
      <CardContent>
        <div className="h-80 overflow-y-auto mb-3 space-y-3 pr-1 scrollbar-thin" data-testid="ai-chat-messages">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-10 h-10 text-[#D4AF37]/30 mb-3" />
              <p className="text-sm text-gray-500 mb-3">Haz una pregunta sobre tus finanzas</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {suggestions.map((s, i) => (
                  <button key={i} type="button"
                    onClick={() => { setInput(s); }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors border border-[#D4AF37]/20"
                    data-testid={`ai-suggestion-${i}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-[#D4AF37] text-[#141b2d] rounded-br-sm"
                  : "bg-[#141b2d] border border-[#2a3444] text-gray-200 rounded-bl-sm"
              }`}>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.text}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#141b2d] border border-[#2a3444] rounded-xl px-4 py-3 rounded-bl-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Pregunta algo..."
            className="bg-[#141b2d] border-[#2a3444] text-white text-sm"
            disabled={loading}
            data-testid="ai-chat-input"
          />
          <Button type="button" size="icon" className="btn-gold shrink-0" onClick={sendMessage} disabled={loading || !input.trim()}
            data-testid="ai-chat-send">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiFinancialChat;

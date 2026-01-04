import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  MessageSquare, Send, Bot, User, BookOpen, 
  AlertTriangle, FileText, Sparkles, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const suggestedQueries = [
  "Show me all current PCI DSS gaps",
  "What GDPR obligations relate to our customer email campaigns?",
  "Generate an audit-ready report for Q4",
  "What are the top compliance risks right now?",
  "Explain the latest regulatory changes"
];

const Assistant = () => {
  const { api, user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI compliance assistant. I can help you with:

• **Regulatory Questions**: Ask about PCI DSS, GDPR, CCPA, LGPD, or AML/KYC requirements
• **Gap Analysis**: Identify compliance gaps in your controls
• **Audit Preparation**: Generate evidence and reports
• **Risk Assessment**: Understand your current risk posture

How can I assist you today?`,
      timestamp: new Date().toISOString(),
      sources: [],
      actions: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (query = input) => {
    if (!query.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api().post('/chat', { 
        message: query,
        context: `User: ${user?.name}, Role: ${user?.role}`
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        sources: response.data.sources || [],
        actions: response.data.suggested_actions || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try again or check if the LLM service is configured correctly.",
        timestamp: new Date().toISOString(),
        sources: [],
        actions: ['Check system status', 'Try again']
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Assistant</h1>
          <p className="text-muted-foreground">AI-powered regulatory guidance and analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Gemini AI Online</span>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area */}
        <Card className="flex-1 flex flex-col bg-card border-border/50" data-testid="chat-card">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20 glow-accent">
                <Bot className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Assistant</CardTitle>
                <CardDescription>Powered by Gemini 3 Flash</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="p-2 rounded-lg bg-accent/20 h-fit">
                        <Bot className="h-4 w-4 text-accent" />
                      </div>
                    )}
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <div 
                        className={`p-4 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted/50 border border-border/50'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      {/* Sources */}
                      {message.sources?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.sources.map((source, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {source.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Suggested Actions */}
                      {message.actions?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.actions.map((action, i) => (
                            <Button 
                              key={i} 
                              variant="outline" 
                              size="sm"
                              className="text-xs"
                              onClick={() => handleSend(action)}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {action}
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="p-2 rounded-lg bg-primary/20 h-fit">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="p-2 rounded-lg bg-accent/20">
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
          
          <CardContent className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about compliance requirements, controls, or risks..."
                className="flex-1"
                disabled={loading}
                data-testid="chat-input"
              />
              <Button 
                onClick={() => handleSend()} 
                disabled={loading || !input.trim()}
                data-testid="send-message-btn"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="w-80 space-y-4 hidden lg:block">
          {/* Suggested Queries */}
          <Card className="bg-card border-border/50" data-testid="suggested-queries-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Suggested Queries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQueries.map((query, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left text-xs h-auto py-2"
                  onClick={() => handleSend(query)}
                  disabled={loading}
                >
                  <Sparkles className="h-3 w-3 mr-2 shrink-0" />
                  <span className="line-clamp-2">{query}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card border-border/50" data-testid="quick-actions-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleSend("Start a new gap analysis for PCI DSS v4.0")}
                disabled={loading}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Run Gap Analysis
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleSend("Compile audit evidence for last quarter")}
                disabled={loading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Evidence
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleSend("What are the critical compliance risks right now?")}
                disabled={loading}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Risk Summary
              </Button>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Capabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>• Search regulatory requirements</p>
              <p>• Analyze control effectiveness</p>
              <p>• Generate compliance reports</p>
              <p>• Trigger agent tasks</p>
              <p>• Answer policy questions</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Assistant;

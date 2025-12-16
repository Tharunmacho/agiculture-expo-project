import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, User, Bot, Loader2, Sparkles, Lightbulb, Leaf, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import useVoiceCommands from '@/hooks/useVoiceCommands';
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SettingsComponent } from "@/components/Settings";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'image';
}

// Basic farming knowledge responses as fallback
const getBasicFarmingResponse = (question: string): string => {
  const q = question.toLowerCase();
  
  if (q.includes('rice') || q.includes('paddy')) {
    return '🌾 **Rice Cultivation Tips**\n\n• **Planting**: Best in monsoon season (June-July)\n• **Water**: Maintain 2-3 inches standing water\n• **Fertilizer**: Apply NPK 20:10:10 at tillering stage\n• **Harvest**: When 80% grains turn golden yellow (120-150 days)';
  }
  if (q.includes('wheat')) {
    return '🌾 **Wheat Growing Guide**\n\n• **Sowing**: November-December is ideal\n• **Irrigation**: At crown root, tillering, flowering, grain filling\n• **Fertilizer**: Nitrogen in 3 splits, Phosphorus at sowing\n• **Harvest**: When moisture content is 20-25% (March-April)';
  }
  if (q.includes('tomato')) {
    return '🍅 **Tomato Farming Basics**\n\n• **Seedlings**: Start 6-8 weeks before planting\n• **Support**: Use stakes or cages\n• **Watering**: Regular, avoid wetting leaves\n• **Common issues**: Blight, aphids - use neem spray preventively';
  }
  if (q.includes('fertilizer') || q.includes('npk')) {
    return '🧪 **Fertilizer Guide**\n\n• **N (Nitrogen)**: For leaf growth - urea, ammonium\n• **P (Phosphorus)**: For roots & flowers - DAP, SSP\n• **K (Potassium)**: For fruit quality - MOP\n• **Tip**: Soil test first, then apply based on crop needs';
  }
  if (q.includes('pest') || q.includes('insect')) {
    return '🐛 **Pest Management**\n\n• **Prevention**: Regular field inspection\n• **Organic**: Neem oil, garlic spray, beneficial insects\n• **Chemical**: Use only when necessary, follow label\n• **IPM**: Combine cultural, biological, chemical methods';
  }
  if (q.includes('soil')) {
    return '🌱 **Soil Health Management**\n\n• **Testing**: Get soil tested every 2-3 years\n• **Organic matter**: Add compost, green manure\n• **pH**: Most crops prefer 6.0-7.5\n• **Rotation**: Change crops to maintain soil fertility';
  }
  
  return '🌾 **General Farming Advice**\n\n• **Plan**: Consider climate, soil, water availability\n• **Prepare**: Good land preparation is key to success\n• **Monitor**: Regular field visits catch problems early\n• **Learn**: Attend training, talk to extension officers\n\n*Ask specific questions about crops, pests, fertilizers, or soil for detailed guidance!*';
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Voice commands hook
  const voiceCommands = useVoiceCommands({
    onTranscript: (transcript) => {
      setInputMessage(transcript);
    },
    onCommand: (command) => {
      if (command === 'action:help') {
        setInputMessage('What can you help me with?');
      }
    },
    continuous: false,
    language: profile?.preferred_language === 'hindi' ? 'hi-IN' : 'en-US'
  });

  // Initial welcome message
  useEffect(() => {
    const userName = profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : '';
    const locationInfo = profile?.district && profile?.state ? ` from ${profile.district}, ${profile.state}` : '';
    const cropInfo = profile?.crop_types?.length ? ` I see you grow ${profile.crop_types.join(', ')}.` : '';
    
    const welcomeMessage: Message = {
      id: '1',
      content: `🌱 Welcome to your **AI Farm Assistant**${userName}!${locationInfo ? ` I see you're${locationInfo}.` : ''}${cropInfo}

I'm your personalized agricultural assistant, ready to help with:

🌾 **Crop Management** - Planting, growing, and harvesting advice specific to your ${profile?.crop_types?.join(', ') || 'crops'}
🦠 **Disease & Pest Control** - Identify and treat plant issues in your ${profile?.region_type || 'region'}
🌡️ **Weather & Climate** - Local seasonal planning and adaptation
🌿 **Sustainable Practices** - Eco-friendly farming methods for ${profile?.soil_type || 'your soil type'}
💰 **Market Insights** - Current pricing and market trends

I can provide advice specific to your location, crops, and farming conditions. What agricultural challenge can I help you solve today?`,
      sender: 'bot',
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
  }, [profile]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Create a unique loading message ID
    const loadingId = `loading-${Date.now()}`;

    try {
      // Get API key and model from localStorage
      const openRouterKey = localStorage.getItem("openRouterKey");
      const selectedModel = localStorage.getItem("selectedModel") || "meta-llama/llama-3.2-3b-instruct:free";
      
      console.log('� Debug Info:', { 
        hasApiKey: !!openRouterKey, 
        apiKeyLength: openRouterKey?.length || 0,
        apiKeyPreview: openRouterKey ? openRouterKey.substring(0, 20) + '...' : 'null',
        model: selectedModel,
        messagePreview: currentMessage.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
      
      if (!openRouterKey || openRouterKey.trim() === "") {
        // Provide a helpful response even without API key
        const basicResponse = getBasicFarmingResponse(currentMessage);
        
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: basicResponse + "\n\n---\n\n🔑 **Want More Advanced AI Assistance?**\n\nConfigure your OpenRouter API key for enhanced responses:\n\n1. Click Settings (⚙️) in the chat header\n2. Enter your OpenRouter API key (free at openrouter.ai)\n3. Save and start getting AI-powered answers!",
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, responseMessage]);
        setIsLoading(false);
        return;
      }

      // Show enhanced loading state
      const loadingMessage: Message = {
        id: loadingId,
        content: '🤖 **Processing your request...**\n\n⚡ Connecting to AI farm expert\n🧠 Analyzing your agricultural question\n📊 Preparing comprehensive response',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, loadingMessage]);

      // Call OpenRouter API directly (bypass edge function issues)
      console.log('📡 Calling OpenRouter API directly...');
      console.log('🔑 Using API key:', openRouterKey?.substring(0, 30) + '...');
      console.log('🤖 Using model:', selectedModel);
      
      try {
        const requestBody = {
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: `You are an expert agricultural AI assistant helping farmers. Provide practical, actionable farming advice.
              
User Context: ${profile ? `Location: ${profile.district}, ${profile.state}. Crops: ${profile.crop_types?.join(', ')}. Soil: ${profile.soil_type}` : 'General farming advice'}

Guidelines:
- Give clear, step-by-step advice
- Use simple, farmer-friendly language
- Include specific measurements and timing
- Mention both organic and conventional options
- Focus on practical implementation`
            },
            {
              role: 'user',
              content: currentMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        };

        console.log('📤 Request payload prepared');

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'GrowSmart AI Assistant'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('📥 OpenRouter response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ OpenRouter API error response:', errorText);
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }
          
          console.error('❌ Parsed error:', errorData);
          
          // Provide specific error messages
          if (response.status === 401) {
            throw new Error('Invalid API key. Please check your OpenRouter API key in Settings.');
          } else if (response.status === 402) {
            throw new Error('Insufficient credits. Please add credits to your OpenRouter account or use a free model.');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
          } else {
            throw new Error(errorData?.error?.message || `API error: ${response.status} - ${errorText.substring(0, 100)}`);
          }
        }

        const data = await response.json();
        console.log('✅ OpenRouter response received:', { 
          hasChoices: !!data.choices,
          choicesLength: data.choices?.length,
          hasContent: !!data.choices?.[0]?.message?.content
        });
        
        // Debug: Log the full response structure
        console.log('📦 Full response:', JSON.stringify(data, null, 2));
        console.log('📦 First choice:', data.choices?.[0]);

        // Remove loading message
        setMessages(prev => prev.filter(msg => msg.id !== loadingId));

        // Try multiple possible response formats
        const aiResponse = data.choices?.[0]?.message?.content?.trim() ||
                          data.choices?.[0]?.text?.trim() ||
                          data.choices?.[0]?.message?.text?.trim();

        if (!aiResponse) {
          console.error('❌ No response content found. Full data:', data);
          console.error('❌ Available properties:', Object.keys(data.choices?.[0] || {}));
          throw new Error(`Model "${selectedModel}" returned empty response. Try "meta-llama/llama-3.2-3b-instruct:free" or "google/gemini-flash-1.5-8b" instead.`);
        }

        console.log('✅ AI response length:', aiResponse.length);

        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, botResponse]);
        
        toast({
          title: "✅ Response received!",
          description: "Got expert agricultural advice from AI assistant!",
        });

      } catch (apiError) {
        console.error('❌ Direct API call failed:', apiError);
        console.error('❌ Error details:', {
          name: apiError instanceof Error ? apiError.name : 'Unknown',
          message: apiError instanceof Error ? apiError.message : String(apiError),
          stack: apiError instanceof Error ? apiError.stack : 'No stack'
        });
        
        // Remove loading message
        setMessages(prev => prev.filter(msg => msg.id !== loadingId));
        
        // Throw error to be caught by outer try-catch for fallback handling
        throw apiError;
      }

    } catch (error) {
      console.error('💥 Critical chat error:', error);
      
      // Remove any loading messages
      setMessages(prev => prev.filter(msg => msg.id !== loadingId));
      
      // Provide fallback response with error info
      const basicResponse = getBasicFarmingResponse(currentMessage);
      
      // Determine error type for specific guidance
      let errorTitle = "Using Built-in Knowledge";
      let errorDescription = "AI service unavailable";
      let additionalInfo = "";

      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Failed to fetch')) {
          errorTitle = "⏱️ Connection Timeout";
          additionalInfo = "\n\n**Issue**: The AI service took too long to respond. Check your internet connection and try again.";
        } else if (error.message.includes('API key') || error.message.includes('401')) {
          errorTitle = "🔑 API Key Issue";
          additionalInfo = "\n\n**Issue**: API authentication failed. Please verify your API key in Settings.";
        } else if (error.message.includes('credits') || error.message.includes('402')) {
          errorTitle = "💳 Credits Needed";
          additionalInfo = "\n\n**Issue**: OpenRouter account needs credits. Add credits or switch to a free model.";
        } else {
          additionalInfo = "\n\n**Issue**: " + error.message;
        }
      }
      
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: basicResponse + additionalInfo + "\n\n---\n\n⚠️ **Note**: Advanced AI is temporarily unavailable. The response above is from our built-in farming knowledge.\n\n**To enable full AI:**\n1. Click Settings (⚙️) in chat header\n2. Enter your OpenRouter API key (free at openrouter.ai)\n3. Save and try again",
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      
      // Show brief notification
      toast({
        title: errorTitle,
        description: errorDescription,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    voiceCommands.toggleListening();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[700px] flex flex-col bg-gradient-to-br from-background via-background to-muted/20 rounded-xl border shadow-xl">
      {/* Enhanced Chat Header */}
      <div className="p-6 border-b bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 rounded-t-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              AI Farm Assistant Pro
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Leaf className="w-3 h-3" />
              Your intelligent agricultural companion
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Chat Settings</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto">
                  <SettingsComponent />
                </div>
              </DialogContent>
            </Dialog>
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              AI Ready
            </Badge>
          </div>
        </div>
      </div>

      {/* Enhanced Messages Area */}
      <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white ml-auto'
                    : 'bg-white border border-gray-100 shadow-md'
                }`}
              >
                <div className={`prose prose-sm max-w-none ${
                  message.sender === 'user' 
                    ? 'prose-invert text-white' 
                    : 'prose-slate'
                }`}>
                  <ReactMarkdown
                    components={{
                      // Enhanced paragraph rendering
                      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-sm">{children}</p>,
                      
                      // Enhanced text formatting
                      strong: ({ children }) => <strong className="font-bold text-emerald-700">{children}</strong>,
                      em: ({ children }) => <em className="italic text-emerald-600">{children}</em>,
                      
                      // Enhanced lists
                      ul: ({ children }) => <ul className="my-3 ml-4 space-y-2 list-disc marker:text-emerald-500">{children}</ul>,
                      ol: ({ children }) => <ol className="my-3 ml-4 space-y-2 list-decimal marker:text-emerald-500">{children}</ol>,
                      li: ({ children }) => <li className="text-sm leading-relaxed pl-2">{children}</li>,
                      
                      // Enhanced headings with icons
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold mb-3 text-emerald-800 border-b border-emerald-200 pb-2 flex items-center gap-2">
                          <span className="text-emerald-600">🌾</span>{children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-bold mb-3 text-emerald-700 flex items-center gap-2">
                          <span className="text-emerald-500">📋</span>{children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold mb-2 text-emerald-600 flex items-center gap-2">
                          <span className="text-emerald-400">▶</span>{children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-sm font-medium mb-2 text-gray-700 flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>{children}
                        </h4>
                      ),
                      
                      // Enhanced blockquotes
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-emerald-300 pl-4 py-2 my-3 bg-emerald-50 italic text-emerald-800 rounded-r-lg">
                          <span className="text-emerald-600 text-lg mr-2">💡</span>
                          {children}
                        </blockquote>
                      ),
                      
                      // COMPLETELY REDESIGNED TABLE RENDERING
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-6 rounded-lg border border-emerald-200 shadow-sm">
                          <table className="min-w-full bg-white">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                          {children}
                        </thead>
                      ),
                      th: ({ children }) => (
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider border-r border-emerald-400 last:border-r-0">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-6 py-4 text-sm text-gray-700 border-b border-gray-100 border-r border-gray-200 last:border-r-0">
                          {children}
                        </td>
                      ),
                      tr: ({ children }) => (
                        <tr className="hover:bg-emerald-50 transition-colors duration-150">
                          {children}
                        </tr>
                      ),
                      
                      // Enhanced code blocks
                      code: ({ children }) => (
                        <code className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-mono border">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-3 text-sm border border-gray-200">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <p className={`text-xs mt-2 ${
                  message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {message.sender === 'user' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-md">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span className="text-sm text-gray-600">Analyzing your question...</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ENHANCED FARMER-FRIENDLY INPUT AREA */}
      <div className="p-6 border-t bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 rounded-b-xl">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Textarea
              placeholder="🌾 Ask me anything about farming: diseases, planting, soil health, weather, market prices..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={3}
              className="min-h-[80px] resize-none rounded-xl border-2 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 text-base p-4 bg-white/80 backdrop-blur-sm"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-white/90 text-emerald-700 border-emerald-200">
                <Lightbulb className="w-3 h-3 mr-1" />
                Farmer Tips
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleVoiceInput}
              variant={voiceCommands.isListening ? "destructive" : "outline"}
              size="lg"
              disabled={isLoading || !voiceCommands.isSupported}
              className="h-[60px] w-[60px] rounded-xl shadow-sm border-2 border-emerald-200 hover:border-emerald-300"
              title={voiceCommands.isSupported ? "🎤 Speak your farming question" : "Voice input not supported"}
            >
              {voiceCommands.isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            {voiceCommands.isListening && (
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            )}
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="lg"
              className="h-[60px] w-[60px] rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg border-0 disabled:opacity-50"
              title="🚀 Send your farming question"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
        
        {/* FARMER-FRIENDLY QUICK TIPS */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge 
            variant="secondary" 
            className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-emerald-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("What crops grow best in my soil type?")}
          >
            🌱 Crop Selection
          </Badge>
          <Badge 
            variant="secondary" 
            className="text-xs bg-blue-100 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("How do I identify plant diseases?")}
            style={{ animationDelay: '0.1s' }}
          >
            🦠 Disease Help
          </Badge>
          <Badge 
            variant="secondary" 
            className="text-xs bg-orange-100 text-orange-700 border-orange-200 cursor-pointer hover:bg-orange-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("What are current market prices?")}
            style={{ animationDelay: '0.2s' }}
          >
            💰 Market Prices
          </Badge>
          <Badge 
            variant="secondary" 
            className="text-xs bg-purple-100 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("Weather forecast for farming")}
            style={{ animationDelay: '0.3s' }}
          >
            🌤️ Weather Info
          </Badge>
          <Badge 
            variant="secondary" 
            className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200 cursor-pointer hover:bg-yellow-200 transition-colors animate-fade-in"
            onClick={() => setInputMessage("Best fertilizers for my crops")}
            style={{ animationDelay: '0.4s' }}
          >
            🌿 Fertilizers
          </Badge>
        </div>
        
        {/* HELPFUL INSTRUCTIONS */}
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Press Enter to send
            </span>
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3" />
              Voice input available
            </span>
          </span>
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            AI Model: {localStorage.getItem("selectedModel")?.split("/")[1]?.split(":")[0] || "deepseek"}
          </span>
        </div>
      </div>
    </div>
  );
}
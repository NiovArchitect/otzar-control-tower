import { useState } from "react"
import { Bot, MessageSquare, X, Send, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  suggestions?: string[]
}

const mockMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Good morning! I'm your Admin AI Assistant. I've noticed 3 urgent notifications requiring your attention. Would you like me to prioritize them for you?",
    timestamp: "9:14 AM",
    suggestions: ["Show priority notifications", "Review team performance", "Check system health"]
  }
]

export function AdminAIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = getAIResponse(inputValue)
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  const getAIResponse = (userInput: string): Message => {
    const input = userInput.toLowerCase()
    
    if (input.includes("notification") || input.includes("alert")) {
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: "I've analyzed your current notifications. The Finance security alert is most critical - unusual AI access patterns suggest potential data breach. I recommend immediate action. Would you like me to create an incident response plan?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ["Create incident plan", "Review Finance AI logs", "Notify security team"]
      }
    }
    
    if (input.includes("team") || input.includes("performance")) {
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: "Team performance summary: Sales AI teammates are 23% above productivity baseline this quarter. Marketing AI is requesting cross-division data access for Q1 campaigns. HR onboarding automation reduced new hire setup time by 40%. Any specific team you'd like me to analyze?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ["Sales team details", "Marketing AI request", "HR automation metrics"]
      }
    }
    
    if (input.includes("system") || input.includes("health")) {
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: "System health is optimal. Current status: 99.7% uptime, 2.3ms average response time, 15 active AI teammates across all divisions. Recent permission matrix update completed successfully. No infrastructure concerns detected.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ["View detailed metrics", "Check AI teammate status", "Review recent updates"]
      }
    }
    
    return {
      id: Date.now().toString(),
      role: "assistant", 
      content: "I understand you're asking about: \"" + userInput + "\". As your Admin AI, I can help with notifications, team management, system monitoring, security alerts, and strategic insights. What specific area would you like assistance with?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: ["Show urgent tasks", "Analyze team metrics", "Review security status"]
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
        <Badge className="absolute -top-1 -left-1 bg-blue-500 text-white animate-pulse">
          AI
        </Badge>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={`shadow-xl transition-all duration-200 ${isMinimized ? 'w-80 h-16' : 'w-96 h-[32rem]'}`}>
        <CardHeader className="pb-3 bg-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <CardTitle className="text-sm">Admin AI Assistant</CardTitle>
              <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                Online
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 hover:bg-white/20 text-white"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 hover:bg-white/20 text-white"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-full">
            <ScrollArea className="flex-1 p-4 h-80">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={message.role === 'user' ? 'bg-primary text-white' : 'bg-muted'}>
                          {message.role === 'user' ? 'A' : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-foreground'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
                        
                        {message.suggestions && message.role === 'assistant' && (
                          <div className="mt-3 space-y-1">
                            {message.suggestions.map((suggestion, index) => (
                              <Button
                                key={index}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="h-6 text-xs justify-start w-full hover:bg-white/20"
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex space-x-2 max-w-[80%]">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-muted">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-lg p-3 bg-muted">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask your AI assistant..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
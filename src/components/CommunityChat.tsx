import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Users, MessageCircle, Smile, Plus, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  crop_type: string | null;
  region: string | null;
  member_count: number;
  is_active: boolean;
  created_at: string;
}

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: string;
  reply_to_id: string | null;
  is_edited: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
}

interface OnlineUser {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  status_message: string | null;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
}

export const CommunityChat: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    if (user) {
      loadChatRooms();
      updateOnlineStatus(true);
      loadOnlineUsers();
    }

    return () => {
      if (user) {
        updateOnlineStatus(false);
      }
    };
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
      joinRoom(selectedRoom);
      setupRealTimeSubscription(selectedRoom);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChatRooms(data || []);
      
      // Auto-select first room
      if (data && data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0].id);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load chat rooms",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      // First get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messagesError) throw messagesError;

      // Then get profiles for all unique user_ids
      const userIds = [...new Set(messagesData?.map(m => m.user_id) || [])];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', userIds);
        
        if (!profilesError) {
          profilesData = profiles || [];
        }
      }

      // Combine messages with profiles
      const messagesWithProfiles = messagesData?.map(message => ({
        ...message,
        profiles: profilesData.find(p => p.user_id === message.user_id) || null
      })) || [];

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      // First get online status
      const { data: statusData, error: statusError } = await supabase
        .from('user_online_status')
        .select('*')
        .eq('is_online', true);

      if (statusError) throw statusError;

      // Then get profiles for online users
      const userIds = statusData?.map(s => s.user_id) || [];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', userIds);
        
        if (!profilesError) {
          profilesData = profiles || [];
        }
      }

      // Combine status with profiles
      const usersWithProfiles = statusData?.map(status => ({
        ...status,
        profiles: profilesData.find(p => p.user_id === status.user_id) || null
      })) || [];

      setOnlineUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  };

  const joinRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('chat_room_members')
        .upsert({
          room_id: roomId,
          user_id: user?.id,
          last_read_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user?.id) return;

    try {
      await supabase.rpc('update_user_online_status', {
        p_user_id: user.id,
        p_is_online: isOnline,
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const setupRealTimeSubscription = (roomId: string) => {
    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          
          // Fetch profile data for the new message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('user_id', newMessage.user_id)
            .maybeSingle();

          const messageWithProfile = {
            ...newMessage,
            profiles: profileData,
          };

          setMessages((prev) => [...prev, messageWithProfile]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !user?.id) return;

    setIsLoading(true);
    try {
      const messageData = {
        room_id: selectedRoom,
        user_id: user.id,
        content: newMessage,
        message_type: 'text',
        reply_to_id: replyToMessage?.id || null,
      };

      const { error } = await supabase
        .from('chat_room_messages')
        .insert(messageData);

      if (error) throw error;

      setNewMessage('');
      setReplyToMessage(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'expert': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'admin': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      default: return 'bg-gradient-to-r from-green-500 to-emerald-500';
    }
  };

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Community Live Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row h-[600px]">
          {/* Chat Rooms Sidebar */}
          <div className="lg:w-1/4 border-r border-border/50">
            <div className="p-4 border-b border-border/50">
              <h3 className="flex items-center gap-2 font-semibold">
                <Hash className="h-4 w-4" />
                Chat Rooms
              </h3>
            </div>
            <ScrollArea className="h-[calc(600px-60px)]">
              <div className="p-3 space-y-2">
                {chatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                      selectedRoom === room.id ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{room.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {room.member_count}
                      </Badge>
                    </div>
                    {room.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {room.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Messages */}
          <div className="lg:w-1/2 flex flex-col">
            <div className="p-4 border-b border-border/50">
              <h3 className="flex items-center gap-2 font-semibold">
                <MessageCircle className="h-4 w-4" />
                {chatRooms.find(room => room.id === selectedRoom)?.name || 'Select a Room'}
              </h3>
            </div>
            <div className="flex-1 flex flex-col">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-3">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-3 group">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={getRoleColor(message.profiles?.role || null)}>
                        {message.profiles?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.profiles?.full_name || 'Unknown User'}
                        </span>
                        {message.profiles?.role && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {message.profiles.role}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      {message.reply_to_id && (
                        <div className="bg-muted p-2 rounded text-xs mb-2 border-l-2 border-primary">
                          Replying to message...
                        </div>
                      )}
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">
                        {message.content}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setReplyToMessage(message)}
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              </ScrollArea>

              {/* Reply Indicator */}
              {replyToMessage && (
                <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Replying to {replyToMessage.profiles?.full_name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyToMessage(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={isLoading || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Online Users Sidebar */}
          <div className="lg:w-1/4 flex flex-col">
            <div className="p-4 border-b border-border/50">
              <h3 className="flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4" />
                Online ({onlineUsers.length})
              </h3>
            </div>
            <ScrollArea className="h-[calc(600px-60px)]">
              <div className="p-3 space-y-3">
                {onlineUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={getRoleColor(user.profiles?.role || null)}>
                          {user.profiles?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {user.profiles?.full_name || 'Unknown User'}
                      </div>
                      {user.profiles?.role && (
                        <Badge variant="outline" className="text-xs mt-1 capitalize">
                          {user.profiles.role}
                        </Badge>
                      )}
                      {user.status_message && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {user.status_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {onlineUsers.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No users online
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
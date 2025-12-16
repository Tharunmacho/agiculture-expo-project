import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Hash, 
  Plus, 
  Search, 
  Users, 
  Settings,
  Volume2,
  VolumeX,
  Pin,
  Crop,
  MapPin
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  crop_type: string | null;
  region: string | null;
  member_count: number;
  is_active: boolean;
  is_private?: boolean; // Optional since it may not exist in DB yet
  created_at: string;
  unread_count?: number;
  last_message?: {
    content: string;
    created_at: string;
    user_name: string;
  };
}

interface OnlineUser {
  user_id: string;
  is_online: boolean;
  status_message: string | null;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
}

interface EnhancedChatSidebarProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoomId?: string;
}

export const EnhancedChatSidebar: React.FC<EnhancedChatSidebarProps> = ({
  onRoomSelect,
  selectedRoomId
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  // Create room form state
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomType, setNewRoomType] = useState('general');
  const [newRoomCropType, setNewRoomCropType] = useState('');
  const [newRoomRegion, setNewRoomRegion] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (user) {
      loadChatRooms();
      loadOnlineUsers();
      setupRealTimeUpdates();
    }
  }, [user]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          description,
          room_type,
          crop_type,
          region,
          member_count,
          is_active,
          created_at,
          updated_at,
          created_by,
          chat_room_members!inner(user_id)
        `)
        .eq('is_active', true)
        .eq('chat_room_members.user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get last messages and unread counts for each room
      const roomsWithMetadata = await Promise.all(
        (data || []).map(async (room) => {
          // Get last message with user info separately
          const { data: lastMessage } = await supabase
            .from('chat_room_messages')
            .select('content, created_at, user_id')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let lastMessageWithUser = null;
          if (lastMessage) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', lastMessage.user_id)
              .single();
            
            lastMessageWithUser = {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              user_name: userProfile?.full_name || 'Unknown'
            };
          }

          // Get unread count (simplified - would need proper read tracking)
          const { count: unreadCount } = await supabase
            .from('chat_room_messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

          return {
            ...room,
            is_private: false, // Default since DB column doesn't exist yet
            last_message: lastMessageWithUser,
            unread_count: unreadCount || 0
          };
        })
      );

      setChatRooms(roomsWithMetadata);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      // Get online status and profiles separately
      const { data: statusData, error } = await supabase
        .from('user_online_status')
        .select('user_id, is_online, status_message')
        .eq('is_online', true)
        .limit(20);

      if (error) throw error;

      // Get profiles for online users
      const userIds = statusData?.map(s => s.user_id) || [];
      let usersWithProfiles: OnlineUser[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', userIds);

        usersWithProfiles = statusData?.map(status => ({
          ...status,
          profiles: profiles?.find(p => p.user_id === status.user_id) || null
        })) || [];
      }

      setOnlineUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  };

  const setupRealTimeUpdates = () => {
    // Listen for new messages to update room previews
    const messagesChannel = supabase
      .channel('chat_messages_sidebar')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_room_messages'
        },
        () => {
          loadChatRooms(); // Reload to get updated last messages
        }
      )
      .subscribe();

    // Listen for online status changes
    const statusChannel = supabase
      .channel('user_status_sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_online_status'
        },
        () => {
          loadOnlineUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(statusChannel);
    };
  };

  const createChatRoom = async () => {
    if (!newRoomName.trim() || !user) return;

    try {
      // Create the room
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name: newRoomName.trim(),
          description: newRoomDescription.trim() || null,
          room_type: newRoomType,
          crop_type: newRoomCropType || null,
          region: newRoomRegion || null,
          created_by: user.id,
          member_count: 1,
          is_active: true
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from('chat_room_members')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // Reset form
      setNewRoomName('');
      setNewRoomDescription('');
      setNewRoomType('general');
      setNewRoomCropType('');
      setNewRoomRegion('');
      setIsPrivate(false);
      setShowCreateDialog(false);

      // Reload rooms and select the new one
      await loadChatRooms();
      onRoomSelect(roomData.id);

      toast({
        title: "Success",
        description: "Chat room created successfully",
      });
    } catch (error) {
      console.error('Error creating chat room:', error);
      toast({
        title: "Error",
        description: "Failed to create chat room",
        variant: "destructive",
      });
    }
  };

  const filteredRooms = chatRooms.filter(room => {
    const matchesSearch = searchQuery === '' || 
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'all' || room.room_type === filterType;

    return matchesSearch && matchesType;
  });

  const getRoomIcon = (roomType: string) => {
    switch (roomType) {
      case 'crop_specific':
        return <Crop className="h-4 w-4" />;
      case 'regional':
        return <MapPin className="h-4 w-4" />;
      case 'expert':
        return <Users className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Live Chat
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Create room">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Chat Room</DialogTitle>
                  <DialogDescription>
                    Create a new chat room for community discussions
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Room Name</label>
                    <Input
                      placeholder="e.g., Rice Farmers Support"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Describe what this room is for..."
                      value={newRoomDescription}
                      onChange={(e) => setNewRoomDescription(e.target.value)}
                      className="h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select value={newRoomType} onValueChange={setNewRoomType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Discussion</SelectItem>
                          <SelectItem value="crop_specific">Crop Specific</SelectItem>
                          <SelectItem value="regional">Regional</SelectItem>
                          <SelectItem value="expert">Expert Q&A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newRoomType === 'crop_specific' && (
                      <div>
                        <label className="text-sm font-medium">Crop Type</label>
                        <Input
                          placeholder="e.g., Rice, Wheat"
                          value={newRoomCropType}
                          onChange={(e) => setNewRoomCropType(e.target.value)}
                        />
                      </div>
                    )}

                    {newRoomType === 'regional' && (
                      <div>
                        <label className="text-sm font-medium">Region</label>
                        <Input
                          placeholder="e.g., Punjab, Gujarat"
                          value={newRoomRegion}
                          onChange={(e) => setNewRoomRegion(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createChatRoom}
                      disabled={!newRoomName.trim()}
                    >
                      Create Room
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="crop_specific">Crop Specific</SelectItem>
              <SelectItem value="regional">Regional</SelectItem>
              <SelectItem value="expert">Expert Q&A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chat Rooms */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Loading rooms...
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? 'No rooms found' : 'No rooms available'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => onRoomSelect(room.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                      selectedRoomId === room.id ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-1">
                        {getRoomIcon(room.room_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {room.name}
                          </span>
                          <div className="flex items-center gap-1">
                            {room.unread_count > 0 && (
                              <Badge variant="destructive" className="text-xs h-5 min-w-5 px-1">
                                {room.unread_count > 99 ? '99+' : room.unread_count}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {room.member_count}
                            </Badge>
                          </div>
                        </div>
                        
                        {room.last_message && (
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground truncate flex-1">
                              <span className="font-medium">
                                {room.last_message.user_name}:
                              </span>{' '}
                              {room.last_message.content}
                            </p>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatLastMessageTime(room.last_message.created_at)}
                            </span>
                          </div>
                        )}
                        
                        {room.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {room.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1">
                          {room.crop_type && (
                            <Badge variant="outline" className="text-xs">
                              {room.crop_type}
                            </Badge>
                          )}
                          {room.region && (
                            <Badge variant="outline" className="text-xs">
                              {room.region}
                            </Badge>
                          )}
                          {/* Private badge hidden for now since column doesn't exist */}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Online Users */}
      <div className="border-t p-3">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Online ({onlineUsers.length})
        </h4>
        <ScrollArea className="h-32">
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div key={user.user_id} className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user.profiles?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {user.profiles?.full_name || 'Unknown User'}
                  </div>
                  {user.status_message && (
                    <div className="text-xs text-muted-foreground truncate">
                      {user.status_message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
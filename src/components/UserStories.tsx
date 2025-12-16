import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Eye, Camera, Type, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Story {
  id: string;
  user_id: string;
  content_type: string;
  text_content: string | null;
  image_url: string | null;
  background_color: string | null;
  view_count: number;
  created_at: string;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
}

export const UserStories: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [newStory, setNewStory] = useState({
    content_type: 'text',
    text_content: '',
    background_color: '#4F46E5',
  });

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      // First get stories
      const { data: storiesData, error: storiesError } = await supabase
        .from('user_stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;

      // Then get profiles for story users
      const userIds = [...new Set(storiesData?.map(s => s.user_id) || [])];
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

      // Combine stories with profiles
      const storiesWithProfiles = storiesData?.map(story => ({
        ...story,
        profiles: profilesData.find(p => p.user_id === story.user_id) || null
      })) || [];

      setStories(storiesWithProfiles);
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const createStory = async () => {
    if (!user?.id || !newStory.text_content.trim()) return;

    try {
      const { error } = await supabase
        .from('user_stories')
        .insert({
          user_id: user.id,
          content_type: newStory.content_type,
          text_content: newStory.text_content,
          background_color: newStory.background_color,
        });

      if (error) throw error;

      toast({
        title: "Story Created!",
        description: "Your story has been shared with the community",
      });

      setIsCreateOpen(false);
      setNewStory({
        content_type: 'text',
        text_content: '',
        background_color: '#4F46E5',
      });
      loadStories();
    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        title: "Error",
        description: "Failed to create story",
        variant: "destructive",
      });
    }
  };

  const viewStory = async (story: Story) => {
    setSelectedStory(story);
    
    // Record story view
    if (story.user_id !== user?.id) {
      try {
        await supabase
          .from('story_views')
          .insert({
            story_id: story.id,
            viewer_id: user?.id,
          });
      } catch (error) {
        console.error('Error recording story view:', error);
      }
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'expert': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'admin': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      default: return 'bg-gradient-to-r from-green-500 to-emerald-500';
    }
  };

  const backgroundColors = [
    '#4F46E5', '#7C3AED', '#DC2626', '#EA580C',
    '#CA8A04', '#16A34A', '#0891B2', '#C2410C'
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        {/* Create Story Button */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <div className="flex-shrink-0 cursor-pointer group">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-dashed border-primary/50 group-hover:border-primary transition-colors">
                  <AvatarFallback className="bg-muted">
                    <Plus className="h-6 w-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Plus className="h-3 w-3 text-white" />
                </div>
              </div>
              <p className="text-xs text-center mt-1 text-muted-foreground">Your Story</p>
            </div>
          </DialogTrigger>
          <DialogContent>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Create Your Story</h3>
              
              <div className="flex gap-2">
                <Button
                  variant={newStory.content_type === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewStory(prev => ({ ...prev, content_type: 'text' }))}
                >
                  <Type className="h-4 w-4 mr-2" />
                  Text
                </Button>
                <Button
                  variant={newStory.content_type === 'image' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewStory(prev => ({ ...prev, content_type: 'image' }))}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Image
                </Button>
              </div>

              {newStory.content_type === 'text' && (
                <>
                  <Textarea
                    placeholder="Share what's happening on your farm..."
                    value={newStory.text_content}
                    onChange={(e) => setNewStory(prev => ({ ...prev, text_content: e.target.value }))}
                    rows={4}
                  />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      <span className="text-sm font-medium">Background Color</span>
                    </div>
                    <div className="flex gap-2">
                      {backgroundColors.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newStory.background_color === color ? 'border-primary' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewStory(prev => ({ ...prev, background_color: color }))}
                        />
                      ))}
                    </div>
                  </div>

                  <div 
                    className="p-6 rounded-lg text-white text-center min-h-[200px] flex items-center justify-center"
                    style={{ backgroundColor: newStory.background_color }}
                  >
                    <p className="text-lg font-medium">
                      {newStory.text_content || "Your story preview..."}
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button onClick={createStory} disabled={!newStory.text_content.trim()}>
                  Share Story
                </Button>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stories List */}
        {stories.map((story) => (
          <div
            key={story.id}
            className="flex-shrink-0 cursor-pointer group"
            onClick={() => viewStory(story)}
          >
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-primary/50 group-hover:ring-primary transition-all">
                <AvatarFallback 
                  className={getRoleBadgeColor(story.profiles?.role || null)}
                  style={story.content_type === 'text' ? { backgroundColor: story.background_color || undefined } : {}}
                >
                  {story.profiles?.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background rounded-full flex items-center justify-center border">
                <Eye className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-center mt-1 text-muted-foreground truncate w-16">
              {story.profiles?.full_name?.split(' ')[0] || 'User'}
            </p>
          </div>
        ))}
      </div>

      {/* Story Viewer */}
      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md p-0 bg-black">
          {selectedStory && (
            <div className="relative">
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={getRoleBadgeColor(selectedStory.profiles?.role || null)}>
                      {selectedStory.profiles?.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {selectedStory.profiles?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-white/70 text-xs">
                      {formatDistanceToNow(new Date(selectedStory.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => setSelectedStory(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div 
                className="aspect-[9/16] flex items-center justify-center p-8 text-white"
                style={{ backgroundColor: selectedStory.background_color || '#000' }}
              >
                {selectedStory.content_type === 'text' && selectedStory.text_content && (
                  <p className="text-xl font-medium text-center leading-relaxed">
                    {selectedStory.text_content}
                  </p>
                )}
                {selectedStory.content_type === 'image' && selectedStory.image_url && (
                  <img 
                    src={selectedStory.image_url} 
                    alt="Story" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">{selectedStory.view_count} views</span>
                </div>
                {selectedStory.profiles?.role && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedStory.profiles.role}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
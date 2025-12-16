import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Users, Calendar, Video, Star, ThumbsUp, HelpCircle, CheckCircle, Bookmark, Plus, Search, Filter, Clock, Globe, TrendingUp, Award, Target, Zap, MessageCircle, Bot, Hash, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CommunityAIAssistant } from '@/components/CommunityAIAssistant';
import { PostDetailView } from '@/components/PostDetailView';
import { TrendingPosts } from '@/components/TrendingPosts';
import { SavedPostsDashboard } from '@/components/SavedPostsDashboard';
import { CommunityHighlights } from '@/components/CommunityHighlights';
import { UserFollowing } from '@/components/UserFollowing';
import { PostEditor } from '@/components/PostEditor';
import { EnhancedPostDetailView } from '@/components/EnhancedPostDetailView';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { CommunityChat } from '@/components/CommunityChat';
import { EnhancedPostCard } from '@/components/EnhancedPostCard';
import { UserStories } from '@/components/UserStories';
import { TrendingTopics } from '@/components/TrendingTopics';
import { EnhancedChatSidebar } from '@/components/EnhancedChatSidebar';
import { EnhancedCommentingSystem } from '@/components/EnhancedCommentingSystem';
import { NotificationCenter } from '@/components/NotificationCenter';
import { InfiniteScrollPosts } from '@/components/InfiniteScrollPosts';
import { UserActivityFeed } from '@/components/UserActivityFeed';
import { TrendingHashtagsSidebar } from '@/components/TrendingHashtagsSidebar';
import { PostSharing } from '@/components/PostSharing';
import { UserProfileModal } from '@/components/UserProfileModal';
import { CommunityStatsSkeleton, PostListSkeleton, SidebarSkeleton, SpinnerLoader } from '@/components/LoadingStates';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  images: string[] | null;
  likes_count: number | null;
  comments_count: number | null;
  is_resolved: boolean | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
  reactions?: PostReaction[];
}

interface Expert {
  id: string;
  user_id: string;
  specialization: string;
  experience_years: number | null;
  rating: number | null;
  bio: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    role: string | null;
  };
}

interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

interface UserReputation {
  id: string;
  user_id: string;
  total_points: number;
  level: number;
  posts_count: number;
  helpful_answers: number;
  best_answers: number;
  created_at: string;
  updated_at: string;
}

interface CommunityGroup {
  id: string;
  name: string;
  description: string | null;
  crop_type: string | null;
  region: string | null;
  member_count: number;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  is_online: boolean;
  max_participants: number | null;
  current_participants: number;
  created_by: string;
  group_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [userReputation, setUserReputation] = useState<UserReputation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedChatRoom, setSelectedChatRoom] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMeetOpen, setIsMeetOpen] = useState(false);

  // Real-time updates
  useRealTimeUpdates({
    onPostUpdate: () => {
      setRefreshTrigger(prev => prev + 1);
      fetchCommunityData();
    },
    onCommentUpdate: () => {
      fetchCommunityData();
    },
    onReactionUpdate: () => {
      fetchCommunityData();
    }
  });

  const fetchCommunityData = async () => {
    try {
      setIsLoading(true);
      
      // Get posts with manual profile joining
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select(`
          *,
          post_reactions (
            id,
            post_id,
            user_id,
            reaction_type,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get profiles for posts
      let postsWithProfiles: any[] = [];
      if (postsData && postsData.length > 0) {
        const postUserIds = [...new Set(postsData.map(p => p.user_id))];
        const { data: postProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', postUserIds);

        postsWithProfiles = postsData.map(post => ({
          ...post,
          profiles: postProfiles?.find(p => p.user_id === post.user_id) || null,
          reactions: post.post_reactions || []
        }));
      }

      // Get experts with manual profile joining
      const { data: expertsData } = await supabase
        .from('expert_network')
        .select('*')
        .limit(10);

      let expertsWithProfiles: any[] = [];
      if (expertsData && expertsData.length > 0) {
        const expertUserIds = [...new Set(expertsData.map(e => e.user_id))];
        const { data: expertProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, role')
          .in('user_id', expertUserIds);

        expertsWithProfiles = expertsData.map(expert => ({
          ...expert,
          profiles: expertProfiles?.find(p => p.user_id === expert.user_id) || null
        }));
      }

      // Get other data
      const [groupsResponse, eventsResponse] = await Promise.all([
        supabase
          .from('community_groups')
          .select('*')
          .order('member_count', { ascending: false })
          .limit(10),
        
        supabase
          .from('community_events')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(10)
      ]);

      setPosts(postsWithProfiles);
      setExperts(expertsWithProfiles);
      if (groupsResponse.data) setGroups(groupsResponse.data);
      if (eventsResponse.data) setEvents(eventsResponse.data);

    } catch (error) {
      console.error('Error fetching community data:', error);
      toast({
        title: "Error",
        description: "Failed to load community data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeUserReputation = async () => {
    if (!user?.id) return;

    try {
      const { data: existingReputation } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingReputation) {
        const { data: newReputation, error } = await supabase
          .from('user_reputation')
          .insert({
            user_id: user.id,
            total_points: 0,
            level: 1,
            posts_count: 0,
            helpful_answers: 0,
            best_answers: 0,
          })
          .select()
          .single();

        if (error) throw error;
        setUserReputation(newReputation);
      } else {
        setUserReputation(existingReputation);
      }
    } catch (error) {
      console.error('Error initializing user reputation:', error);
    }
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!user?.id) return;

    try {
      const post = posts.find(p => p.id === postId);
      const existingReaction = post?.reactions?.find(
        r => r.user_id === user.id && r.reaction_type === reactionType
      );

      if (existingReaction) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          });
      }

      await fetchCommunityData();
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  const handleSavePost = async (postId: string) => {
    if (!user?.id) return;

    try {
      const { data: existingSave } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      if (existingSave) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('id', existingSave.id);
        
        toast({
          title: "Post unsaved",
          description: "Post removed from your saved list",
        });
      } else {
        await supabase
          .from('saved_posts')
          .insert({
            user_id: user.id,
            post_id: postId,
          });
        
        toast({
          title: "Post saved",
          description: "Post added to your saved list",
        });
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handlePostClick = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setSelectedPost(post);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleRefreshPosts = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchCommunityData();
  };

  useEffect(() => {
    if (user) {
      fetchCommunityData();
      initializeUserReputation();
    }
  }, [user, refreshTrigger]);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === '' || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      searchQuery.startsWith('#');

    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Join the Community</CardTitle>
            <CardDescription>
              Sign in to connect with fellow farmers and share knowledge
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              GrowSmart Community
            </h1>
            <SpinnerLoader message="Loading community..." size="lg" />
          </div>
          <CommunityStatsSkeleton />
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3">
              <PostListSkeleton />
            </div>
            <div className="space-y-6">
              <SidebarSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Community Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                GrowSmart Community
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
                Connect with fellow farmers, share knowledge, and grow together in our thriving agricultural community.
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <NotificationCenter />
            </div>
          </div>
          
          {/* User Stories and Meet button */}
          <div className="flex items-center justify-between gap-4">
            <UserStories />
            <Dialog open={isMeetOpen} onOpenChange={setIsMeetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0 gap-2">
                  <Video className="h-4 w-4" />
                  <span>Meet</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl w-full h-[80vh] p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-2">
                  <DialogTitle>Community Meet</DialogTitle>
                  <DialogDescription>
                    Join a live video meet with fellow GrowSmart community members.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 px-0 pb-0 h-full">
                  <iframe
                    src="https://open-meet.netlify.app/"
                    title="GrowSmart Community Meet"
                    className="w-full h-full rounded-b-lg border-t"
                    allow="camera; microphone; fullscreen; display-capture"
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Community Stats Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Your Reputation</p>
                  <p className="text-2xl font-bold text-primary">{userReputation?.total_points || 0}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Award className="h-3 w-3 text-primary" />
                    <span className="text-xs text-muted-foreground">Level {userReputation?.level || 1}</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={(userReputation?.total_points || 0) % 100} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Your Posts</p>
                  <p className="text-2xl font-bold text-emerald-600">{userReputation?.posts_count || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Published</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Helpful Answers</p>
                  <p className="text-2xl font-bold text-blue-600">{userReputation?.helpful_answers || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Community impact</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <ThumbsUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20 hover:shadow-lg transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Best Answers</p>
                  <p className="text-2xl font-bold text-amber-600">{userReputation?.best_answers || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Expert recognition</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Community Content */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:w-auto lg:inline-grid">
              <TabsTrigger value="posts" className="flex items-center gap-1 text-xs md:text-sm">
                <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Feed</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center gap-1 text-xs md:text-sm">
                <MessageCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="ai-assistant" className="flex items-center gap-1 text-xs md:text-sm">
                <Bot className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-1 text-xs md:text-sm">
                <Bookmark className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Saved</span>
              </TabsTrigger>
              <TabsTrigger value="following" className="flex items-center gap-1 text-xs md:text-sm">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Follow</span>
              </TabsTrigger>
              <TabsTrigger value="trending" className="flex items-center gap-1 text-xs md:text-sm">
                <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Trending</span>
              </TabsTrigger>
            </TabsList>

            {/* Posts Feed Tab */}
            <TabsContent value="posts" className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <div className="xl:col-span-3 space-y-4">
                {/* Post Creation */}
                <Card className="bg-gradient-to-r from-card to-card/80 border-border/50 hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white font-semibold">
                          {user?.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full justify-start text-muted-foreground h-12 bg-muted/30 hover:bg-muted/50 border-dashed hover:border-primary/50 transition-all"
                          onClick={() => setShowCreateDialog(true)}
                        >
                          Share your farming experience or ask a question...
                        </Button>
                      </div>
                      <Button 
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search posts, topics, or users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-muted/30 border-border/50 focus:border-primary/50 hover:bg-muted/40 transition-all"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-border/50 hover:bg-muted/40 transition-all">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="question">Questions</SelectItem>
                      <SelectItem value="tip">Tips & Advice</SelectItem>
                      <SelectItem value="showcase">Showcase</SelectItem>
                      <SelectItem value="discussion">Discussion</SelectItem>
                      <SelectItem value="problem">Problem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Enhanced Posts Feed with Infinite Scroll */}
                <InfiniteScrollPosts
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                  onPostClick={handlePostClick}
                  onReaction={handleReaction}
                  onSavePost={handleSavePost}
                />
              </div>

                {/* Enhanced Sidebar */}
                <div className="space-y-4">
                  <TrendingTopics onTopicClick={(topic) => setSearchQuery(`#${topic}`)} />
                  <CommunityHighlights onPostClick={handlePostClick} />
                </div>
              </div>
            </TabsContent>

            {/* Real-time Chat Tab */}
            <TabsContent value="chat" className="mt-4">
              <div className="w-full max-w-6xl mx-auto">
                <CommunityChat />
              </div>
            </TabsContent>

            {/* AI Assistant Tab */}
            <TabsContent value="ai-assistant" className="mt-4">
              <div className="w-full max-w-4xl mx-auto">
                <CommunityAIAssistant />
              </div>
            </TabsContent>

            {/* Saved Posts Tab */}
            <TabsContent value="saved" className="space-y-4">
              <SavedPostsDashboard onPostClick={handlePostClick} />
            </TabsContent>

            {/* Following Tab */}
            <TabsContent value="following" className="space-y-4">
              <UserFollowing />
            </TabsContent>

            {/* Trending Tab */}
            <TabsContent value="trending" className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                  <TrendingPosts onPostClick={handlePostClick} />
                </div>
                <div className="space-y-4">
                  <TrendingTopics onTopicClick={(topic) => setSearchQuery(`#${topic}`)} />
                  <CommunityHighlights onPostClick={handlePostClick} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Post Creation Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isEditingPost ? 'Edit Post' : 'Create New Post'}
              </DialogTitle>
              <DialogDescription>
                Share your farming knowledge, ask questions, or showcase your work
              </DialogDescription>
            </DialogHeader>
            <PostEditor 
              onPostCreated={() => {
                setShowCreateDialog(false);
                fetchCommunityData();
              }}
              editingPost={editingPost}
              onEditComplete={() => {
                setShowCreateDialog(false);
                setIsEditingPost(false);
                setEditingPost(null);
                fetchCommunityData();
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Enhanced Post Detail Dialog */}
        {selectedPost && (
          <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
              <div className="space-y-6 overflow-y-auto max-h-[85vh]">
                {/* Post Header */}
                <div className="border-b pb-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedPost.profiles?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">{selectedPost.title}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{selectedPost.profiles?.full_name || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{new Date(selectedPost.created_at).toLocaleDateString()}</span>
                        <Badge variant="secondary">{selectedPost.category}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                  
                  {selectedPost.tags && selectedPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {selectedPost.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">#{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enhanced Comments */}
                <div className="border-t pt-6">
                  <EnhancedCommentingSystem 
                    postId={selectedPost.id}
                    onCommentsUpdate={(count) => {
                      // Update comments count in the post
                      setPosts(prev => prev.map(p => 
                        p.id === selectedPost.id 
                          ? { ...p, comments_count: count }
                          : p
                      ));
                    }}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from '@/components/WeatherWidget';
import MarketPriceWidget from '@/components/MarketPriceWidget';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  MessageSquare, 
  Camera, 
  Sprout, 
  TrendingUp, 
  Calendar,
  MapPin,
  Wheat,
  Settings,
  Target,
  Zap,
  BookOpen,
  Award,
  Thermometer,
  CloudRain,
  Bug,
  Shield,
  BarChart3,
  Globe,
  PhoneCall,
  Mail,
  Bell,
  CheckCircle
} from 'lucide-react';

interface DashboardStats {
  aiConsultations: number;
  plantScans: number;
  weatherAlerts: number;
  todayTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  badge?: string;
}

interface DashboardStat {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  trend?: string;
}

interface DashboardContent {
  title: string;
  subtitle: string;
  stats: DashboardStat[];
  quickActions: QuickAction[];
  recommendations: string[];
}

export const RoleBasedDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    aiConsultations: 0,
    plantScans: 0,
    weatherAlerts: 0,
    todayTasks: 0,
    overdueTasks: 0,
    upcomingTasks: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch real data from database
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get the authenticated user ID directly
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No authenticated user found');
          setLoading(false);
          return;
        }

        console.log('👤 Authenticated user ID:', user.id);
        console.log('👤 Profile ID:', profile?.id);

        // Use the actual authenticated user ID, not profile.id
        const userId = user.id;
        // Initialize default task counts
        let todayTasks = 0;
        let overdueTasks = 0;
        let upcomingTasks = 0;
        let totalCalendarItems = 0;

        // Try to fetch scheduled activities from crop_calendar table
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        try {
          // Try crop_calendar table first (the actual calendar table being used)
          console.log('🔍 Querying crop_calendar for user_id:', userId);
          
          const { data: calendarItems, error: calendarError } = await supabase
            .from('crop_calendar')
            .select('*')
            .eq('user_id', userId);

          console.log('📊 Query result:', { 
            itemsFound: calendarItems?.length || 0, 
            error: calendarError?.message || 'none',
            userId: userId
          });

          if (!calendarError && calendarItems) {
            console.log('✅ Found calendar items:', calendarItems.length);
            console.log('📅 Calendar items:', calendarItems);
            console.log('📆 Today date:', today.toISOString());
            
            totalCalendarItems = calendarItems.length;
            
            todayTasks = calendarItems.filter(s => {
              const scheduleDate = new Date(s.scheduled_date);
              scheduleDate.setHours(0, 0, 0, 0);
              console.log(`Comparing: ${scheduleDate.toISOString()} === ${today.toISOString()}, completed: ${s.completed}`);
              return scheduleDate.getTime() === today.getTime() && !s.completed;
            }).length;

            overdueTasks = calendarItems.filter(s => {
              const scheduleDate = new Date(s.scheduled_date);
              scheduleDate.setHours(0, 0, 0, 0);
              return scheduleDate.getTime() < today.getTime() && !s.completed;
            }).length;

            upcomingTasks = calendarItems.filter(s => {
              const scheduleDate = new Date(s.scheduled_date);
              scheduleDate.setHours(0, 0, 0, 0);
              return scheduleDate.getTime() > today.getTime() && !s.completed;
            }).length;
            
            console.log('✅ Task counts:', { todayTasks, overdueTasks, upcomingTasks, totalItems: calendarItems.length });
          } else if (calendarError) {
            console.log('Crop calendar error:', calendarError.message);
          }
        } catch (schedError) {
          console.log('Calendar/schedules feature not set up yet (this is okay)');
        }

        // Use calendar activities count for AI Consultations (since posts table doesn't exist)
        // This shows total scheduled activities as a measure of farm planning engagement
        let consultationsCount = totalCalendarItems;

        // Count completed activities as "Plant Scans" for now
        let plantScansCount = 0;
        if (totalCalendarItems > 0) {
          try {
            const { data: completedItems } = await supabase
              .from('crop_calendar')
              .select('*')
              .eq('user_id', userId)
              .eq('completed', true);
            plantScansCount = completedItems?.length || 0;
          } catch (error) {
            console.log('Could not count completed activities');
          }
        }

        setStats({
          aiConsultations: consultationsCount,
          plantScans: plantScansCount,
          weatherAlerts: 3, // This would come from weather API
          todayTasks,
          overdueTasks,
          upcomingTasks
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set default values on error
        setStats({
          aiConsultations: 0,
          plantScans: 0,
          weatherAlerts: 0,
          todayTasks: 0,
          overdueTasks: 0,
          upcomingTasks: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile]);

  const getPersonalizedGreeting = (): string => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const name = profile?.full_name?.split(' ')[0] || 'Farmer';
    
    const greetings = {
      english: `${timeGreeting}, ${name}!`,
      hindi: `नमस्ते ${name}!`,
      tamil: `வணக்கம் ${name}!`,
      telugu: `నమస్కారం ${name}!`,
      kannada: `ನಮಸ್ಕಾರ ${name}!`,
      marathi: `नमस्कार ${name}!`,
      gujarati: `નમસ્તે ${name}!`,
      bengali: `নমস্কার ${name}!`
    };

    return greetings[profile?.preferred_language as keyof typeof greetings] || greetings.english;
  };

  const getDashboardContent = (): DashboardContent => {
    const role = profile?.role || 'farmer';

    switch (role) {
      case 'farmer':
        return {
          title: 'Farmer Dashboard',
          subtitle: 'Manage your farm with AI-powered insights',
          stats: [
            {
              title: 'Active Crops',
              value: profile?.crop_types?.length?.toString() || '0',
              icon: Wheat,
              description: 'Types of crops you\'re growing',
              trend: '+2 this season'
            },
            {
              title: 'Scheduled Activities',
              value: stats.aiConsultations.toString(),
              icon: Calendar,
              description: 'Total farming activities planned',
              trend: loading ? '...' : `${stats.aiConsultations} activities`
            },
            {
              title: 'Completed Tasks',
              value: stats.plantScans.toString(),
              icon: CheckCircle,
              description: 'Activities marked as done',
              trend: loading ? '...' : `${stats.plantScans} completed`
            },
            {
              title: 'Weather Alerts',
              value: stats.weatherAlerts.toString(),
              icon: CloudRain,
              description: 'Active weather warnings',
              trend: 'Monitor closely'
            }
          ],
          quickActions: [
            {
              title: 'Ask AI Expert',
              description: 'Get instant farming advice',
              icon: MessageSquare,
              href: '/chat',
              color: 'bg-emerald-500',
              badge: 'Popular'
            },
            {
              title: 'Identify Plant',
              description: 'Scan for diseases & pests',
              icon: Camera,
              href: '/identify',
              color: 'bg-blue-500'
            },
            {
              title: 'Weather Forecast',
              description: 'Check local conditions',
              icon: CloudRain,
              href: '/weather',
              color: 'bg-sky-500'
            },
            {
              title: 'Market Prices',
              description: 'Current crop prices',
              icon: TrendingUp,
              href: '/market',
              color: 'bg-green-500'
            },
            {
              title: 'Crop Calendar',
              description: 'Plan your farming activities',
              icon: Calendar,
              href: '/calendar',
              color: 'bg-purple-500'
            },
            {
              title: 'Configure Settings',
              description: 'Update your preferences',
              icon: Settings,
              href: '/settings',
              color: 'bg-gray-500'
            }
          ],
          recommendations: [
            `Based on your ${profile?.soil_type || 'soil'} soil type, consider applying organic fertilizer this month.`,
            `Weather forecast shows rain in ${profile?.district || 'your area'}. Perfect time for transplanting.`,
            `Your ${profile?.crop_types?.[0] || 'crops'} are in peak growth phase. Monitor for pests daily.`,
            'Consider companion planting to improve soil health and reduce pests naturally.',
            'Set up drip irrigation to conserve water during the dry season.'
          ]
        };

      case 'expert':
        return {
          title: 'Expert Dashboard',
          subtitle: 'Help farmers with your agricultural expertise',
          stats: [
            {
              title: 'Farmers Helped',
              value: '156',
              icon: Users,
              description: 'Total farmers assisted',
              trend: '+23 this month'
            },
            {
              title: 'Questions Answered',
              value: '342',
              icon: MessageSquare,
              description: 'Expert consultations provided',
              trend: '+45 this week'
            },
            {
              title: 'Success Rate',
              value: '94%',
              icon: Target,
              description: 'Positive feedback score',
              trend: '+2% improvement'
            },
            {
              title: 'Knowledge Articles',
              value: '28',
              icon: BookOpen,
              description: 'Published this month',
              trend: '+5 new articles'
            }
          ],
          quickActions: [
            {
              title: 'Answer Questions',
              description: 'Help farmers with their queries',
              icon: MessageSquare,
              href: '/expert/questions',
              color: 'bg-emerald-500',
              badge: '12 pending'
            },
            {
              title: 'Review Plant Scans',
              description: 'Verify AI plant identifications',
              icon: Shield,
              href: '/expert/reviews',
              color: 'bg-blue-500'
            },
            {
              title: 'Create Content',
              description: 'Write farming guides',
              icon: BookOpen,
              href: '/expert/content',
              color: 'bg-purple-500'
            },
            {
              title: 'Analytics Dashboard',
              description: 'View impact metrics',
              icon: BarChart3,
              href: '/expert/analytics',
              color: 'bg-green-500'
            },
            {
              title: 'Farmer Network',
              description: 'Connect with local farmers',
              icon: Users,
              href: '/expert/network',
              color: 'bg-orange-500'
            },
            {
              title: 'Expert Settings',
              description: 'Manage your profile',
              icon: Settings,
              href: '/settings',
              color: 'bg-gray-500'
            }
          ],
          recommendations: [
            'Review 12 pending farmer questions in your specialty area.',
            'Update your expertise tags to reach more relevant farmers.',
            'Consider hosting a virtual farming workshop this week.',
            'Share seasonal farming tips for your region.',
            'Collaborate with other experts on comprehensive guides.'
          ]
        };

      case 'admin':
        return {
          title: 'Admin Dashboard',
          subtitle: 'Manage platform operations and user experience',
          stats: [
            {
              title: 'Total Users',
              value: '2,847',
              icon: Users,
              description: 'Active platform users',
              trend: '+127 this week'
            },
            {
              title: 'Daily Queries',
              value: '1,234',
              icon: Zap,
              description: 'AI consultations today',
              trend: '+15% vs yesterday'
            },
            {
              title: 'System Uptime',
              value: '99.9%',
              icon: Shield,
              description: 'Platform reliability',
              trend: 'Excellent'
            },
            {
              title: 'Expert Rating',
              value: '4.8/5',
              icon: Award,
              description: 'Average expert feedback',
              trend: '+0.2 this month'
            }
          ],
          quickActions: [
            {
              title: 'User Management',
              description: 'Manage farmers and experts',
              icon: Users,
              href: '/admin/users',
              color: 'bg-emerald-500'
            },
            {
              title: 'Content Moderation',
              description: 'Review AI responses',
              icon: Shield,
              href: '/admin/moderation',
              color: 'bg-red-500',
              badge: '5 flagged'
            },
            {
              title: 'Analytics Hub',
              description: 'Platform insights & metrics',
              icon: BarChart3,
              href: '/admin/analytics',
              color: 'bg-blue-500'
            },
            {
              title: 'System Config',
              description: 'Platform settings',
              icon: Settings,
              href: '/admin/settings',
              color: 'bg-purple-500'
            },
            {
              title: 'Expert Network',
              description: 'Manage expert partnerships',
              icon: Globe,
              href: '/admin/experts',
              color: 'bg-green-500'
            },
            {
              title: 'Support Center',
              description: 'Help & documentation',
              icon: PhoneCall,
              href: '/admin/support',
              color: 'bg-orange-500'
            }
          ],
          recommendations: [
            'Review 5 flagged AI responses for quality assurance.',
            'Onboard 3 new agricultural experts this week.',
            'Update platform terms for better user experience.',
            'Schedule weekly expert training session.',
            'Implement new crop disease detection models.'
          ]
        };

      default:
        return {
          title: 'Welcome Dashboard',
          subtitle: 'Get started with AI-powered farming assistance',
          stats: [],
          quickActions: [],
          recommendations: []
        };
    }
  };

  const content = getDashboardContent();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{getPersonalizedGreeting()}</h1>
          <p className="text-muted-foreground mt-2">{content.subtitle}</p>
        </div>
        
        {profile?.district && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{profile.district}, {profile.state}</span>
            {profile.region_type && (
              <Badge variant="outline" className="capitalize">
                {profile.region_type}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Weather and Market Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <WeatherWidget />
        <MarketPriceWidget />
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.todayTasks}</div>
            <p className="text-xs text-muted-foreground">Pending farm activities</p>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Today</span>
                <Badge variant={stats.todayTasks > 0 ? "default" : "secondary"}>
                  {stats.todayTasks}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-600">Overdue</span>
                <Badge variant={stats.overdueTasks > 0 ? "destructive" : "secondary"}>
                  {stats.overdueTasks}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Upcoming</span>
                <Badge variant="outline">{stats.upcomingTasks}</Badge>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3"
              onClick={() => navigate('/calendar')}
            >
              View Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      {content.stats.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {content.stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                {stat.trend && (
                  <p className="text-xs text-emerald-600 mt-1">{stat.trend}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {content.quickActions.map((action, index) => (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(action.href)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  {action.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {action.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base">{action.title}</CardTitle>
                <CardDescription className="text-sm">
                  {action.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {content.recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Personalized Recommendations</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-emerald-600" />
                AI Insights for You
              </CardTitle>
              <CardDescription>
                Based on your profile, location, and farming practices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Crop Types Display (for farmers) */}
      {profile?.role === 'farmer' && profile?.crop_types && profile.crop_types.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Crops</h2>
          <Card>
            <CardHeader>
              <CardTitle>Crop Portfolio</CardTitle>
              <CardDescription>Manage and track your agricultural activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.crop_types.map((crop, index) => (
                  <Badge key={index} variant="outline" className="capitalize">
                    {crop}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Crop Diversity Score</span>
                  <span className="font-medium">{Math.min(profile.crop_types.length * 10, 100)}%</span>
                </div>
                <Progress value={Math.min(profile.crop_types.length * 10, 100)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Diversification helps reduce risk and improve soil health
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Preferences Quick View */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Communication Preferences</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${profile?.sms_notifications ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">SMS Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.sms_notifications ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${profile?.email_notifications ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">Email Updates</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.email_notifications ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${profile?.app_notifications ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">App Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.app_notifications ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => navigate('/settings')}
            >
              Update Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
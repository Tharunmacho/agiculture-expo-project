import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Heart, 
  UserPlus, 
  AtSign,
  Settings
} from 'lucide-react';

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  comment_notifications: boolean;
  reaction_notifications: boolean;
  follow_notifications: boolean;
  mention_notifications: boolean;
}

export const NotificationPreferences: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    comment_notifications: true,
    reaction_notifications: true,
    follow_notifications: true,
    mention_notifications: true
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotificationPreferences();
    }
  }, [user]);

  const loadNotificationPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
          comment_notifications: data.comment_notifications,
          reaction_notifications: data.reaction_notifications,
          follow_notifications: data.follow_notifications,
          mention_notifications: data.mention_notifications
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...settings
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const notificationOptions = [
    {
      key: 'email_notifications' as keyof NotificationSettings,
      label: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: <Mail className="h-5 w-5" />
    },
    {
      key: 'push_notifications' as keyof NotificationSettings,
      label: 'Push Notifications',
      description: 'Receive push notifications in your browser',
      icon: <Bell className="h-5 w-5" />
    },
    {
      key: 'comment_notifications' as keyof NotificationSettings,
      label: 'Comments',
      description: 'Get notified when someone comments on your posts',
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      key: 'reaction_notifications' as keyof NotificationSettings,
      label: 'Reactions',
      description: 'Get notified when someone likes or reacts to your content',
      icon: <Heart className="h-5 w-5" />
    },
    {
      key: 'follow_notifications' as keyof NotificationSettings,
      label: 'New Followers',
      description: 'Get notified when someone follows you',
      icon: <UserPlus className="h-5 w-5" />
    },
    {
      key: 'mention_notifications' as keyof NotificationSettings,
      label: 'Mentions',
      description: 'Get notified when someone mentions you in a post or comment',
      icon: <AtSign className="h-5 w-5" />
    }
  ];

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-muted-foreground">Please sign in to manage notification preferences</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 bg-muted rounded"></div>
                  <div>
                    <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                    <div className="h-3 bg-muted rounded w-48"></div>
                  </div>
                </div>
                <div className="h-6 w-11 bg-muted rounded-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose when and how you want to be notified about community activities
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {notificationOptions.map((option) => (
            <div key={option.key} className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-3 flex-1">
                <div className="text-muted-foreground">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{option.label}</h4>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings[option.key]}
                onCheckedChange={(checked) => handleSettingChange(option.key, checked)}
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Quick Settings</h4>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const allOn = {
                  email_notifications: true,
                  push_notifications: true,
                  comment_notifications: true,
                  reaction_notifications: true,
                  follow_notifications: true,
                  mention_notifications: true
                };
                setSettings(allOn);
              }}
            >
              Enable All
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const allOff = {
                  email_notifications: false,
                  push_notifications: false,
                  comment_notifications: false,
                  reaction_notifications: false,
                  follow_notifications: false,
                  mention_notifications: false
                };
                setSettings(allOff);
              }}
            >
              Disable All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Key, 
  MapPin,
  Smartphone,
  Mail,
  Globe
} from 'lucide-react';

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'हिंदी (Hindi)' },
  { value: 'tamil', label: 'தமிழ் (Tamil)' },
  { value: 'telugu', label: 'తెలుగు (Telugu)' },
  { value: 'kannada', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'marathi', label: 'मराठी (Marathi)' },
  { value: 'gujarati', label: 'ગુજરાતી (Gujarati)' },
  { value: 'bengali', label: 'বাংলা (Bengali)' },
];

export default function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    preferred_language: 'english' as const,
    sms_notifications: true,
    email_notifications: true,
    app_notifications: true,
    gemini_api_key: '',
    huggingface_api_key: '',
    kaggle_api_key: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        preferred_language: (profile.preferred_language as any) || 'english',
        sms_notifications: profile.sms_notifications ?? true,
        email_notifications: profile.email_notifications ?? true,
        app_notifications: profile.app_notifications ?? true,
        gemini_api_key: profile.gemini_api_key || '',
        huggingface_api_key: profile.huggingface_api_key || '',
        kaggle_api_key: profile.kaggle_api_key || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await updateProfile(formData as any);
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to update settings. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Settings updated",
          description: "Your preferences have been saved successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account preferences and API configurations</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="language" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Language
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and account details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={profile.role || 'farmer'} disabled className="capitalize" />
                  </div>
                  
                  {profile.district && profile.state && (
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={`${profile.district}, ${profile.state}`} disabled />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to receive updates and alerts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        SMS Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important updates via SMS
                      </p>
                    </div>
                    <Switch
                      checked={formData.sms_notifications}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, sms_notifications: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates and tips via email
                      </p>
                    </div>
                    <Switch
                      checked={formData.email_notifications}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, email_notifications: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        App Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in the app
                      </p>
                    </div>
                    <Switch
                      checked={formData.app_notifications}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, app_notifications: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="language" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Language Settings</CardTitle>
                  <CardDescription>
                    Choose your preferred language for the interface
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferred_language">Preferred Language</Label>
                    <Select 
                      value={formData.preferred_language} 
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, preferred_language: value as any }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>
                    Configure your API keys for enhanced AI features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gemini_api_key">Gemini API Key</Label>
                    <Input
                      id="gemini_api_key"
                      type="password"
                      value={formData.gemini_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                      placeholder="Enter your Gemini API key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="huggingface_api_key">Hugging Face API Key</Label>
                    <Input
                      id="huggingface_api_key"
                      type="password"
                      value={formData.huggingface_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, huggingface_api_key: e.target.value }))}
                      placeholder="Enter your Hugging Face API key"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kaggle_api_key">Kaggle API Key</Label>
                    <Input
                      id="kaggle_api_key"
                      type="password"
                      value={formData.kaggle_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, kaggle_api_key: e.target.value }))}
                      placeholder="Enter your Kaggle API key"
                    />
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> API keys are stored securely and used to enhance your AI experience. 
                      You can update or remove them at any time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-8">
            <Button onClick={handleSave} disabled={isLoading} size="lg">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
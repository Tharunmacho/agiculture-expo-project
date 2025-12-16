import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft, ChevronRight, Check, MapPin } from 'lucide-react';

const STEPS = [
  { id: 1, title: "Basic Information", description: "Tell us about yourself" },
  { id: 2, title: "Location", description: "Where are you located?" },
  { id: 3, title: "Agricultural Details", description: "Your farming preferences" },
  { id: 4, title: "Preferences", description: "Customize your experience" },
];

const CROP_TYPES = [
  'rice', 'wheat', 'sugarcane', 'cotton', 'maize', 'soybean', 
  'pulses', 'vegetables', 'fruits', 'spices', 'other'
];

const SOIL_TYPES = [
  'clay', 'loam', 'sandy', 'red', 'black', 'alluvial', 'laterite'
];

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

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function ProfileSetup() {
  const { user, profile, updateProfile, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Profile setup state tracking

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    district: '',
    state: '',
    preferred_language: 'english' as const,
    crop_types: [] as string[],
    soil_type: '',
    region_type: '',
    sms_notifications: true,
    email_notifications: true,
    app_notifications: true,
    gemini_api_key: '',
    kaggle_api_key: '',
    huggingface_api_key: '',
  });

  // Loading state - show spinner only while initial auth is loading
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if user is not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect if profile is already completed
  if (profile?.profile_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  // Initialize form data from profile when available
  useEffect(() => {
    if (profile) {
      // Initialize form with existing profile data
      setFormData({
        full_name: profile.full_name || '',
        district: profile.district || '',
        state: profile.state || '',
        preferred_language: (profile.preferred_language as any) || 'english',
        crop_types: profile.crop_types || [],
        soil_type: profile.soil_type || '',
        region_type: profile.region_type || '',
        sms_notifications: profile.sms_notifications ?? true,
        email_notifications: profile.email_notifications ?? true,
        app_notifications: profile.app_notifications ?? true,
        gemini_api_key: profile.gemini_api_key || '',
        kaggle_api_key: profile.kaggle_api_key || '',
        huggingface_api_key: profile.huggingface_api_key || '',
      });
    } else if (user && !profile) {
      // Set default values if no profile exists yet
      setFormData(prev => ({
        ...prev,
        full_name: user.email?.split('@')[0] || ''
      }));
    }
  }, [profile, user]);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location detection.",
        variant: "destructive",
      });
      return;
    }

    setIsDetectingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          toast({
            title: "Location detected",
            description: "Please select your state and district manually for now.",
          });
        } catch (error) {
          toast({
            title: "Location detection failed",
            description: "Please select your location manually.",
            variant: "destructive",
          });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        toast({
          title: "Location access denied",
          description: "Please select your location manually.",
          variant: "destructive",
        });
        setIsDetectingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  const handleCropTypeChange = (cropType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      crop_types: checked 
        ? [...prev.crop_types, cropType]
        : prev.crop_types.filter(c => c !== cropType)
    }));
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
      
      // Auto-save progress with timeout
      if (user) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          await updateProfile(formData as any);
          clearTimeout(timeoutId);
        } catch (error) {
          // Auto-save failed, but don't block progression
          // Don't block progression for auto-save failures
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      // Validate required fields
      if (!formData.full_name?.trim()) {
        toast({
          title: "Incomplete Information",
          description: "Please enter your full name.",
          variant: "destructive",
        });
        return;
      }

      // Filter out empty strings and undefined values
      const cleanFormData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => {
          if (typeof value === 'string') return value.trim() !== '';
          if (Array.isArray(value)) return value.length > 0;
          return value !== null && value !== undefined;
        })
      );

      const updateData = {
        ...cleanFormData,
        profile_completed: true,
        // Ensure required fields have defaults
        role: profile?.role || 'farmer',
        preferred_language: cleanFormData.preferred_language || 'english'
      };

      // Submitting profile data
      
      const { error } = await updateProfile(updateData as any);
      
      if (error) {
        // Profile update failed
        toast({
          title: "Setup failed", 
          description: error.message || "Failed to complete profile setup. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile completed!",
          description: "Welcome to your personalized agricultural assistant.",
        });
        
        // Navigate immediately on success
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      // Unexpected error during profile update
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground text-center mb-6">
            Help us personalize your agricultural experience
          </p>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Step {currentStep} of {STEPS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Your Role</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium capitalize">{profile?.role || 'farmer'}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.role === 'farmer' && 'Get personalized farming advice and recommendations'}
                      {profile?.role === 'expert' && 'Provide expertise and support to farmers'}
                      {profile?.role === 'admin' && 'Manage users and system settings'}
                      {!profile?.role && 'Get personalized farming advice and recommendations'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Location</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={detectLocation}
                    disabled={isDetectingLocation}
                  >
                    {isDetectingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    Auto-detect
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    placeholder="Enter your district"
                    value={formData.district}
                    onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Agricultural Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Crop Types (Select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {CROP_TYPES.map(crop => (
                      <div key={crop} className="flex items-center space-x-2">
                        <Checkbox
                          id={crop}
                          checked={formData.crop_types.includes(crop)}
                          onCheckedChange={(checked) => handleCropTypeChange(crop, checked as boolean)}
                        />
                        <Label htmlFor={crop} className="capitalize cursor-pointer">
                          {crop}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soil_type">Soil Type</Label>
                  <Select 
                    value={formData.soil_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, soil_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your soil type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOIL_TYPES.map(soil => (
                        <SelectItem key={soil} value={soil} className="capitalize">
                          {soil}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region_type">Region Type</Label>
                  <Select 
                    value={formData.region_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, region_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your region type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rainfed">Rainfed</SelectItem>
                      <SelectItem value="irrigated">Irrigated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 4: Preferences */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_language">Preferred Language</Label>
                  <Select 
                    value={formData.preferred_language} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_language: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your preferred language" />
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

                <div className="space-y-4">
                  <Label>Notification Preferences</Label>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms_notifications">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive important updates via SMS</p>
                    </div>
                    <Switch
                      id="sms_notifications"
                      checked={formData.sms_notifications}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sms_notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email_notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates and tips via email</p>
                    </div>
                    <Switch
                      id="email_notifications"
                      checked={formData.email_notifications}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, email_notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="app_notifications">App Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive push notifications</p>
                    </div>
                    <Switch
                      id="app_notifications"
                      checked={formData.app_notifications}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, app_notifications: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label>API Keys (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure your API keys for enhanced features
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gemini_api_key">Gemini API Key</Label>
                    <Input
                      id="gemini_api_key"
                      type="password"
                      placeholder="Enter your Gemini API key (optional)"
                      value={formData.gemini_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="huggingface_api_key">Hugging Face API Key</Label>
                    <Input
                      id="huggingface_api_key"
                      type="password"
                      placeholder="Enter your Hugging Face API key (optional)"
                      value={formData.huggingface_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, huggingface_api_key: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < STEPS.length ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Completing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>Complete Setup</span>
                    </div>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
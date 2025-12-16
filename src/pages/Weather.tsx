import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  CloudRain,
  Sun,
  Cloud,
  Wind,
  Thermometer,
  Droplets,
  Eye,
  Gauge,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Zap,
  Leaf,
  Sprout,
  Bug,
  Shield,
  Brain,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  condition: string;
  windSpeed: number;
  pressure: number;
  rainfall: number;
  forecast: {
    day: string;
    high: number;
    low: number;
    condition: string;
    rainfall: number;
  }[];
}

interface WeatherAlert {
  id: string;
  type: 'warning' | 'advisory' | 'watch';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  validUntil: string;
}

interface CropAdvice {
  crop: string;
  recommendation: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
}

export default function Weather() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [cropAdvice, setCropAdvice] = useState<CropAdvice[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [customLocation, setCustomLocation] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    const icons = {
      'Clear': Sun,
      'Sunny': Sun,
      'Partly Cloudy': Cloud,
      'Cloudy': Cloud,
      'Overcast': Cloud,
      'Rain': CloudRain,
      'Light Rain': CloudRain,
      'Heavy Rain': CloudRain,
      'Drizzle': CloudRain,
      'Snow': Cloud,
      'Thunderstorm': CloudRain,
      'Mist': Cloud,
      'Fog': Cloud
    };
    return icons[condition as keyof typeof icons] || Cloud;
  };

  // Fetch weather data
  const fetchWeatherData = async (latitude?: number, longitude?: number, location?: string) => {
    try {
      setLoading(true);
      
      const response = await supabase.functions.invoke('weather-data', {
        body: { 
          latitude: latitude || 28.6139, 
          longitude: longitude || 77.2090,
          location: location || profile?.district || 'Delhi'
        }
      });

      if (response.error) throw response.error;
      
      setWeather(response.data);
      setLastUpdated(new Date());
      
      // Generate AI weather advice
      if (response.data) {
        await generateWeatherAdvice(response.data);
      }
      
      // Generate mock alerts based on weather conditions
      generateWeatherAlerts(response.data);
      
    } catch (error) {
      console.error('Weather fetch error:', error);
      toast({
        title: "Weather Error",
        description: "Failed to fetch weather data. Using demo data.",
        variant: "destructive"
      });
      
      // Fallback mock data
      const mockWeather: WeatherData = {
        location: profile?.district || "Demo Location",
        temperature: 28,
        humidity: 65,
        condition: "Partly Cloudy",
        windSpeed: 12,
        pressure: 1013,
        rainfall: 0,
        forecast: [
          { day: "Today", high: 32, low: 22, condition: "Sunny", rainfall: 0 },
          { day: "Tomorrow", high: 30, low: 20, condition: "Partly Cloudy", rainfall: 5 },
          { day: "Day 3", high: 28, low: 18, condition: "Light Rain", rainfall: 15 },
          { day: "Day 4", high: 29, low: 19, condition: "Cloudy", rainfall: 10 },
          { day: "Day 5", high: 31, low: 21, condition: "Sunny", rainfall: 0 },
        ]
      };
      setWeather(mockWeather);
      await generateWeatherAdvice(mockWeather);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI-powered weather advice using OpenRouter
  const generateWeatherAdvice = async (weatherData: WeatherData) => {
    try {
      setIsLoadingAI(true);
      
      const cropTypes = profile?.crop_types || ['rice', 'wheat'];
      const soilType = profile?.soil_type || 'loamy';
      const region = profile?.region_type || 'subtropical';
      
      const prompt = `As an agricultural weather expert, analyze this weather data and provide specific farming advice:

Weather: ${weatherData.condition}, ${weatherData.temperature}°C, ${weatherData.humidity}% humidity, ${weatherData.windSpeed} km/h wind, ${weatherData.rainfall}mm rainfall
Location: ${weatherData.location}
Farmer's crops: ${cropTypes.join(', ')}
Soil type: ${soilType}
Region: ${region}

5-day forecast: ${weatherData.forecast.map(f => `${f.day}: ${f.condition}, ${f.high}°C/${f.low}°C, ${f.rainfall}mm rain`).join('; ')}

Provide:
1. Immediate actions needed today
2. Crop-specific advice for next 3 days
3. Irrigation recommendations
4. Pest/disease warnings
5. Harvesting/planting guidance

Be practical, specific, and focus on actionable advice.`;

      const response = await supabase.functions.invoke('openrouter-direct', {
        body: {
          messages: [
            { role: 'system', content: 'You are an expert agricultural meteorologist specializing in crop management and weather-based farming decisions.' },
            { role: 'user', content: prompt }
          ],
          model: 'meta-llama/llama-3.2-3b-instruct:free',
          max_tokens: 800,
          temperature: 0.3
        }
      });

      if (response.data?.content) {
        setAiAdvice(response.data.content);
        generateCropSpecificAdvice(weatherData, response.data.content);
      }
      
    } catch (error) {
      console.error('AI advice error:', error);
      setAiAdvice('AI weather analysis temporarily unavailable. Please check current conditions and follow standard farming practices for your crops.');
      generateCropSpecificAdvice(weatherData, '');
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Generate crop-specific advice
  const generateCropSpecificAdvice = (weatherData: WeatherData, aiResponse: string) => {
    const cropTypes = profile?.crop_types || ['rice', 'wheat', 'tomato'];
    const advice: CropAdvice[] = [];

    cropTypes.forEach(crop => {
      let recommendation = '';
      let action = '';
      let priority: 'low' | 'medium' | 'high' = 'medium';
      let reasoning = '';

      // Weather-based crop advice logic
      if (weatherData.rainfall > 10) {
        if (crop === 'rice') {
          recommendation = 'Excellent conditions for rice growth';
          action = 'Monitor water levels, ensure proper drainage';
          priority = 'medium';
          reasoning = 'High rainfall benefits rice but requires water management';
        } else if (crop === 'wheat') {
          recommendation = 'Risk of fungal diseases';
          action = 'Apply fungicide, improve ventilation';
          priority = 'high';
          reasoning = 'Excess moisture can cause wheat diseases';
        } else {
          recommendation = 'Monitor for waterlogging';
          action = 'Ensure proper drainage';
          priority = 'medium';
          reasoning = 'Most crops need drainage during heavy rain';
        }
      } else if (weatherData.temperature > 35) {
        recommendation = 'Heat stress risk';
        action = 'Increase irrigation frequency, provide shade';
        priority = 'high';
        reasoning = 'High temperatures can damage crops and reduce yield';
      } else if (weatherData.humidity > 80) {
        recommendation = 'High humidity - disease risk';
        action = 'Monitor for pests, apply preventive treatments';
        priority = 'medium';
        reasoning = 'High humidity promotes fungal and bacterial diseases';
      } else {
        recommendation = 'Favorable growing conditions';
        action = 'Continue regular care routine';
        priority = 'low';
        reasoning = 'Current weather is suitable for crop growth';
      }

      advice.push({
        crop: crop.charAt(0).toUpperCase() + crop.slice(1),
        recommendation,
        action,
        priority,
        reasoning
      });
    });

    setCropAdvice(advice);
  };

  // Generate weather alerts
  const generateWeatherAlerts = (weatherData: WeatherData) => {
    const alerts: WeatherAlert[] = [];

    if (weatherData.rainfall > 20) {
      alerts.push({
        id: '1',
        type: 'warning',
        title: 'Heavy Rainfall Alert',
        description: `${weatherData.rainfall}mm rainfall expected. Risk of waterlogging and crop damage.`,
        severity: 'high',
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }

    if (weatherData.temperature > 38) {
      alerts.push({
        id: '2',
        type: 'warning',
        title: 'Extreme Heat Warning',
        description: `Temperature reaching ${weatherData.temperature}°C. High risk of heat stress in crops.`,
        severity: 'critical',
        validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      });
    }

    if (weatherData.windSpeed > 25) {
      alerts.push({
        id: '3',
        type: 'advisory',
        title: 'Strong Wind Advisory',
        description: `Wind speeds of ${weatherData.windSpeed} km/h. Secure loose equipment and tall crops.`,
        severity: 'medium',
        validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      });
    }

    if (weatherData.humidity < 30) {
      alerts.push({
        id: '4',
        type: 'advisory',
        title: 'Low Humidity Alert',
        description: `Humidity at ${weatherData.humidity}%. Increase irrigation frequency.`,
        severity: 'medium',
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }

    setAlerts(alerts);
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          fetchWeatherData(); // Fallback to default location
        }
      );
    } else {
      fetchWeatherData(); // Fallback if geolocation not supported
    }
  };

  // Handle custom location search
  const handleLocationSearch = () => {
    if (customLocation.trim()) {
      fetchWeatherData(undefined, undefined, customLocation);
    }
  };

  useEffect(() => {
    getCurrentLocation();
    
    // Auto-refresh every 10 minutes
    const interval = setInterval(() => {
      getCurrentLocation();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      default: return 'bg-blue-100 border-blue-500 text-blue-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Weather Data Unavailable</h2>
          <p className="text-gray-600 mb-4">Unable to load weather information at this time.</p>
          <Button onClick={() => getCurrentLocation()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const WeatherIcon = getWeatherIcon(weather.condition);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weather Hub</h1>
            <p className="text-gray-600 mt-1">AI-powered weather insights for smart farming</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <Button 
              onClick={() => getCurrentLocation()} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Location Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="location">Search Different Location</Label>
                <Input
                  id="location"
                  placeholder="Enter city or district name..."
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
                />
              </div>
              <Button onClick={handleLocationSearch} className="mt-6">
                <MapPin className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weather Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-gray-900">Active Weather Alerts</h2>
            <div className="grid gap-3">
              {alerts.map((alert) => (
                <Alert key={alert.id} className={getAlertColor(alert.severity)}>
                  <AlertTriangle className="h-4 w-4" />
                  <div>
                    <h4 className="font-semibold">{alert.title}</h4>
                    <AlertDescription>{alert.description}</AlertDescription>
                    <p className="text-xs mt-1 opacity-75">
                      Valid until: {new Date(alert.validUntil).toLocaleString()}
                    </p>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="current">Current Weather</TabsTrigger>
            <TabsTrigger value="forecast">5-Day Forecast</TabsTrigger>
            <TabsTrigger value="advice">AI Crop Advice</TabsTrigger>
            <TabsTrigger value="insights">Farm Insights</TabsTrigger>
          </TabsList>

          {/* Current Weather Tab */}
          <TabsContent value="current" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Weather Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {weather.location}
                  </CardTitle>
                  <CardDescription>Current weather conditions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <WeatherIcon className="h-16 w-16 text-blue-500" />
                      <div>
                        <div className="text-4xl font-bold">{weather.temperature}°C</div>
                        <div className="text-lg text-gray-600">{weather.condition}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span>Humidity: {weather.humidity}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wind className="h-4 w-4 text-gray-500" />
                        <span>Wind: {weather.windSpeed} km/h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-purple-500" />
                        <span>Pressure: {weather.pressure} hPa</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CloudRain className="h-4 w-4 text-blue-600" />
                        <span>Rainfall: {weather.rainfall} mm</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weather Conditions Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Conditions Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Temperature</span>
                      <span>{weather.temperature}°C</span>
                    </div>
                    <Progress value={(weather.temperature / 50) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Humidity</span>
                      <span>{weather.humidity}%</span>
                    </div>
                    <Progress value={weather.humidity} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Wind Speed</span>
                      <span>{weather.windSpeed} km/h</span>
                    </div>
                    <Progress value={(weather.windSpeed / 50) * 100} className="h-2" />
                  </div>

                  <div className="pt-3 border-t">
                    <h4 className="font-medium mb-2">Farming Conditions</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Irrigation Need</span>
                        <Badge variant={weather.rainfall < 5 ? "destructive" : "default"}>
                          {weather.rainfall < 5 ? "High" : "Low"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Disease Risk</span>
                        <Badge variant={weather.humidity > 70 ? "destructive" : "default"}>
                          {weather.humidity > 70 ? "High" : "Low"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Work Conditions</span>
                        <Badge variant={weather.temperature > 35 ? "destructive" : "default"}>
                          {weather.temperature > 35 ? "Caution" : "Good"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 5-Day Forecast Tab */}
          <TabsContent value="forecast" className="space-y-6">
            <div className="grid gap-4">
              {weather.forecast.map((day, index) => {
                const DayIcon = getWeatherIcon(day.condition);
                return (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <DayIcon className="h-8 w-8 text-blue-500" />
                          <div>
                            <div className="font-semibold">{day.day}</div>
                            <div className="text-sm text-gray-600">{day.condition}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="font-semibold">{day.high}°C</div>
                            <div className="text-gray-500">High</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{day.low}°C</div>
                            <div className="text-gray-500">Low</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{day.rainfall}mm</div>
                            <div className="text-gray-500">Rain</div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          {day.rainfall > 10 && (
                            <Badge variant="outline" className="text-xs">Heavy Rain</Badge>
                          )}
                          {day.high > 35 && (
                            <Badge variant="destructive" className="text-xs">Hot</Badge>
                          )}
                          {day.high < 15 && (
                            <Badge variant="secondary" className="text-xs">Cold</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* AI Crop Advice Tab */}
          <TabsContent value="advice" className="space-y-6">
            <div className="grid gap-6">
              {/* General AI Advice */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    AI Weather Analysis
                    {isLoadingAI && <Loader2 className="h-4 w-4 animate-spin" />}
                  </CardTitle>
                  <CardDescription>
                    Comprehensive weather-based farming recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAI ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating AI insights...
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700">{aiAdvice}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Crop-Specific Advice */}
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold">Crop-Specific Recommendations</h3>
                {cropAdvice.map((advice, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sprout className="h-5 w-5 text-green-500" />
                          {advice.crop}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(advice.priority)}`} />
                          <Badge variant="outline" className="capitalize">
                            {advice.priority} Priority
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-1">Recommendation</h4>
                        <p className="text-sm text-gray-700">{advice.recommendation}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-1">Action Required</h4>
                        <p className="text-sm text-gray-700">{advice.action}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm mb-1">Reasoning</h4>
                        <p className="text-xs text-gray-600">{advice.reasoning}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Farm Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Irrigation Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    Irrigation Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Water Need Level</span>
                    <Badge variant={weather.rainfall < 5 ? "destructive" : "default"}>
                      {weather.rainfall < 5 ? "High" : weather.rainfall > 15 ? "Low" : "Medium"}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {weather.rainfall < 5 
                      ? "Increase irrigation frequency. Soil moisture likely low."
                      : weather.rainfall > 15
                      ? "Reduce or pause irrigation. Monitor for waterlogging."
                      : "Maintain regular irrigation schedule with monitoring."
                    }
                  </div>
                  
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs font-medium text-blue-800">Next 3 Days</div>
                    <div className="text-xs text-blue-700 mt-1">
                      Expected rainfall: {weather.forecast.slice(0, 3).reduce((sum, day) => sum + day.rainfall, 0)}mm
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pest & Disease Risk */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-red-500" />
                    Pest & Disease Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Risk Level</span>
                    <Badge variant={weather.humidity > 70 && weather.temperature > 25 ? "destructive" : "default"}>
                      {weather.humidity > 70 && weather.temperature > 25 ? "High" : "Medium"}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {weather.humidity > 70 && weather.temperature > 25
                      ? "High humidity + warm temperature increases fungal disease risk."
                      : "Moderate conditions. Continue regular monitoring."
                    }
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      Monitor for aphids and whiteflies
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      Check for leaf spot diseases
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      Watch for powdery mildew
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Field Work Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Field Work Safety
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Work Conditions</span>
                    <Badge variant={weather.temperature > 35 || weather.windSpeed > 20 ? "destructive" : "default"}>
                      {weather.temperature > 35 || weather.windSpeed > 20 ? "Caution" : "Safe"}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {weather.temperature > 35 
                      ? "High temperature. Work during early morning or evening."
                      : weather.windSpeed > 20
                      ? "Strong winds. Avoid spraying activities."
                      : "Good conditions for field work."
                    }
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div>• Best work hours: 6-10 AM, 4-7 PM</div>
                    <div>• Stay hydrated and take breaks</div>
                    <div>• Use protective equipment</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Weather Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Weather Summary</CardTitle>
                <CardDescription>Key insights for the week ahead</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <CloudRain className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="font-semibold">
                      {weather.forecast.reduce((sum, day) => sum + day.rainfall, 0)}mm
                    </div>
                    <div className="text-sm text-gray-600">Total Rainfall</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <Thermometer className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="font-semibold">
                      {Math.max(...weather.forecast.map(d => d.high))}°C
                    </div>
                    <div className="text-sm text-gray-600">Max Temperature</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Leaf className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="font-semibold">
                      {weather.forecast.filter(d => d.condition === 'Sunny').length}
                    </div>
                    <div className="text-sm text-gray-600">Sunny Days</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Zap className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <div className="font-semibold">
                      {alerts.length}
                    </div>
                    <div className="text-sm text-gray-600">Active Alerts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
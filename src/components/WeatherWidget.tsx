import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Sun, CloudRain, Wind, Droplets, Gauge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const { toast } = useToast();

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return <Sun className="h-8 w-8 text-yellow-500" />;
      case 'rain':
      case 'light rain':
        return <CloudRain className="h-8 w-8 text-blue-500" />;
      default:
        return <Cloud className="h-8 w-8 text-gray-500" />;
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location (Delhi coordinates)
          setLocation({ lat: 28.6139, lon: 77.2090 });
        }
      );
    } else {
      // Use default location if geolocation is not supported
      setLocation({ lat: 28.6139, lon: 77.2090 });
    }
  };

  const fetchWeatherData = async () => {
    if (!location) return;

    try {
      const { data, error } = await supabase.functions.invoke('weather-data', {
        body: {
          latitude: location.lat,
          longitude: location.lon,
          location: 'Your Location'
        }
      });

      if (error) throw error;

      setWeather(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast({
        title: "Weather data unavailable",
        description: "Using demo weather data for now.",
        variant: "destructive",
      });
      
      // Fallback weather data
      setWeather({
        location: "Demo Location",
        temperature: 25,
        humidity: 60,
        condition: "Clear",
        windSpeed: 10,
        pressure: 1015,
        rainfall: 0,
        forecast: [
          { day: "Today", high: 28, low: 18, condition: "Clear", rainfall: 0 },
          { day: "Tomorrow", high: 26, low: 16, condition: "Cloudy", rainfall: 5 },
          { day: "Day 3", high: 24, low: 15, condition: "Rain", rainfall: 15 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (location) {
      fetchWeatherData();
    }
  }, [location]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getWeatherIcon(weather.condition)}
          Weather in {weather.location}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{weather.temperature}°C</div>
            <div className="text-sm text-muted-foreground">{weather.condition}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Droplets className="h-4 w-4" />
              Humidity: {weather.humidity}%
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wind className="h-4 w-4" />
              Wind: {weather.windSpeed} km/h
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4" />
              Pressure: {weather.pressure} hPa
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">5-Day Forecast</h4>
          <div className="grid grid-cols-5 gap-2">
            {weather.forecast.map((day, index) => (
              <div key={index} className="text-center text-xs">
                <div className="font-medium">{day.day}</div>
                <div className="my-1">{getWeatherIcon(day.condition)}</div>
                <div>{day.high}°/{day.low}°</div>
                {day.rainfall > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {day.rainfall}mm
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {weather.rainfall > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <CloudRain className="h-4 w-4" />
              <span className="text-sm font-medium">
                Current rainfall: {weather.rainfall}mm
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
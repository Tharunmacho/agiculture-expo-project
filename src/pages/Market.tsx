import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Bell, 
  Star, 
  BarChart3, 
  MapPin, 
  Clock, 
  IndianRupee,
  Activity,
  Target,
  Eye,
  Plus,
  Calendar,
  LineChart,
  AlertTriangle,
  Zap,
  Globe,
  Calculator,
  Phone,
  MessageSquare,
  Truck,
  Warehouse,
  Users,
  HelpCircle,
  Info,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Download,
  Share,
  Bookmark,
  Heart,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';

// Enhanced interfaces
interface MarketPrice {
  crop: string;
  price: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  market: string;
  lastUpdated: string;
  minPrice?: number;
  maxPrice?: number;
  volume?: number;
}

interface MarketData {
  location: string;
  prices: MarketPrice[];
  marketTrends: {
    crop: string;
    prediction: string;
    confidence: number;
    factors?: string[];
  }[];
  lastUpdated?: string;
  dataSource?: string;
  isLive?: boolean;
}

interface MarketAlert {
  id: string;
  crop: string;
  alertType: string;
  threshold: number;
  isActive: boolean;
}

interface ProfitCalculation {
  crop: string;
  costPrice: number;
  currentPrice: number;
  quantity: number;
  profit: number;
  profitPercentage: number;
  recommendation: string;
}

const Market = () => {
  const { profile } = useAuth();
  
  // Enhanced state management
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState('all');
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [markets, setMarkets] = useState<any[]>([]);
  const [commodities, setCommodities] = useState<any[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [profitCalculator, setProfitCalculator] = useState<ProfitCalculation | null>(null);
  const [showProfitCalculator, setShowProfitCalculator] = useState(false);

  // Enhanced market data fetching
  const fetchMarketData = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      const requestBody = {
        location: profile?.district ? `${profile.district}, ${profile.state}` : 'Tamil Nadu',
        crops: profile?.crop_types || ['rice', 'wheat', 'tomato', 'onion', 'sugarcane', 'cotton', 'groundnut']
      };

      const { data, error: fetchError } = await supabase.functions.invoke('market-prices', {
        body: requestBody
      });

      if (fetchError) throw new Error(`API Error: ${fetchError.message}`);
      if (!data) throw new Error('No market data received');

      const sanitizedData: MarketData = {
        ...data,
        prices: (data.prices || []).map((price: any) => ({
          ...price,
          price: parseFloat(price.price) || 0,
          change: parseFloat(price.change) || 0,
          trend: ['up', 'down', 'stable'].includes(price.trend) ? price.trend : 'stable'
        })),
        marketTrends: (data.marketTrends || []).map((trend: any) => ({
          ...trend,
          confidence: Math.min(Math.max(parseFloat(trend.confidence) || 0, 0), 100)
        }))
      };

      setMarketData(sanitizedData);
      setLastRefresh(new Date());
      setConnectionStatus('connected');
      
      if (sanitizedData.isLive) {
        toast.success('🔴 Real-time market data updated!', {
          description: `${sanitizedData.prices.length} crops updated`
        });
      }
      
    } catch (error) {
      console.error('Error fetching market data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (retryCount < maxRetries) {
        setTimeout(() => fetchMarketData(retryCount + 1), 2000 * (retryCount + 1));
        return;
      }
      
      setError(errorMessage);
      setConnectionStatus('disconnected');
      toast.error('Failed to fetch market data', {
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => fetchMarketData()
        }
      });
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Enhanced additional data fetching
  const fetchAdditionalMarketData = useCallback(async () => {
    try {
      const [marketsResult, commoditiesResult, watchlistResult, alertsResult, newsResult] = await Promise.allSettled([
        supabase.from('market_locations').select('*').eq('state', 'Tamil Nadu').eq('is_active', true),
        supabase.from('commodities').select('*').order('name'),
        profile?.user_id ? supabase.from('user_watchlists').select('*, commodities(name)').eq('user_id', profile.user_id) : Promise.resolve({ data: [] }),
        profile?.user_id ? supabase.from('price_alerts').select('*, commodities(name)').eq('user_id', profile.user_id).eq('is_active', true) : Promise.resolve({ data: [] }),
        supabase.from('market_news').select('*').gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('published_at', { ascending: false }).limit(10)
      ]);

      if (marketsResult.status === 'fulfilled' && marketsResult.value.data) {
        setMarkets(marketsResult.value.data);
      }

      if (commoditiesResult.status === 'fulfilled' && commoditiesResult.value.data) {
        setCommodities(commoditiesResult.value.data);
      }

      if (watchlistResult.status === 'fulfilled' && watchlistResult.value.data) {
        const watchlistItems = watchlistResult.value.data.map((w: any) => w.commodities.name);
        setWatchlist(watchlistItems);
      }

      if (alertsResult.status === 'fulfilled' && alertsResult.value.data) {
        const alertItems = alertsResult.value.data.map((a: any) => ({
          id: a.id,
          crop: a.commodities.name,
          alertType: a.alert_type,
          threshold: a.threshold_value,
          isActive: a.is_active
        }));
        setAlerts(alertItems);
      }

      if (newsResult.status === 'fulfilled' && newsResult.value.data) {
        setNews(newsResult.value.data);
      }

    } catch (error) {
      console.error('Error fetching additional market data:', error);
      toast.error('Some features may not be available');
    }
  }, [profile?.user_id]);

  // Utility functions
  const getTrendIcon = useCallback((trend: string, change: number) => {
    if (trend === 'up' || change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (trend === 'down' || change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-600" />;
  }, []);

  const getTrendColor = useCallback((trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);

  // Watchlist management
  const addToWatchlist = useCallback(async (cropName: string) => {
    try {
      const commodity = commodities.find(c => c.name.toLowerCase() === cropName.toLowerCase());
      if (!commodity || !profile?.user_id) {
        toast.error('Unable to add to watchlist');
        return;
      }

      const { error } = await supabase
        .from('user_watchlists')
        .insert({
          user_id: profile.user_id,
          commodity_id: commodity.id
        });

      if (error) throw error;

      setWatchlist(prev => [...prev, cropName]);
      toast.success(`⭐ ${cropName} added to watchlist`);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  }, [commodities, profile?.user_id]);

  const removeFromWatchlist = useCallback(async (cropName: string) => {
    try {
      const commodity = commodities.find(c => c.name.toLowerCase() === cropName.toLowerCase());
      if (!commodity || !profile?.user_id) return;

      const { error } = await supabase
        .from('user_watchlists')
        .delete()
        .eq('user_id', profile.user_id)
        .eq('commodity_id', commodity.id);

      if (error) throw error;

      setWatchlist(prev => prev.filter(item => item !== cropName));
      toast.success(`❌ ${cropName} removed from watchlist`);
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast.error('Failed to remove from watchlist');
    }
  }, [commodities, profile?.user_id]);

  // Price alert creation
  const createPriceAlert = useCallback(async (cropName: string, alertType: string, threshold: number) => {
    try {
      const commodity = commodities.find(c => c.name.toLowerCase() === cropName.toLowerCase());
      if (!commodity || !profile?.user_id) {
        toast.error('Unable to create price alert');
        return;
      }

      const { error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: profile.user_id,
          commodity_id: commodity.id,
          alert_type: alertType,
          threshold_value: threshold,
          is_active: true
        });

      if (error) throw error;

      toast.success(`🔔 Price alert created for ${cropName}`);
      fetchAdditionalMarketData();
    } catch (error) {
      console.error('Error creating price alert:', error);
      toast.error('Failed to create price alert');
    }
  }, [commodities, profile?.user_id, fetchAdditionalMarketData]);

  // Profit calculator
  const calculateProfit = useCallback((crop: string, costPrice: number, quantity: number): ProfitCalculation | null => {
    const priceData = marketData?.prices.find(p => p.crop.toLowerCase() === crop.toLowerCase());
    if (!priceData || costPrice <= 0 || quantity <= 0) return null;

    const currentPrice = priceData.price;
    const totalCost = costPrice * quantity;
    const totalRevenue = currentPrice * quantity;
    const profit = totalRevenue - totalCost;
    const profitPercentage = (profit / totalCost) * 100;

    let recommendation = '';
    if (profitPercentage > 20) {
      recommendation = '🟢 Excellent profit margin! Good time to sell.';
    } else if (profitPercentage > 10) {
      recommendation = '🟡 Good profit margin. Consider market trends.';
    } else if (profitPercentage > 0) {
      recommendation = '🟠 Low profit margin. Monitor prices closely.';
    } else {
      recommendation = '🔴 Loss situation. Consider holding if possible.';
    }

    return {
      crop,
      costPrice,
      currentPrice,
      quantity,
      profit,
      profitPercentage,
      recommendation
    };
  }, [marketData]);

  // Real-time updates
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel('enhanced-market-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'market_prices'
      }, (payload) => {
        toast.info('💫 New market prices available!');
        fetchMarketData();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id, fetchMarketData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && connectionStatus === 'connected') {
      const currentHour = new Date().getHours();
      const isMarketHours = currentHour >= 6 && currentHour <= 20;
      const refreshDelay = isMarketHours ? 30000 : 120000;
      
      const interval = setInterval(() => {
        fetchMarketData();
      }, refreshDelay);
      
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, connectionStatus, fetchMarketData]);

  // Initial data loading
  useEffect(() => {
    fetchMarketData();
    fetchAdditionalMarketData();
  }, [fetchMarketData, fetchAdditionalMarketData]);

  // Enhanced filtering
  const filteredPrices = useMemo(() => {
    if (!marketData?.prices) return [];
    
    return marketData.prices.filter(price => {
      const matchesCrop = selectedCrop === 'all' || price.crop.toLowerCase().includes(selectedCrop.toLowerCase());
      const matchesMarket = selectedMarket === 'all' || price.market.toLowerCase().includes(selectedMarket.toLowerCase());
      const matchesSearch = searchTerm === '' || 
        price.crop.toLowerCase().includes(searchTerm.toLowerCase()) ||
        price.market.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesCategory = true;
      if (selectedCategory !== 'all') {
        const commodity = commodities.find(c => c.name.toLowerCase() === price.crop.toLowerCase());
        matchesCategory = commodity?.category === selectedCategory;
      }
      
      return matchesCrop && matchesMarket && matchesSearch && matchesCategory;
    });
  }, [marketData?.prices, selectedCrop, selectedMarket, searchTerm, selectedCategory, commodities]);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(commodities.map(c => c.category))];
    return uniqueCategories.filter(Boolean);
  }, [commodities]);

  // Loading state
  if (loading && !marketData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">Loading enhanced market data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Live Market Intelligence
            {marketData?.isLive && (
              <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600 border-green-500/20">
                <Zap className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered real-time agricultural market data for Tamil Nadu farmers
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={connectionStatus === 'connected' ? 'secondary' : 'destructive'} 
            className={connectionStatus === 'connected' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}>
            <Activity className={`h-3 w-3 mr-1 ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
            {connectionStatus}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-primary/10' : ''}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse text-primary' : ''}`} />
            Auto: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          
          <Button onClick={() => fetchMarketData()} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced Status Alert */}
      {marketData && (
        <Alert className="border-primary/20 bg-primary/5">
          <Globe className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center gap-2 text-sm">
            <span><strong>{marketData.location}</strong></span>
            <Separator orientation="vertical" className="h-4" />
            <span>Source: <strong>{marketData.dataSource || 'Multiple APIs'}</strong></span>
            <Separator orientation="vertical" className="h-4" />
            <span>Updated: <strong>{lastRefresh.toLocaleTimeString()}</strong></span>
            <Separator orientation="vertical" className="h-4" />
            <span>Status: <strong className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>
              {connectionStatus}
            </strong></span>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Smart Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crops or markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by crop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Crops</SelectItem>
                {commodities.map(commodity => (
                  <SelectItem key={commodity.id} value={commodity.name.toLowerCase()}>
                    {commodity.name} ({commodity.tamil_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger>
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {markets.map(market => (
                  <SelectItem key={market.id} value={market.name}>
                    {market.name} - {market.district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="prices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="prices">
            <IndianRupee className="h-4 w-4 mr-2" />
            Live Prices
          </TabsTrigger>
          <TabsTrigger value="trends">
            <LineChart className="h-4 w-4 mr-2" />
            AI Trends
          </TabsTrigger>
          <TabsTrigger value="calculator">
            <Calculator className="h-4 w-4 mr-2" />
            Profit Calc
          </TabsTrigger>
          <TabsTrigger value="watchlist">
            <Star className="h-4 w-4 mr-2" />
            Watchlist
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="news">
            <Calendar className="h-4 w-4 mr-2" />
            News
          </TabsTrigger>
        </TabsList>

        {/* Live Prices Tab */}
        <TabsContent value="prices" className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Error: {error}</span>
                <Button variant="outline" size="sm" onClick={() => fetchMarketData()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPrices.map((price, index) => (
              <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {price.crop}
                      {getTrendIcon(price.trend, price.change)}
                      {watchlist.includes(price.crop) && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {!watchlist.includes(price.crop) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addToWatchlist(price.crop)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromWatchlist(price.crop)}
                        >
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        </Button>
                      )}
                      <Badge variant={price.trend === 'up' ? 'secondary' : price.trend === 'down' ? 'destructive' : 'outline'} 
                        className={price.trend === 'up' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}>
                        {price.trend}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {price.market}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(price.price)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {price.unit}
                      </span>
                    </div>
                    
                    {price.change !== 0 && (
                      <div className={`flex items-center gap-1 text-sm ${getTrendColor(price.trend)}`}>
                        {getTrendIcon(price.trend, price.change)}
                        <span>
                          {price.change > 0 ? '+' : ''}{formatCurrency(price.change)} today
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(price.lastUpdated).toLocaleTimeString()}
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => createPriceAlert(price.crop, 'price_above', price.price + 100)}
                      >
                        <Bell className="h-3 w-3 mr-1" />
                        Alert
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Calculator className="h-3 w-3 mr-1" />
                        Calculate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPrices.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No market data available</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or refreshing the data.
                </p>
                <Button onClick={() => fetchMarketData()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-4">
            {marketData?.marketTrends?.map((trend, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      {trend.crop} AI Market Analysis
                    </span>
                    <Badge variant="outline" className="text-primary">
                      {Math.round(trend.confidence)}% confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{trend.prediction}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>AI Confidence</span>
                      <span>{Math.round(trend.confidence)}%</span>
                    </div>
                    <Progress value={trend.confidence} className="h-2" />
                  </div>
                  {trend.factors && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Key Factors:</h4>
                      <div className="flex flex-wrap gap-2">
                        {trend.factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Profit Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Smart Profit Calculator
              </CardTitle>
              <CardDescription>
                Calculate potential profits based on current market prices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Crop</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose crop" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPrices.map(price => (
                        <SelectItem key={price.crop} value={price.crop}>
                          {price.crop} - {formatCurrency(price.price)}/{price.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Cost Price (₹)</label>
                  <Input type="number" placeholder="Enter your cost price" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <Input type="number" placeholder="Enter quantity" />
                </div>
              </div>
              
              <Button className="w-full">
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Profit
              </Button>
              
              {profitCalculator && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-3">Profit Analysis for {profitCalculator.crop}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Cost:</span>
                      <span className="font-medium ml-2">{formatCurrency(profitCalculator.costPrice * profitCalculator.quantity)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Value:</span>
                      <span className="font-medium ml-2">{formatCurrency(profitCalculator.currentPrice * profitCalculator.quantity)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Profit/Loss:</span>
                      <span className={`font-medium ml-2 ${profitCalculator.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(profitCalculator.profit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Margin:</span>
                      <span className={`font-medium ml-2 ${profitCalculator.profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profitCalculator.profitPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-background rounded border">
                    <span className="text-sm">{profitCalculator.recommendation}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Watchlist Tab */}
        <TabsContent value="watchlist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Your Crop Watchlist
              </CardTitle>
              <CardDescription>
                Track prices for crops you're interested in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watchlist.length > 0 ? (
                <div className="grid gap-2">
                  {watchlist.map((crop, index) => {
                    const priceData = marketData?.prices.find(p => p.crop.toLowerCase() === crop.toLowerCase());
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <div>
                            <span className="font-medium">{crop}</span>
                            {priceData && (
                              <div className="text-sm text-muted-foreground">
                                Current: {formatCurrency(priceData.price)}/{priceData.unit}
                                <span className={`ml-2 ${getTrendColor(priceData.trend)}`}>
                                  {priceData.change > 0 ? '+' : ''}{formatCurrency(priceData.change)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeFromWatchlist(crop)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No crops in watchlist</h3>
                  <p className="text-muted-foreground">
                    Add crops to your watchlist from the Live Prices tab
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Active Price Alerts ({alerts.length})
              </CardTitle>
              <CardDescription>
                Get notified when prices reach your target levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="grid gap-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4 text-primary" />
                        <div>
                          <span className="font-medium">{alert.crop}</span>
                          <p className="text-sm text-muted-foreground">
                            Alert when price {alert.alertType.replace('_', ' ')} {formatCurrency(alert.threshold)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={alert.isActive ? 'secondary' : 'outline'} 
                        className={alert.isActive ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}>
                        {alert.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active alerts</h3>
                  <p className="text-muted-foreground">
                    Create price alerts from the Live Prices tab
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market News Tab */}
        <TabsContent value="news" className="space-y-6">
          <div className="grid gap-4">
            {news.map((article, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{article.title}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(article.published_at).toLocaleDateString()}
                        {article.source && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span>{article.source}</span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      article.importance_level === 'urgent' ? 'destructive' :
                      article.importance_level === 'high' ? 'secondary' : 'outline'
                    } className={
                      article.importance_level === 'high' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : ''
                    }>
                      {article.importance_level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{article.content}</p>
                  {article.region && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {article.region}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {news.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recent news</h3>
                <p className="text-muted-foreground">
                  Check back later for the latest market news and updates.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Market;
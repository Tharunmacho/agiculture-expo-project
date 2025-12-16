-- Create comprehensive market-related tables for real-time data

-- Market locations table
CREATE TABLE IF NOT EXISTS public.market_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  market_type TEXT NOT NULL DEFAULT 'mandi',
  coordinates POINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Commodities master table
CREATE TABLE IF NOT EXISTS public.commodities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'quintal',
  tamil_name TEXT,
  seasonal_pattern JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Real-time market prices table
CREATE TABLE IF NOT EXISTS public.market_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commodity_id UUID NOT NULL REFERENCES public.commodities(id),
  market_location_id UUID NOT NULL REFERENCES public.market_locations(id),
  min_price DECIMAL(10,2) NOT NULL,
  max_price DECIMAL(10,2) NOT NULL,
  modal_price DECIMAL(10,2) NOT NULL,
  price_date DATE NOT NULL,
  arrivals INTEGER,
  previous_price DECIMAL(10,2),
  price_change DECIMAL(10,2),
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  data_source TEXT NOT NULL DEFAULT 'api',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Price alerts for users
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  commodity_id UUID NOT NULL REFERENCES public.commodities(id),
  market_location_id UUID REFERENCES public.market_locations(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'price_change')),
  threshold_value DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Market trends and predictions
CREATE TABLE IF NOT EXISTS public.market_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commodity_id UUID NOT NULL REFERENCES public.commodities(id),
  region TEXT NOT NULL,
  trend_direction TEXT NOT NULL CHECK (trend_direction IN ('bullish', 'bearish', 'neutral')),
  confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  prediction_text TEXT NOT NULL,
  factors JSONB,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User watchlists
CREATE TABLE IF NOT EXISTS public.user_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  commodity_id UUID NOT NULL REFERENCES public.commodities(id),
  market_location_id UUID REFERENCES public.market_locations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, commodity_id, market_location_id)
);

-- Market news and updates
CREATE TABLE IF NOT EXISTS public.market_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  affected_commodities UUID[] DEFAULT '{}',
  region TEXT,
  importance_level TEXT NOT NULL DEFAULT 'medium' CHECK (importance_level IN ('low', 'medium', 'high', 'urgent')),
  source TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Price history aggregated data
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commodity_id UUID NOT NULL REFERENCES public.commodities(id),
  market_location_id UUID NOT NULL REFERENCES public.market_locations(id),
  date DATE NOT NULL,
  avg_price DECIMAL(10,2) NOT NULL,
  min_price DECIMAL(10,2) NOT NULL,
  max_price DECIMAL(10,2) NOT NULL,
  volume INTEGER,
  price_volatility DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(commodity_id, market_location_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.market_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market_locations (public read)
CREATE POLICY "Anyone can view market locations" ON public.market_locations FOR SELECT USING (true);

-- RLS Policies for commodities (public read)
CREATE POLICY "Anyone can view commodities" ON public.commodities FOR SELECT USING (true);

-- RLS Policies for market_prices (public read)
CREATE POLICY "Anyone can view market prices" ON public.market_prices FOR SELECT USING (true);

-- RLS Policies for price_alerts (user-specific)
CREATE POLICY "Users can manage their price alerts" ON public.price_alerts FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for market_trends (public read)
CREATE POLICY "Anyone can view market trends" ON public.market_trends FOR SELECT USING (true);

-- RLS Policies for user_watchlists (user-specific)
CREATE POLICY "Users can manage their watchlists" ON public.user_watchlists FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for market_news (public read)
CREATE POLICY "Anyone can view market news" ON public.market_news FOR SELECT USING (true);

-- RLS Policies for price_history (public read)
CREATE POLICY "Anyone can view price history" ON public.price_history FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_prices_commodity_date ON public.market_prices(commodity_id, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_prices_location_date ON public.market_prices(market_location_id, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active ON public.price_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user ON public.user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_market_trends_commodity ON public.market_trends(commodity_id, valid_until DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_commodity_date ON public.price_history(commodity_id, date DESC);

-- Enable Realtime for market_prices table
ALTER TABLE public.market_prices REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_prices;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_market_locations_updated_at
  BEFORE UPDATE ON public.market_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_prices_updated_at
  BEFORE UPDATE ON public.market_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for Tamil Nadu markets and commodities
INSERT INTO public.market_locations (name, district, state, market_type) VALUES
('Koyambedu Market', 'Chennai', 'Tamil Nadu', 'wholesale'),
('Uzhavar Sandhai', 'Chennai', 'Tamil Nadu', 'retail'),
('Chengalpattu Mandi', 'Chengalpattu', 'Tamil Nadu', 'mandi'),
('Tiruvannamalai Mandi', 'Tiruvannamalai', 'Tamil Nadu', 'mandi'),
('Coimbatore Market', 'Coimbatore', 'Tamil Nadu', 'wholesale'),
('Salem Market', 'Salem', 'Tamil Nadu', 'wholesale'),
('Madurai Market', 'Madurai', 'Tamil Nadu', 'wholesale'),
('Trichy Market', 'Tiruchirappalli', 'Tamil Nadu', 'wholesale')
ON CONFLICT DO NOTHING;

INSERT INTO public.commodities (name, category, unit, tamil_name) VALUES
('Rice', 'cereals', 'quintal', 'அரிசி'),
('Wheat', 'cereals', 'quintal', 'கோதுமை'),
('Maize', 'cereals', 'quintal', 'சோளம்'),
('Sugarcane', 'cash_crops', 'tonne', 'கரும்பு'),
('Cotton', 'cash_crops', 'quintal', 'பருத்தி'),
('Groundnut', 'oilseeds', 'quintal', 'வேர்க்கடலை'),
('Sesame', 'oilseeds', 'quintal', 'எள்'),
('Tomato', 'vegetables', 'quintal', 'தக்காளி'),
('Onion', 'vegetables', 'quintal', 'வெங்காயம்'),
('Potato', 'vegetables', 'quintal', 'உருளைக்கிழங்கு'),
('Brinjal', 'vegetables', 'quintal', 'கத்தரிக்காய்'),
('Okra', 'vegetables', 'quintal', 'வெண்டைக்காய்'),
('Green Chilli', 'vegetables', 'quintal', 'பச்சை மிளகாய்'),
('Banana', 'fruits', 'quintal', 'வாழைப்பழம்'),
('Mango', 'fruits', 'quintal', 'மாம்பழம்'),
('Coconut', 'fruits', 'piece', 'தேங்காய்'),
('Turmeric', 'spices', 'quintal', 'மஞ்சள்'),
('Coriander', 'spices', 'quintal', 'கொத்தமல்லி'),
('Black Pepper', 'spices', 'quintal', 'கருப்பு மிளகு'),
('Cardamom', 'spices', 'quintal', 'ஏலக்காய்')
ON CONFLICT (name) DO NOTHING;
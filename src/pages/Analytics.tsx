import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Leaf, Calendar, Plus, Target, Activity, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FarmRecord {
  id: string;
  crop_type: string;
  field_size: number;
  planting_date: string;
  harvest_date: string;
  expected_yield: number;
  actual_yield: number;
  investment_cost: number;
  revenue: number;
  profit: number;
  notes: string;
  created_at: string;
}

interface FarmActivity {
  id: string;
  farm_record_id: string;
  activity_type: string;
  activity_date: string;
  description: string;
  cost: number;
  created_at: string;
}

const Analytics = () => {
  const [farmRecords, setFarmRecords] = useState<FarmRecord[]>([]);
  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRecordDialog, setShowNewRecordDialog] = useState(false);
  const [newRecord, setNewRecord] = useState({
    crop_type: '',
    field_size: '',
    planting_date: '',
    harvest_date: '',
    expected_yield: '',
    actual_yield: '',
    investment_cost: '',
    revenue: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }

      // Try to fetch from farm_records and farm_activities tables
      try {
        const [recordsResult, activitiesResult] = await Promise.all([
          supabase
            .from('farm_records')
            .select('*')
            .eq('user_id', user.id)
            .order('planting_date', { ascending: false }),
          supabase
            .from('farm_activities')
            .select('*')
            .eq('user_id', user.id)
            .order('activity_date', { ascending: false })
        ]);

        if (recordsResult.error) {
          console.log('Farm records table not available:', recordsResult.error.message);
        } else {
          setFarmRecords(recordsResult.data || []);
        }

        if (activitiesResult.error) {
          console.log('Farm activities table not available:', activitiesResult.error.message);
        } else {
          setActivities(activitiesResult.data || []);
        }

        // If no data in these tables, create sample data from calendar
        if ((!recordsResult.data || recordsResult.data.length === 0) && !recordsResult.error) {
          console.log('No farm records found, using sample data');
        }
      } catch (error) {
        console.log('Analytics tables not set up yet, using demo data');
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Analytics Loading",
        description: "Using demo data. Add farm records to see your own analytics.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate profit: Revenue - Investment Cost
      const investmentCost = parseFloat(newRecord.investment_cost) || 0;
      const revenue = parseFloat(newRecord.revenue) || 0;
      const profit = revenue - investmentCost;

      console.log('💰 Creating farm record:', {
        investment: investmentCost,
        revenue: revenue,
        profit: profit
      });

      const { error } = await supabase.from('farm_records').insert({
        user_id: user.id,
        crop_type: newRecord.crop_type,
        field_size: parseFloat(newRecord.field_size),
        planting_date: newRecord.planting_date,
        harvest_date: newRecord.harvest_date,
        expected_yield: parseFloat(newRecord.expected_yield),
        actual_yield: parseFloat(newRecord.actual_yield) || null,
        investment_cost: investmentCost,
        revenue: revenue,
        profit: profit
      });

      if (error) {
        console.error('❌ Error creating record:', error);
        throw error;
      }

      console.log('✅ Farm record created successfully');

      toast({
        title: "Farm record created!",
        description: `Profit: ₹${profit.toLocaleString()} recorded successfully.`,
      });

      setShowNewRecordDialog(false);
      setNewRecord({
        crop_type: '',
        field_size: '',
        planting_date: '',
        harvest_date: '',
        expected_yield: '',
        actual_yield: '',
        investment_cost: '',
        revenue: ''
      });
      fetchAnalyticsData();
    } catch (error) {
      console.error('Error creating record:', error);
      toast({
        title: "Error creating record",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate analytics
  const totalProfit = farmRecords.reduce((sum, record) => sum + (record.profit || 0), 0);
  const totalRevenue = farmRecords.reduce((sum, record) => sum + (record.revenue || 0), 0);
  const totalCost = farmRecords.reduce((sum, record) => sum + (record.investment_cost || 0), 0);
  const roi = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;
  
  const avgYieldEfficiency = farmRecords.length > 0 
    ? farmRecords.reduce((sum, record) => {
        if (record.expected_yield && record.actual_yield) {
          return sum + (record.actual_yield / record.expected_yield * 100);
        }
        return sum;
      }, 0) / farmRecords.filter(r => r.expected_yield && r.actual_yield).length
    : 0;

  // If no data, show helpful message instead of confusing zeros
  const hasData = farmRecords.length > 0;

  // Chart data
  const cropPerformanceData = farmRecords.reduce((acc, record) => {
    const existing = acc.find(item => item.crop === record.crop_type);
    if (existing) {
      existing.profit += record.profit || 0;
      existing.revenue += record.revenue || 0;
      existing.count += 1;
    } else {
      acc.push({
        crop: record.crop_type,
        profit: record.profit || 0,
        revenue: record.revenue || 0,
        count: 1
      });
    }
    return acc;
  }, [] as any[]);

  const monthlyProfitData = farmRecords.reduce((acc, record) => {
    if (record.harvest_date) {
      const month = new Date(record.harvest_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const existing = acc.find(item => item.month === month);
      if (existing) {
        existing.profit += record.profit || 0;
      } else {
        acc.push({ month, profit: record.profit || 0 });
      }
    }
    return acc;
  }, [] as any[]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#fbbf24', '#f87171', '#34d399'];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Farm Analytics</h1>
        <Dialog open={showNewRecordDialog} onOpenChange={setShowNewRecordDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Farm Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Farm Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select value={newRecord.crop_type} onValueChange={(value) => setNewRecord(prev => ({ ...prev, crop_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crop type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rice">Rice</SelectItem>
                    <SelectItem value="wheat">Wheat</SelectItem>
                    <SelectItem value="maize">Maize</SelectItem>
                    <SelectItem value="cotton">Cotton</SelectItem>
                    <SelectItem value="sugarcane">Sugarcane</SelectItem>
                    <SelectItem value="vegetables">Vegetables</SelectItem>
                    <SelectItem value="fruits">Fruits</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Field size (acres)"
                  value={newRecord.field_size}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, field_size: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  placeholder="Planting date"
                  value={newRecord.planting_date}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, planting_date: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="Expected harvest date"
                  value={newRecord.harvest_date}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, harvest_date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Expected yield (kg)"
                  value={newRecord.expected_yield}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, expected_yield: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Actual yield (kg) - optional"
                  value={newRecord.actual_yield}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, actual_yield: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Investment cost (₹)"
                  value={newRecord.investment_cost}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, investment_cost: e.target.value }))}
                  required
                />
                <Input
                  type="number"
                  placeholder="Revenue earned (₹)"
                  value={newRecord.revenue}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, revenue: e.target.value }))}
                  required
                />
              </div>
              {newRecord.investment_cost && newRecord.revenue && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Calculated Profit: ₹{(parseFloat(newRecord.revenue || '0') - parseFloat(newRecord.investment_cost || '0')).toLocaleString()}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewRecordDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRecord} disabled={!newRecord.crop_type || !newRecord.field_size}>
                  Add Record
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasData ? `₹${totalProfit.toLocaleString()}` : '₹0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {!hasData ? (
                <span className="text-gray-500">Add farm records to track profit</span>
              ) : totalProfit > 0 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Profitable
                </span>
              ) : totalProfit < 0 ? (
                <span className="text-red-600 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Loss
                </span>
              ) : (
                <span className="text-gray-500">Break even</span>
              )}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasData ? `₹${totalRevenue.toLocaleString()}` : '₹0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasData ? `ROI: ${roi.toFixed(1)}%` : 'Start tracking revenue'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yield Efficiency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasData && !isNaN(avgYieldEfficiency) ? `${avgYieldEfficiency.toFixed(1)}%` : '0%'}
            </div>
            <Progress value={hasData ? avgYieldEfficiency : 0} className="mt-2" />
            {!hasData && (
              <p className="text-xs text-muted-foreground mt-1">Record harvests to track</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farm Records</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farmRecords.length}</div>
            <p className="text-xs text-muted-foreground">
              {activities.length} activities logged
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="crops">Crop Performance</TabsTrigger>
          <TabsTrigger value="records">Farm Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Profit Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyProfitData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crop Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={cropPerformanceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="count"
                      label={({ crop, count }) => `${crop}: ${count}`}
                    >
                      {cropPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="crops" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Crop Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={cropPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="crop" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="profit" fill="hsl(var(--primary))" name="Profit (₹)" />
                  <Bar dataKey="revenue" fill="hsl(var(--secondary))" name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <div className="space-y-4">
            {farmRecords.map((record) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">{record.crop_type}</CardTitle>
                    <Badge variant={record.profit >= 0 ? "default" : "destructive"}>
                      {record.profit >= 0 ? `+₹${record.profit}` : `-₹${Math.abs(record.profit)}`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Field Size:</span>
                      <p className="font-medium">{record.field_size} acres</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Planting:</span>
                      <p className="font-medium">{new Date(record.planting_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected Yield:</span>
                      <p className="font-medium">{record.expected_yield} kg</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Investment:</span>
                      <p className="font-medium">₹{record.investment_cost}</p>
                    </div>
                  </div>
                  {record.notes && (
                    <div className="mt-4">
                      <span className="text-muted-foreground text-sm">Notes:</span>
                      <p className="text-sm mt-1">{record.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
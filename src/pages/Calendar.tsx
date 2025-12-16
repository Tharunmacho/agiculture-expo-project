import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, Plus, Leaf, Droplets, Scissors, Sprout, Bug, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CropCalendarItem {
  id: string;
  crop_type: string;
  activity_type: string;
  scheduled_date: string;
  completed: boolean;
  notes: string;
  created_at: string;
}

const Calendar = () => {
  const [calendarItems, setCalendarItems] = useState<CropCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newItem, setNewItem] = useState({
    crop_type: '',
    activity_type: '',
    scheduled_date: '',
    notes: ''
  });
  const { toast } = useToast();

  const activityTypes = [
    { value: 'planting', label: 'Planting', icon: Sprout },
    { value: 'watering', label: 'Watering', icon: Droplets },
    { value: 'fertilizing', label: 'Fertilizing', icon: Leaf },
    { value: 'pruning', label: 'Pruning', icon: Scissors },
    { value: 'pest_control', label: 'Pest Control', icon: Bug },
    { value: 'harvesting', label: 'Harvesting', icon: Sun }
  ];

  const cropTypes = [
    'rice', 'wheat', 'maize', 'cotton', 'sugarcane', 'vegetables', 'fruits', 'pulses', 'spices'
  ];

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('crop_calendar')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setCalendarItems(data || []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast({
        title: "Error loading calendar",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('💾 Saving calendar item:', {
        user_id: user.id,
        crop_type: newItem.crop_type,
        activity_type: newItem.activity_type,
        scheduled_date: newItem.scheduled_date,
        notes: newItem.notes
      });

      const { data, error } = await supabase.from('crop_calendar').insert({
        user_id: user.id,
        crop_type: newItem.crop_type,
        activity_type: newItem.activity_type,
        scheduled_date: newItem.scheduled_date,
        notes: newItem.notes
      }).select();

      if (error) {
        console.error('❌ Insert error:', error);
        throw error;
      }

      console.log('✅ Calendar item saved:', data);

      toast({
        title: "Activity scheduled!",
        description: "Your farming activity has been added to the calendar.",
      });

      setShowNewItemDialog(false);
      setNewItem({ crop_type: '', activity_type: '', scheduled_date: '', notes: '' });
      fetchCalendarData();
    } catch (error) {
      console.error('Error creating calendar item:', error);
      toast({
        title: "Error scheduling activity",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleCompleted = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('crop_calendar')
        .update({ completed })
        .eq('id', id);

      if (error) throw error;

      setCalendarItems(prev => prev.map(item => 
        item.id === id ? { ...item, completed } : item
      ));

      toast({
        title: completed ? "Activity completed!" : "Activity marked as pending",
        description: completed ? "Great work on your farming schedule!" : "Activity moved back to pending.",
      });
    } catch (error) {
      console.error('Error updating calendar item:', error);
      toast({
        title: "Error updating activity",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Group items by date
  const groupedItems = calendarItems.reduce((acc, item) => {
    const date = item.scheduled_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {} as Record<string, CropCalendarItem[]>);

  // Get items for today and upcoming
  const today = new Date().toISOString().split('T')[0];
  const todayItems = groupedItems[today] || [];
  const upcomingItems = calendarItems.filter(item => 
    item.scheduled_date > today && !item.completed
  ).slice(0, 5);

  const getActivityIcon = (activityType: string) => {
    const activity = activityTypes.find(a => a.value === activityType);
    return activity ? activity.icon : Leaf;
  };

  const getPriorityBadge = (date: string, completed: boolean) => {
    if (completed) return <Badge variant="default">Completed</Badge>;
    
    const today = new Date().toISOString().split('T')[0];
    const itemDate = new Date(date);
    const todayDate = new Date(today);
    const diffDays = Math.ceil((itemDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return <Badge variant="destructive">Overdue</Badge>;
    if (diffDays === 0) return <Badge variant="default">Today</Badge>;
    if (diffDays <= 3) return <Badge variant="secondary">Upcoming</Badge>;
    return <Badge variant="outline">Scheduled</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Crop Calendar</h1>
        <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Activity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select value={newItem.crop_type} onValueChange={(value) => setNewItem(prev => ({ ...prev, crop_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crop type" />
                  </SelectTrigger>
                  <SelectContent>
                    {cropTypes.map((crop) => (
                      <SelectItem key={crop} value={crop}>
                        {crop.charAt(0).toUpperCase() + crop.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newItem.activity_type} onValueChange={(value) => setNewItem(prev => ({ ...prev, activity_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((activity) => (
                      <SelectItem key={activity.value} value={activity.value}>
                        {activity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="date"
                value={newItem.scheduled_date}
                onChange={(e) => setNewItem(prev => ({ ...prev, scheduled_date: e.target.value }))}
              />
              <Input
                placeholder="Notes (optional)"
                value={newItem.notes}
                onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateItem} disabled={!newItem.crop_type || !newItem.activity_type || !newItem.scheduled_date}>
                  Schedule Activity
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Today's Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No activities scheduled for today
              </p>
            ) : (
              <div className="space-y-3">
                {todayItems.map((item) => {
                  const ActivityIcon = getActivityIcon(item.activity_type);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={(checked) => toggleCompleted(item.id, checked as boolean)}
                      />
                      <ActivityIcon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {item.activity_type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.crop_type}
                          </Badge>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                      {getPriorityBadge(item.scheduled_date, item.completed)}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Upcoming Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No upcoming activities scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingItems.map((item) => {
                  const ActivityIcon = getActivityIcon(item.activity_type);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <ActivityIcon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {item.activity_type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.crop_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.scheduled_date).toLocaleDateString()}
                        </p>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                      {getPriorityBadge(item.scheduled_date, item.completed)}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>All Scheduled Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedItems)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, items]) => (
                <div key={date} className="border-l-2 border-primary pl-4">
                  <h3 className="font-semibold text-lg mb-3">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const ActivityIcon = getActivityIcon(item.activity_type);
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) => toggleCompleted(item.id, checked as boolean)}
                          />
                          <ActivityIcon className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">
                                {item.activity_type.replace('_', ' ')}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {item.crop_type}
                              </Badge>
                            </div>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                          {getPriorityBadge(item.scheduled_date, item.completed)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
          
          {calendarItems.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No activities scheduled</h3>
              <p className="text-muted-foreground">
                Start planning your farming activities by scheduling your first task.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Calendar;
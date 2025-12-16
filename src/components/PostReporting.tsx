import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Flag, AlertTriangle } from 'lucide-react';

interface PostReportingProps {
  postId: string;
  children: React.ReactNode;
}

export const PostReporting: React.FC<PostReportingProps> = ({ postId, children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportTypes = [
    { value: 'spam', label: 'Spam or unwanted content' },
    { value: 'inappropriate', label: 'Inappropriate or offensive content' },
    { value: 'misinformation', label: 'False or misleading information' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'copyright', label: 'Copyright violation' },
    { value: 'other', label: 'Other (please specify)' }
  ];

  const handleSubmit = async () => {
    if (!user?.id || !reportType) {
      toast({
        title: "Missing Information",
        description: "Please select a report type",
        variant: "destructive",
      });
      return;
    }

    if (reportType === 'other' && !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for reporting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_reports')
        .insert({
          post_id: postId,
          reported_by: user.id,
          report_type: reportType,
          reason: reason.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our community safe. We'll review this report.",
      });

      setIsOpen(false);
      setReportType('');
      setReason('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Report Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Before reporting:</p>
                <p>Please consider whether this content violates our community guidelines. False reports may result in account restrictions.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium">Why are you reporting this post?</Label>
            <RadioGroup value={reportType} onValueChange={setReportType}>
              {reportTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="text-sm">
                    {type.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {(reportType === 'other' || reportType) && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Additional details {reportType === 'other' ? '(required)' : '(optional)'}
              </Label>
              <Textarea
                id="reason"
                placeholder="Please provide more details about why you're reporting this post..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reportType || isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
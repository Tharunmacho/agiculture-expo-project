import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Users, CheckCircle } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  expires_at?: string;
  created_by: string;
  allows_multiple: boolean;
  is_anonymous: boolean;
}

interface InteractivePollProps {
  poll: Poll;
  onVote?: (pollId: string, optionId: string) => void;
  showResults?: boolean;
}

export const InteractivePoll: React.FC<InteractivePollProps> = ({
  poll,
  onVote,
  showResults = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  // Check if user has already voted
  React.useEffect(() => {
    const userVotes = poll.options.some(option => 
      option.voters.includes(user?.id || '')
    );
    setHasVoted(userVotes);
  }, [poll, user]);

  const handleVote = async () => {
    if (!user || voting) return;
    
    const optionsToVote = poll.allows_multiple ? selectedOptions : [selectedOption].filter(Boolean);
    if (optionsToVote.length === 0) return;

    setVoting(true);
    try {
      // Simulate recording votes in user activity instead
      await supabase
        .from('user_activity_feed')
        .insert({
          user_id: user.id,
          activity_type: 'poll_vote',
          target_type: 'poll',
          target_id: poll.id,
          metadata: { options: optionsToVote }
        });

      setHasVoted(true);
      onVote?.(poll.id, optionsToVote[0]);
      
      toast({
        title: "Vote recorded!",
        description: "Thank you for participating in this poll",
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to record your vote",
        variant: "destructive",
      });
    } finally {
      setVoting(false);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    if (hasVoted) return;

    if (poll.allows_multiple) {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOption(optionId);
    }
  };

  const getOptionPercentage = (option: PollOption) => {
    if (poll.total_votes === 0) return 0;
    return Math.round((option.votes / poll.total_votes) * 100);
  };

  const isExpired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false;
  const canVote = user && !hasVoted && !isExpired;
  const shouldShowResults = showResults || hasVoted || isExpired;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Poll Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Poll</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {poll.allows_multiple && (
              <Badge variant="secondary" className="text-xs">
                Multiple Choice
              </Badge>
            )}
            {poll.is_anonymous && (
              <Badge variant="outline" className="text-xs">
                Anonymous
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                Ended
              </Badge>
            )}
          </div>
        </div>

        {/* Poll Question */}
        <h4 className="text-lg font-medium mb-4">{poll.question}</h4>

        {/* Poll Options */}
        <div className="space-y-3">
          {poll.options.map((option) => {
            const percentage = getOptionPercentage(option);
            const isSelected = poll.allows_multiple 
              ? selectedOptions.includes(option.id)
              : selectedOption === option.id;

            return (
              <div
                key={option.id}
                className={`relative border rounded-lg p-3 cursor-pointer transition-all ${
                  canVote 
                    ? 'hover:border-primary hover:bg-primary/5' 
                    : 'cursor-default'
                } ${
                  isSelected && canVote ? 'border-primary bg-primary/10' : ''
                }`}
                onClick={() => canVote && handleOptionSelect(option.id)}
              >
                {shouldShowResults && (
                  <div className="absolute inset-0 bg-primary/10 rounded-lg transition-all">
                    <div 
                      className="h-full bg-primary/20 rounded-lg transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {canVote && (
                      <div className={`w-4 h-4 border-2 rounded ${
                        poll.allows_multiple ? 'rounded-sm' : 'rounded-full'
                      } ${
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-white m-0.5" />
                        )}
                      </div>
                    )}
                    
                    <span className="font-medium">{option.text}</span>
                  </div>
                  
                  {shouldShowResults && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{percentage}%</span>
                      <span className="text-xs text-muted-foreground">
                        ({option.votes} votes)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote Button */}
        {canVote && (
          <Button
            onClick={handleVote}
            disabled={
              voting || 
              (poll.allows_multiple ? selectedOptions.length === 0 : !selectedOption)
            }
            className="w-full mt-4"
          >
            {voting ? 'Recording Vote...' : 'Vote'}
          </Button>
        )}

        {/* Poll Stats */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{poll.total_votes} votes</span>
          </div>
          
          {poll.expires_at && (
            <span>
              {isExpired 
                ? 'Poll ended' 
                : `Ends ${new Date(poll.expires_at).toLocaleDateString()}`
              }
            </span>
          )}
        </div>

        {hasVoted && (
          <div className="mt-2 text-center">
            <Badge variant="outline" className="text-xs">
              ✓ You voted in this poll
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
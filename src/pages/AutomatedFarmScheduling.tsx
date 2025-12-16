import React from 'react';
import { EmbeddedToolWrapper } from '@/components/EmbeddedToolWrapper';
import { Calendar } from 'lucide-react';

const AutomatedFarmScheduling = () => {
  return (
    <EmbeddedToolWrapper
      src="https://y0h0i3cqe5p0.manus.space/"
      title="Automated Farm Scheduling"
      description="Intelligent scheduling system for farm activities, planting, and harvest planning"
      category="Schedule Management"
      icon={Calendar}
      farmingUseCase="Optimize planting schedules, track activities, and plan seasonal operations"
    />
  );
};

export default AutomatedFarmScheduling;
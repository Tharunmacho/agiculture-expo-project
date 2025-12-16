import React from 'react';
import { EmbeddedToolWrapper } from '@/components/EmbeddedToolWrapper';
import { Sprout } from 'lucide-react';

const SmartCropRecommender = () => {
  return (
    <EmbeddedToolWrapper
      src="https://kkh7ikclnezl.manus.space/"
      title="Smart Crop Recommender"
      description="AI-powered crop selection and recommendation system for optimal farming decisions"
      category="Crop Planning"
      icon={Sprout}
      farmingUseCase="Select the best crops for your soil type, climate, and market conditions"
    />
  );
};

export default SmartCropRecommender;
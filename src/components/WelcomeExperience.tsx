import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sprout, 
  MessageSquare, 
  Camera, 
  Sparkles, 
  Volume2,
  VolumeX,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface WelcomeExperienceProps {
  onComplete: () => void;
}

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({ onComplete }) => {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const getWelcomeMessage = () => {
    const messages = {
      english: `Welcome to GrowSmart AI, ${profile?.full_name?.split(' ')[0] || 'Friend'}! I'm your personal agricultural assistant, ready to help you grow smarter and farm better.`,
      hindi: `GrowSmart AI में आपका हार्दिक स्वागत है, ${profile?.full_name?.split(' ')[0] || 'मित्र'}! मैं आपका व्यक्तिगत कृषि सहायक हूँ, आपको बेहतर खेती करने में मदद करने के लिए तैयार हूँ।`,
      tamil: `GrowSmart AI-க்கு வரவேற்கிறோம், ${profile?.full_name?.split(' ')[0] || 'நண்பரே'}! நான் உங்கள் தனிப்பட்ட விவசாய உதவியாளர், உங்களுக்கு சிறந்த விவசாயம் செய்ய உதவ தயாராக உள்ளேன்.`,
      telugu: `GrowSmart AI కి హృదయపూర్వక స్వాగతం, ${profile?.full_name?.split(' ')[0] || 'మిత్రమా'}! నేను మీ వ్యక్తిగత వ్యవసాయ సహాయకుడిని, మీకు మెరుగైన వ్యవసాయం చేయడంలో సహాయం చేయడానికి సిద్ధంగా ఉన్నాను.`,
      kannada: `GrowSmart AI ಗೆ ಹೃದಯಪೂರ್ವಕ ಸ್ವಾಗತ, ${profile?.full_name?.split(' ')[0] || 'ಸ್ನೇಹಿತರೇ'}! ನಾನು ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಕೃಷಿ ಸಹಾಯಕ, ನಿಮಗೆ ಉತ್ತಮ ಕೃಷಿ ಮಾಡಲು ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧ.`,
      marathi: `GrowSmart AI मध्ये मनापासून स्वागत आहे, ${profile?.full_name?.split(' ')[0] || 'मित्रा'}! मी तुमचा वैयक्तिक कृषी सहाय्यक आहे, तुम्हाला चांगली शेती करण्यास मदत करण्यासाठी तयार आहे.`,
      gujarati: `GrowSmart AI માં હૃદયપૂર્વક સ્વાગત છે, ${profile?.full_name?.split(' ')[0] || 'મિત્ર'}! હું તમારો વ્યક્તિગત કૃષિ સહાયક છું, તમને વધુ સારી ખેતી કરવામાં મદદ કરવા માટે તૈયાર છું.`,
      bengali: `GrowSmart AI তে আন্তরিক স্বাগতম, ${profile?.full_name?.split(' ')[0] || 'বন্ধু'}! আমি আপনার ব্যক্তিগত কৃষি সহায়ক, আপনাকে আরও ভাল চাষাবাদ করতে সাহায্য করার জন্য প্রস্তুত।`
    };

    return messages[profile?.preferred_language as keyof typeof messages] || messages.english;
  };

  const welcomeSteps = [
    {
      title: 'Welcome to GrowSmart AI!',
      description: 'Your intelligent farming companion crafted with care for modern agriculture',
      icon: Sprout,
      color: 'bg-emerald-500'
    },
    {
      title: 'Chat with AI Expert',
      description: 'Get instant answers to all your farming questions',
      icon: MessageSquare,
      color: 'bg-blue-500'
    },
    {
      title: 'Plant Identification',
      description: 'Upload photos to identify plants and diseases',
      icon: Camera,
      color: 'bg-green-500'
    },
    {
      title: 'Personalized for You',
      description: `Tailored advice for ${profile?.crop_types?.length || 0} crop types in ${profile?.district || 'your area'}`,
      icon: Sparkles,
      color: 'bg-purple-500'
    }
  ];

  const playWelcomeMessage = () => {
    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(getWelcomeMessage());
      utterance.lang = profile?.preferred_language === 'english' ? 'en-US' : 'hi-IN';
      utterance.onend = () => setIsPlaying(false);
      speechSynthesis.speak(utterance);
    }
  };

  const stopWelcomeMessage = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const nextStep = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const currentStepData = welcomeSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {/* Progress */}
          <div className="flex justify-center space-x-2 mb-6">
            {welcomeSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={`w-16 h-16 ${currentStepData.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
            <currentStepData.icon className="w-8 h-8 text-white" />
          </div>

          {/* Content */}
          <h2 className="text-xl font-bold mb-3">{currentStepData.title}</h2>
          <p className="text-gray-600 mb-6">{currentStepData.description}</p>

          {/* Welcome Message (only on first step) */}
          {currentStep === 0 && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-emerald-800 mb-3">
                {getWelcomeMessage()}
              </p>
              <div className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isPlaying ? stopWelcomeMessage : playWelcomeMessage}
                  disabled={!('speechSynthesis' in window)}
                >
                  {isPlaying ? (
                    <>
                      <VolumeX className="w-4 h-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-1" />
                      Listen
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Role-specific content */}
          {currentStep === 3 && profile?.role && (
            <div className="mb-4">
              <Badge variant="outline" className="capitalize">
                {profile.role} Dashboard
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onComplete}
              disabled={currentStep === 0}
            >
              Skip Tour
            </Button>
            <Button onClick={nextStep} className="flex items-center">
              {currentStep === welcomeSteps.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Quick actions on last step */}
          {currentStep === welcomeSteps.length - 1 && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-600 mb-3">Quick start:</p>
              <div className="flex justify-center space-x-2">
                <Link to="/?tab=chat">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Ask AI
                  </Button>
                </Link>
                <Link to="/?tab=identify">
                  <Button variant="outline" size="sm">
                    <Camera className="w-4 h-4 mr-1" />
                    Identify Plant
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
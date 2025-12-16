import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LanguageSelection as LanguageSelectionComponent } from '@/components/LanguageSelection';
import { LiteracyCheck } from '@/components/LiteracyCheck';

export const LanguageSelectionPage: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [showLiteracyCheck, setShowLiteracyCheck] = useState(false);
  const navigate = useNavigate();

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setShowLiteracyCheck(true);
    localStorage.setItem('selectedLanguage', language);
  };

  const handleLiteracySelect = (isLiterate: boolean) => {
    localStorage.setItem('literacyStatus', isLiterate ? 'literate' : 'illiterate');
    
    if (isLiterate) {
      // Literate users need to sign in first
      navigate('/auth');
    } else {
      // Illiterate users go directly to voice chat (no sign-in needed)
      navigate('/voice-chat');
    }
  };

  if (showLiteracyCheck) {
    return (
      <LiteracyCheck
        selectedLanguage={selectedLanguage}
        onLiteracySelect={handleLiteracySelect}
      />
    );
  }

  return (
    <LanguageSelectionComponent onLanguageSelect={handleLanguageSelect} />
  );
};
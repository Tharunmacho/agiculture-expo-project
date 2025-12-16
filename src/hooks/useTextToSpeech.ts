import React, { useState, useCallback, useEffect } from 'react';
import { getLanguageConfig } from '@/utils/languageConfig';

interface TextToSpeechHook {
  isSpeaking: boolean;
  speak: (text: string, options?: SpeechSynthesisUtteranceOptions) => Promise<void>;
  stop: () => void;
  cancel: () => void;
  voices: SpeechSynthesisVoice[];
  isSupported: boolean;
}

interface SpeechSynthesisUtteranceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}

export const useTextToSpeech = (language: string): TextToSpeechHook => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const languageConfig = getLanguageConfig(language);

  // Load voices
  const loadVoices = useCallback(() => {
    if (isSupported) {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      return availableVoices;
    }
    return [];
  }, [isSupported]);

  // Get best voice for language
  const getBestVoice = useCallback((allVoices: SpeechSynthesisVoice[]) => {
    if (!allVoices.length) return null;
    
    // For Tamil, specifically look for Tamil voices
    if (language === 'tamil') {
      let tamilVoice = allVoices.find(v => 
        v.lang.includes('ta') || v.lang.includes('tamil') || v.name.toLowerCase().includes('tamil')
      );
      
      if (tamilVoice) return tamilVoice;
      
      // Fallback to Indian English for Tamil content
      tamilVoice = allVoices.find(v => v.lang.includes('en-IN'));
      if (tamilVoice) return tamilVoice;
    }

    const speechCode = languageConfig.speechCode;
    
    // Try to find exact language match
    let voice = allVoices.find(v => v.lang === speechCode);
    
    // Fallback to language code without region
    if (!voice) {
      const langCode = speechCode.split('-')[0];
      voice = allVoices.find(v => v.lang.startsWith(langCode));
    }
    
    // Fallback to any available voice
    if (!voice) {
      voice = allVoices[0];
    }
    
    return voice;
  }, [languageConfig.speechCode, language]);

  const speak = useCallback(async (text: string, options: SpeechSynthesisUtteranceOptions = {}): Promise<void> => {
    if (!isSupported) {
      console.warn('Text-to-speech is not supported in this browser');
      return;
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Load voices if not already loaded
      let availableVoices = voices;
      if (!availableVoices.length) {
        availableVoices = loadVoices();
      }

      // Set voice
      const bestVoice = options.voice || getBestVoice(availableVoices);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      // Set language - ensure Tamil uses proper language code
      utterance.lang = language === 'tamil' ? 'ta-IN' : languageConfig.speechCode;
      
      // Set options
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log(`Started speaking in ${languageConfig.nativeName}`);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('Finished speaking');
        resolve();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('Speech synthesis error:', event.error);
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };

      utterance.onpause = () => {
        console.log('Speech paused');
      };

      utterance.onresume = () => {
        console.log('Speech resumed');
      };

      // Start speaking
      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        setIsSpeaking(false);
        reject(error);
      }
    });
  }, [isSupported, voices, languageConfig, loadVoices, getBestVoice]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.pause();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const cancel = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  // Load voices on component mount and when voices change
  React.useEffect(() => {
    if (isSupported) {
      loadVoices();
      
      // Listen for voices changed event
      const handleVoicesChanged = () => {
        loadVoices();
      };
      
      speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      return () => {
        speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, [isSupported, loadVoices]);

  return {
    isSpeaking,
    speak,
    stop,
    cancel,
    voices,
    isSupported
  };
};
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceCommandsOptions {
  onCommand?: (command: string) => void;
  onTranscript?: (transcript: string) => void;
  continuous?: boolean;
  language?: string;
}

interface VoiceCommandsHook {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  error: string | null;
}

const useVoiceCommands = ({
  onCommand,
  onTranscript,
  continuous = false,
  language = 'en-US'
}: VoiceCommandsOptions = {}): VoiceCommandsHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const recognitionRef = useRef<any>(null);

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const processVoiceCommand = useCallback((text: string) => {
    const lowerText = text.toLowerCase();
    
    // Define voice commands
    const commands = {
      'start chat': () => onCommand?.('navigate:chat'),
      'open chat': () => onCommand?.('navigate:chat'),
      'identify plant': () => onCommand?.('navigate:plant'),
      'plant identification': () => onCommand?.('navigate:plant'),
      'check weather': () => onCommand?.('action:weather'),
      'market prices': () => onCommand?.('action:market'),
      'take photo': () => onCommand?.('action:camera'),
      'help': () => onCommand?.('action:help'),
      'settings': () => onCommand?.('navigate:settings'),
      'profile': () => onCommand?.('navigate:profile'),
      'dashboard': () => onCommand?.('navigate:dashboard'),
      'home': () => onCommand?.('navigate:home'),
    };

    // Check for exact matches
    for (const [command, action] of Object.entries(commands)) {
      if (lowerText.includes(command)) {
        action();
        toast({
          title: "Voice Command Recognized",
          description: `Executing: ${command}`,
        });
        return;
      }
    }

    // If no command matches, treat as general input
    onTranscript?.(text);
  }, [onCommand, onTranscript, toast]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice recognition not supported in this browser');
      toast({
        title: "Voice Not Supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive",
      });
      return;
    }

    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;

          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(confidence || 0);
          } else {
            interimTranscript += transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);

        if (finalTranscript) {
          processVoiceCommand(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        
        if (event.error !== 'no-speech') {
          toast({
            title: "Voice Recognition Error",
            description: `Error: ${event.error}`,
            variant: "destructive",
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    try {
      recognitionRef.current.start();
    } catch (err) {
      setError('Failed to start voice recognition');
      setIsListening(false);
    }
  }, [isSupported, continuous, language, processVoiceCommand, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    confidence,
    startListening,
    stopListening,
    toggleListening,
    error
  };
};

export default useVoiceCommands;
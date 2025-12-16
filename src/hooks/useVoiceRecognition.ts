import { useState, useRef, useCallback, useEffect } from 'react';
import { getLanguageConfig } from '@/utils/languageConfig';

interface VoiceRecognitionHook {
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  isSupported: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface VoiceRecognitionOptions {
  language: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResult?: (transcript: string, confidence: number) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export const useVoiceRecognition = (options: VoiceRecognitionOptions): VoiceRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const languageConfig = getLanguageConfig(options.language);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      // Configure recognition
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? true;
      recognition.maxAlternatives = options.maxAlternatives ?? 1;
      recognition.lang = languageConfig.speechCode;

      // Event handlers
      recognition.onstart = () => {
        console.log('Speech recognition started for:', languageConfig.nativeName);
        setIsListening(true);
        setError(null);
        options.onStart?.();
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let bestConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptPart = result[0].transcript;
          const confidenceScore = result[0].confidence || 0;

          if (result.isFinal) {
            finalTranscript += transcriptPart;
            bestConfidence = Math.max(bestConfidence, confidenceScore);
          } else {
            interimTranscript += transcriptPart;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        setTranscript(currentTranscript);
        setConfidence(bestConfidence);

        if (finalTranscript) {
          options.onResult?.(finalTranscript, bestConfidence);
        }

        // Reset timeout for continuous listening
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        // Auto-stop after 30 seconds of silence
        timeoutRef.current = setTimeout(() => {
          if (isListening) {
            recognition.stop();
          }
        }, 30000);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = 'Speech recognition failed';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not accessible. Please check your microphone.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please enable microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech service not allowed. Please try again.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        setError(errorMessage);
        setIsListening(false);
        options.onError?.(errorMessage);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        options.onEnd?.();
        
        // Clear timeouts
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
      };
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [options.language, options.continuous, options.interimResults]);

  const startListening = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      const errorMsg = 'Speech recognition is not supported in this browser';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return;
    }

    if (!recognitionRef.current) {
      const errorMsg = 'Speech recognition not initialized';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return;
    }

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Reset state
      setTranscript('');
      setConfidence(0);
      setError(null);

      // Update language
      recognitionRef.current.lang = languageConfig.speechCode;
      
      // Start recognition
      recognitionRef.current.start();
    } catch (err) {
      const errorMsg = 'Failed to access microphone. Please check permissions.';
      setError(errorMsg);
      setIsListening(false);
      options.onError?.(errorMsg);
    }
  }, [isSupported, languageConfig.speechCode, options]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  };
};
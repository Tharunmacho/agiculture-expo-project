import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Keyboard, 
  Languages, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  VolumeX,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
  Settings,
  User,
  Pause,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { getLanguageConfig, getVoiceChatTranslation } from '@/utils/languageConfig';

interface EnhancedVoiceChatInterfaceProps {
  selectedLanguage: string;
}

interface ConversationEntry {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  confidence?: number;
}

interface UserProfile {
  crop_types?: string[];
  region_type?: string;
  soil_type?: string;
  location?: string;
  full_name?: string;
}

// Enhanced Audio Context Manager
class AudioContextManager {
  private audioContext: AudioContext | null = null;
  private audioQueue: Uint8Array[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async addToQueue(audioData: Uint8Array): Promise<void> {
    this.audioQueue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.audioQueue.shift()!;

    try {
      await this.initialize();
      const wavData = this.createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext!.decodeAudioData(wavData.buffer as ArrayBuffer);
      
      this.currentSource = this.audioContext!.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext!.destination);
      
      this.currentSource.onended = () => this.playNext();
      this.currentSource.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext(); // Continue with next segment
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length, true);
    
    const wavArray = new Uint8Array(wavHeader.byteLength + pcmData.length);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(pcmData, wavHeader.byteLength);
    
    return wavArray;
  }

  pauseCurrentAudio(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
  }

  stopAll(): void {
    this.pauseCurrentAudio();
    this.audioQueue = [];
    this.isPlaying = false;
  }
}

export const EnhancedVoiceChatInterface: React.FC<EnhancedVoiceChatInterfaceProps> = ({ selectedLanguage }) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const [retryCount, setRetryCount] = useState(0);
  const [contextualQuestions, setContextualQuestions] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 0.9,
    pitch: 1.0,
    volume: 0.8
  });

  // Refs
  const audioManagerRef = useRef<AudioContextManager>(new AudioContextManager());
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const languageConfig = getLanguageConfig(selectedLanguage);
  const translation = getVoiceChatTranslation(selectedLanguage);

  // Enhanced voice recognition with better error handling
  const {
    isListening,
    transcript,
    confidence,
    error: voiceError,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceRecognition({
    language: selectedLanguage,
    continuous: false,
    interimResults: true,
    onResult: (finalTranscript, conf) => {
      console.log('Voice recognition result:', finalTranscript, 'Confidence:', conf);
      // Lower confidence threshold since some browsers report 0 confidence even for good recognition
      if (finalTranscript.trim() && (conf > 0.3 || conf === 0)) {
        console.log('Submitting question:', finalTranscript.trim());
        handleSubmitQuestion(finalTranscript.trim());
      }
    },
    onError: (error) => {
      console.error('Voice recognition error:', error);
      toast({
        title: translation.errorTitle,
        description: error,
        variant: "destructive",
      });
    }
  });

  // Load user profile and generate contextual questions
  useEffect(() => {
    loadUserProfile();
    generateContextualQuestions();
  }, [selectedLanguage]);

  // Monitor network connection
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('online');
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize audio context on user interaction
  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioManagerRef.current.initialize();
      } catch (error) {
        console.warn('Audio context initialization failed:', error);
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('crop_types, region_type, soil_type, location, full_name')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    } catch (error) {
      console.warn('Could not load user profile:', error);
    }
  };

  const generateContextualQuestions = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('voice-chat-ai', {
        body: { 
          generateSampleQuestions: true,
          language: selectedLanguage,
          userProfile: userProfile
        }
      });

      if (error) throw error;

      if (data?.questions?.length) {
        setContextualQuestions(data.questions);
      }
    } catch (error) {
      console.warn('Could not generate contextual questions:', error);
      // Use default questions
      setContextualQuestions(getDefaultQuestions());
    }
  };

  const getDefaultQuestions = (): string[] => {
    const defaults: Record<string, string[]> = {
      english: [
        "What's the best time to plant crops this season?",
        "How can I improve my soil fertility naturally?",
        "What are the signs of common plant diseases?",
        "How to manage water efficiently in farming?",
        "Which organic fertilizers work best?",
        "How to protect crops from unexpected weather?"
      ],
      hindi: [
        "इस मौसम में फसल बोने का सबसे अच्छा समय क्या है?",
        "मैं अपनी मिट्टी की उर्वरता प्राकृतिक रूप से कैसे बढ़ा सकता हूँ?",
        "सामान्य पौधों की बीमारियों के लक्षण क्या हैं?",
        "खेती में पानी का कुशलता से प्रबंधन कैसे करें?",
        "कौन से जैविक उर्वरक सबसे अच्छे काम करते हैं?",
        "अप्रत्याशित मौसम से फसलों की सुरक्षा कैसे करें?"
      ],
      tamil: [
        "இந்த பருவத்தில் பயிர் நடுவதற்கு சிறந்த நேரம் எது?",
        "இயற்கையாக மண் வளத்தை எவ்வாறு மேம்படுத்துவது?",
        "பொதுவான தாவர நோய்களின் அறிகுறிகள் என்ன?",
        "விவசாயத்தில் நீரை திறம்பட நிர்வகிப்பது எப்படி?",
        "எந்த இயற்கை உரங்கள் சிறந்த முறையில் செயல்படுகின்றன?",
        "எதிர்பாராத வானிலையிலிருந்து பயிர்களைப் பாதுகாப்பது எப்படி?"
      ]
    };

    return defaults[selectedLanguage] || defaults.english;
  };

  const handleSubmitQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;
    
    const questionId = Date.now().toString();
    setIsLoading(true);
    setRetryCount(0);
    
    console.log(`🎙️ Submitting question: "${question}"`);
    
    // Add question to history immediately
    const newEntry: ConversationEntry = {
      id: questionId,
      question: question.trim(),
      answer: '',
      timestamp: new Date(),
      confidence: confidence
    };
    
    setConversationHistory(prev => [newEntry, ...prev]);
    
    try {
      console.log('🚀 Calling OpenRouter Direct API...');
      
      // Call the robust OpenRouter direct function
      const { data, error } = await supabase.functions.invoke('openrouter-direct', {
        body: { 
          question: question.trim(),
          language: selectedLanguage
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }

      console.log('📥 OpenRouter response:', data);

      if (data.success) {
        const responseText = data.response;
        console.log(`✅ OpenRouter SUCCESS: "${responseText}"`);
        
        setResponse(responseText);
        
        // Update conversation history
        setConversationHistory(prev => 
          prev.map(entry => 
            entry.id === questionId 
              ? { ...entry, answer: responseText }
              : entry
          )
        );
        
        // 🎤 Automatic TTS - Voice Assistant Experience
        await speakResponse(responseText);
        
        // Generate smart follow-up questions based on the user's question
        generateSmartQuestions(question);
        
        toast({
          title: "OpenRouter Success! 🎉",
          description: `Model: ${data.model || 'Unknown'}`,
          variant: "default",
        });
        
      } else {
        console.log('❌ OpenRouter failed, using intelligent fallback:', data.error);
        
        // Intelligent Tamil fallback responses
        const tamilResponses = {
          'அரிசி': '🌾 **நெல் சாகுபடி வழிகாட்டுதல்**\n\n**முக்கிய பதில்:**\nநெல் சாகுபடி தமிழ்நாட்டின் முக்கிய விவசாயம். சரியான முறையில் செய்தால் நல்ல மகசூல் கிடைக்கும்.\n\n**செய்முறை வழிகாட்டுதல்:**\n1. **விதை தேர்வு:** ADT-43, CO-51, ASD-16 போன்ற உள்ளூர் வகைகள் தேர்வு செய்யவும்\n2. **நீர் மேலாண்மை:** துளி நீர்ப்பாசனம் பயன்படுத்தி 40% நீர் சேமிக்கவும்\n3. **உரமிடுதல்:** ஏக்கருக்கு DAP 50 கிலோ, யூரியா 100 கிலோ, பொட்டாஷ் 25 கிலோ\n\n**முக்கிய குறிப்புகள்:**\n• விதை நேர்த்தி அவசியம் செய்யவும்\n• மண் பரிசோதனை செய்து pH 6.0-7.0 வைத்துக்கொள்ளவும்\n• பூச்சி மேலாண்மைக்கு இயற்கை முறைகளை பயன்படுத்தவும்',
          
          'நெல்': '🌾 **நெல் சாகுபடி வழிகாட்டுதல்**\n\n**முக்கிய பதில்:**\nநெல் சாகுபடி தமிழ்நாட்டின் முக்கிய விவசாயம். சரியான முறையில் செய்தால் நல்ல மகசூல் கிடைக்கும்.\n\n**செய்முறை வழிகாட்டுதல்:**\n1. **விதை தேர்வு:** ADT-43, CO-51, ASD-16 போன்ற உள்ளூர் வகைகள் தேர்வு செய்யவும்\n2. **நீர் மேலாண்மை:** துளி நீர்ப்பாசனம் பயன்படுத்தி 40% நீர் சேமிக்கவும்\n3. **உரமிடுதல்:** ஏக்கருக்கு DAP 50 கிலோ, யூரியா 100 கிலோ, பொட்டாஷ் 25 கிலோ\n\n**முக்கிய குறிப்புகள்:**\n• விதை நேர்த்தி அவசியம் செய்யவும்\n• மண் பரிசோதனை செய்து pH 6.0-7.0 வைத்துக்கொள்ளவும்\n• பூச்சி மேலாண்மைக்கு இயற்கை முறைகளை பயன்படுத்தவும்',
          
          'தண்ணீர்': '💧 **நீர் மேலாண்மை வழிகாட்டுதல்**\n\n**முக்கிய பதில்:**\nநீர் விவசாயத்தின் உயிர்நாடி. சரியான நீர் மேலாண்மை மூலம் அதிக மகசூல் பெறலாம்.\n\n**செய்முறை வழிகாட்டுதல்:**\n1. **துளி நீர்ப்பாசனம்:** 40-50% நீர் சேமிப்பு, வேர் வளர்ச்சி மேம்படும்\n2. **மழைநீர் சேகரிப்பு:** ஏக்கருக்கு 2-3 குழி அமைத்து மழைநீர் சேகரிக்கவும்\n3. **மண் ஈரப்பதம்:** மண்ணின் ஈரப்பதத்தை கண்காணித்து தேவையான அளவு நீர் கொடுக்கவும்\n\n**முக்கிய குறிப்புகள்:**\n• காலை மற்றும் மாலை நேரங்களில் நீர் கொடுக்கவும்\n• பருவகாலத்திற்கு ஏற்ப நீர் அளவை மாற்றவும்',
          
          'உரம்': '🧪 **உரமிடல் வழிகாட்டுதல்**\n\n**முக்கிய பதில்:**\nமண் வளத்தை பராமரிக்க சரியான உரமிடுதல் முக்கியம். இயற்கை மற்றும் ரசாயன உரங்களை சமநிலையில் பயன்படுத்தவும்.\n\n**செய்முறை வழிகாட்டுதல்:**\n1. **இயற்கை உரம்:** வேப்பம் புண்ணாக்கு 100 கிலோ, காய்ந்த சாணம் 500 கிலோ\n2. **ரசாயன உரம்:** NPK 19:19:19 - 50 கிலோ, DAP - 50 கிலோ, யூரியா - 100 கிலோ\n3. **நுண்ணூட்டம்:** துத்தநாகம், இரும்பு, மேங்கனீசு கலவை தெளிக்கவும்\n\n**முக்கிய குறிப்புகள்:**\n• மண் பரிசோதனை அடிப்படையில் உரமிடவும்\n• நீர் கொடுத்த பின் உரம் இடவும்'
        };
        
        // Find matching response or provide generic advice
        const question_lower = question.trim().toLowerCase();
        let fallbackResponse = '';
        
        for (const [key, response] of Object.entries(tamilResponses)) {
          if (question_lower.includes(key) || question.includes(key)) {
            fallbackResponse = response;
            break;
          }
        }
        
        if (!fallbackResponse) {
          fallbackResponse = selectedLanguage === 'tamil' 
            ? '🌾 **விவசாய ஆலோசனை**\n\n**முக்கிய பதில்:**\nதயவுசெய்து உங்கள் கேள்வியை மேலும் தெளிவாக கேளுங்கள். நான் நெல், கோதுமை, பருத்தி, காய்கறிகள், பழங்கள், நீர்ப்பாசனம், உரமிடுதல், பூச்சி மேலாண்மை பற்றி உதவ முடியும்.\n\n**செய்முறை வழிகாட்டுதல்:**\n1. உங்கள் பயிர் வகையை குறிப்பிடவும்\n2. உங்கள் பிரச்சனையை தெளிவாக சொல்லவும்\n3. உங்கள் மண் வகையை குறிப்பிடவும்\n\n**முக்கிய குறிப்புகள்:**\n• நான் தமிழ் மற்றும் ஆங்கிலத்தில் பதில் தர முடியும்\n• விவசாய தொழில்நுட்பம், பயிர் பாதுகாப்பு, சந்தை விலை பற்றி கேளுங்கள்'
            : '🌾 **Agricultural Advice**\n\nPlease ask your question more clearly. I can help with rice, wheat, cotton, vegetables, fruits, irrigation, fertilizers, and pest management.\n\n**How to ask:**\n1. Specify your crop type\n2. Describe your problem clearly\n3. Mention your soil type\n\n**Available topics:**\n• Crop cultivation techniques\n• Pest and disease management\n• Soil health and fertilization\n• Water management and irrigation';
        }
        
        console.log(`✅ Using intelligent fallback response`);
        setResponse(fallbackResponse);
        
        // Update conversation history
        setConversationHistory(prev => 
          prev.map(entry => 
            entry.id === questionId 
              ? { ...entry, answer: fallbackResponse }
              : entry
          )
        );
        
        // Speak the fallback response
        await speakResponse(fallbackResponse);
        
        toast({
          title: "Intelligent Response 🧠",
          description: "Using built-in farming knowledge",
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error('💥 Question submission failed:', error);
      
      const errorMessage = `Failed to get AI response: ${error.message}`;
      
      toast({
        title: "AI Response Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Update conversation history with error
      setConversationHistory(prev => 
        prev.map(entry => 
          entry.id === questionId 
            ? { ...entry, answer: `Error: ${errorMessage}` }
            : entry
        )
      );
    } finally {
      setIsLoading(false);
      resetTranscript();
      setTextInput('');
    }
  }, [selectedLanguage, confidence, toast, resetTranscript]);

  const speakTamilResponse = useCallback(async (text: string) => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    console.log('🎤 Starting Tamil TTS with 1000x robust approach...');
    setIsSpeaking(true);

    // Method 1: Try ElevenLabs TTS (High Quality)
    try {
      console.log('🚀 Attempting ElevenLabs TTS...');
      
      const response = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text, language: 'tamil' }
      });

      console.log('📊 ElevenLabs response:', response);

      if (response.data && response.data.audioContent && !response.error) {
        console.log('✅ ElevenLabs TTS successful');
        
        const { audioContent } = response.data;
        const audioBlob = new Blob([
          Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))
        ], { type: 'audio/mpeg' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        await new Promise<void>((resolve, reject) => {
          audio.onloadeddata = () => console.log('🎵 ElevenLabs audio loaded');
          audio.onplay = () => console.log('🔊 ElevenLabs Tamil TTS started');
          audio.onended = () => {
            console.log('🔇 ElevenLabs Tamil TTS ended');
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = (error) => {
            console.error('❌ ElevenLabs audio playback error:', error);
            URL.revokeObjectURL(audioUrl);
            reject(error);
          };

          audio.play().catch(reject);
        });

        toast({
          title: "உயர்தர தமிழ் குரல் 🎭",
          description: "ElevenLabs மூலம் தரமான தமிழ் குரல்",
        });
        return;
      }
    } catch (error) {
      console.warn('⚠️ ElevenLabs TTS failed:', error);
    }

    // Method 2: Enhanced Browser TTS with comprehensive voice detection
    try {
      console.log('🔄 Trying enhanced browser TTS...');
      
      // Wait for voices to load with multiple attempts
      let voices = speechSynthesis.getVoices();
      let attempts = 0;
      
      while (voices.length === 0 && attempts < 5) {
        console.log(`🔍 Loading voices attempt ${attempts + 1}...`);
        await new Promise(resolve => {
          speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
          setTimeout(resolve, 500); // Fallback timeout
        });
        voices = speechSynthesis.getVoices();
        attempts++;
      }

      console.log(`🎯 Found ${voices.length} voices:`, voices.map(v => `${v.name} (${v.lang})`));

      // Comprehensive Tamil voice search
      let selectedVoice = null;
      let voiceType = 'default';

      // 1. Try exact Tamil voices
      selectedVoice = voices.find(voice => 
        voice.lang === 'ta-IN' || 
        voice.lang === 'ta' ||
        voice.name.toLowerCase().includes('tamil') ||
        voice.name.toLowerCase().includes('தமிழ்')
      );
      if (selectedVoice) voiceType = 'tamil';

      // 2. Try Indian English voices
      if (!selectedVoice) {
        selectedVoice = voices.find(voice =>
          voice.lang === 'en-IN' || 
          voice.name.toLowerCase().includes('india') ||
          voice.name.toLowerCase().includes('ravi') ||
          voice.name.toLowerCase().includes('heera') ||
          voice.name.toLowerCase().includes('veena')
        );
        if (selectedVoice) voiceType = 'indian-english';
      }

      // 3. Try any Indian/South Asian voices
      if (!selectedVoice) {
        selectedVoice = voices.find(voice =>
          voice.name.toLowerCase().includes('hindi') ||
          voice.name.toLowerCase().includes('bengali') ||
          voice.name.toLowerCase().includes('telugu') ||
          voice.name.toLowerCase().includes('kannada')
        );
        if (selectedVoice) voiceType = 'south-asian';
      }

      console.log(`🎵 Selected voice: ${selectedVoice?.name || 'default'} (${voiceType})`);

      const utterance = new SpeechSynthesisUtterance(text);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Optimized settings for Tamil
      utterance.lang = 'ta-IN';
      utterance.rate = voiceType === 'tamil' ? 0.8 : 0.6; // Slower for non-Tamil voices
      utterance.pitch = voiceType === 'tamil' ? 1.0 : 0.9;
      utterance.volume = 1.0;

      await new Promise<void>((resolve, reject) => {
        utterance.onstart = () => {
          console.log(`🔊 Browser TTS started (${voiceType})`);
        };
        
        utterance.onend = () => {
          console.log(`🔇 Browser TTS ended (${voiceType})`);
          setIsSpeaking(false);
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error('❌ Browser TTS error:', event.error);
          reject(new Error(event.error));
        };

        speechSynthesis.speak(utterance);
      });

      // Show appropriate toast
      const toastMessages = {
        'tamil': { title: "தமிழ் குரல் கிடைத்தது! 🎤", description: `குரல்: ${selectedVoice.name}` },
        'indian-english': { title: "இந்திய ஆங்கில குரல் 🇮🇳", description: `குரல்: ${selectedVoice.name}` },
        'south-asian': { title: "தெற்காசிய குரல் 🌏", description: `குரல்: ${selectedVoice.name}` },
        'default': { title: "இயல்பு குரல் 🔊", description: "தமிழ் மொழி அமைப்புடன்" }
      };

      toast(toastMessages[voiceType] || toastMessages.default);
      return;

    } catch (error) {
      console.error('💥 Browser TTS failed:', error);
    }

    // Method 3: Text Display Fallback
    console.log('📝 Using text display fallback...');
    setIsSpeaking(false);
    
    toast({
      title: "குரல் கிடைக்கவில்லை 📢",
      description: "உரையாக காட்டப்படுகிறது: " + text.substring(0, 50) + "...",
      variant: "destructive",
    });

    // Show text in a modal or alert as ultimate fallback
    setTimeout(() => {
      alert(`தமிழ் பதில்: ${text}`);
    }, 1000);
  }, [isSpeaking, toast]);

  const speakResponse = async (text: string) => {
    try {
      if (!text || text.trim().length === 0) return;

      // Stop any current speech
      if (speechSynthRef.current) {
        speechSynthesis.cancel();
      }

      setIsSpeaking(true);
      setSpeechProgress(0);

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthRef.current = utterance;

      // Configure utterance
      utterance.rate = voiceSettings.rate;
      utterance.pitch = voiceSettings.pitch;
      utterance.volume = voiceSettings.volume;
      utterance.lang = languageConfig.speechCode;

      // Find best voice for the language
      const voices = speechSynthesis.getVoices();
      const bestVoice = voices.find(voice => 
        voice.lang.startsWith(languageConfig.speechCode.split('-')[0]) && voice.localService
      ) || voices.find(voice => 
        voice.lang.startsWith(languageConfig.speechCode.split('-')[0])
      ) || voices.find(voice => voice.default);

      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      // Progress tracking
      const words = text.split(' ');
      let currentWordIndex = 0;

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          currentWordIndex++;
          const progress = (currentWordIndex / words.length) * 100;
          setSpeechProgress(progress);
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeechProgress(0);
        speechSynthRef.current = null;
        
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        setIsSpeaking(false);
        setSpeechProgress(0);
        speechSynthRef.current = null;
        
        toast({
          title: "Speech Error",
          description: "Unable to speak the response. Please check your audio settings.",
          variant: "destructive",
        });
      };

      // Start speaking
      speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      setSpeechProgress(0);
      
      toast({
        title: "Speech Error",
        description: "Unable to speak the text. Please check your audio settings.",
        variant: "destructive",
      });
    }
  };

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      handleSubmitQuestion(textInput);
    }
  }, [textInput, handleSubmitQuestion]);

  const generateSmartQuestions = async (userInput: string) => {
    try {
      // Enhanced Tamil question generation with farming context
      const tamilContext = selectedLanguage === 'tamil' ? 
        'தமிழ்நாடு விவசாயிகளுக்கு ஏற்ற, நடைமுறையான கேள்விகள் மட்டும் தாருங்கள். நெல், கரும்பு, துவரை, பருத்தி, காய்கறிகள் பற்றிய கேள்விகளை முன்னுரிமை கொடுங்கள்.' :
        'Generate practical farming questions relevant to Indian agriculture.';

      const { data, error } = await supabase.functions.invoke('openrouter-direct', {
        body: { 
          question: `${tamilContext} Based on this farming question: "${userInput}", generate 3 highly relevant follow-up questions that a farmer might realistically ask next. ${selectedLanguage === 'tamil' ? 'தமிழில் பதில் தாருங்கள்.' : 'Answer in ' + selectedLanguage}. Return only the questions, one per line.`,
          language: selectedLanguage
        }
      });

      if (error) throw error;

      if (data.success && data.response) {
        const smartQuestions = data.response
          .split('\n')
          .filter(q => q.trim() && !q.startsWith('Based on') && !q.includes('நடைமுறையான'))
          .map(q => q.replace(/^\d+\.\s*/, '').replace(/^[\-\*]\s*/, '').trim())
          .filter(q => q.length > 10) // Filter out too short questions
          .slice(0, 3);
        
        console.log('Generated smart questions for Tamil:', smartQuestions);
        
        if (smartQuestions.length > 0) {
          setContextualQuestions(prev => [...smartQuestions, ...prev.slice(0, 2)]);
          
          if (selectedLanguage === 'tamil') {
            toast({
              title: "புத்திசாலித்தனமான கேள்விகள் உருவாக்கப்பட்டுள்ளன! 🧠",
              description: `${smartQuestions.length} தொடர்புடைய கேள்விகள் சேர்க்கப்பட்டுள்ளன`,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Could not generate smart questions:', error);
    }
  };
  const handleVoiceToggle = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      if (!voiceSupported) {
        toast({
          title: "Voice Not Supported",
          description: "Your browser doesn't support voice recognition. Please use text input.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        // Initialize audio context first
        await audioManagerRef.current.initialize();
        await startListening();
      } catch (error) {
        console.error('Failed to start listening:', error);
      }
    }
  }, [isListening, stopListening, startListening, voiceSupported, toast]);

  const toggleSpeech = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechProgress(0);
    } else if (response) {
      speakResponse(response);
    }
  };

  const handleVoiceCommand = (command: string) => {
    const commandLower = command.toLowerCase();
    
    // Voice commands
    if (commandLower.includes('show weather') || commandLower.includes('weather')) {
      handleSubmitQuestion('What is the current weather for farming?');
    } else if (commandLower.includes('market price') || commandLower.includes('price')) {
      handleSubmitQuestion('What are current market prices for crops?');
    } else if (commandLower.includes('stop') || commandLower.includes('pause')) {
      if (isSpeaking) {
        toggleSpeech();
      }
    } else {
      handleSubmitQuestion(command);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 relative">
      {/* Connection Status & User Profile Indicator */}
      <div className="fixed top-4 right-4 z-20 flex space-x-2">
        <Badge variant={connectionStatus === 'online' ? 'default' : 'destructive'} className="flex items-center space-x-1">
          {connectionStatus === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="text-xs">{connectionStatus}</span>
        </Badge>
        
        {userProfile && (
          <Badge variant="outline" className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span className="text-xs">{userProfile.full_name || 'User'}</span>
          </Badge>
        )}
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-6 shadow-xl relative">
            <span className="text-white text-3xl">🌱</span>
            {isSpeaking && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
                <Volume2 className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            {translation.title}
          </h1>
          <p className="text-xl text-green-600 font-medium">{translation.subtitle}</p>
          
          {/* Voice Settings Quick Access */}
          <div className="mt-4 flex justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoiceSettings(prev => ({ ...prev, rate: prev.rate === 0.9 ? 1.2 : 0.9 }))}
              className="text-xs"
            >
              Speed: {voiceSettings.rate}x
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoiceSettings(prev => ({ ...prev, volume: prev.volume === 0.8 ? 0.5 : 0.8 }))}
              className="text-xs"
            >
              Volume: {Math.round(voiceSettings.volume * 100)}%
            </Button>
          </div>
        </div>

        {/* Enhanced Main Chat Interface */}
        <Card className="p-8 mb-6 bg-white/90 shadow-2xl border-0 backdrop-blur-sm">
          {/* Voice Input Section with Enhanced Features */}
          <div className="text-center mb-8">
            <div className="relative">
              <Button
                size="lg"
                className={`w-40 h-40 rounded-full ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-2xl shadow-red-500/50' 
                    : 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-2xl shadow-green-500/30'
                } text-white transition-all duration-300 hover:scale-105`}
                onClick={handleVoiceToggle}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-16 h-16 animate-spin" />
                ) : isListening ? (
                  <MicOff className="w-16 h-16" />
                ) : (
                  <Mic className="w-16 h-16" />
                )}
              </Button>
              
              {/* Enhanced Voice Level Indicator */}
              {isListening && (
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-2 h-8 bg-green-500 rounded-full animate-pulse`}
                        style={{ 
                          animationDelay: `${i * 0.1}s`,
                          height: `${Math.random() * 20 + 10}px`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Speech Progress Indicator */}
              {isSpeaking && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-32">
                  <Progress value={speechProgress} className="h-2" />
                  <p className="text-xs text-green-600 mt-1">Speaking...</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 space-y-2">
              <p className="text-lg font-medium text-gray-700">
                {isListening 
                  ? translation.listeningText
                  : isLoading 
                  ? translation.processingText
                  : translation.tapToAskText}
              </p>
              
              {retryCount > 0 && (
                <div className="flex items-center justify-center space-x-2 text-orange-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Retrying... (Attempt {retryCount + 1})</span>
                </div>
              )}
              
              {/* Voice Support Status */}
              {!voiceSupported && (
                <Badge variant="destructive" className="mt-2">
                  Voice recognition not supported
                </Badge>
              )}
            </div>

            {/* Enhanced Real-time Transcript */}
            {transcript && (
              <Card className="mt-6 p-4 bg-green-50 border-green-200 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-green-800">{translation.youSaidText}</p>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(confidence * 100)}% confidence
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVoiceCommand(transcript)}
                      disabled={confidence < 0.5}
                    >
                      <Sparkles className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-green-700 font-medium text-lg">"{transcript}"</p>
                {confidence > 0 && (
                  <Progress value={confidence * 100} className="mt-2 h-1" />
                )}
              </Card>
            )}
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex justify-center space-x-4 mb-6">
            <Button
              variant="outline"
              onClick={() => setShowTextInput(!showTextInput)}
              className="flex items-center space-x-2 px-6 py-3 hover:bg-green-50 border-green-200"
            >
              <Keyboard className="w-5 h-5" />
              <span>{translation.typeText}</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={toggleSpeech}
              disabled={!response || isLoading}
              className="flex items-center space-x-2 px-6 py-3 hover:bg-green-50 border-green-200"
            >
              {isSpeaking ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isSpeaking ? 'Pause' : 'Speak'}</span>
            </Button>
            
            
            <Button
              variant="outline"
              className="flex items-center space-x-2 px-6 py-3 hover:bg-green-50 border-green-200"
            >
              <Languages className="w-5 h-5" />
              <span>{translation.translateText}</span>
            </Button>
          </div>

          {/* Enhanced Text Input */}
          {showTextInput && (
            <Card className="mb-6 p-4 bg-gray-50 border animate-slide-down">
              <div className="flex space-x-2">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`${translation.typeText}...`}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                  className="flex-1 text-lg"
                  dir={languageConfig.rtl ? 'rtl' : 'ltr'}
                />
                <Button 
                  onClick={handleTextSubmit} 
                  disabled={!textInput.trim() || isLoading}
                  className="px-6"
                >
                  Send
                </Button>
              </div>
            </Card>
          )}

          {/* Enhanced Voice Assistant Response */}
          {response && (
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 mb-6 animate-fade-in shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isSpeaking 
                    ? 'bg-primary/20 animate-pulse shadow-lg shadow-primary/30' 
                    : 'bg-primary/10'
                }`}>
                  {isSpeaking ? (
                    <Volume2 className="w-5 h-5 text-primary animate-pulse" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-primary text-lg flex items-center gap-2">
                    🎤 Voice Assistant Response
                    {isSpeaking && (
                      <Badge variant="secondary" className="text-xs animate-pulse">
                        Speaking...
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isSpeaking ? 'Playing audio response...' : 'Tap speaker to hear response'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={isSpeaking ? "default" : "outline"}
                    size="sm"
                    onClick={toggleSpeech}
                    className={`gap-2 transition-all duration-200 ${
                      isSpeaking ? 'bg-primary hover:bg-primary/90' : ''
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span className="hidden sm:inline">Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Listen</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Speech Progress Bar */}
              {isSpeaking && speechProgress > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>🎧 Playing audio response...</span>
                    <span>{Math.round(speechProgress)}%</span>
                  </div>
                  <Progress value={speechProgress} className="h-2 bg-secondary/20" />
                </div>
              )}
              
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div 
                  className="text-foreground leading-relaxed" 
                  dir={languageConfig.rtl ? 'rtl' : 'ltr'}
                  dangerouslySetInnerHTML={{
                    __html: response
                      .replace(/\*\*/g, '') // Remove ** markdown
                      .replace(/##\s*/g, '') // Remove ## markdown
                      .replace(/\*/g, '') // Remove * markdown
                      .replace(/\n\n/g, '<br><br>') // Convert double newlines to breaks
                      .replace(/\n/g, '<br>') // Convert single newlines to breaks
                      .replace(/(\d+\.\s)/g, '<br>$1') // Add breaks before numbered lists
                      .replace(/•\s*/g, '<br>• ') // Format bullet points
                  }}
                />
              </div>
            </Card>
          )}
        </Card>

        {/* Enhanced Contextual Sample Questions */}
        <Card className="p-6 bg-white/90 shadow-2xl border-0 backdrop-blur-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-green-700 flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>Smart Questions for You</span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateContextualQuestions}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {contextualQuestions.slice(0, showMore ? 6 : 4).map((question, index) => (
              <Button
                key={index}
                variant="outline"
                className="text-left justify-start h-auto p-4 hover:bg-green-50 hover:border-green-300 transition-all duration-200 text-wrap"
                onClick={() => handleSubmitQuestion(question)}
                disabled={isLoading}
                dir={languageConfig.rtl ? 'rtl' : 'ltr'}
              >
                <span className="break-words whitespace-normal">{question}</span>
              </Button>
            ))}
          </div>
          
          {contextualQuestions.length > 4 && (
            <Button
              variant="ghost" 
              onClick={() => setShowMore(!showMore)}
              className="w-full mt-2 text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              {showMore ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show More Questions
                </>
              )}
            </Button>
          )}
        </Card>

        {/* Enhanced Conversation History */}
        {conversationHistory.length > 0 && (
          <Card className="p-6 bg-white/90 shadow-2xl border-0 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-green-700 mb-4">Recent Conversations</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversationHistory.slice(0, 5).map((entry) => (
                <div key={entry.id} className="border-l-4 border-green-200 pl-4 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-800" dir={languageConfig.rtl ? 'rtl' : 'ltr'}>
                      Q: {entry.question}
                    </p>
                    <div className="flex items-center space-x-2 ml-2">
                      {entry.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(entry.confidence * 100)}%
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {entry.answer && (
                    <div className="flex items-start justify-between">
                      <p className="text-green-700 text-sm" dir={languageConfig.rtl ? 'rtl' : 'ltr'}>
                        A: {entry.answer}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakResponse(entry.answer)}
                        disabled={isSpeaking}
                        className="ml-2 text-green-600"
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 py-4">
          <p className="text-sm text-green-600">
            © 2024 GrowSmart AI - Empowering Farmers with AI Technology
          </p>
        </div>
      </div>
    </div>
  );
};
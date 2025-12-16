export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string;
  ttsVoice?: string;
  rtl?: boolean;
  enhancedVoice?: boolean;
  region?: string;
  crops?: string[];
}

export const languageConfigs: Record<string, LanguageConfig> = {
  english: {
    code: 'english',
    name: 'English',
    nativeName: 'English',
    speechCode: 'en-US',
    ttsVoice: 'en-US'
  },
  hindi: {
    code: 'hindi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    speechCode: 'hi-IN',
    ttsVoice: 'hi-IN'
  },
  tamil: {
    code: 'tamil',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    speechCode: 'ta-IN',
    ttsVoice: 'ta-IN',
    enhancedVoice: true,
    region: 'TN',
    crops: ['நெல்', 'கரும்பு', 'துவரை', 'பருத்தி', 'மிளகாய்', 'தக்காளி']
  },
  telugu: {
    code: 'telugu',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    speechCode: 'te-IN',
    ttsVoice: 'te-IN'
  },
  kannada: {
    code: 'kannada',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    speechCode: 'kn-IN',
    ttsVoice: 'kn-IN'
  },
  marathi: {
    code: 'marathi',
    name: 'Marathi',
    nativeName: 'मराठी',
    speechCode: 'mr-IN',
    ttsVoice: 'mr-IN'
  },
  gujarati: {
    code: 'gujarati',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    speechCode: 'gu-IN',
    ttsVoice: 'gu-IN'
  },
  bengali: {
    code: 'bengali',
    name: 'Bengali',
    nativeName: 'বাংলা',
    speechCode: 'bn-IN',
    ttsVoice: 'bn-IN'
  },
  punjabi: {
    code: 'punjabi',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    speechCode: 'pa-IN',
    ttsVoice: 'pa-IN'
  },
  malayalam: {
    code: 'malayalam',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    speechCode: 'ml-IN',
    ttsVoice: 'ml-IN'
  },
  spanish: {
    code: 'spanish',
    name: 'Spanish',
    nativeName: 'Español',
    speechCode: 'es-ES',
    ttsVoice: 'es-ES'
  },
  portuguese: {
    code: 'portuguese',
    name: 'Portuguese',
    nativeName: 'Português',
    speechCode: 'pt-PT',
    ttsVoice: 'pt-PT'
  },
  japanese: {
    code: 'japanese',
    name: 'Japanese',
    nativeName: '日本語',
    speechCode: 'ja-JP',
    ttsVoice: 'ja-JP'
  },
  indonesian: {
    code: 'indonesian',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    speechCode: 'id-ID',
    ttsVoice: 'id-ID'
  }
};

export const voiceChatTranslations = {
  english: {
    title: "Grow Smart AI",
    subtitle: "Agriculture CoPilot for India",
    listeningText: "Listening... Speak your question",
    processingText: "Processing your question...",
    tapToAskText: "Tap the microphone to ask your question",
    typeText: "Type",
    translateText: "Translate",
    youSaidText: "You said:",
    responseText: "Grow Smart AI Response:",
    sampleQuestionsText: "Sample Questions:",
    moreExamplesText: "More Examples",
    changeLanguageText: "Change Language",
    signInText: "Sign In",
    errorTitle: "Voice Recognition Error",
    errorDescription: "Please try again or use text input",
    noSpeechError: "No speech detected. Please try speaking again.",
    networkError: "Network error. Please check your connection.",
    microphoneError: "Microphone access denied. Please enable microphone access.",
    footerText: "Your intelligent farming companion"
  },
  hindi: {
    title: "Grow Smart AI",
    subtitle: "भारत के लिए कृषि सहायक",
    listeningText: "सुन रहा हूँ... अपना सवाल बोलें",
    processingText: "आपके सवाल को समझ रहा हूँ...",
    tapToAskText: "अपना सवाल पूछने के लिए माइक्रोफोन दबाएं",
    typeText: "टाइप करें",
    translateText: "अनुवाद",
    youSaidText: "आपने कहा:",
    responseText: "Grow Smart AI का जवाब:",
    sampleQuestionsText: "नमूना प्रश्न:",
    moreExamplesText: "और उदाहरण",
    changeLanguageText: "भाषा बदलें",
    signInText: "साइन इन करें",
    errorTitle: "आवाज़ पहचान त्रुटि",
    errorDescription: "कृपया फिर से कोशिश करें या टेक्स्ट इनपुट का उपयोग करें",
    noSpeechError: "कोई आवाज़ नहीं सुनाई दी। कृपया फिर से बोलें।",
    networkError: "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।",
    microphoneError: "माइक्रोफोन एक्सेस नकारा गया। कृपया माइक्रोफोन एक्सेस सक्षम करें।",
    footerText: "आपका बुद्धिमान खेती साथी"
  },
  tamil: {
    title: "Grow Smart AI",
    subtitle: "இந்தியாவுக்கான விவசாய துணை",
    listeningText: "கேட்கிறேன்... உங்கள் கேள்வியைக் கேளுங்கள்",
    processingText: "உங்கள் கேள்வியை புரிந்துகொள்கிறேன்...",
    tapToAskText: "உங்கள் கேள்வியைக் கேட்க மைக்ரோஃபோனை அழுத்தவும்",
    typeText: "தட்டச்சு செய்யவும்",
    translateText: "மொழிபெயர்க்கவும்",
    youSaidText: "நீங்கள் சொன்னது:",
    responseText: "Grow Smart AI பதில்:",
    sampleQuestionsText: "மாதிரி கேள்விகள்:",
    moreExamplesText: "மேலும் உদாहரணங்கள்",
    changeLanguageText: "மொழியை மாற்றவும்",
    signInText: "உள்நுழையவும்",
    errorTitle: "குரல் அங்கீகார பிழை",
    errorDescription: "தயவுசெய்து மீண்டும் முயற்சிக்கவும் அல்லது உரை உள்ளீட்டைப் பயன்படுத்தவும்",
    noSpeechError: "எந்த பேச்சும் கண்டறியப்படவில்லை. தயவுசெய்து மீண்டும் பேசவும்.",
    networkError: "நெட்வொர்க் பிழை. தயவுசெய்து உங்கள் இணைப்பைச் சரிபார்க்கவும்.",
    microphoneError: "மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. தயவுசெய்து மைக்ரோஃபோன் அணுகலை இயக்கவும்.",
    footerText: "உங்கள் அறிவார்ந்த விவசாய துணை"
  }
  // Add more translations for other languages as needed
};

export const getLanguageConfig = (language: string): LanguageConfig => {
  return languageConfigs[language] || languageConfigs.english;
};

export const getVoiceChatTranslation = (language: string) => {
  return voiceChatTranslations[language as keyof typeof voiceChatTranslations] || voiceChatTranslations.english;
};
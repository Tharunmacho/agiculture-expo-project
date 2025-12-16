import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  question: string;
  language: string;
  conversationHistory?: Array<{question: string, answer: string}>;
  userProfile?: {
    crop_types?: string[];
    region_type?: string;
    soil_type?: string;
    location?: string;
  };
  generateSampleQuestions?: boolean;
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Voice chat request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { question, language = 'english', generateSampleQuestions } = body;

    console.log(`Processing request: generateSampleQuestions=${generateSampleQuestions}, question="${question?.substring(0, 50)}..."`);

    // If generating sample questions
    if (generateSampleQuestions) {
      console.log('Generating sample questions');
      const questions = generateDefaultQuestions(language);
      return new Response(
        JSON.stringify({
          questions: questions,
          language: language,
          timestamp: new Date().toISOString(),
          status: 'success'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!question?.trim()) {
      throw new Error('Question is required');
    }

    console.log(`Processing question in ${language}: "${question}"`);

    // Try OpenRouter API first
    try {
      const response = await callOpenRouterAPI(question, language, body);
      if (response) {
        console.log('OpenRouter API successful');
        return response;
      }
    } catch (openRouterError) {
      console.error('OpenRouter API failed:', openRouterError);
    }

    // Fallback to intelligent response generation
    console.log('Using intelligent fallback');
    const fallbackResponse = generateIntelligentResponse(question, language);
    
    return new Response(
      JSON.stringify({
        response: fallbackResponse,
        language: language,
        timestamp: new Date().toISOString(),
        status: 'fallback_success',
        source: 'intelligent_fallback'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Voice chat error:', error);
    
    // Emergency fallback
    return new Response(
      JSON.stringify({
        response: getEmergencyResponse('english'),
        language: 'english',
        timestamp: new Date().toISOString(),
        status: 'emergency_fallback',
        error: error.message
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function callOpenRouterAPI(question: string, language: string, body: RequestBody): Promise<Response | null> {
  const openRouterApiKey = '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';
  
  console.log('=== OpenRouter API Debug ===');
  console.log('API Key:', openRouterApiKey.substring(0, 20) + '...');
  console.log('Question:', question);
  console.log('Language:', language);

  // Build context
  let systemPrompt = `You are GrowSmart AI, an expert agricultural assistant. Answer the user's farming question in ${language} language.

Rules:
- Provide practical, actionable farming advice
- Keep response concise (2-3 sentences maximum)
- Focus on the specific question asked
- Use simple, clear language
- Include specific recommendations when possible

User question: "${question}"`;

  if (body.userProfile) {
    const { crop_types, region_type, soil_type, location } = body.userProfile;
    systemPrompt += `\n\nUser farming context:
- Crops: ${crop_types?.join(', ') || 'general farming'}
- Region: ${region_type || 'not specified'}
- Soil type: ${soil_type || 'not specified'}
- Location: ${location || 'not specified'}`;
  }

  // Try the most reliable free models
  const models = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'mistralai/mistral-7b-instruct:free'
  ];

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    console.log(`\n--- Attempt ${i + 1}: Testing model ${model} ---`);
    
    try {
      const requestBody = {
        model: model,
        messages: [
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        top_p: 0.9,
        stream: false
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://growsmart-ai.com',
          'X-Title': 'GrowSmart AI Voice Chat',
          'User-Agent': 'GrowSmart-AI/1.0'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`Response status: ${response.status}`);
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Model ${model} HTTP error:`, response.status, errorText);
        
        if (response.status === 402) {
          console.log('Payment required - trying next model');
          continue;
        }
        if (response.status === 429) {
          console.log('Rate limited - trying next model');
          continue;
        }
        if (response.status === 404) {
          console.log('Model not found - trying next model');
          continue;
        }
        
        // For other errors, try next model
        continue;
      }

      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      const aiResponse = data.choices?.[0]?.message?.content?.trim();
      
      if (aiResponse && aiResponse.length > 5) {
        console.log(`✅ SUCCESS with ${model}!`);
        console.log(`Response: "${aiResponse}"`);
        
        return new Response(
          JSON.stringify({
            response: aiResponse,
            language: language,
            timestamp: new Date().toISOString(),
            status: 'openrouter_success',
            model: model,
            source: 'openrouter_api',
            debug: 'OpenRouter API working correctly'
          }),
          {
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          }
        );
      } else {
        console.log(`Model ${model} returned empty/invalid response:`, aiResponse);
      }
    } catch (error) {
      console.error(`Model ${model} request failed:`, error.message);
      console.error('Full error:', error);
      continue;
    }
  }

  console.log('❌ All OpenRouter models failed');
  return null;
}

function generateIntelligentResponse(question: string, language: string): string {
  const questionLower = question.toLowerCase();
  
  console.log(`Generating intelligent response for: "${questionLower}" in ${language}`);

  const responses: Record<string, Record<string, string>> = {
    english: {
      rice: "For rice cultivation: Plant during monsoon season (June-July), maintain 2-3 inches of standing water, use disease-resistant varieties, and apply balanced NPK fertilizers. Harvest when 80% of grains turn golden yellow.",
      wheat: "For wheat farming: Sow in November-December, ensure good drainage, apply nitrogen in 2-3 splits during growth stages. Irrigate at critical stages: crown root initiation, tillering, and grain filling.",
      tomato: "For tomato cultivation: Start with healthy seedlings, provide support stakes, water consistently but avoid wetting leaves, and apply potassium-rich fertilizer during fruiting. Watch for blight and pest infestations.",
      pest: "For pest control: Use integrated pest management (IPM) - monitor regularly, encourage beneficial insects, apply neem oil or biocontrol agents first, use chemical pesticides only when necessary.",
      fertilizer: "For fertilizer management: Test soil first, apply organic compost, use balanced NPK based on crop needs, and avoid over-fertilization which can reduce quality and increase pest problems.",
      disease: "For disease management: Ensure good air circulation, avoid overhead watering, remove infected plant parts immediately, use resistant varieties, and apply fungicides preventively if needed.",
      water: "For water management: Use drip irrigation for efficiency, mulch to retain moisture, water early morning or evening, monitor soil moisture at root depth, and avoid waterlogging.",
      organic: "For organic farming: Build soil with compost and green manures, use crop rotation, encourage biodiversity, practice companion planting, and rely on natural pest control methods.",
      soil: "For soil health: Add organic matter regularly, maintain proper pH (6-7 for most crops), ensure good drainage, practice crop rotation, and test soil nutrients annually.",
      default: "For successful farming: Focus on soil health, choose appropriate varieties for your climate, manage water efficiently, monitor for pests and diseases, and maintain proper nutrition balance."
    },
    hindi: {
      rice: "धान की खेती के लिए: मानसून में बुआई करें (जून-जुलाई), 2-3 इंच पानी बनाए रखें, रोग प्रतिरोधी किस्में उगाएं, संतुलित NPK उर्वरक डालें। 80% दाने सुनहरे होने पर कटाई करें।",
      wheat: "गेहूं की खेती के लिए: नवंबर-दिसंबर में बुआई करें, अच्छी जल निकासी सुनिश्चित करें, नाइट्रोजन को 2-3 भागों में डालें। महत्वपूर्ण अवस्थाओं में सिंचाई करें।",
      pest: "कीट नियंत्रण के लिए: एकीकृत कीट प्रबंधन का उपयोग करें, नियमित निगरानी करें, पहले नीम तेल या जैविक नियंत्रण का प्रयोग करें।",
      fertilizer: "उर्वरक प्रबंधन के लिए: पहले मिट्टी जांच कराएं, जैविक खाद डालें, फसल की आवश्यकता के अनुसार संतुलित NPK का प्रयोग करें।",
      default: "सफल खेती के लिए: मिट्टी की सेहत पर ध्यान दें, जलवायु के अनुकूल किस्में चुनें, पानी का कुशल प्रबंधन करें, कीट-रोगों की निगरानी करें।"
    },
    tamil: {
      rice: "நெல் சாகுபடிக்கு: மானசூன் காலத்தில் (ஜூன்-ஜூலை) நடவு செய்யுங்கள், 2-3 அங்குல நீர் பராமரியுங்கள், நோய் எதிர்ப்பு ரகங்கள் பயன்படுத்துங்கள், சமநிலையான NPK உரம் இடுங்கள்.",
      wheat: "கோதுமை விவசாயத்திற்கு: நவம்பர்-டிசம்பரில் விதைக்கவும், நல்ல வடிகால் உறுதி செய்யவும், வளர்ச்சி நிலைகளில் நைட்ரஜனை 2-3 பகுதிகளாக பயன்படுத்தவும்.",
      pest: "பூச்சி கட்டுப்பாட்டிற்கு: ஒருங்கிணைந்த பூச்சி மேலாண்மை பயன்படுத்துங்கள், வழக்கமாக கண்காணிக்கவும், முதலில் வேப்பெண்ணெய் அல்லது உயிரியல் கட்டுப்பாடு பயன்படுத்துங்கள்.",
      fertilizer: "உர நிர்வாகத்திற்கு: முதலில் மண் பரிசோதனை செய்யுங்கள், இயற்கை உரம் போடுங்கள், பயிர் தேவைக்கு ஏற்ப சமநிலையான NPK பயன்படுத்துங்கள்.",
      default: "வெற்றிகரமான விவசாயத்திற்கு: மண் ஆரோக்கியத்தில் கவனம் செலுத்துங்கள், உங்கள் காலநிலைக்கு ஏற்ற ரகங்களை தேர்வு செய்யுங்கள், நீரை திறமையாக நிர்வகிக்கவும்."
    }
  };

  const langResponses = responses[language] || responses.english;
  
  // Match keywords and return appropriate response
  for (const [keyword, response] of Object.entries(langResponses)) {
    if (keyword !== 'default' && questionLower.includes(keyword)) {
      return response;
    }
  }
  
  return langResponses.default;
}

function generateDefaultQuestions(language: string): string[] {
  const questions: Record<string, string[]> = {
    english: [
      "What's the best time to plant rice this season?",
      "How can I control pests in my wheat crop?",
      "Which fertilizer should I use for tomatoes?",
      "How to identify plant diseases early?",
      "What are organic farming best practices?",
      "How to improve soil fertility naturally?"
    ],
    hindi: [
      "इस मौसम में धान बोने का सबसे अच्छा समय क्या है?",
      "गेहूं की फसल में कीड़ों को कैसे नियंत्रित करूं?",
      "टमाटर के लिए कौन सा उर्वरक इस्तेमाल करना चाहिए?",
      "पौधों की बीमारियों की जल्दी पहचान कैसे करें?",
      "जैविक खेती की सर्वोत्तम प्रथाएं क्या हैं?",
      "मिट्टी की उर्वरता प्राकृतिक रूप से कैसे बढ़ाएं?"
    ],
    tamil: [
      "இந்த பருவத்தில் நெல் நடுவதற்கு சிறந்த நேரம் எது?",
      "எனது கோதுமை பயிரில் பூச்சிகளை எவ்வாறு கட்டுப்படுத்துவது?",
      "தக்காளிக்கு எந்த உரம் பயன்படுத்த வேண்டும்?",
      "தாவர நோய்களை ஆரம்பத்திலேயே எவ்வாறு அடையாளம் காண்பது?",
      "இயற்கை விவசாயத்தின் சிறந்த நடைமுறைகள் என்ன?",
      "இயற்கையாக மண் வளத்தை எவ்வாறு மேம்படுத்துவது?"
    ]
  };

  return questions[language] || questions.english;
}

function getEmergencyResponse(language: string): string {
  const emergency: Record<string, string> = {
    english: "I'm here to help with your farming questions. Please try asking about specific crops, pest control, fertilizers, or farming techniques. For immediate help, contact your local agricultural extension office.",
    hindi: "मैं आपके खेती के सवालों में मदद के लिए यहाँ हूँ। कृपया विशिष्ट फसलों, कीट नियंत्रण, उर्वरकों या खेती तकनीकों के बारे में पूछें।",
    tamil: "உங்கள் விவசாய கேள்விகளுக்கு உதவ நான் இங்கே இருக்கிறேன். குறிப்பிட்ட பயிர்கள், பூச்சி கட்டுப்பாடு, உரங்கள் அல்லது விவசாய நுட்பங்களைப் பற்றி கேட்கவும்."
  };

  return emergency[language] || emergency.english;
}
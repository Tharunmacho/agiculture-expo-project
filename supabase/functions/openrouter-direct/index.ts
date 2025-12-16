import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  question: string;
  language?: string;
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] OpenRouter Direct API request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the new OpenRouter API key provided
    const API_KEY = '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';
    
    console.log('=== OPENROUTER DIRECT API TEST ===');
    console.log('API Key (first 25 chars):', API_KEY.substring(0, 25) + '...');
    console.log('API Key (last 10 chars):', '...' + API_KEY.slice(-10));
    
    const body: ChatRequest = await req.json().catch(() => ({ question: 'What fertilizer is best for rice farming?' }));
    const { question, language = 'english' } = body;
    
    console.log('Question:', question);
    console.log('Language:', language);
    
    // Use the latest free models available on OpenRouter
    const models = [
      'qwen/qwen-2.5-7b-instruct:free',
      'meta-llama/llama-3.2-1b-instruct:free',
      'google/gemma-2-9b-it:free',
      'huggingface/zephyr-7b-beta:free'
    ];
    
    console.log('Testing models:', models);

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      console.log(`\n--- ATTEMPT ${i + 1}: Testing ${model} ---`);
      
      try {
        // Language-specific response instructions
        const getSystemPrompt = (lang: string) => {
          const prompts = {
            english: `You are a knowledgeable agricultural AI assistant specializing in farming advice for English-speaking farmers. Your expertise includes:

🌾 Crops: Rice, wheat, corn, cotton, sugarcane, tea, coffee, spices, vegetables, fruits
🐛 Pest Management: identification, natural solutions, integrated pest management  
💧 Irrigation: water management, drip irrigation, rainwater harvesting
🧪 Soil Health: testing, fertilization, composting, soil conservation
🌱 Seeds: variety selection, seed treatment, germination
🌦️ Weather: seasonal advice, climate adaptation, timing of operations
💰 Markets: price trends, crop planning, value addition
🔧 Tools: modern farming tools, mechanization

Provide practical, actionable advice in English suitable for farmers. Include measurements, timing, and local best practices when possible.

If asked about non-farming topics, politely redirect to agricultural matters.

User Question: ${question}

Please respond in English with detailed, practical farming advice.`,

            tamil: `நீங்கள் தமிழ்நாடு விவசாயிகளுக்கான அனுபவம் வாய்ந்த விவசாய ஆலோசகர். நீங்கள் தமிழில் தெளிவாகவும், அழகாகவும், நடைமுறையாகவும் பதில் அளிக்க வேண்டும்.

**உங்கள் நிபுணத்துவ பகுதிகள்:**

🌾 **பயிர்கள்:** நெல், கோதுமை, மக்காச்சோளம், பருத்தி, கரும்பு, தேநீர், காபி, மசாலா, காய்கறிகள், பழங்கள்
🐛 **பூச்சி மேலாண்மை:** அடையாளம், இயற்கை தீர்வுகள், ஒருங்கிணைந்த பூச்சி மேலாண்மை
💧 **நீர்ப்பாசனம்:** நீர் மேலாண்மை, துளி நீர்ப்பாசனம், மழைநீர் சேகரிப்பு
🧪 **மண் ஆரோக்கியம்:** பரிசோதனை, உரமிடல், உரம் தயாரித்தல், மண் பாதுகாப்பு
🌱 **விதைகள்:** வகை தேர்வு, விதை சிகிச்சை, முளைப்பு
🌦️ **வானிலை:** பருவகால ஆலோசனை, காலநிலை தழுவல், செயல்பாடுகளின் நேரம்
💰 **சந்தைகள்:** விலை போக்குகள், பயிர் திட்டமிடல், மதிப்பு சேர்த்தல்
🔧 **கருவிகள்:** நவீன விவசாய கருவிகள், இயந்திரமயமாக்கல்

**பதில் அளிக்கும் முறை:**
• தமிழ்நாடு விவசாயிகளுக்கு ஏற்ற எளிய, தெளிவான தமிழில் பதில் கொடுங்கள்
• பதிலை முக்கிய பகுதிகளாக பிரித்து தலைப்புகளுடன் அழகாக ஒழுங்குபடுத்துங்கள்
• அளவுகள், நேரம், மற்றும் உள்ளூர் சிறந்த நடைமுறைகளை சேர்க்கவும்
• எண்களில் (1, 2, 3) அல்லது புள்ளிகளில் (•) முக்கிய விஷயங்களை வரிசைப்படுத்துங்கள்
• தமிழக விவசாயத்திற்கு ஏற்ற உள்ளூர் முறைகளையும் பரிந்துரைக்கவும்

**உதாரணம் பதில் கட்டமைப்பு:**
**முக்கிய பதில்:**
[தெளிவான விளக்கம்]

**செய்முறை வழிகாட்டுதல்:**
1. [படி ஒன்று]
2. [படி இரண்டு]
3. [படி மூன்று]

**முக்கிய குறிப்புகள்:**
• [முக்கிய குறிப்பு 1]
• [முக்கிய குறிப்பு 2]

பயனர் கேள்வி: ${question}

மேலே உள்ள வழிமுறைகளின்படி தமிழில் அழகாக ஒழுங்குபடுத்தப்பட்ட, விரிவான விவசாய ஆலோசனையை அளியுங்கள்.`,

            hindi: `आप हिंदी बोलने वाले किसानों के लिए कृषि सलाह में विशेषज्ञ AI सहायक हैं। आपकी विशेषज्ञता में शामिल है:

🌾 फसलें: चावल, गेहूं, मक्का, कपास, गन्ना, चाय, कॉफी, मसाले, सब्जियां, फल
🐛 कीट प्रबंधन: पहचान, प्राकृतिक समाधान, एकीकृत कीट प्रबंधन
💧 सिंचाई: जल प्रबंधन, ड्रिप सिंचाई, वर्षा जल संचयन
🧪 मिट्टी स्वास्थ्य: परीक्षण, उर्वरीकरण, कंपोस्ट, मिट्टी संरक्षण
🌱 बीज: किस्म चयन, बीज उपचार, अंकुरण
🌦️ मौसम: मौसमी सलाह, जलवायु अनुकूलन, संचालन का समय
💰 बाजार: मूल्य रुझान, फसल योजना, मूल्य संवर्धन
🔧 उपकरण: आधुनिक कृषि उपकरण, मशीनीकरण

हिंदी में व्यावहारिक, कार्यान्वित योग्य सलाह प्रदान करें। किसानों के लिए उपयुक्त सरल हिंदी का उपयोग करें।

उपयोगकर्ता प्रश्न: ${question}

कृपया हिंदी में विस्तृत, व्यावहारिक कृषि सलाह के साथ उत्तर दें।`
          };
          
          return prompts[lang] || prompts.english;
        };

        const enhancedPrompt = getSystemPrompt(language);

        const requestPayload = {
          model: model,
          messages: [
            {
              role: "user", 
              content: enhancedPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 300, // Increased for more detailed Tamil responses
          top_p: 0.9,
          stream: false
        };
        
        console.log('Request payload:', JSON.stringify(requestPayload, null, 2));
        
        const startTime = Date.now();
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://growsmart-ai.com',
            'X-Title': 'GrowSmart AI Direct Test',
            'User-Agent': 'GrowSmart-AI/1.0'
          },
          body: JSON.stringify(requestPayload)
        });
        
        const duration = Date.now() - startTime;
        console.log(`Request completed in ${duration}ms`);
        console.log('Response status:', response.status);
        console.log('Response statusText:', response.statusText);
        console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
        
        // Log response regardless of status
        const responseText = await response.text();
        console.log('Raw response body:', responseText);
        
        if (!response.ok) {
          console.error(`❌ Model ${model} failed with status ${response.status}`);
          console.error('Error details:', responseText);
          
          // Check specific error types
          if (response.status === 401) {
            console.error('🚨 AUTHENTICATION ERROR - Invalid API key');
          } else if (response.status === 402) {
            console.error('💳 PAYMENT REQUIRED - Credits exhausted or billing issue');
          } else if (response.status === 429) {
            console.error('⏰ RATE LIMITED - Too many requests');
          } else if (response.status === 404) {
            console.error('🔍 MODEL NOT FOUND - Model may not exist or be unavailable');
          }
          
          continue; // Try next model
        }
        
        // Parse successful response
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          continue;
        }
        
        console.log('Parsed response data:', JSON.stringify(data, null, 2));
        
        const aiResponse = data.choices?.[0]?.message?.content?.trim();
        const usage = data.usage;
        
        if (aiResponse && aiResponse.length > 5) {
          console.log(`✅ SUCCESS with ${model}!`);
          console.log(`Response: "${aiResponse}"`);
          console.log('Usage:', usage);
          
          return new Response(
            JSON.stringify({
              success: true,
              response: aiResponse,
              model: model,
              language: language,
              question: question,
              timestamp: timestamp,
              duration_ms: duration,
              usage: usage,
              status: 'openrouter_success',
              debug: {
                attempt: i + 1,
                total_attempts: models.length,
                api_status: response.status,
                response_length: aiResponse.length
              }
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        } else {
          console.log(`❌ Model ${model} returned empty or invalid response:`, aiResponse);
        }
        
      } catch (fetchError) {
        console.error(`❌ Network error with ${model}:`, fetchError);
        console.error('Error details:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
      }
    }
    
    // If all models failed
    console.log('🚨 ALL MODELS FAILED - Returning detailed error report');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'All OpenRouter models failed',
        api_key_used: API_KEY.substring(0, 25) + '...',
        models_tested: models,
        timestamp: timestamp,
        recommendation: 'Check API key validity, billing status, and model availability',
        fallback_available: true
      }),
      {
        status: 200, // Return 200 to avoid client errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('🚨 CRITICAL ERROR in OpenRouter Direct function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Critical function error',
        details: error.message,
        timestamp: timestamp
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
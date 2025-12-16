import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🎤 ElevenLabs TTS function called');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, language = 'english' } = await req.json();
    console.log(`📝 TTS Request - Language: ${language}, Text length: ${text?.length}`);

    if (!text) {
      throw new Error('Text is required');
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('❌ ElevenLabs API key not found');
      throw new Error('ElevenLabs API key not configured');
    }

    console.log('🔑 API key found, proceeding with TTS...');

    // Choose voice based on language with multiple options
    let voiceId = '9BWtsMINqrJLrRacOk9x'; // Aria (default)
    
    if (language === 'tamil') {
      // Try multiple voices for Tamil/Indian languages
      voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - good for multilingual
      console.log('🇮🇳 Using Sarah voice for Tamil');
    } else if (language === 'hindi') {
      voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah
      console.log('🇮🇳 Using Sarah voice for Hindi');
    }

    console.log(`🎵 Selected voice ID: ${voiceId}`);

    const requestBody = {
      text: text,
      model_id: 'eleven_multilingual_v2', // Best model for non-English
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true
      }
    };

    console.log('📤 Making request to ElevenLabs API...');

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📥 ElevenLabs API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ElevenLabs API error: ${response.status} - ${errorText}`);
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`🎵 Audio generated successfully, size: ${audioBuffer.byteLength} bytes`);
    
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    console.log(`📦 Base64 audio length: ${base64Audio.length}`);

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio, 
        contentType: 'audio/mpeg',
        voiceId: voiceId,
        language: language,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('💥 ElevenLabs TTS Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
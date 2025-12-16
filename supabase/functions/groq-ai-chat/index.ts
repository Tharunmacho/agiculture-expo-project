import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId } = await req.json();
    
    // Create service role client to bypass RLS
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user from auth header using anon client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    let currentSessionId = sessionId;

    // Create new session if none provided
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabaseServiceClient
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          session_title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      currentSessionId = newSession.id;
    }

    // Store user message using service role client to bypass RLS
    const { error: userMessageError } = await supabaseServiceClient
      .from('ai_chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        content: message,
        sender: 'user',
      });

    if (userMessageError) throw userMessageError;

    // Call Groq API
    const groqApiKey = Deno.env.get('GROQ_API_KEY') || '';
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: `You are GrowSmart AI, an expert agricultural assistant helping farmers optimize their crop yields and farming practices. You provide practical, actionable advice based on scientific knowledge and modern farming techniques.

Your expertise includes:
- Crop management and cultivation techniques
- Soil health and fertilization
- Pest and disease identification and treatment
- Weather-based farming decisions
- Market insights and crop pricing
- Sustainable farming practices
- Irrigation and water management
- Farm equipment and technology

Always provide specific, practical advice that farmers can implement. When discussing treatments or solutions, mention both organic and conventional options when available. If you need more information to give accurate advice, ask specific questions about the farmer's location, crop type, growing conditions, etc.

Keep responses helpful, concise, and focused on actionable insights.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        stream: true
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error('Groq API error:', groqResponse.status, errorData);
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorData}`);
    }

    // Handle streaming response
    const reader = groqResponse.body?.getReader();
    const decoder = new TextDecoder();
    let aiResponse = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                aiResponse += content;
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    }

    // Store AI response using service role client to bypass RLS
    const { error: aiMessageError } = await supabaseServiceClient
      .from('ai_chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        content: aiResponse,
        sender: 'ai',
      });

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
      throw aiMessageError;
    }

    // Update session timestamp using service role client
    await supabaseServiceClient
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentSessionId);

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        sessionId: currentSessionId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in groq-ai-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
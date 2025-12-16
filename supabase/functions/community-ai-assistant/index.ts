import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Community AI Assistant function called');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, sessionId, actionType } = await req.json();
    console.log('Received request:', { message, sessionId, actionType, userId: user.id });

    // Get user profile for context
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, role, preferred_language, crop_types, soil_type, region_type, district, state')
      .eq('user_id', user.id)
      .single();

    console.log('User profile:', profile);

    // Create system prompt based on user context
    const systemPrompt = `You are an AI agricultural assistant specializing in farming advice for the GrowSmart community. 

User Context:
- Name: ${profile?.full_name || 'Farmer'}
- Location: ${profile?.district || 'Unknown'}, ${profile?.state || 'Unknown'}
- Crops: ${profile?.crop_types?.join(', ') || 'Various crops'}
- Soil Type: ${profile?.soil_type || 'Unknown'}
- Region: ${profile?.region_type || 'Unknown'}
- Language: ${profile?.preferred_language || 'english'}

Your role:
1. Provide practical, actionable farming advice
2. Focus on crop management, disease prevention, weather adaptation, and market insights
3. Be culturally sensitive and region-appropriate
4. Keep responses concise but informative (max 200 words)
5. If asked about specific diseases, recommend consulting local experts
6. Suggest relevant community features when appropriate

Always respond in a helpful, encouraging tone that empowers farmers to make informed decisions.`;

    // Handle different action types
    if (actionType === 'suggest_category') {
      // Auto-categorize question
      const categoryPrompt = `Categorize this farming question into one of these categories: 
      "Crop Management", "Disease & Pest Control", "Weather & Climate", "Market & Pricing", "Soil & Fertilizers", "Technology & Equipment", "General Farming"
      
      Question: "${message}"
      
      Respond with just the category name.`;

      const categoryResponse = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: categoryPrompt },
            { role: 'user', content: message }
          ],
          max_tokens: 50,
          temperature: 0.3,
        }),
      });

      const categoryData = await categoryResponse.json();
      const suggestedCategory = categoryData.choices[0].message.content.trim();

      return new Response(JSON.stringify({ 
        suggestedCategory,
        type: 'category_suggestion' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle regular chat messages
    let currentSessionId = sessionId;

    // Create new session if not provided
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabaseClient
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          session_title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        return new Response(JSON.stringify({ error: 'Failed to create chat session' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      currentSessionId = newSession.id;
      console.log('Created new session:', currentSessionId);
    }

    // Save user message
    const { error: userMessageError } = await supabaseClient
      .from('ai_chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        content: message,
        sender: 'user'
      });

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
    }

    // Get recent chat history for context
    const { data: recentMessages } = await supabaseClient
      .from('ai_chat_messages')
      .select('content, sender')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(10);

    console.log('Recent messages:', recentMessages?.length || 0);

    // Prepare messages for Groq API
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent chat history
    if (recentMessages) {
      recentMessages.forEach(msg => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    } else {
      // Add current message if no history found
      messages.push({ role: 'user', content: message });
    }

    console.log('Sending request to Groq API with', messages.length, 'messages');

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('Groq API error:', response.status, response.statusText);
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Received AI response, length:', aiResponse.length);

    // Save AI response
    const { error: aiMessageError } = await supabaseClient
      .from('ai_chat_messages')
      .insert({
        session_id: currentSessionId,
        user_id: user.id,
        content: aiResponse,
        sender: 'ai'
      });

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError);
    }

    // Update session timestamp
    await supabaseClient
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentSessionId);

    return new Response(JSON.stringify({ 
      response: aiResponse,
      sessionId: currentSessionId,
      type: 'chat_response'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in community AI assistant:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
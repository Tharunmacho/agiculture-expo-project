import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] OpenRouter test request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openRouterApiKey = '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';
    
    console.log('=== OpenRouter Test ===');
    console.log('API Key (first 20 chars):', openRouterApiKey.substring(0, 20) + '...');
    
    const testQuestion = "What is the best fertilizer for rice?";
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://growsmart-ai.com',
        'X-Title': 'GrowSmart AI Test'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [
          {
            role: 'user',
            content: testQuestion
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      return new Response(
        JSON.stringify({
          success: false,
          status: response.status,
          error: errorText,
          message: 'OpenRouter API test failed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('Success response:', JSON.stringify(data, null, 2));
    
    const aiResponse = data.choices?.[0]?.message?.content;
    
    return new Response(
      JSON.stringify({
        success: true,
        question: testQuestion,
        response: aiResponse,
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        message: 'OpenRouter API working correctly!',
        rawData: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Test error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'OpenRouter test failed with exception'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
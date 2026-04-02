export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: corsHeaders
        }
      );
    }

    try {
      const apiKey = env.OPENAI_API_KEY;
      const body = await request.json();

      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid messages array" }),
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

      const openAIResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: body.messages,
            max_completion_tokens: 300
          })
        }
      );

      const data = await openAIResponse.json();

      return new Response(JSON.stringify(data), {
        status: openAIResponse.status,
        headers: corsHeaders
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Worker request failed",
          details: error.message
        }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
};
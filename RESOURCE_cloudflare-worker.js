export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response("", { status: 200, headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders }
      );
    }

    try {
      const apiKey = env.OPENAI_API_KEY;

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing OPENAI_API_KEY secret" }),
          { status: 500, headers: corsHeaders }
        );
      }

      const userInput = await request.json();

      const requestBody = {
        model: "gpt-4o",
        messages: userInput.messages,
        max_tokens: 300
      };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`, // ✅ FIXED HERE
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const text = await response.text();

      return new Response(text, {
        status: response.status,
        headers: corsHeaders
      });

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Worker failed",
          details: error.message
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  }
};
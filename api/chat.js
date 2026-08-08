// api/chat.js
//
// Vercel Serverless Function
// The OpenRouter API key stays on the server.
// It is NEVER exposed to the browser.
//
// Frontend calls:
// POST /api/chat

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  // Get OpenRouter API key from Vercel environment variables
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is missing.");

    return res.status(500).json({
      error: "Server is missing OPENROUTER_API_KEY.",
    });
  }

  try {
    // Read request body
    const body = req.body || {};

    const system =
      typeof body.system === "string"
        ? body.system
        : "";

    const messages = body.messages;

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "messages array is required.",
      });
    }

    // Build messages for OpenRouter
    const input = [];

    // Add system instructions
    if (system) {
      input.push({
        role: "system",
        content: system,
      });
    }

    // Add conversation history
    for (const message of messages) {
      if (
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string"
      ) {
        continue;
      }

      input.push({
        role: message.role,
        content: message.content,
      });
    }

    if (input.length === 0) {
      return res.status(400).json({
        error: "No valid messages were provided.",
      });
    }

    // Call OpenRouter
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://maryam-wasay-portfolio.vercel.app",
          "X-Title": "Maryam Wasay Portfolio",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: input,
          max_tokens: 500,
        }),
      }
    );

    // Read OpenRouter response
    const data = await response.json();

    console.log("OpenRouter status:", response.status);

    // Handle OpenRouter errors
    if (!response.ok) {
      console.error("OpenRouter API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter API error",
      });
    }

    // Extract assistant response
    const reply =
      data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error(
        "OpenRouter returned an empty response:",
        data
      );

      return res.status(500).json({
        error: "OpenRouter returned an empty response.",
      });
    }

    // Return response in the same format
    // expected by your existing index.html
    return res.status(200).json({
      content: [
        {
          type: "text",
          text: reply,
        },
      ],
    });
  } catch (error) {
    // Handle unexpected errors
    console.error("Chat server error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Unexpected server error",
    });
  }
}

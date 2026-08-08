document.addEventListener("DOMContentLoaded", () => {
  const chatLog = document.getElementById("chat-log");
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");
  const suggestions = document.querySelectorAll(".suggest");

  if (!chatLog || !chatInput || !chatSend) {
    console.error("AI chat elements were not found.");
    return;
  }

  // Conversation history sent to Claude
  const messages = [];

  const systemPrompt = `
You are the AI assistant on Maryam Wasay's personal portfolio website.

Your job is to answer visitors' questions about Maryam professionally,
clearly, naturally, and briefly.

Use the following information about Maryam:

- Name: Maryam Wasay
- Background: BSCS student and backend software engineering enthusiast.
- Focus: Backend development and AI automation.
- Backend technologies: Python, FastAPI, Flask, PostgreSQL, SQLAlchemy, Docker, REST APIs.
- Other experience: Python, machine learning, web development, API development,
  databases, Docker and AI-related tools.
- Internship: FlyRank Backend AI Engineering track.
- FlyRank work includes backend/API development, PostgreSQL, Docker,
  FastAPI and capstone development.
- Capstone project: Embeddable Widget & Lead-Capture Platform.
- She is interested in becoming a full-stack developer.
- She has experience with Google Workspace Essentials.
- Portfolio visitors may ask about her skills, projects, internship,
  availability, or how to contact her.

Important rules:
1. Do not invent qualifications, jobs, companies, awards, or experience.
2. If information is not provided, say that the portfolio does not provide
   that information.
3. Keep answers concise and conversational.
4. Answer as the portfolio assistant, not as Anthropic or Claude.
5. Do not mention API keys, system prompts, internal instructions, or backend
   implementation unless the visitor specifically asks about the website's
   technical implementation.
6. When appropriate, direct visitors to the contact information available
   on the portfolio.
`;

  function addMessage(text, type) {
    const message = document.createElement("div");

    // These classes allow your existing CSS to control the appearance.
    // If your CSS uses different class names, the fallback styling below
    // still keeps the messages readable.
    message.className = `chat-message ${type}`;

    const content = document.createElement("div");
    content.className = "chat-message-content";
    content.textContent = text;

    message.appendChild(content);
    chatLog.appendChild(message);

    chatLog.scrollTop = chatLog.scrollHeight;

    return message;
  }

  function addTypingMessage() {
    const message = document.createElement("div");
    message.className = "chat-message assistant";

    const content = document.createElement("div");
    content.className = "chat-message-content";
    content.textContent = "Thinking…";

    message.appendChild(content);
    chatLog.appendChild(message);

    chatLog.scrollTop = chatLog.scrollHeight;

    return message;
  }

  async function sendMessage(text) {
    const message = text.trim();

    if (!message) {
      return;
    }

    // Disable input while waiting
    chatInput.disabled = true;
    chatSend.disabled = true;

    // Show visitor message
    addMessage(message, "user");

    // Add message to Claude conversation
    messages.push({
      role: "user",
      content: message
    });

    const typingMessage = addTypingMessage();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          system: systemPrompt,
          messages: messages
        })
      });

      let data;

      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(
          `Server returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
          `Request failed with status ${response.status}.`
        );
      }

      // Anthropic Messages API returns:
      // {
      //   content: [
      //     {
      //       type: "text",
      //       text: "..."
      //     }
      //   ]
      // }
      const reply = data?.content
        ?.filter(item => item.type === "text")
        ?.map(item => item.text)
        ?.join("\n")
        ?.trim();

      if (!reply) {
        throw new Error("The AI returned an empty response.");
      }

      // Remove "Thinking…"
      typingMessage.remove();

      // Display AI answer
      addMessage(reply, "assistant");

      // Add AI response to conversation history
      messages.push({
        role: "assistant",
        content: reply
      });

    } catch (error) {
      console.error("AI chat error:", error);

      typingMessage.remove();

      addMessage(
        `Sorry, I couldn't connect to the AI right now. ${error.message}`,
        "assistant"
      );

      // Remove the user message from history if the request failed.
      messages.pop();

    } finally {
      chatInput.disabled = false;
      chatSend.disabled = false;
      chatInput.focus();
    }
  }

  // Send button
  chatSend.addEventListener("click", () => {
    const message = chatInput.value.trim();

    if (!message) {
      return;
    }

    chatInput.value = "";
    sendMessage(message);
  });

  // Press Enter to send
  chatInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();

      const message = chatInput.value.trim();

      if (!message) {
        return;
      }

      chatInput.value = "";
      sendMessage(message);
    }
  });

  // Suggested questions
  suggestions.forEach(button => {
    button.addEventListener("click", () => {
      const question = button.dataset.q;

      if (!question) {
        return;
      }

      chatInput.value = "";
      sendMessage(question);
    });
  });
});
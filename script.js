/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

// Initialize conversation history
const conversationHistory = [
  {
    role: "system",
    content:
      "You are a L’Oréal AI that refuses unrelated questions and only answers queries about L’Oréal products and routines, remembers details from earlier messages and responds with context awareness.",
  },
];

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Add user message to conversation history
  const userText = userInput.value;
  conversationHistory.push({ role: "user", content: userText });

  // Clear input field
  userInput.value = "";

  // Display user message in chat window
  chatWindow.innerHTML += `You: ${userText}<br>`;

  // URL of your Cloudflare Worker or proxy that forwards requests to OpenAI
  // Change this to your deployed worker endpoint (e.g. 'https://...')
  const WORKER_URL = 'https://white-sound-1605.yledesm1.workers.dev/';

  // Display 'Thinking...' message in the chat window
  const thinkingMessage = document.createElement("div");
  thinkingMessage.textContent = "AI: Thinking...";
  thinkingMessage.classList.add("thinking-message");
  chatWindow.appendChild(thinkingMessage);

  // Send request to the worker/proxy
  (async () => {
    try {
      const resp = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: conversationHistory,
          max_completion_tokens: 800,
          temperature: 0.5,
          frequency_penalty: 0.8,
        }),
      });

      if (!resp.ok) {
        throw new Error(
          `API request failed with status ${resp.status}: ${resp.statusText}`
        );
      }

      const data = await resp.json();

      // Remove 'Thinking...' message
      chatWindow.removeChild(thinkingMessage);

      // Extract only the assistant/AI text and log that to the console.
      const aiText = extractAssistantText(data);

      if (aiText !== null) {
        // Add assistant message to conversation history
        conversationHistory.push({ role: "assistant", content: aiText });

        // Display the AI response in the chat window, preserving line breaks and spacing
        const formattedResponse = aiText.replace(/\n/g, "<br>");
        chatWindow.innerHTML += `AI: ${formattedResponse}<br>`;
      } else {
        console.error("No assistant text found in response", data);
        chatWindow.innerHTML += "Error: No assistant text found.<br>";
      }
    } catch (err) {
      // Remove 'Thinking...' message in case of error
      chatWindow.removeChild(thinkingMessage);

      console.error("Request failed", err);
      chatWindow.innerHTML +=
        "Error: Something went wrong while processing your request. Please try again later.<br>";
    }
  })();
});

/**
 * Helper: given an OpenAI chat completions response object, return the assistant
 * text string (or null if not found). This keeps console output limited to the
 * assistant/AI content only.
 */
function extractAssistantText(data) {
  // Chat Completions (chat API)
  if (data && Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    // new style: choice.message.content
    if (choice.message && typeof choice.message.content === "string") {
      return choice.message.content;
    }
    // older style: choice.text
    if (typeof choice.text === "string") {
      return choice.text;
    }
  }

  // Safety: some proxies return { message: { content: '...' } }
  if (data && data.message && typeof data.message.content === "string") {
    return data.message.content;
  }

  return null;
}

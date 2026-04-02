/* ---------- DOM elements ---------- */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const currentQuestion = document.getElementById("currentQuestion");
const sendBtn = document.getElementById("sendBtn");

/* ---------- IMPORTANT ----------
   Paste your real deployed Cloudflare Worker URL here
----------------------------------- */
const WORKER_URL = "PASTE_YOUR_REAL_CLOUDFLARE_WORKER_URL_HERE";

/* ---------- System prompt ---------- */
const systemPrompt = `
You are the L’Oréal Beauty Advisor.

You only help with:
- L’Oréal makeup, skincare, haircare, and fragrances
- product discovery
- personalized beauty routines
- beauty recommendations related to L’Oréal products
- general beauty questions that are clearly connected to L’Oréal

Rules:
- If a question is unrelated to L’Oréal or beauty, politely refuse and redirect.
- Be friendly, clear, and concise.
- Do not give medical diagnoses.
- For serious skin or scalp concerns, suggest talking to a qualified professional.
`;

/* ---------- Conversation history ---------- */
let messages = [
  { role: "system", content: systemPrompt }
];

/* ---------- Initial message ---------- */
chatWindow.innerHTML = "";
addMessage(
  "assistant",
  "Hi! I’m your L’Oréal Beauty Advisor. Ask me about skincare, makeup, haircare, fragrance, or routines."
);

/* ---------- Form submit ---------- */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) return;

  currentQuestion.textContent = `Latest question: ${question}`;
  addMessage("user", question);

  messages.push({
    role: "user",
    content: question
  });

  userInput.value = "";
  toggleForm(true);

  const loadingBubble = addMessage("assistant", "Typing...");

  try {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });

  const rawText = await response.text();
  console.log("Raw worker response:", rawText);

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (parseError) {
    throw new Error(`Server did not return valid JSON. Response was: ${rawText}`);
  }

  if (!response.ok) {
    throw new Error(data.error || data.details || `HTTP error: ${response.status}`);
  }

  const aiReply =
    data?.choices?.[0]?.message?.content ||
    "Sorry, I couldn’t generate a response right now.";

  loadingBubble.textContent = aiReply;

  messages.push({
    role: "assistant",
    content: aiReply
  });
} catch (error) {
  console.error("Chat error:", error);
  loadingBubble.textContent = `Error: ${error.message}`;
}
});

/* ---------- Helpers ---------- */
function addMessage(sender, text) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");

  if (sender === "user") {
    messageDiv.classList.add("user-message");
  } else {
    messageDiv.classList.add("assistant-message");
  }

  messageDiv.textContent = text;
  chatWindow.appendChild(messageDiv);
  scrollToBottom();
  return messageDiv;
}

function toggleForm(isLoading) {
  userInput.disabled = isLoading;
  sendBtn.disabled = isLoading;
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
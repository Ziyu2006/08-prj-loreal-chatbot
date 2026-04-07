/* ---------- DOM elements ---------- */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const currentQuestion = document.getElementById("currentQuestion");
const sendBtn = document.getElementById("sendBtn");

/* ---------- IMPORTANT ----------
   替换为您的 Cloudflare Worker URL
   获取方式：部署 worker 后获得的域名
----------------------------------- */
const WORKER_URL = "https://loralbot.jadedaydreaming022023.workers.dev/";

/* ---------- System prompt (确保AI只回答L'Oréal相关问题) ---------- */
const systemPrompt = `You are the official L’Oréal Beauty Advisor.

Your ONLY role is to help with:
- L’Oréal makeup, skincare, haircare, and fragrances
- Product discovery and recommendations
- Personalized beauty routines
- Beauty tips and techniques using L’Oréal products

CRITICAL RULES:
1. If a question is completely unrelated to L’Oréal or beauty (e.g., politics, sports, weather, coding, math, general knowledge), politely refuse and redirect to beauty topics.
2. Never give medical diagnoses or treatment advice. For serious skin/scalp concerns, recommend consulting a dermatologist.
3. Be warm, expert, and concise. Embody L’Oréal's "Because You're Worth It" spirit.
4. When suggesting products, mention real L’Oréal Paris ranges (Revitalift, Infallible, EverPure, Elvive, Age Perfect, etc.).
5. Keep responses under 150 words when possible.
6. Always respond in English.`;

/* ---------- Conversation history (LevelUp: 10pts - 维护对话上下文) ---------- */
let conversationHistory = [
  { role: "system", content: systemPrompt }
];

/* ---------- 清空并初始化聊天窗口 ---------- */
function initChat() {
  chatWindow.innerHTML = "";
  // 重置历史记录，保留系统提示
  conversationHistory = [{ role: "system", content: systemPrompt }];
  
  // 显示欢迎消息
  const welcomeMessage = "Hi gorgeous! 💄 I'm your L'Oréal Beauty Advisor. Ask me about anti-aging skincare, radiant foundation, hair repair routines, or building your perfect beauty ritual. How can I elevate your beauty game today?";
  addMessageToUI("assistant", welcomeMessage);
  conversationHistory.push({ role: "assistant", content: welcomeMessage });
  
  currentQuestion.textContent = "";
  scrollToBottom();
}

/* ---------- 添加消息到UI (LevelUp: 对话气泡UI) ---------- */
function addMessageToUI(sender, text) {
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

/* ---------- 显示用户最新问题 (LevelUp: 5pts) ---------- */
function updateLatestQuestion(question) {
  if (question && question.trim()) {
    currentQuestion.textContent = `✨ Latest question: ${question}`;
  } else {
    currentQuestion.textContent = "";
  }
}

/* ---------- 滚动到底部 ---------- */
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ---------- 禁用/启用表单（加载状态） ---------- */
function setLoading(isLoading) {
  userInput.disabled = isLoading;
  sendBtn.disabled = isLoading;
  if (isLoading) {
    sendBtn.style.opacity = "0.6";
  } else {
    sendBtn.style.opacity = "1";
  }
}

/* ---------- 发送消息到 Cloudflare Worker ---------- */
async function sendMessage(userQuestion) {
  // 1. 保存用户消息到历史
  conversationHistory.push({ role: "user", content: userQuestion });
  
  // 2. 在UI中显示用户消息
  addMessageToUI("user", userQuestion);
  updateLatestQuestion(userQuestion);
  
  // 3. 显示"思考中"的临时消息
  const thinkingBubble = addMessageToUI("assistant", "💄 Thinking...");
  
  setLoading(true);
  
  try {
    // 4. 发送请求到 Cloudflare Worker
    const payload = {
      messages: conversationHistory  // 发送完整对话历史，保持上下文
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // 5. 解析响应（修复：正确处理各种响应格式）
    const rawResponse = await response.text();
    console.log("[Worker Response]:", rawResponse.substring(0, 300));
    
    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(`Worker returned invalid JSON. Raw response: ${rawResponse.substring(0, 200)}`);
    }
    
    if (!response.ok) {
      const errorMsg = data?.error || data?.details || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }
    
    // 6. 提取AI回复（兼容多种响应格式）
    let aiReply = null;
    
    // 标准 OpenAI 格式
    if (data?.choices?.[0]?.message?.content) {
      aiReply = data.choices[0].message.content;
    }
    // 某些 worker 可能直接返回 response 字段
    else if (data?.response) {
      aiReply = data.response;
    }
    // 如果都没有，使用后备回复
    else {
      aiReply = "I'd love to help with your L'Oréal beauty journey! Could you rephrase your question about skincare, makeup, or haircare?";
    }
    
    // 7. 更新UI中的消息（替换"Thinking..."）
    thinkingBubble.textContent = aiReply;
    
    // 8. 保存AI回复到历史（维护上下文）
    conversationHistory.push({ role: "assistant", content: aiReply });
    
    // 9. 可选：限制历史长度，防止过长（保留系统提示 + 最近20条）
    if (conversationHistory.length > 30) {
      const systemMsg = conversationHistory[0];
      const recentMsgs = conversationHistory.slice(-24);
      conversationHistory = [systemMsg, ...recentMsgs.filter(m => m.role !== "system")];
    }
    
  } catch (error) {
    console.error("Chat error details:", error);
    
    // 友好的错误消息
    let friendlyError = "🌸 Oops! My beauty server is having a moment. ";
    
    if (error.message.includes("invalid JSON")) {
      friendlyError += "The Cloudflare Worker may not be configured correctly. Please check your worker endpoint and API key.";
    } else if (error.name === "AbortError") {
      friendlyError += "Request timed out. Please try again in a moment.";
    } else if (error.message.includes("401") || error.message.includes("API key")) {
      friendlyError += "Authentication error. The API key needs to be set in Cloudflare Worker secrets.";
    } else if (error.message.includes("fetch")) {
      friendlyError += "Network error. Make sure your Worker URL is correct and the worker is deployed.";
    } else {
      friendlyError += `Error: ${error.message.substring(0, 150)}`;
    }
    
    thinkingBubble.textContent = friendlyError;
    // 不要将错误消息添加到历史中，保持上下文干净
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

/* ---------- 表单提交处理 ---------- */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const question = userInput.value.trim();
  if (!question) return;
  
  // 清空输入框
  userInput.value = "";
  
  // 发送消息
  await sendMessage(question);
});

/* ---------- 页面加载时初始化聊天 ---------- */
initChat();
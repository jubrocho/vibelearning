// DOM Elements
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatForm = document.getElementById('chatForm');
const messageList = document.getElementById('messageList');
const welcomeMessage = document.getElementById('welcomeMessage');
const typingIndicator = document.getElementById('typingIndicator');
const chatContainer = document.getElementById('chatContainer');

// Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');

// State
// Fallback to CONFIG object if available (loaded from config.js)
const defaultKey = typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : '';
let apiKey = localStorage.getItem('gemini_api_key') || defaultKey;
let chatHistory = []; // Store history for context

// Initialize
try {
    lucide.createIcons();
} catch (e) {
    console.error("Lucide error:", e);
}

if (apiKey) {
    apiKeyInput.value = apiKey;
}

// --- UI Logic ---

// Auto-resize textarea
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    
    // Enable/disable send button
    if (this.value.trim().length > 0) {
        sendBtn.disabled = false;
    } else {
        sendBtn.disabled = true;
    }
});

// Handle Enter key to send (Shift+Enter for new line)
chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (this.value.trim().length > 0) {
            chatForm.requestSubmit();
        }
    }
});

// Scroll to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add message to UI
function appendMessage(role, text) {
    // Hide welcome message
    if (!welcomeMessage.classList.contains('hidden')) {
        welcomeMessage.classList.add('hidden');
        welcomeMessage.style.display = 'none';
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', role);
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    // Simple markdown parsing for code blocks and basic formatting
    let formattedText = text
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Code blocks
        .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
        .replace(/\n/g, '<br>'); // New lines
        
    contentDiv.innerHTML = formattedText;
    msgDiv.appendChild(contentDiv);
    
    // Insert before typing indicator
    messageList.appendChild(msgDiv);
    scrollToBottom();
}

// Show/Hide typing indicator
function setTyping(isTyping) {
    if (isTyping) {
        typingIndicator.classList.remove('hidden');
        messageList.appendChild(typingIndicator); // Move to bottom
    } else {
        typingIndicator.classList.add('hidden');
    }
    scrollToBottom();
}

// --- API Logic ---

// Mock AI Response
const getMockResponse = () => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve("이것은 모의(Mock) 응답입니다. 실제 AI와 대화하려면 우측 상단의 ⚙️ 설정 아이콘을 눌러 Gemini API 키를 입력해주세요!");
        }, 1500);
    });
};

// Call Gemini API
async function callGeminiAPI(prompt) {
    // Add user message to history
    chatHistory.push({
        role: "user",
        parts: [{ text: prompt }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: chatHistory
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API 요청 실패');
        }

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        // Add AI response to history
        chatHistory.push({
            role: "model",
            parts: [{ text: aiText }]
        });
        
        return aiText;
        
    } catch (error) {
        console.error("Gemini API Error:", error);
        // Remove the last user message from history on error so they can retry
        chatHistory.pop(); 
        return `오류가 발생했습니다: ${error.message}`;
    }
}

// --- Event Listeners ---

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Reset input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.setAttribute('disabled', 'true');
    
    // Add user message to UI
    appendMessage('user', message);
    
    // Show typing indicator
    setTyping(true);
    
    // Get response
    let responseText = "";
    if (apiKey) {
        responseText = await callGeminiAPI(message);
    } else {
        responseText = await getMockResponse();
    }
    
    // Hide typing and show AI message
    setTyping(false);
    appendMessage('ai', responseText);
});

// Modal Events
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

const closeModal = () => {
    settingsModal.classList.add('hidden');
};

closeModalBtn.addEventListener('click', closeModal);
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeModal();
    }
});

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    apiKey = key;
    if (key) {
        localStorage.setItem('gemini_api_key', key);
    } else {
        localStorage.removeItem('gemini_api_key');
    }
    closeModal();
    
    // Optional: add a system message
    appendMessage('ai', key ? "API 키가 성공적으로 저장되었습니다! 이제 진짜 AI와 대화할 수 있습니다." : "API 키가 제거되었습니다. 이제 모의 응답 모드로 전환됩니다.");
});

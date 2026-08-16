// DOM Elements
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const chatForm = document.getElementById('chatForm');
const messageList = document.getElementById('messageList');
const welcomeMessage = document.getElementById('welcomeMessage');
const typingIndicator = document.getElementById('typingIndicator');
const chatContainer = document.getElementById('chatContainer');
const ambientBackground = document.getElementById('ambientCanvas');

// Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');

// Header Elements
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundIcon = document.getElementById('soundIcon');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// State
// Fallback to CONFIG object if available (loaded from config.js)
const defaultKey = typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : '';
let apiKey = localStorage.getItem('gemini_api_key') || defaultKey;
let chatHistory = []; // Store history for context
let isSoundOn = true; // Default sound state

// Initialize
try {
    lucide.createIcons();
} catch (e) {
    console.error("Lucide error:", e);
}

if (apiKey) {
    apiKeyInput.value = apiKey;
}

// --- Status Logic ---
function updateStatus() {
    statusDot.className = 'status-dot'; // reset
    if (!navigator.onLine) {
        statusDot.classList.add('status-offline');
        statusText.textContent = 'Offline';
        statusText.style.color = 'var(--text-secondary)';
    } else if (!apiKey) {
        statusDot.classList.add('status-warn');
        statusText.textContent = 'API Key Required';
        statusText.style.color = '#f59e0b';
    } else {
        statusDot.classList.add('status-online');
        statusText.textContent = 'Online';
        statusText.style.color = '#10b981';
    }
}

window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus(); // Initial check

// --- Ambient Canvas Ripple Effect ---
const ctx = ambientBackground.getContext('2d');
let width = window.innerWidth;
let height = window.innerHeight;
ambientBackground.width = width;
ambientBackground.height = height;

window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    ambientBackground.width = width;
    ambientBackground.height = height;
});

const ripples = [];
let lastMouseTime = 0;

document.addEventListener('mousemove', (e) => {
    if (ambientBackground.classList.contains('hidden')) return;
    
    const now = Date.now();
    // Create haze particles more frequently
    if (now - lastMouseTime > 30) {
        ripples.push({
            x: e.clientX,
            y: e.clientY,
            radius: Math.random() * 20 + 30, // initial size
            maxRadius: Math.random() * 100 + 150, // final size
            opacity: 0.4,
            vx: (Math.random() - 0.5) * 1.5, // horizontal drift
            vy: (Math.random() - 0.5) * 1.5 - 0.5 // slight upward drift
        });
        lastMouseTime = now;
    }
});

function drawAmbient() {
    if (ambientBackground.classList.contains('hidden')) return;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw central deep red glow (Larger and more visible)
    const cx = width / 2;
    const cy = height / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.8);
    gradient.addColorStop(0, 'rgba(159, 18, 57, 0.3)'); // Deep red
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Enable additive blending for a glowing/hazy effect
    ctx.globalCompositeOperation = 'lighter';
    
    // Draw haze particles
    for (let i = ripples.length - 1; i >= 0; i--) {
        const p = ripples[i];
        
        // Soft radial gradient for the particle (Darker Deep Red)
        const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        pGrad.addColorStop(0, `rgba(120, 10, 30, ${p.opacity})`);
        pGrad.addColorStop(1, 'rgba(120, 10, 30, 0)');
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = pGrad;
        ctx.fill();
        
        // Update particle logic (drift and expand like smoke/haze)
        p.x += p.vx;
        p.y += p.vy;
        p.radius += (p.maxRadius - p.radius) * 0.03; // Smooth expansion
        p.opacity -= 0.004; // Fade out speed
        
        if (p.opacity <= 0) {
            ripples.splice(i, 1);
        }
    }
    
    // Reset blending mode
    ctx.globalCompositeOperation = 'source-over';
    
    requestAnimationFrame(drawAmbient);
}
drawAmbient();

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
    
    // Add TTS button for AI
    if (role === 'ai') {
        const actionDiv = document.createElement('div');
        actionDiv.classList.add('message-actions');
        
        const speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.classList.add('icon-btn', 'action-btn');
        speakBtn.innerHTML = '<i data-lucide="volume-2"></i>';
        speakBtn.title = "음성으로 듣기";
        speakBtn.onclick = () => speakText(text);
        
        actionDiv.appendChild(speakBtn);
        msgDiv.appendChild(actionDiv);
    }
    
    // Insert before typing indicator
    messageList.appendChild(msgDiv);
    lucide.createIcons({ root: msgDiv });
    scrollToBottom();
}

// --- Text to Speech Logic ---
function speakText(text) {
    if (!isSoundOn) return; // Respect sound toggle
    
    if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        
        // Remove markdown formatting (code blocks, asterisks, etc.) for speech
        const plainText = text.replace(/```[\s\S]*?```/g, "코드 블록이 생략되었습니다.")
                              .replace(/[*_#`]/g, '');

        const utterance = new SpeechSynthesisUtterance(plainText);
        utterance.lang = 'ko-KR'; // Korean
        window.speechSynthesis.speak(utterance);
    }
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

// --- Voice Recognition Logic ---
let isRecording = false;
let recognition = null;

if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR'; // Korean
    recognition.interimResults = true;
    recognition.continuous = false;
    
    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        chatInput.placeholder = "듣고 있습니다...";
    };
    
    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        chatInput.value = transcript;
        
        // Trigger input event to resize textarea and enable send button
        chatInput.dispatchEvent(new Event('input'));
    };
    
    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        chatInput.placeholder = "메시지를 입력하세요...";
        
        // Auto-submit when voice input ends automatically
        if (chatInput.value.trim().length > 0) {
            chatForm.requestSubmit();
        }
    };
    
    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        isRecording = false;
        micBtn.classList.remove('recording');
        chatInput.placeholder = "메시지를 입력하세요...";
    };
    
    micBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
} else {
    // Hide mic button if API is not supported
    micBtn.style.display = 'none';
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
    sendBtn.disabled = true;
    
    // Hide ambient background on first message
    if (!ambientBackground.classList.contains('hidden')) {
        ambientBackground.classList.add('hidden');
    }
    
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
    
    // Automatically read the response aloud
    speakText(responseText);
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
    updateStatus(); // Update status badge
    
    // Optional: add a system message
    appendMessage('ai', key ? "API 키가 성공적으로 저장되었습니다! 이제 진짜 AI와 대화할 수 있습니다." : "API 키가 제거되었습니다. 이제 모의 응답 모드로 전환됩니다.");
});

// Sound Toggle Event
soundToggleBtn.addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    
    if (isSoundOn) {
        soundIcon.setAttribute('data-lucide', 'volume-2');
        soundToggleBtn.title = "소리 끄기";
    } else {
        soundIcon.setAttribute('data-lucide', 'volume-x');
        soundToggleBtn.title = "소리 켜기";
        // Immediately stop any playing audio
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
    lucide.createIcons(); // Re-render the icon
});

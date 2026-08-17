// DOM Elements
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const previewImage = document.getElementById('previewImage');
const previewPdf = document.getElementById('previewPdf');
const pdfName = document.getElementById('pdfName');
const removeFileBtn = document.getElementById('removeFileBtn');
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

// Drag & Drop / Upload Modal Elements
const globalDropOverlay = document.getElementById('globalDropOverlay');
const uploadModal = document.getElementById('uploadModal');
const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
const dropZone = document.getElementById('dropZone');
const browseFilesBtn = document.getElementById('browseFilesBtn');

// Model Selector Elements
const modelSelector = document.getElementById('modelSelector');
const modelSelectBtn = document.getElementById('modelSelectBtn');
const modelDropdown = document.getElementById('modelDropdown');
const currentModelName = document.getElementById('currentModelName');
const modelOptions = document.querySelectorAll('.model-option');

// State
const MODELS = {
    'gemini-flash-latest': { name: 'Gemini Flash', limit: 15 },
    'gemini-1.5-pro-latest': { name: 'Gemini Pro', limit: 2 }
};
let selectedModel = 'gemini-flash-latest';
let usageHistory = JSON.parse(localStorage.getItem('geminiUsageHistory')) || {
    'gemini-flash-latest': [],
    'gemini-1.5-pro-latest': []
};
// Ensure arrays exist
for (const model in MODELS) {
    if (!usageHistory[model]) usageHistory[model] = [];
}

// Fallback to CONFIG object if available (loaded from config.js)
const defaultKey = typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : '';
let apiKey = localStorage.getItem('gemini_api_key') || defaultKey;
let chatHistory = []; // Store history for context
let isSoundOn = true; // Default sound state
let selectedFile = null; // Store selected file data { base64, mimeType, name }

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

// --- Upload Modal & File Attachment Logic ---

// Open custom upload modal instead of direct file input
attachBtn.addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
    uploadModal.style.display = 'flex';
});

// Close custom upload modal
closeUploadModalBtn.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
    uploadModal.style.display = 'none';
});

// Browse Files Button inside Modal
browseFilesBtn.addEventListener('click', () => {
    fileInput.click();
});

// Common file processing function
function processFile(file) {
    if (!file) return;

    // Check if it's an image or PDF
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('지원되지 않는 파일 형식입니다. 이미지(JPG, PNG 등) 또는 PDF 파일만 업로드 가능합니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        // Extract base64 part
        const base64Data = event.target.result.split(',')[1];
        
        selectedFile = {
            base64: base64Data,
            mimeType: file.type,
            name: file.name,
            dataUrl: event.target.result // for preview
        };
        
        // Show preview in the chat input area
        filePreview.classList.remove('hidden');
        if (file.type.startsWith('image/')) {
            previewImage.src = selectedFile.dataUrl;
            previewImage.classList.remove('hidden');
            previewPdf.classList.add('hidden');
        } else if (file.type === 'application/pdf') {
            pdfName.textContent = file.name;
            previewPdf.classList.remove('hidden');
            previewImage.classList.add('hidden');
        }
        
        // Enable send button
        sendBtn.disabled = false;
        
        // Close modal if it was open
        uploadModal.classList.add('hidden');
        uploadModal.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// --- Rate Limiter & Model Selector Logic ---

function updateQuotas() {
    const now = Date.now();
    let hasChanges = false;
    
    for (const modelId in MODELS) {
        // Clean up requests older than 60 seconds
        const oldLen = usageHistory[modelId].length;
        usageHistory[modelId] = usageHistory[modelId].filter(timestamp => now - timestamp < 60000);
        if (usageHistory[modelId].length !== oldLen) hasChanges = true;
        
        const used = usageHistory[modelId].length;
        const limit = MODELS[modelId].limit;
        const remaining = Math.max(0, limit - used);
        
        const optionEl = document.querySelector(`.model-option[data-model="${modelId}"]`);
        const quotaEl = document.getElementById(`quota-${modelId === 'gemini-flash-latest' ? 'flash' : 'pro'}`);
        const tooltipEl = document.getElementById(`tooltip-${modelId === 'gemini-flash-latest' ? 'flash' : 'pro'}`);
        
        if (quotaEl) quotaEl.textContent = `${remaining}/${limit}`;
        
        if (remaining === 0) {
            optionEl.disabled = true;
            // Calculate time until earliest request expires
            const oldestRequest = usageHistory[modelId][0] || now;
            const msUntilRecovery = 60000 - (now - oldestRequest);
            const secUntilRecovery = Math.ceil(Math.max(0, msUntilRecovery) / 1000);
            
            tooltipEl.textContent = `${secUntilRecovery}초 후 회복`;
            tooltipEl.classList.remove('hidden');
            
            // Auto switch model if active is disabled
            if (selectedModel === modelId) {
                for (const fallbackModel in MODELS) {
                    if (fallbackModel !== modelId && usageHistory[fallbackModel].length < MODELS[fallbackModel].limit) {
                        selectedModel = fallbackModel;
                        currentModelName.textContent = MODELS[fallbackModel].name;
                        modelOptions.forEach(opt => {
                            opt.classList.remove('active');
                            if (opt.dataset.model === fallbackModel) opt.classList.add('active');
                        });
                        break;
                    }
                }
            }
        } else {
            optionEl.disabled = false;
            tooltipEl.classList.add('hidden');
        }
    }
    
    if (hasChanges) {
        localStorage.setItem('geminiUsageHistory', JSON.stringify(usageHistory));
    }
}

function recordUsage(modelId) {
    usageHistory[modelId].push(Date.now());
    localStorage.setItem('geminiUsageHistory', JSON.stringify(usageHistory));
    updateQuotas();
}

// Check quotas every second
setInterval(updateQuotas, 1000);
updateQuotas();

// Toggle Dropdown
modelSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modelDropdown.classList.toggle('hidden');
    modelSelector.classList.toggle('open');
});

// Close when clicking outside
document.addEventListener('click', (e) => {
    if (!modelSelector.contains(e.target)) {
        modelDropdown.classList.add('hidden');
        modelSelector.classList.remove('open');
    }
});

// Select Model
modelOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (option.disabled) return;
        const modelId = option.dataset.model;
        selectedModel = modelId;
        currentModelName.textContent = MODELS[modelId].name;
        
        // Update active class
        modelOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        // Close dropdown
        modelDropdown.classList.add('hidden');
        modelSelector.classList.remove('open');
    });
});

// Native file input change
fileInput.addEventListener('change', (e) => {
    processFile(e.target.files[0]);
});

// --- Drag & Drop Logic ---

let dragCounter = 0; // To handle child element dragenter/leave properly

// Global Window Drag Events
window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
        globalDropOverlay.classList.remove('hidden');
        globalDropOverlay.style.display = 'flex';
    }
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        globalDropOverlay.classList.add('hidden');
        globalDropOverlay.style.display = 'none';
    }
});

window.addEventListener('dragover', (e) => {
    e.preventDefault(); // Prevent default to allow drop
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    globalDropOverlay.classList.add('hidden');
    globalDropOverlay.style.display = 'none';
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
    }
});

// Modal Drop Zone Events
dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
    }
});

function clearFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    previewImage.src = '';
    
    if (chatInput.value.trim() === '') {
        sendBtn.disabled = true;
    }
}

removeFileBtn.addEventListener('click', clearFileSelection);

// Auto-resize textarea
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    
    // Enable/disable send button
    if (this.value.trim().length > 0 || selectedFile) {
        sendBtn.disabled = false;
    } else {
        sendBtn.disabled = true;
    }
});

// Handle Enter key to send (Shift+Enter for new line)
chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (this.value.trim().length > 0 || selectedFile) {
            chatForm.requestSubmit();
        }
    }
});

// Scroll to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add message to UI
function appendMessage(role, text, fileAttachment = null) {
    // Hide welcome message
    if (!welcomeMessage.classList.contains('hidden')) {
        welcomeMessage.classList.add('hidden');
        welcomeMessage.style.display = 'none';
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', role);
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    // Add user attachment preview if exists
    if (role === 'user' && fileAttachment) {
        const attachDiv = document.createElement('div');
        attachDiv.classList.add('user-attachment');
        
        if (fileAttachment.mimeType.startsWith('image/')) {
            attachDiv.innerHTML = `<img src="${fileAttachment.dataUrl}" alt="첨부 이미지">`;
        } else if (fileAttachment.mimeType === 'application/pdf') {
            attachDiv.innerHTML = `<div class="pdf-attachment"><i data-lucide="file-text"></i> <span>${fileAttachment.name}</span></div>`;
        }
        contentDiv.appendChild(attachDiv);
    }
    
    // Basic Markdown formatting (bold, italics, line breaks, and Images)
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Convert Markdown Images to <img> tags for Image Generation
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
        .replace(/\n/g, '<br>');
        
    // Format code blocks
    formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Create text container to append to contentDiv
    const textDiv = document.createElement('div');
    textDiv.innerHTML = formattedText;
    contentDiv.appendChild(textDiv);
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
    try {
        const payloadParts = [];
        
        // If file attached, add to parts
        if (selectedFile) {
            payloadParts.push({
                inlineData: {
                    mimeType: selectedFile.mimeType,
                    data: selectedFile.base64
                }
            });
        }
        
        // Add text prompt
        if (prompt) {
            payloadParts.push({ text: prompt });
        }

        const payload = {
            systemInstruction: {
                parts: [{ 
                    text: "당신은 구글 제미나이(Gemini) 기반의 친절하고 똑똑한 AI 어시스턴트입니다. 파일(PDF, 이미지)이 첨부되면 내용을 꼼꼼히 분석하여 답변하세요. \n\n[중요: 이미지 생성 요청 처리 규칙]\n만약 사용자가 이미지를 그려달라고 하거나 생성해달라고 요청하는 경우, 당신은 무료 이미지 생성 API를 통해 이미지를 그려주어야 합니다. 답변에 다음과 같은 마크다운 형식의 이미지 링크를 반드시 포함하세요: \n\n`![이미지 설명](https://image.pollinations.ai/prompt/영어로_번역된_상세_프롬프트)`\n\n- '영어로_번역된_상세_프롬프트' 부분은 사용자의 요청을 바탕으로 고품질 이미지를 만들기 위한 상세한 영문 설명(URL 인코딩 불필요, 띄어쓰기는 그대로)으로 작성하세요.\n- 예시: `![귀여운 우주 비행사 고양이](https://image.pollinations.ai/prompt/A cute fluffy cat wearing an astronaut suit, floating in space, highly detailed, 4k, digital art)`" 
                }]
            },
            contents: [
                ...chatHistory,
                { role: "user", parts: payloadParts }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        };

        // Optional safety: locally prevent sending if we know quota is exhausted
        if (usageHistory[selectedModel].length >= MODELS[selectedModel].limit) {
            throw new Error(`${MODELS[selectedModel].name} 모델의 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.`);
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.status === 429) {
            // Force exhaust local quota immediately to trigger cooldown
            const now = Date.now();
            usageHistory[selectedModel] = Array(MODELS[selectedModel].limit).fill(now);
            localStorage.setItem('geminiUsageHistory', JSON.stringify(usageHistory));
            updateQuotas();
            throw new Error(`API 서버 요청 한도(429)를 초과했습니다. ${MODELS[selectedModel].name} 모델이 60초간 비활성화됩니다.`);
        }

        if (!response.ok) {
            throw new Error(`API 오류: ${response.status} ${response.statusText}`);
        }
        
        // Record successful usage
        recordUsage(selectedModel);

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;
        
        // Add history
        chatHistory.push({ role: "user", parts: payloadParts });
        chatHistory.push({ role: "model", parts: [{ text: aiText }] });
        
        return aiText;
        
    } catch (error) {
        console.error("Gemini API Error:", error);
        return `오류가 발생했습니다: ${error.message}`;
    }
}

// --- Event Listeners ---

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = chatInput.value.trim();
    if (!message && !selectedFile) return;
    
    // Reset input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    // Hide ambient background on first message
    if (!ambientBackground.classList.contains('hidden')) {
        ambientBackground.classList.add('hidden');
    }
    
    // Save reference to current file and clear UI
    const fileToUpload = selectedFile;
    clearFileSelection();
    
    // Add user message to UI
    appendMessage('user', message, fileToUpload);
    
    // Show typing indicator
    setTyping(true);
    
    // Get response
    let responseText = "";
    if (apiKey) {
        selectedFile = fileToUpload;
        responseText = await callGeminiAPI(message);
        selectedFile = null;
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

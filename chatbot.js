class BuddyAI {
    constructor() {
        // DOM Elements
        this.chatBox = document.getElementById('chatBox');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.leftSidebar = document.getElementById('leftSidebar');
        this.rightSidebar = document.getElementById('rightSidebar');
        this.leftSidebarToggle = document.getElementById('leftSidebarToggle');
        this.rightSidebarToggle = document.getElementById('rightSidebarToggle');
        this.closeSidebarBtn = document.getElementById('closeSidebarBtn');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.dropdownHeader = document.getElementById('dropdownHeader');
        this.dropdownContent = document.getElementById('dropdownContent');
        this.customModelInput = document.getElementById('customModelInput');
        this.addModelBtn = document.getElementById('addModelBtn');
        this.savedModels = document.getElementById('savedModels');
        this.clearChatBtn = document.getElementById('clearChatBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.exportChatBtn = document.getElementById('exportChatBtn');
        this.themeToggleBtn = document.getElementById('themeToggleBtn');
        this.historyList = document.getElementById('historyList');
        this.currentModelName = document.getElementById('currentModelName');
        
        
        // Stats Elements
        this.totalMessagesEl = document.getElementById('totalMessages');
        this.tokensUsedEl = document.getElementById('tokensUsed');
        this.modelSwitchesEl = document.getElementById('modelSwitches');
        
        // API Configuration
        this.API_KEY = ''; // Will be loaded from config.json
        this.API_URL = 'https://openrouter.ai/api/v1/chat/completions';
        
        // App State
        this.state = {
            currentModel: 'openai/gpt-3.5-turbo',
            currentChatId: this.generateChatId(),
            messages: [],
            tokenCount: 0,
            modelSwitchCount: 0,
            customModels: [],
            chatHistory: [],
            presetModels: [
                {
                    id: 'openai/gpt-3.5-turbo',
                    name: 'GPT-3.5 Turbo',
                    description: 'Fast & cost-effective',
                    icon: 'fa-bolt',
                    badge: 'Popular'
                },
                {
                    id: 'openai/gpt-4',
                    name: 'GPT-4',
                    description: 'Most capable',
                    icon: 'fa-crown',
                    badge: 'Premium'
                },
                {
                    id: 'anthropic/claude-3-haiku',
                    name: 'Claude 3 Haiku',
                    description: 'Fast & efficient',
                    icon: 'fa-leaf',
                    badge: 'New'
                },
                {
                    id: 'google/gemini-pro',
                    name: 'Gemini Pro',
                    description: 'Great for reasoning',
                    icon: 'fa-gem',
                    badge: 'Google'
                },
                {
                    id: 'meta-llama/llama-3.1-70b-instruct',
                    name: 'Llama 3.1 70B',
                    description: 'Open-source power',
                    icon: 'fa-dragon',
                    badge: 'Open'
                }
            ]
        };
        
        this.init();
    }

    async init() {
        this.loadState();
        await this.loadConfig(); // Wait for config to load
        this.setupEventListeners();
        this.renderModelDropdown();
        this.renderSavedModels();
        this.loadChatHistory();
        this.updateStats();
        this.setupAutoResize();
        this.updateCurrentModelDisplay();
        this.checkApiKeyStatus();
        
        // Handle initial sidebar state based on screen size
        this.handleResize();
        
        // Focus input
        setTimeout(() => this.messageInput.focus(), 100);
    }

    // New method to load config from server/static file
    async loadConfig() {
        try {
            console.log('Loading config.json...');
            const response = await fetch('./config.json');
            console.log('Config fetch response:', response.status);
            
            if (response.ok) {
                const config = await response.json();
                console.log('Config loaded, API key present:', !!config.apiKey);
                
                if (config.apiKey && config.apiKey.trim() !== '') {
                    this.API_KEY = config.apiKey;
                    console.log('API key set successfully');
                } else {
                    console.warn('API key is empty in config.json');
                }
                
                if (config.customModels && Array.isArray(config.customModels)) {
                    const newModels = config.customModels.filter(m => !this.state.customModels.includes(m));
                    this.state.customModels = [...this.state.customModels, ...newModels];
                    this.renderModelDropdown();
                    this.renderSavedModels();
                }
            } else {
                console.error('Failed to load config.json:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error loading config.json:', error);
        }
    }

    async saveConfigToServer(data) {
        // Disabled for GitHub Pages static hosting
        console.log('Static hosting mode: Config changes are saved locally but must be manually updated in config.json for the live site.');
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    setupEventListeners() {
        // Message sending
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Sidebar toggles
        this.leftSidebarToggle.addEventListener('click', () => this.toggleLeftSidebar());
        this.rightSidebarToggle.addEventListener('click', () => this.toggleRightSidebar());
        this.closeSidebarBtn.addEventListener('click', () => this.closeRightSidebar());
        this.sidebarOverlay.addEventListener('click', () => this.closeAllSidebars());
        
        // Model dropdown
        this.dropdownHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.closeDropdown();
        });
        
        // Custom model management
        this.addModelBtn.addEventListener('click', () => this.addCustomModel());
        this.customModelInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCustomModel();
        });
        this.customModelInput.addEventListener('input', () => {
            this.addModelBtn.disabled = !this.customModelInput.value.trim();
        });
        
        
        // Action buttons
        this.clearChatBtn.addEventListener('click', () => this.clearCurrentChat());
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.exportChatBtn.addEventListener('click', () => this.exportCurrentChat());
        this.clearHistoryBtn.addEventListener('click', () => this.clearAllHistory());
        this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
        // Close sidebar with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllSidebars();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    toggleLeftSidebar() {
        if (window.innerWidth <= 768) {
            this.leftSidebar.classList.toggle('active');
            this.sidebarOverlay.classList.toggle('active', this.leftSidebar.classList.contains('active'));
        } else {
            this.leftSidebar.classList.toggle('active');
        }
    }

    toggleRightSidebar() {
        if (window.innerWidth <= 1200) {
            this.rightSidebar.classList.toggle('active');
            this.sidebarOverlay.classList.toggle('active', this.rightSidebar.classList.contains('active'));
            this.rightSidebarToggle.classList.toggle('active', this.rightSidebar.classList.contains('active'));
        } else {
            this.rightSidebar.classList.toggle('active');
            this.rightSidebarToggle.classList.toggle('active', this.rightSidebar.classList.contains('active'));
        }
    }

    closeRightSidebar() {
        this.rightSidebar.classList.remove('active');
        this.rightSidebarToggle.classList.remove('active');
        this.sidebarOverlay.classList.remove('active');
    }

    closeAllSidebars() {
        if (window.innerWidth <= 768) {
            this.leftSidebar.classList.remove('active');
        }
        if (window.innerWidth <= 1200) {
            this.rightSidebar.classList.remove('active');
            this.rightSidebarToggle.classList.remove('active');
        }
        this.sidebarOverlay.classList.remove('active');
    }

    handleResize() {
        // On larger screens, show sidebars by default
        if (window.innerWidth > 1200) {
            this.rightSidebar.classList.add('active');
        } else {
            this.rightSidebar.classList.remove('active');
        }
        
        if (window.innerWidth > 768) {
            this.leftSidebar.classList.add('active');
        } else {
            this.leftSidebar.classList.remove('active');
        }
        
        // Always hide overlay on larger screens
        if (window.innerWidth > 1200) {
            this.sidebarOverlay.classList.remove('active');
        }
    }

    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.autoResize();
        });
    }

    autoResize() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
    }

    updateCurrentModelDisplay() {
        const currentModel = this.state.presetModels.find(m => m.id === this.state.currentModel) || 
                           { name: this.state.currentModel.split('/').pop(), description: 'Custom model' };
        this.currentModelName.textContent = currentModel.name;
    }

    // API Key Management - now only loads from config.json
    loadApiKey() {
        // This is now a fallback - API key should be in config.json
        console.log('API key should be configured in config.json');
    }

    checkApiKeyStatus() {
        if (this.API_KEY) {
            this.sendButton.disabled = false;
            console.log('API key loaded from config.json');
        } else {
            this.sendButton.disabled = true;
            console.warn('No API key found. Please add your OpenRouter API key to config.json');
        }
    }

    renderModelDropdown() {
        // Update header with current model
        const currentModel = this.state.presetModels.find(m => m.id === this.state.currentModel) || 
                           { name: this.state.currentModel.split('/').pop(), description: 'Custom model' };
        
        this.dropdownHeader.querySelector('.model-name').textContent = currentModel.name;
        this.dropdownHeader.querySelector('.model-desc').textContent = currentModel.description;
        
        // Render dropdown content
        this.dropdownContent.innerHTML = `
            ${this.state.presetModels.map(model => `
                <div class="dropdown-item ${this.state.currentModel === model.id ? 'active' : ''}" 
                     data-model="${model.id}">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas ${model.icon}"></i>
                            <div>
                                <div style="font-weight: 600;">${model.name}</div>
                                <div style="font-size: 12px; color: var(--text-light);">${model.description}</div>
                            </div>
                        </div>
                        ${model.badge ? `<span class="model-badge">${model.badge}</span>` : ''}
                    </div>
                </div>
            `).join('')}
            
            ${this.state.customModels.length > 0 ? `
                <div style="padding: 12px 16px; font-size: 12px; color: var(--text-light); border-top: 1px solid var(--border);">
                    <i class="fas fa-star"></i> Custom Models
                </div>
                ${this.state.customModels.map(model => `
                    <div class="dropdown-item ${this.state.currentModel === model ? 'active' : ''}" 
                         data-model="${model}">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-user-cog"></i>
                            <div>
                                <div style="font-weight: 600;">${model.split('/').pop()}</div>
                                <div style="font-size: 12px; color: var(--text-light);">Custom model</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            ` : ''}
        `;
        
        // Add click listeners to dropdown items
        this.dropdownContent.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const modelId = e.currentTarget.dataset.model;
                this.switchModel(modelId);
                this.closeDropdown();
            });
        });
    }

    toggleDropdown() {
        this.dropdownContent.classList.toggle('active');
        this.dropdownHeader.querySelector('.dropdown-arrow').classList.toggle('rotated');
    }

    closeDropdown() {
        this.dropdownContent.classList.remove('active');
        this.dropdownHeader.querySelector('.dropdown-arrow').classList.remove('rotated');
    }

    switchModel(modelId) {
        this.state.currentModel = modelId;
        this.state.modelSwitchCount++;
        
        // Update UI
        this.renderModelDropdown();
        this.updateCurrentModelDisplay();
        this.updateStats();
        this.saveState();
        
        // Show notification
        this.showNotification(`Switched to ${this.getModelName(modelId)}`);
    }

    addCustomModel() {
        const modelId = this.customModelInput.value.trim();
        if (!modelId) return;
        
        // Validate format
        if (!modelId.includes('/')) {
            this.showNotification('Please enter a valid model ID (e.g., organization/model-name)', 'error');
            return;
        }
        
        // Check if already exists
        if (this.state.presetModels.some(m => m.id === modelId) || this.state.customModels.includes(modelId)) {
            this.showNotification('Model already exists', 'warning');
            return;
        }
        
        // Add to custom models
        this.state.customModels.push(modelId);
        this.saveState();
        this.saveConfigToServer({ customModels: this.state.customModels }); // Sync to server
        this.renderModelDropdown();
        this.renderSavedModels();
        
        // Clear input
        this.customModelInput.value = '';
        this.addModelBtn.disabled = true;
        
        // Show success
        this.showNotification(`Added custom model: ${modelId.split('/').pop()}`);
    }

    renderSavedModels() {
        if (this.state.customModels.length === 0) {
            this.savedModels.innerHTML = `
                <div style="text-align: center; padding: 10px; color: var(--text-light); font-size: 12px;">
                    No custom models added yet
                </div>
            `;
            return;
        }
        
        this.savedModels.innerHTML = this.state.customModels.map(model => `
            <div class="saved-model-tag ${this.state.currentModel === model ? 'active' : ''}" 
                 data-model="${model}"
                 onclick="app.useSavedModel('${model}')">
                ${model.split('/').pop()}
                <span class="remove" onclick="event.stopPropagation(); app.removeSavedModel('${model}')">
                    <i class="fas fa-times"></i>
                </span>
            </div>
        `).join('');
    }

    useSavedModel(modelId) {
        this.switchModel(modelId);
    }

    removeSavedModel(modelId) {
        this.state.customModels = this.state.customModels.filter(m => m !== modelId);
        this.saveState();
        this.saveConfigToServer({ customModels: this.state.customModels }); // Sync to server
        this.renderModelDropdown();
        this.renderSavedModels();
        this.showNotification('Custom model removed');
    }

    getModelName(modelId) {
        const preset = this.state.presetModels.find(m => m.id === modelId);
        return preset ? preset.name : modelId.split('/').pop();
    }

    addMessage(content, isUser = false, timestamp = new Date()) {
        const messageId = Date.now();
        const message = {
            id: messageId,
            content,
            isUser,
            timestamp,
            model: this.state.currentModel
        };
        
        this.state.messages.push(message);
        this.renderMessage(message);
        this.updateStats();
        
        // Save to current chat
        this.saveCurrentChat();
        
        // Update chat history
        this.updateChatHistory();
        
        return messageId;
    }

    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.isUser ? 'user' : 'bot'}`;
        messageDiv.dataset.messageId = message.id;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const content = this.formatMessageContent(message.content);
        
        messageDiv.innerHTML = `
            <div class="avatar ${message.isUser ? 'user' : 'bot'}">
                <i class="fas ${message.isUser ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="bubble">${content}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        this.chatBox.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Highlight code blocks
        setTimeout(() => {
            this.highlightCodeBlocks(messageDiv);
            this.attachCopyButtons(messageDiv);
        }, 100);
    }

    formatMessageContent(text) {
        // First, escape HTML but preserve code blocks
        const lines = text.split('\n');
        let inCodeBlock = false;
        let currentLanguage = '';
        let result = '';
        let codeContent = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    // Start of code block
                    inCodeBlock = true;
                    currentLanguage = line.substring(3).trim() || 'plaintext';
                    codeContent = '';
                } else {
                    // End of code block
                    inCodeBlock = false;
                    const escapedCode = this.escapeHtml(codeContent);
                    result += `
                        <div class="code-container">
                            <div class="code-header">
                                <div class="code-language">
                                    <i class="fas fa-code"></i>
                                    ${currentLanguage.toUpperCase()}
                                </div>
                                <div class="code-actions">
                                    <button class="code-btn copy" data-code="${btoa(escapedCode)}">
                                        <i class="fas fa-copy"></i>
                                        <span>Copy</span>
                                    </button>
                                </div>
                            </div>
                            <pre><code class="language-${currentLanguage}">${escapedCode}</code></pre>
                        </div>
                    `;
                }
            } else if (inCodeBlock) {
                codeContent += line + '\n';
            } else {
                // Regular text - process inline code and formatting
                let processedLine = this.escapeHtml(line);
                
                // Process inline code
                processedLine = processedLine.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
                
                // Process bold and italic
                processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
                
                // Add line break if not last line
                result += processedLine + (i < lines.length - 1 ? '<br>' : '');
            }
        }
        
        return result;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    highlightCodeBlocks(container) {
        container.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    attachCopyButtons(container) {
        container.querySelectorAll('.code-btn.copy').forEach(button => {
            button.addEventListener('click', async (e) => {
                const code = atob(e.currentTarget.dataset.code);
                await this.copyToClipboard(code);
                
                // Show success message
                const success = document.createElement('div');
                success.className = 'copy-success';
                success.textContent = 'Copied to clipboard!';
                e.currentTarget.parentElement.appendChild(success);
                
                setTimeout(() => success.remove(), 2000);
            });
        });
    }

    async copyToClipboard(text) {
        try {
            // Decode HTML entities before copying
            const decodedText = this.decodeHtmlEntities(text);
            await navigator.clipboard.writeText(decodedText);
        } catch (err) {
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = this.decodeHtmlEntities(text);
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="avatar bot">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        this.chatBox.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    // Helper to extract first URL from text
    extractUrl(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = text.match(urlRegex);
        return matches ? matches[0] : null;
    }

    // Helper to fetch URL content via proxy
    async fetchUrlContent(url) {
        try {
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            if (data.contents) {
                // Stripping HTML tags to get text content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = data.contents;
                
                // Remove scripts and styles
                const scripts = tempDiv.getElementsByTagName('script');
                const styles = tempDiv.getElementsByTagName('style');
                while(scripts[0]) scripts[0].parentNode.removeChild(scripts[0]);
                while(styles[0]) styles[0].parentNode.removeChild(styles[0]);
                
                let text = tempDiv.textContent || tempDiv.innerText || '';
                // Collapse whitespace and limit length
                text = text.replace(/\s+/g, ' ').trim().substring(0, 10000);
                return text;
            }
            return null;
        } catch (error) {
            console.error('Error fetching URL:', error);
            return null;
        }
    }

    async sendMessage() {
        // Check if API key is set
        if (!this.API_KEY) {
            this.showNotification('API key not configured. Please check config.json', 'error');
            return;
        }
        
        const message = this.messageInput.value.trim();
        if (!message) return;
        
        // Reset input
        this.messageInput.value = '';
        this.autoResize();
        
        // Disable input while processing
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
        
        // Add user message
        this.addMessage(message, true);
        
        // URL Content Checking
        let contextMessage = message;
        const url = this.extractUrl(message);
        
        if (url) {
            this.showNotification('Fetching content from URL...', 'info');
            // Show typing indicator while fetching
            this.showTypingIndicator();
            
            const urlContent = await this.fetchUrlContent(url);
            this.hideTypingIndicator(); // Hide temporary indicator
            
            if (urlContent) {
                contextMessage = `${message}\n\n[System: The following is the text content fetched from the URL provided by the user (${url})]\n---\n${urlContent}\n---\n[System: End of URL content]`;
                this.showNotification('URL content loaded successfully', 'success');
            } else {
                 this.showNotification('Could not fetch URL content. Proceeding with message only.', 'warning');
            }
        }
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.getAIResponse(contextMessage);
            this.hideTypingIndicator();
            
            // Estimate tokens (rough calculation)
            const estimatedTokens = Math.ceil(response.length / 4);
            this.state.tokenCount += estimatedTokens;
            
            this.addMessage(response, false);
            
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Error:', error);
            
            let errorMessage = 'Sorry, I encountered an error. ';
            if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
                errorMessage += 'Please check your API key in config.json.';
                this.toggleRightSidebar(); // Open settings panel
            } else if (error.message.includes('model')) {
                errorMessage += 'The selected model might be unavailable. Try another model.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            this.addMessage(errorMessage, false);
            this.showNotification('Error: ' + error.message, 'error');
        } finally {
            // Re-enable input
            this.messageInput.disabled = false;
            this.sendButton.disabled = false;
            this.messageInput.focus();
        }
    }

    async getAIResponse(userMessage) {
        // Construct message history for context
        // Exclude system messages if any (we add one fresh), map to API format
        const history = this.state.messages.map(msg => ({
            role: msg.isUser ? "user" : "assistant",
            content: msg.content
        }));

        const response = await fetch(this.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'BuddyAI - AI Coding Assistant'
            },
            body: JSON.stringify({
                model: this.state.currentModel,
                messages: [
                    {
                        role: "system",
                        content: `You are BuddyAI, an expert AI coding assistant. You help with programming, debugging, code review, and learning. 
                        Always format code properly with language specification. Be concise but thorough.
                        Current model: ${this.state.currentModel}`
                    },
                    ...history
                ],
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    scrollToBottom() {
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    // Chat History Management (same as before, shortened for brevity)
    loadChatHistory() {
        try {
            const savedHistory = localStorage.getItem('buddyai-chat-history');
            if (savedHistory) {
                this.state.chatHistory = JSON.parse(savedHistory);
            }
            this.renderChatHistory();
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.state.chatHistory = [];
        }
    }

    renderChatHistory() {
        if (this.state.chatHistory.length === 0) {
            this.historyList.innerHTML = `
                <div class="empty-history">
                    <i class="fas fa-comments"></i>
                    <p>No chat history yet</p>
                </div>
            `;
            return;
        }
        
        const sortedHistory = [...this.state.chatHistory].sort((a, b) => 
            new Date(b.lastModified) - new Date(a.lastModified)
        ).slice(0, 10);
        
        this.historyList.innerHTML = sortedHistory.map(chat => `
            <div class="history-item ${chat.id === this.state.currentChatId ? 'active' : ''}" 
                 data-chat-id="${chat.id}">
                <div class="history-icon">
                    <i class="fas fa-message"></i>
                </div>
                <div class="history-text" onclick="app.loadChat('${chat.id}')">
                    ${chat.title || 'Untitled Chat'}
                </div>
                <div class="history-actions">
                    <button class="history-action-btn export" onclick="event.stopPropagation(); app.exportChatToFile('${chat.id}')" 
                            title="Export">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="history-action-btn delete" onclick="event.stopPropagation(); app.deleteChatFromHistory('${chat.id}')" 
                            title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateChatHistory() {
        if (this.state.messages.length === 0) return;
        
        const existingIndex = this.state.chatHistory.findIndex(chat => chat.id === this.state.currentChatId);
        
        const chatInfo = {
            id: this.state.currentChatId,
            title: this.generateChatTitle(),
            lastModified: new Date().toISOString(),
            messageCount: this.state.messages.length,
            model: this.state.currentModel,
            preview: this.state.messages[0]?.content?.substring(0, 100) || ''
        };
        
        if (existingIndex >= 0) {
            this.state.chatHistory[existingIndex] = chatInfo;
        } else {
            this.state.chatHistory.unshift(chatInfo);
        }
        
        if (this.state.chatHistory.length > 50) {
            this.state.chatHistory = this.state.chatHistory.slice(0, 50);
        }
        
        this.saveChatHistory();
        this.renderChatHistory();
    }

    generateChatTitle() {
        if (this.state.messages.length === 0) return 'New Chat';
        const firstMessage = this.state.messages[0].content;
        const words = firstMessage.split(' ').slice(0, 5).join(' ');
        return words.length > 30 ? words.substring(0, 30) + '...' : words;
    }

    saveChatHistory() {
        try {
            localStorage.setItem('buddyai-chat-history', JSON.stringify(this.state.chatHistory));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    saveCurrentChat() {
        try {
            const chatData = {
                id: this.state.currentChatId,
                title: this.generateChatTitle(),
                lastModified: new Date().toISOString(),
                messages: this.state.messages,
                model: this.state.currentModel,
                tokenCount: this.state.tokenCount
            };
            
            localStorage.setItem(`buddyai-chat-${this.state.currentChatId}`, JSON.stringify(chatData));
            localStorage.setItem('buddyai-last-chat-id', this.state.currentChatId);
        } catch (error) {
            console.error('Error saving current chat:', error);
        }
    }

    loadChat(chatId) {
        try {
            const savedChat = localStorage.getItem(`buddyai-chat-${chatId}`);
            if (!savedChat) {
                this.showNotification('Chat not found', 'error');
                return;
            }
            
            const chatData = JSON.parse(savedChat);
            this.state.currentChatId = chatData.id;
            this.state.messages = chatData.messages || [];
            this.state.tokenCount = chatData.tokenCount || 0;
            this.state.currentModel = chatData.model || 'openai/gpt-3.5-turbo';
            
            this.renderChatMessages();
            this.renderModelDropdown();
            this.updateCurrentModelDisplay();
            this.updateStats();
            this.renderChatHistory();
            
            this.closeAllSidebars();
            this.showNotification(`Loaded chat: ${chatData.title || 'Untitled'}`);
        } catch (error) {
            console.error('Error loading chat:', error);
            this.showNotification('Error loading chat', 'error');
        }
    }

    renderChatMessages() {
        this.chatBox.innerHTML = '';
        this.state.messages.forEach(message => {
            this.renderMessage(message);
        });
        this.scrollToBottom();
    }

    deleteChatFromHistory(chatId) {
        if (confirm('Are you sure you want to delete this chat from history?')) {
            try {
                localStorage.removeItem(`buddyai-chat-${chatId}`);
                this.state.chatHistory = this.state.chatHistory.filter(chat => chat.id !== chatId);
                this.saveChatHistory();
                
                if (chatId === this.state.currentChatId) {
                    this.startNewChat();
                }
                
                this.renderChatHistory();
                this.showNotification('Chat deleted from history');
            } catch (error) {
                console.error('Error deleting chat:', error);
                this.showNotification('Error deleting chat', 'error');
            }
        }
    }

    clearAllHistory() {
        if (this.state.chatHistory.length === 0) return;
        
        if (confirm('Are you sure you want to delete ALL chat history? This cannot be undone.')) {
            try {
                this.state.chatHistory.forEach(chat => {
                    localStorage.removeItem(`buddyai-chat-${chat.id}`);
                });
                
                this.state.chatHistory = [];
                this.saveChatHistory();
                
                if (this.state.chatHistory.every(chat => chat.id !== this.state.currentChatId)) {
                    this.startNewChat();
                }
                
                this.renderChatHistory();
                this.showNotification('All chat history cleared');
            } catch (error) {
                console.error('Error clearing history:', error);
                this.showNotification('Error clearing history', 'error');
            }
        }
    }

    exportCurrentChat() {
        this.exportChatToFile(this.state.currentChatId);
    }

    exportChatToFile(chatId) {
        try {
            const chatData = localStorage.getItem(`buddyai-chat-${chatId}`);
            if (!chatData) {
                this.showNotification('Chat not found', 'error');
                return;
            }
            
            const chat = JSON.parse(chatData);
            const blob = new Blob([JSON.stringify(chat, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `buddyai-chat-${chat.title || chat.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('Chat exported to JSON file');
        } catch (error) {
            console.error('Error exporting chat:', error);
            this.showNotification('Error exporting chat', 'error');
        }
    }

    startNewChat() {
        this.saveCurrentChat();
        this.state.currentChatId = this.generateChatId();
        this.state.messages = [];
        this.renderChatMessages();
        this.updateStats();
        this.updateChatHistory();
        this.addMessage("I'm ready to help with your coding questions! What would you like to work on?", false);
        this.closeAllSidebars();
        this.showNotification('Started new chat');
    }

    clearCurrentChat() {
        if (this.state.messages.length === 0) return;
        
        if (confirm('Clear all messages in this chat?')) {
            this.state.messages = [];
            this.renderChatMessages();
            this.updateStats();
            this.addMessage("Chat cleared! How can I help you with coding today?", false);
            this.showNotification('Chat cleared');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                            type === 'warning' ? 'exclamation-triangle' : 
                            'check-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : 
                        type === 'warning' ? '#f59e0b' : 
                        '#10b981'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        if (!document.getElementById('notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.state.theme);
        this.saveState();
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            this.themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            this.themeToggleBtn.title = 'Switch to Light Mode';
        } else {
            document.body.classList.remove('dark-theme');
            this.themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            this.themeToggleBtn.title = 'Switch to Dark Mode';
        }
    }

    updateStats() {
        this.totalMessagesEl.textContent = this.state.messages.length;
        this.tokensUsedEl.textContent = this.state.tokenCount.toLocaleString();
        this.modelSwitchesEl.textContent = this.state.modelSwitchCount;
    }

    saveState() {
        const state = {
            currentModel: this.state.currentModel,
            customModels: this.state.customModels,
            tokenCount: this.state.tokenCount,
            modelSwitchCount: this.state.modelSwitchCount,
            theme: this.state.theme
        };
        localStorage.setItem('buddyai-settings', JSON.stringify(state));
    }

    loadState() {
        try {
            const saved = localStorage.getItem('buddyai-settings');
            if (saved) {
                const state = JSON.parse(saved);
                this.state.currentModel = state.currentModel || 'openai/gpt-3.5-turbo';
                this.state.customModels = state.customModels || [];
                this.state.tokenCount = state.tokenCount || 0;
                this.state.modelSwitchCount = state.modelSwitchCount || 0;
                // Load theme
                this.state.theme = state.theme || 'dark';
                this.applyTheme(this.state.theme);
            } else {
                // Default to dark mode
                this.state.theme = 'dark';
                this.applyTheme('dark');
            }
            
            this.loadChatHistory();
            const lastChatId = localStorage.getItem('buddyai-last-chat-id');
            if (lastChatId) {
                this.loadChat(lastChatId);
            }
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new BuddyAI();
    window.app = app;
});

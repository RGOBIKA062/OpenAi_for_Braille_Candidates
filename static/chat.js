// Voice-enabled Chat System (stabilized)
class VoiceChat {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isProcessing = false;
        this.messagesContainer = document.getElementById('chatMessages');
        this.statusText = document.getElementById('statusIndicator');
        this.statusDot = document.querySelector('.status-dot');

        // --- Audio Context Priming ---
        // Play a silent sound on the first user interaction to unlock audio playback.
        // This is crucial for satisfying browser autoplay policies.
        const primeAudioContext = () => {
            const audioContext = window.AudioContext || window.webkitAudioContext;
            if (audioContext) {
                const context = new audioContext();
                if (context.state === 'suspended') {
                    context.resume();
                }
                
                // Create a silent buffer
                const buffer = context.createBuffer(1, 1, 22050);
                const source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                source.start(0);
            }
            // Also prime the SpeechSynthesis API
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
                speechSynthesis.speak(new SpeechSynthesisUtterance(''));
            }
            document.removeEventListener('mousedown', primeAudioContext, true);
            document.removeEventListener('touchstart', primeAudioContext, true);
            document.removeEventListener('keydown', primeAudioContext, true);
        };
        document.addEventListener('mousedown', primeAudioContext, { once: true, capture: true });
        document.addEventListener('touchstart', primeAudioContext, { once: true, capture: true });
        document.addEventListener('keydown', primeAudioContext, { once: true, capture: true });

        // Ensure mic starts after first user gesture to satisfy browser policies
        this.setupMicActivation();


        // Stop any existing voice navigation before starting chat voice recognition
        this.stopExistingVoiceNavigation();

        // Initialize recognition and TTS
        this.initSpeechRecognition();
        this.initTextToSpeech();
        
        // Use server-side TTS endpoint for reliable playback
        this.useServerTTS = true;

        // Re-initialize voices when they load asynchronously
        if ('speechSynthesis' in window) {
            speechSynthesis.onvoiceschanged = () => { console.log('VoiceChat: voiceschanged event'); this.initTextToSpeech(); };
            // After a short delay, ensure voices are picked up
            setTimeout(() => {
                console.log('VoiceChat: delayed initTextToSpeech', speechSynthesis.getVoices());
                this.initTextToSpeech();
            }, 500);
        }
        this.startListening();

        console.log('VoiceChat initialized');
    }

    stopExistingVoiceNavigation() {
        // Stop any existing VoiceNavigator instances
        if (window.voiceNavigator) {
            try {
                window.voiceNavigator.stopListening();
                console.log('Stopped existing voice navigator');
            } catch (e) {
                console.error('Error stopping voice navigator:', e);
            }
            window.voiceNavigator = null;
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            this.updateStatus('error', 'Speech recognition not supported');
            return;
        }
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateStatus('listening', 'Listening...');
        };

        this.recognition.onresult = (event) => {
            try {
                const transcript = event.results[0][0].transcript.trim().toLowerCase();
                console.log('Chat heard:', transcript);
                if (this.isProcessing) return;
                if (this.handleNavigationCommands(transcript)) return;
                if (['help','commands','what can i say'].includes(transcript)) { this.showHelp(); return; }
                this.processUserInput(transcript);
            } catch (e) { console.error('onresult error:', e); }
        };

        this.recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);
            if (!this.isProcessing) {
                let msg = 'Recognition error - restarting...';
                if (event.error === 'no-speech') msg = 'No speech detected';
                if (event.error === 'audio-capture') msg = 'Microphone not working';
                if (event.error === 'not-allowed') msg = 'Microphone access denied';
                if (event.error === 'network') msg = 'Network error';
                this.updateStatus('error', msg);
                setTimeout(()=>this.startListening(), 800);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (!this.isProcessing) setTimeout(()=>this.startListening(), 800);
        };
    }

    initTextToSpeech() {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            const voices = speechSynthesis.getVoices();
            if (voices.length) {
                const v = voices.find(v => v.lang.includes('en') && /female|zira|samantha/i.test(v.name));
                this.selectedVoice = v || voices[0];
            }
        }
    }
    
    // Handle site navigation voice commands; returns true if a command matched
    handleNavigationCommands(command) {
        if (!command || typeof command !== 'string') return false;
        const c = command.toLowerCase();

        // Open Chat
        if (c.includes('open chat') || c.includes('open ai') || c.includes('open a i') ||
            c.includes('go to chat') || c.includes('start chat') || c.includes('chat page')) {
            this.navigateToChat();
            return true;
        }

        // Home navigation
        if (c.includes('go home') || c.includes('home page') || c.includes('return home') ||
            c.includes('go to home') || c.includes('back to home') ||
            c.includes('return back to home') || c.includes('return back to home page')) {
            this.navigateHome();
            return true;
        }

        // About page
        if (c.includes('about this website') || c.includes('about page') ||
            c.includes('about website') || c.includes('tell me about')) {
            this.navigateToAbout();
            return true;
        }

        // New conversation
        if (c.includes('new conversation') || c.includes('new chat') || c.includes('start new chat')) {
            this.startNewConversation();
            return true;
        }

        return false;
    }

    startListening() {
        if (this.isProcessing) {
            return; // Don't listen while the AI is processing
        }
        try {
            // This is the most robust way to start.
            // It will throw an error if already started, which we'll catch.
            this.recognition.start();
        } catch (e) {
            if (e.name === 'InvalidStateError') {
                // This error is okay. It just means recognition was already running.
                // We can ignore it, but we'll log it for debugging purposes.
                console.warn('Tried to start recognition, but it was already running.');
            } else {
                // For other errors, log them as actual errors.
                console.error('Failed to start speech recognition:', e);
            }
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
                this.isListening = false;
            } catch (error) {
                console.error('VoiceChat: Error stopping recognition:', error);
            }
        }
    }

    async processUserInput(input) {
        const command = input.toLowerCase().trim();
        
        // Handle voice commands
        if (command === 'stop' || command === 'pause' || command === 'halt') {
            this.stopConversation();
            return;
        }

        // Process regular chat
        this.isProcessing = true;
        this.stopListening();
        this.updateStatus('processing', 'Processing...');
        
        // Add the user message to the UI
        this.addMessage(input, 'user');
        this.showThinkingIndicator();
        
    try {
            // Send request to API
            const response = await this.sendToAPI(input);
            this.hideThinkingIndicator();
            
            if (response.success) {
                // Add AI response to the UI
                this.addMessage(response.response, 'ai');
                
                // Read response aloud
                this.speakText(response.response);
                
                // Scroll to the bottom to show new message
                this.scrollToBottom();
                
                // If we have an active conversation ID, save it
                if (response.conversation_id && window.setActiveConversationId) {
                    window.setActiveConversationId(response.conversation_id);
                }
                
                // Optionally refresh chat history
                if (window.loadChatHistory && typeof window.loadChatHistory === 'function') {
                    setTimeout(() => window.loadChatHistory(), 500);
                }
            } else {
                // Show error message if API request was not successful
                const errorMsg = response.message || 'Sorry, I encountered an error. Please try again.';
                this.addMessage(errorMsg, 'ai');
                this.speakText(errorMsg);
            }
    } catch (error) {
            console.error('API Error:', error);
            this.hideThinkingIndicator();
            
            let errorMsg = 'Sorry, I encountered an error. Please try again.';
            
            // Provide more specific error messages
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                errorMsg = 'Sorry, the response took too long. Please try a shorter question or try again later.';
            } else if (error.message.includes('network')) {
                errorMsg = 'Sorry, there seems to be a network issue. Please check your connection and try again.';
            }
            
            this.addMessage(errorMsg, 'ai');
            this.speakText(errorMsg);
        } finally {
            // Always resume listening regardless of success or failure
            setTimeout(() => { this.isProcessing = false; this.startListening(); }, 1200);
        }
    }

    async sendToAPI(message, retryCount = 0) {
        try {
            console.log('Sending message to API:', message);
            
            // Use AbortController for timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
            
            // Send the request
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
                signal: controller.signal
            });
            
            // Clear the timeout
            clearTimeout(timeoutId);
            
            // Check if the response is ok
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Parse the response
            const data = await response.json();
            console.log('API response:', data);
            
            // Check if the response is valid
            if (!data) {
                throw new Error('Empty response from API');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            
            // Retry logic for timeout or network errors
            if (error.name === 'AbortError' || error.message.includes('network') || error.message.includes('timeout')) {
                if (retryCount < 2) { // Try up to 2 more times (3 total attempts)
                    console.log(`API request timed out or network error. Retrying (${retryCount + 1}/3)...`);
                    return this.sendToAPI(message, retryCount + 1);
                }
            }
            
            // If we've exhausted retries or it's a different error, rethrow
            throw error;
        }
    }

    addMessage(text, sender) {
        if (!this.messagesContainer) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        const ts = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        messageDiv.innerHTML = `<div class="message-content">${text}</div><div class="message-timestamp">${ts}</div>`;
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.style.overflowY = 'scroll';
        this.scrollToBottom();
    }

    showThinkingIndicator() {
        // Remove message-wrapper logic so no outer container is created
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-indicator';
        thinkingDiv.id = 'thinking';
        
        // Apply styles directly to ensure correct positioning
        thinkingDiv.style.alignSelf = 'flex-start';
        thinkingDiv.style.marginRight = 'auto';
        thinkingDiv.style.marginBottom = '16px';
        thinkingDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        thinkingDiv.style.borderRadius = '8px';
        thinkingDiv.style.padding = '10px 15px';
        
        thinkingDiv.innerHTML = `
            <span style="color: rgba(255,255,255,0.8);">AI is thinking</span>
            <div class="thinking-dots">
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
            </div>
        `;
        
        this.messagesContainer.appendChild(thinkingDiv);
        
        // Set overflow to ensure scrollbar is visible
        this.messagesContainer.style.overflowY = 'scroll';
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    hideThinkingIndicator() {
        const thinking = document.getElementById('thinking');
        if (thinking) {
            thinking.remove();
        }
    }

    async speakText(text) {
        if (this.useServerTTS) {
            try {
                const url = '/tts?text=' + encodeURIComponent(text);
                console.log('VoiceChat: fetching TTS from', url);
                const audio = new Audio(url);
                
                // Wait for audio to be ready to play
                await new Promise((resolve, reject) => {
                    audio.oncanplaythrough = resolve;
                    audio.onerror = reject;
                    setTimeout(() => reject(new Error('Audio load timeout')), 10000); // 10-second timeout
                });

                await audio.play();
                console.log('VoiceChat: played server TTS');
                return;
            } catch (e) {
                console.error('VoiceChat: server TTS playback error', e);
                // Fallback to Web Speech API if server-side fails
            }
        }
        
        // Fallback to Web Speech API
        if (!('speechSynthesis' in window)) {
            console.error('VoiceChat: Text-to-speech not supported');
            return;
        }
        try {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            if (this.selectedVoice) utterance.voice = this.selectedVoice;
            console.log('VoiceChat: speaking via Web Speech API');
            speechSynthesis.speak(utterance);
        } catch (e) {
            console.error('VoiceChat: Error speaking text:', e);
        }
    }

    stopConversation() {
        speechSynthesis.cancel();
        this.isProcessing = false;
        this.stopListening();
        this.updateStatus('error', 'Conversation stopped');
        
        const stopMsg = 'Conversation stopped. Say anything to resume.';
        this.addMessage(stopMsg, 'ai');
        this.speakText(stopMsg);
        
        setTimeout(() => {
            this.startListening();
        }, 3000);
    }

    navigateHome() {
        this.speakText('Returning to home page');
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    }

    navigateToAbout() {
        this.speakText('Opening about page');
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/about';
        }, 500);
    }
    
    navigateToChat() {
        this.speakText('Opening chat');
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/chat';
        }, 500);
    }
    
    startNewConversation() {
        // Stop listening while processing
        this.stopListening();
        this.updateStatus('processing', 'Starting new conversation...');
        this.speakText('Starting new conversation');
        
        // Call the new conversation API endpoint
        fetch('/api/new_conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('New conversation created:', data.conversation_id);
                
                // Set the active conversation ID
                if (window.setActiveConversationId) {
                    window.setActiveConversationId(data.conversation_id);
                }
                
                // Clear the chat UI
                if (this.messagesContainer) {
                    this.messagesContainer.innerHTML = '';
                }
                
                // Confirm to the user
                this.addMessage('New conversation started', 'system');
                
                // Refresh history if function exists
                if (window.loadChatHistory && typeof window.loadChatHistory === 'function') {
                    setTimeout(() => window.loadChatHistory(), 500);
                }
            } else {
                console.error('Failed to create new conversation:', data.error);
                this.addMessage('Failed to start new conversation', 'error');
            }
        })
        .catch(error => {
            console.error('Error creating new conversation:', error);
            this.addMessage('Error creating new conversation', 'error');
        })
        .finally(() => {
            // Resume listening
            this.isProcessing = false;
            this.startListening();
        });
    }

    showHelp() {
        const helpText = 'Available commands: Say stop to pause conversation. Say return back to home page to go home. Say about this website to learn more. Say help for this message.';
        this.addMessage(helpText, 'ai');
        this.speakText(helpText);
    }

    updateStatus(type, message) {
        if (this.statusText) {
            this.statusText.textContent = message;
        }
        if (this.statusDot) {
            this.statusDot.className = `status-dot ${type}`;
        }
    }
    
    scrollToBottom() {
        if (this.messagesContainer) {
            // Set overflow to ensure scrollbar is visible
            this.messagesContainer.style.overflowY = 'scroll';
            
            // Immediate scroll
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            
            // Double-check scroll position after a short delay
            setTimeout(() => {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }, 50);
            
            // Final scroll check after content has fully rendered
            setTimeout(() => {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }, 200);
            
            // Use global function if available (from our embedded script)
            if (window.scrollChatToBottom) {
                window.scrollChatToBottom();
            }
        }
    }

    // Handle wave animation based on listening state
    updateWaveAnimation() {
        const waves = document.querySelectorAll('.wave');
        waves.forEach(wave => {
            if (this.isListening && !this.isProcessing) {
                wave.style.animationPlayState = 'running';
            } else {
                wave.style.animationPlayState = 'paused';
            }
        });
    }

    // Start listening on first user interaction to improve reliability
    setupMicActivation() {
        const activator = () => {
            try { this.startListening(); } catch (_) {}
            document.removeEventListener('mousedown', activator, true);
            document.removeEventListener('touchstart', activator, true);
            document.removeEventListener('keydown', activator, true);
        };
        document.addEventListener('mousedown', activator, true);
        document.addEventListener('touchstart', activator, true);
        document.addEventListener('keydown', activator, true);
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => { window.voiceChat = new VoiceChat(); });

// Cancel TTS when hidden
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') speechSynthesis.cancel(); });

// Save chat to MongoDB after each message
function saveChatToDB(message, sender='user') {
    fetch('/api/save_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sender })
    });
}

// Optional: Add hooks to persist messages if backend expects it

// (Home page effects removed from chat.js)


class VoiceChat {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isProcessing = false;
        this.messagesContainer = document.getElementById('chatMessages');
        this.statusText = document.getElementById('status-text');
        this.statusDot = document.querySelector('.status-dot');
        
        this.initSpeechRecognition();
        this.initTextToSpeech();
        this.startListening();
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            this.updateStatus('error', 'Speech recognition not supported');
            return;
        }

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            
            if (event.results[event.results.length - 1].isFinal && !this.isProcessing) {
                this.processUserInput(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (!this.isProcessing) {
                this.updateStatus('error', 'Recognition error - Restarting...');
                setTimeout(() => this.startListening(), 1000);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            if (!this.isProcessing) {
                setTimeout(() => this.startListening(), 500);
            }
        };
    }

    initTextToSpeech() {
        if ('speechSynthesis' in window) {
            // Clear any existing utterances
            speechSynthesis.cancel();
        }
    }

    startListening() {
        if (this.recognition && !this.isListening && !this.isProcessing) {
            try {
                this.recognition.start();
                this.isListening = true;
                this.updateStatus('listening', 'Listening...');
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    async processUserInput(input) {
        const command = input.toLowerCase().trim();
        
        // Handle voice commands
        if (command === 'stop' || command === 'pause' || command === 'halt') {
            this.stopConversation();
            return;
        }

        if (command === 'home' || command === 'back') {
            this.navigateHome();
            return;
        }

        // Process regular chat
        this.isProcessing = true;
        this.stopListening();
        this.updateStatus('processing', 'Processing...');
        
        this.addMessage(input, 'user');
        this.showThinkingIndicator();
        
        try {
            const response = await this.sendToAPI(input);
            this.hideThinkingIndicator();
            
            if (response.response) {
                this.addMessage(response.response, 'ai');
                this.speakText(response.response);
            }
        } catch (error) {
            console.error('API Error:', error);
            this.hideThinkingIndicator();
            const errorMsg = 'Sorry, I encountered an error. Please try again.';
            this.addMessage(errorMsg, 'ai');
            this.speakText(errorMsg);
        }
        
        // Wait for speech to complete before resuming listening
        setTimeout(() => {
            this.isProcessing = false;
            this.startListening();
        }, 2000);
    }

    async sendToAPI(message) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
            </div>
            <div class="message-timestamp">${timestamp}</div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showThinkingIndicator() {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-indicator';
        thinkingDiv.id = 'thinking';
        
        thinkingDiv.innerHTML = `
            <span style="color: rgba(255,255,255,0.8);">AI is thinking</span>
            <div class="thinking-dots">
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
                <div class="thinking-dot"></div>
            </div>
        `;
        
        this.messagesContainer.appendChild(thinkingDiv);
        this.scrollToBottom();
    }

    hideThinkingIndicator() {
        const thinking = document.getElementById('thinking');
        if (thinking) {
            thinking.remove();
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel(); // Cancel any ongoing speech
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            // Choose a better voice if available
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.name.includes('Google') || 
                voice.name.includes('Microsoft') ||
                voice.lang.includes('en-US')
            );
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            speechSynthesis.speak(utterance);
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

    updateStatus(type, message) {
        this.statusText.textContent = message;
        this.statusDot.className = `status-dot ${type}`;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
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
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    const voiceChat = new VoiceChat();
    
    // Update wave animation periodically
    setInterval(() => {
        voiceChat.updateWaveAnimation();
    }, 100);
});

// Handle page load animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s ease-in';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        speechSynthesis.cancel();
    }
});

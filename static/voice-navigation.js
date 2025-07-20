
class VoiceNavigator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.initSpeechRecognition();
        this.startListening();
    }

    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            console.error('Speech recognition not supported');
            this.showFallbackMessage();
            return;
        }

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            
            if (event.results[event.results.length - 1].isFinal) {
                this.processCommand(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setTimeout(() => {
                if (!this.isListening) {
                    this.startListening();
                }
            }, 1000);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            setTimeout(() => {
                this.startListening();
            }, 500);
        };
    }

    startListening() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.isListening = true;
                this.updateVoiceIndicator('listening');
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        }
    }

    processCommand(command) {
        console.log('Voice command:', command);
        
        if (command.includes('openai') || command.includes('open ai') || command.includes('chat')) {
            this.navigateToChat();
        } else if (command.includes('help') || command.includes('commands')) {
            this.speakText('Available commands: Say OpenAI to start chatting. Say help for this message.');
        }
    }

    navigateToChat() {
        this.speakText('Navigating to chat interface');
        this.updateVoiceIndicator('processing');
        
        // Add navigation animation
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/chat';
        }, 500);
    }

    updateVoiceIndicator(status) {
        const voiceIcon = document.querySelector('.voice-icon');
        const instruction = document.querySelector('.instruction');
        
        switch(status) {
            case 'listening':
                voiceIcon.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
                instruction.textContent = 'Listening... Say "OpenAI" to start';
                break;
            case 'processing':
                voiceIcon.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
                instruction.textContent = 'Processing...';
                break;
            case 'error':
                voiceIcon.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                instruction.textContent = 'Error - Please try again';
                break;
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            speechSynthesis.speak(utterance);
        }
    }

    showFallbackMessage() {
        const instruction = document.querySelector('.instruction');
        instruction.innerHTML = 'Voice recognition not supported. <a href="/chat" style="color: #fff; text-decoration: underline;">Click here to chat</a>';
    }
}

// Initialize voice navigation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new VoiceNavigator();
});

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s ease-in';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

class VoiceNavigator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isProcessing = false;
        this.shouldStop = false;
        
        this.initAnimations();
        this.initSpeechRecognition();
        
        // Start listening after a short delay to ensure everything is initialized
        setTimeout(() => {
            this.startListening();
        }, 1000);
    }

    initAnimations() {
        this.initTypewriter();
        this.initMorphingText();
    }

    initTypewriter() {
        const typewriterElement = document.querySelector('.typewriter');
        if (!typewriterElement) return;

        const text = typewriterElement.getAttribute('data-text');
        if (!text) return;
        
        let i = 0;
        function typeWriter() {
            if (i < text.length) {
                typewriterElement.innerHTML = text.substring(0, i + 1) + '<span class="cursor">|</span>';
                i++;
                setTimeout(typeWriter, 100);
            }
        }
        setTimeout(typeWriter, 1000);
    }

    initMorphingText() {
        const morphingElement = document.querySelector('.morphing-text');
        if (!morphingElement) return;

        const wordsAttr = morphingElement.getAttribute('data-words');
        if (!wordsAttr) return;
        
        const words = wordsAttr.split(',');
        let currentWordIndex = 0;

        setInterval(() => {
            currentWordIndex = (currentWordIndex + 1) % words.length;
            morphingElement.textContent = words[currentWordIndex];
        }, 3000);
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
                console.log('Voice command detected:', transcript);
                this.processCommand(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.log('Speech recognition error:', event.error);
            this.isListening = false;
            
            // Don't restart for aborted errors (usually means we stopped intentionally)
            if (event.error === 'aborted') {
                return;
            }
            
            // For no-speech errors, restart with longer delay to avoid loops
            if (event.error === 'no-speech') {
                setTimeout(() => {
                    if (this.recognition && !this.shouldStop) {
                        this.startListening();
                    }
                }, 3000);
                return;
            }
            
            // For other errors, restart with delay
            if (event.error === 'audio-capture' || event.error === 'not-allowed') {
                this.updateVoiceIndicator('error');
                this.showFallbackMessage();
                setTimeout(() => {
                    if (this.recognition && !this.shouldStop) {
                        this.startListening();
                    }
                }, 5000);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            // Only restart if recognition object exists and we haven't stopped intentionally
            if (this.recognition && !this.shouldStop && !this.isProcessing) {
                setTimeout(() => {
                    this.startListening();
                }, 1500);
            }
        };

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceIndicator('listening');
        };
    }

    startListening() {
        if (!this.recognition || this.isListening || this.shouldStop || this.isProcessing) return;

        try {
            this.shouldStop = false;
            this.recognition.start();
            console.log('Started listening for voice commands...');
        } catch (error) {
            console.log('Failed to start recognition:', error);
            if (!this.shouldStop) {
                setTimeout(() => {
                    this.startListening();
                }, 3000);
            }
        }
    }

    stopListening() {
        this.shouldStop = true;
        this.isProcessing = true;
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
                this.isListening = false;
            } catch (error) {
                console.log('Error stopping recognition:', error);
            }
        }
    }

    processCommand(command) {
        console.log('Processing command:', command);
        
        // Stop listening during command processing to prevent interference
        this.stopListening();
        this.updateVoiceIndicator('processing');

        const cmd = command.toLowerCase().trim();

        if (cmd.includes('openai') || cmd.includes('open ai') || cmd.includes('chat') || 
            cmd.includes('open a i') || cmd.includes('ai') || cmd.includes('open eye')) {
            this.navigateToChat();
            return; // Prevent restart of listening
        } else if (cmd.includes('return back to home') || cmd.includes('go back to home') || cmd.includes('home')) {
            this.navigateToHome();
            return; // Prevent restart of listening
        } else if (cmd.includes('help') || cmd.includes('commands')) {
            this.speakText('Available commands: Say OpenAI to start chatting. Say return back to home page to go home. Say help for this message.');
            // Resume listening after help
            setTimeout(() => {
                this.isProcessing = false;
                this.shouldStop = false;
                this.startListening();
            }, 5000);
            return;
        }

        // If command not recognized, provide feedback and resume listening
        this.speakText(`I heard "${command}" but didn't understand. Try saying "OpenAI", "chat", "home", or "help".`);
        setTimeout(() => {
            this.isProcessing = false;
            this.shouldStop = false;
            this.startListening();
        }, 4000);
    }

    navigateToChat() {
        console.log('Navigating to chat...');
        this.stopListening(); // Stop listening immediately
        this.recognition = null; // Prevent restart attempts
        
        this.speakText('Opening chat interface');
        this.updateVoiceIndicator('processing');

        // Add navigation animation
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';

        setTimeout(() => {
            window.location.href = '/chat';
        }, 500);
    }

    navigateToHome() {
        console.log('Navigating to home...');
        this.stopListening(); // Stop listening immediately
        this.recognition = null; // Prevent restart attempts
        
        this.speakText('Returning to home page');
        this.updateVoiceIndicator('processing');

        // Add navigation animation
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';

        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    }

    updateVoiceIndicator(state) {
        const indicator = document.querySelector('.voice-orb-advanced');
        if (!indicator) return;

        indicator.className = `voice-orb-advanced ${state}`;
        
        // Update command display based on state
        const commandContent = document.querySelector('.command-content');
        if (commandContent) {
            switch(state) {
                case 'listening':
                    commandContent.textContent = 'Say "OpenAI" to start chatting';
                    break;
                case 'processing':
                    commandContent.textContent = 'Processing command...';
                    break;
                case 'error':
                    commandContent.textContent = 'Microphone error - Retrying...';
                    break;
            }
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            // Stop any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            utterance.volume = 0.8;

            // Try to get a good voice
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                const englishVoice = voices.find(voice => 
                    voice.lang.startsWith('en') && !voice.name.includes('Google')
                ) || voices[0];
                
                if (englishVoice) {
                    utterance.voice = englishVoice;
                }
            }

            speechSynthesis.speak(utterance);
        }
    }

    showFallbackMessage() {
        const commandDisplay = document.querySelector('.command-content');
        if (commandDisplay) {
            commandDisplay.textContent = 'Voice not available - Please allow microphone access and refresh the page';
        }
        
        // Create manual buttons as fallback
        this.createFallbackButtons();
    }

    createFallbackButtons() {
        // Remove existing buttons if any
        const existingContainer = document.getElementById('fallback-buttons');
        if (existingContainer) {
            existingContainer.remove();
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'fallback-buttons';
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 15px;
            z-index: 10000;
            background: rgba(0,0,0,0.8);
            padding: 20px;
            border-radius: 15px;
        `;

        const chatButton = this.createButton('🗨️ Go to Chat', () => {
            this.navigateToChat();
        });
        
        const homeButton = this.createButton('🏠 Go Home', () => {
            this.navigateToHome();
        });

        const retryButton = this.createButton('🎤 Retry Voice', () => {
            buttonContainer.remove();
            this.initSpeechRecognition();
        });
        
        buttonContainer.appendChild(chatButton);
        buttonContainer.appendChild(homeButton);
        buttonContainer.appendChild(retryButton);
        document.body.appendChild(buttonContainer);
    }

    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            padding: 12px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        
        button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
        };
        
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        };
        
        button.onclick = onClick;
        return button;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for voices to load
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            if (!window.voiceNavigator) {
                window.voiceNavigator = new VoiceNavigator();
            }
        };
        
        // Fallback if voices are already loaded
        setTimeout(() => {
            if (!window.voiceNavigator) {
                window.voiceNavigator = new VoiceNavigator();
            }
        }, 1500);
    } else {
        // No speech synthesis support
        setTimeout(() => {
            window.voiceNavigator = new VoiceNavigator();
        }, 1000);
    }
});

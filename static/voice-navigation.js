class VoiceNavigator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isProcessing = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        
        // Add visual feedback first
        this.addStatusDisplay();
        this.updateStatus('Initializing voice system...');
        
        // Initialize with delay to ensure page is ready
        setTimeout(() => {
            this.initAnimations();
            this.initSpeechRecognition();
        }, 500);
    }

    addStatusDisplay() {
        // Create a more prominent status display
        const statusDiv = document.createElement('div');
        statusDiv.id = 'voice-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 99999;
            max-width: 350px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.2);
        `;
        statusDiv.innerHTML = '🎤 Voice: Initializing...';
        document.body.appendChild(statusDiv);
        this.statusDiv = statusDiv;
    }

    updateStatus(message) {
        if (this.statusDiv) {
            const emoji = message.includes('Error') ? '❌' : 
                         message.includes('Listening') ? '👂' :
                         message.includes('Processing') ? '⚡' :
                         message.includes('Speaking') ? '🗣️' : '🎤';
            this.statusDiv.innerHTML = `${emoji} Voice: ${message}`;
            console.log('Voice Status:', message);
        }
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

    async initSpeechRecognition() {
        // Check for speech recognition support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.updateStatus('Speech recognition not supported - Using fallback buttons');
            this.showFallbackMessage();
            return;
        }

        try {
            // Request microphone permission first
            this.updateStatus('Requesting microphone permission...');
            await navigator.mediaDevices.getUserMedia({ audio: true });
            this.updateStatus('Microphone permission granted');
            
            // Create recognition instance
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure recognition
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 3;

            // Handle results
            this.recognition.onresult = (event) => {
                if (event.results && event.results.length > 0) {
                    const transcript = event.results[0][0].transcript.toLowerCase().trim();
                    this.updateStatus(`Heard: "${transcript}"`);
                    this.processCommand(transcript);
                } else {
                    this.updateStatus('No speech detected, retrying...');
                    this.restartListening();
                }
            };

            // Handle errors with specific messages
            this.recognition.onerror = (event) => {
                this.updateStatus(`Error: ${event.error}`);
                console.error('Speech recognition error:', event.error);
                
                switch(event.error) {
                    case 'not-allowed':
                        this.updateStatus('Microphone access denied - Please allow microphone and refresh');
                        this.showFallbackMessage();
                        break;
                    case 'no-speech':
                        this.updateStatus('No speech detected - Retrying...');
                        this.restartListening();
                        break;
                    case 'audio-capture':
                        this.updateStatus('No microphone found - Using fallback buttons');
                        this.showFallbackMessage();
                        break;
                    case 'network':
                        this.updateStatus('Network error - Retrying...');
                        this.restartListening();
                        break;
                    default:
                        this.restartListening();
                }
            };

            // Handle end of recognition
            this.recognition.onend = () => {
                this.isListening = false;
                if (!this.isProcessing) {
                    this.restartListening();
                }
            };

            // Handle start
            this.recognition.onstart = () => {
                this.isListening = true;
                this.retryCount = 0;
                this.updateStatus('Listening for commands... (say "OpenAI", "chat", or "help")');
                this.updateVoiceIndicator('listening');
            };

            this.updateStatus('Speech recognition ready - Starting...');
            this.startListening();
            
        } catch (error) {
            this.updateStatus('Microphone access denied - Using fallback buttons');
            console.error('Microphone permission error:', error);
            this.showFallbackMessage();
        }
    }

    startListening() {
        if (!this.recognition || this.isListening || this.isProcessing) {
            return;
        }

        if (this.retryCount >= this.maxRetries) {
            this.updateStatus('Max retries reached - Using fallback buttons');
            this.showFallbackMessage();
            return;
        }

        try {
            this.recognition.start();
            this.updateStatus('Starting to listen...');
        } catch (error) {
            this.retryCount++;
            this.updateStatus(`Failed to start (attempt ${this.retryCount}/${this.maxRetries}): ${error.message}`);
            console.error('Failed to start recognition:', error);
            
            if (this.retryCount < this.maxRetries) {
                setTimeout(() => {
                    this.startListening();
                }, 2000);
            } else {
                this.showFallbackMessage();
            }
        }
    }

    restartListening() {
        if (this.isProcessing) return;
        
        setTimeout(() => {
            if (!this.isProcessing) {
                this.startListening();
            }
        }, 1500);
    }

    stopListening() {
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
        this.isProcessing = true;
        this.stopListening();
        this.updateVoiceIndicator('processing');
        this.updateStatus(`Processing: "${command}"`);

        const cmd = command.toLowerCase().trim();
        
        // More comprehensive matching
        if (this.matchesOpenAI(cmd)) {
            this.updateStatus('Command recognized: Going to chat...');
            this.navigateToChat();
        } else if (this.matchesHome(cmd)) {
            this.updateStatus('Command recognized: Going home...');
            this.navigateToHome();
        } else if (this.matchesHelp(cmd)) {
            this.updateStatus('Command recognized: Showing help...');
            this.showHelp();
        } else {
            this.updateStatus(`Unknown command: "${command}" - Providing help...`);
            this.speakText(`I heard "${command}" but didn't understand. Try saying "open AI", "chat", "home", or "help". The most common command is "open AI" to start chatting.`);
            
            setTimeout(() => {
                this.isProcessing = false;
                this.startListening();
            }, 6000);
        }
    }

    matchesOpenAI(cmd) {
        const patterns = [
            'openai', 'open ai', 'open a i', 'open a.i.', 'open ay eye',
            'chat', 'ai', 'open eye', 'open i', 'ai chat',
            'start chat', 'begin chat', 'talk to ai', 'assistant',
            'go to chat', 'chat mode', 'artificial intelligence'
        ];
        return patterns.some(pattern => cmd.includes(pattern));
    }

    matchesHome(cmd) {
        const patterns = [
            'home', 'go home', 'back home', 'return home', 'main page',
            'go back', 'return back', 'back to home', 'homepage'
        ];
        return patterns.some(pattern => cmd.includes(pattern));
    }

    matchesHelp(cmd) {
        const patterns = [
            'help', 'commands', 'what can you do', 'instructions',
            'how to use', 'guide', 'what can i say', 'options'
        ];
        return patterns.some(pattern => cmd.includes(pattern));
    }

    navigateToChat() {
        this.speakText('Opening chat interface now');
        this.updateVoiceIndicator('processing');
        
        setTimeout(() => {
            window.location.href = '/chat';
        }, 1000);
    }

    navigateToHome() {
        this.speakText('Returning to home page');
        this.updateVoiceIndicator('processing');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }

    showHelp() {
        const helpText = 'Available voice commands: Say "open AI" or "chat" to start chatting. Say "home" to return to the main page. Say "help" for this message. The main command you need is "open AI" to start chatting.';
        this.speakText(helpText);
        
        setTimeout(() => {
            this.isProcessing = false;
            this.startListening();
        }, 10000);
    }

    updateVoiceIndicator(state) {
        const indicator = document.querySelector('.voice-orb-advanced');
        if (indicator) {
            indicator.className = `voice-orb-advanced ${state}`;
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            utterance.volume = 0.9;

            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
                const englishVoice = voices.find(voice => 
                    voice.lang.startsWith('en') && 
                    (voice.name.includes('Female') || voice.name.includes('Zira') || voice.name.includes('Microsoft'))
                ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
                
                if (englishVoice) {
                    utterance.voice = englishVoice;
                }
            }

            utterance.onend = () => {
                this.updateStatus('Speech finished');
            };

            speechSynthesis.speak(utterance);
            this.updateStatus(`Speaking: "${text.substring(0, 50)}..."`);
        }
    }

    showFallbackMessage() {
        const commandDisplay = document.querySelector('.command-content');
        if (commandDisplay) {
            commandDisplay.textContent = 'Voice not available - Use buttons below or refresh and allow microphone';
        }
        
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
            backdrop-filter: blur(10px);
        `;

        const chatButton = this.createButton('🗨️ Go to Chat', () => {
            this.updateStatus('Manual navigation to chat');
            this.navigateToChat();
        });
        
        const homeButton = this.createButton('🏠 Go Home', () => {
            this.updateStatus('Manual navigation to home');
            this.navigateToHome();
        });

        const retryButton = this.createButton('🎤 Retry Voice', () => {
            this.updateStatus('Retrying voice recognition...');
            this.retryCount = 0;
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

// Initialize when DOM and voices are ready
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
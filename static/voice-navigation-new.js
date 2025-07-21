// Simple Voice Navigator for OpenAI Braille App
class VoiceNavigator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isProcessing = false;
        
        console.log('🎤 VoiceNavigator: Starting initialization...');
        this.initAnimations();
        this.initSpeechRecognition();
    }

    initAnimations() {
        // Initialize typewriter effect
        const typewriterElement = document.querySelector('.typewriter');
        if (typewriterElement) {
            const text = typewriterElement.getAttribute('data-text');
            if (text) {
                let i = 0;
                const typeWriter = () => {
                    if (i < text.length) {
                        typewriterElement.innerHTML = text.substring(0, i + 1) + '<span class="cursor">|</span>';
                        i++;
                        setTimeout(typeWriter, 100);
                    }
                };
                setTimeout(typeWriter, 1000);
            }
        }

        // Initialize morphing text
        const morphingElement = document.querySelector('.morphing-text');
        if (morphingElement) {
            const wordsAttr = morphingElement.getAttribute('data-words');
            if (wordsAttr) {
                const words = wordsAttr.split(',');
                let currentWordIndex = 0;
                setInterval(() => {
                    currentWordIndex = (currentWordIndex + 1) % words.length;
                    morphingElement.textContent = words[currentWordIndex];
                }, 3000);
            }
        }
    }

    initSpeechRecognition() {
        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('❌ Speech recognition not supported');
            this.showManualButtons();
            return;
        }

        try {
            // Create recognition object
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Configure recognition
            this.recognition.continuous = false;  // Listen for one command at a time
            this.recognition.interimResults = false;  // Only final results
            this.recognition.lang = 'en-US';

            // Handle successful recognition
            this.recognition.onresult = (event) => {
                if (event.results && event.results.length > 0) {
                    const transcript = event.results[0][0].transcript.toLowerCase().trim();
                    console.log('🎯 Voice detected:', transcript);
                    this.processVoiceCommand(transcript);
                }
            };

            // Handle errors
            this.recognition.onerror = (event) => {
                console.log('❌ Speech error:', event.error);
                this.isListening = false;
                
                if (event.error === 'not-allowed') {
                    console.log('❌ Microphone permission denied');
                    this.showManualButtons();
                    return;
                }
                
                if (event.error === 'no-speech') {
                    console.log('⚠️ No speech detected, retrying...');
                    setTimeout(() => this.startListening(), 2000);
                    return;
                }
                
                // For other errors, retry after delay
                setTimeout(() => this.startListening(), 3000);
            };

            // Handle recognition end
            this.recognition.onend = () => {
                this.isListening = false;
                console.log('🔇 Recognition ended');
                
                // Restart if not processing a command
                if (!this.isProcessing) {
                    setTimeout(() => this.startListening(), 1500);
                }
            };

            // Handle recognition start
            this.recognition.onstart = () => {
                this.isListening = true;
                console.log('🎤 Listening for voice commands...');
                this.updateStatus('Listening for "OpenAI"...');
            };

            console.log('✅ Speech recognition initialized');
            
            // Start listening after a delay
            setTimeout(() => this.startListening(), 2000);
            
        } catch (error) {
            console.error('❌ Failed to initialize speech recognition:', error);
            this.showManualButtons();
        }
    }

    startListening() {
        if (!this.recognition || this.isListening || this.isProcessing) {
            return;
        }

        try {
            this.recognition.start();
            console.log('🎤 Starting to listen...');
        } catch (error) {
            console.log('❌ Failed to start listening:', error);
            setTimeout(() => this.startListening(), 3000);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            console.log('🔇 Stopped listening');
        }
    }

    processVoiceCommand(command) {
        console.log('⚡ Processing command:', command);
        this.isProcessing = true;
        this.stopListening();
        
        const cmd = command.toLowerCase().trim();
        
        // Check for OpenAI/Chat commands
        if (this.isOpenAICommand(cmd)) {
            console.log('✅ OpenAI command recognized!');
            this.updateStatus('Opening chat...');
            this.speakAndNavigate('Opening chat interface', '/chat');
            return;
        }
        
        // Check for Home commands
        if (this.isHomeCommand(cmd)) {
            console.log('✅ Home command recognized!');
            this.updateStatus('Going home...');
            this.speakAndNavigate('Going to home page', '/');
            return;
        }
        
        // Check for Help commands
        if (this.isHelpCommand(cmd)) {
            console.log('✅ Help command recognized!');
            this.updateStatus('Showing help...');
            this.speakText('Say "open AI" or "chat" to start chatting. Say "home" to go back to the main page.');
            setTimeout(() => {
                this.isProcessing = false;
                this.startListening();
            }, 4000);
            return;
        }
        
        // Command not recognized
        console.log('❓ Command not recognized:', command);
        this.updateStatus(`Didn't understand: "${command}"`);
        this.speakText(`I heard "${command}" but didn't understand. Try saying "open AI", "chat", or "help".`);
        
        setTimeout(() => {
            this.isProcessing = false;
            this.startListening();
        }, 3000);
    }

    isOpenAICommand(cmd) {
        const patterns = [
            'openai', 'open ai', 'open a i', 'open a.i.', 'open ay eye',
            'chat', 'ai', 'open eye', 'open i', 'artificial intelligence',
            'start chat', 'begin chat', 'talk to ai', 'assistant'
        ];
        return patterns.some(pattern => cmd.includes(pattern));
    }

    isHomeCommand(cmd) {
        const patterns = ['home', 'go home', 'back home', 'return home', 'main page', 'homepage'];
        return patterns.some(pattern => cmd.includes(pattern));
    }

    isHelpCommand(cmd) {
        const patterns = ['help', 'commands', 'what can you do', 'instructions', 'guide'];
        return patterns.some(pattern => cmd.includes(pattern));
    }

    speakAndNavigate(text, url) {
        this.speakText(text);
        
        // Add visual transition
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0.7';
        
        setTimeout(() => {
            window.location.href = url;
        }, 1500);
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel(); // Stop any ongoing speech
            
            // Clean the text by removing unwanted symbols
            const cleanText = this.cleanTextForSpeech(text);
            
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
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
            console.log('🗣️ Speaking (cleaned):', cleanText);
        }
    }

    cleanTextForSpeech(text) {
        // Remove or replace unwanted symbols and characters
        return text
            .replace(/\*/g, '')                    // Remove asterisks
            .replace(/[#@$%^&()[\]{}|\\]/g, '')    // Remove special symbols
            .replace(/_{2,}/g, '')                 // Remove multiple underscores
            .replace(/_{1}/g, ' ')                 // Replace single underscore with space
            .replace(/\s+/g, ' ')                  // Replace multiple spaces with single space
            .replace(/\.{2,}/g, '.')               // Replace multiple dots with single dot
            .replace(/,{2,}/g, ',')                // Replace multiple commas with single comma
            .trim();                               // Remove leading/trailing whitespace
    }

    updateStatus(message) {
        console.log('📢 Status:', message);
        
        // Update command display
        const commandContent = document.querySelector('.command-content');
        if (commandContent) {
            commandContent.textContent = message;
        }
        
        // Update voice indicator
        const indicator = document.querySelector('.voice-orb-advanced');
        if (indicator) {
            if (message.includes('Listening')) {
                indicator.className = 'voice-orb-advanced listening';
            } else if (message.includes('Opening') || message.includes('Going')) {
                indicator.className = 'voice-orb-advanced processing';
            }
        }
    }

    showManualButtons() {
        console.log('🔘 Showing manual navigation buttons');
        
        // Update status
        this.updateStatus('Voice not available - Use buttons below');
        
        // Remove existing buttons
        const existing = document.getElementById('manual-nav-buttons');
        if (existing) existing.remove();
        
        // Create button container
        const container = document.createElement('div');
        container.id = 'manual-nav-buttons';
        container.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 20px;
            z-index: 10000;
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        `;
        
        // Create Chat button
        const chatBtn = document.createElement('button');
        chatBtn.textContent = '💬 Go to Chat';
        chatBtn.style.cssText = `
            padding: 15px 25px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: transform 0.2s ease;
        `;
        chatBtn.onmouseover = () => chatBtn.style.transform = 'translateY(-3px)';
        chatBtn.onmouseout = () => chatBtn.style.transform = 'translateY(0)';
        chatBtn.onclick = () => {
            this.speakText('Going to chat');
            setTimeout(() => window.location.href = '/chat', 500);
        };
        
        // Create Home button
        const homeBtn = document.createElement('button');
        homeBtn.textContent = '🏠 Go Home';
        homeBtn.style.cssText = chatBtn.style.cssText;
        homeBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        homeBtn.onmouseover = () => homeBtn.style.transform = 'translateY(-3px)';
        homeBtn.onmouseout = () => homeBtn.style.transform = 'translateY(0)';
        homeBtn.onclick = () => {
            this.speakText('Going home');
            setTimeout(() => window.location.href = '/', 500);
        };
        
        // Create Retry button
        const retryBtn = document.createElement('button');
        retryBtn.textContent = '🎤 Try Voice Again';
        retryBtn.style.cssText = chatBtn.style.cssText;
        retryBtn.style.background = 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)';
        retryBtn.onmouseover = () => retryBtn.style.transform = 'translateY(-3px)';
        retryBtn.onmouseout = () => retryBtn.style.transform = 'translateY(0)';
        retryBtn.onclick = () => {
            container.remove();
            this.isProcessing = false;
            this.initSpeechRecognition();
        };
        
        container.appendChild(chatBtn);
        container.appendChild(homeBtn);
        container.appendChild(retryBtn);
        document.body.appendChild(container);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing VoiceNavigator...');
    
    // Wait for speech synthesis voices to load
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            if (!window.voiceNavigator) {
                console.log('🔊 Voices loaded, creating VoiceNavigator...');
                window.voiceNavigator = new VoiceNavigator();
            }
        };
        
        // Fallback in case voices are already loaded
        setTimeout(() => {
            if (!window.voiceNavigator) {
                console.log('🔊 Creating VoiceNavigator (fallback)...');
                window.voiceNavigator = new VoiceNavigator();
            }
        }, 2000);
    } else {
        // No speech synthesis support
        setTimeout(() => {
            console.log('🔊 No speech synthesis, creating VoiceNavigator anyway...');
            window.voiceNavigator = new VoiceNavigator();
        }, 1500);
    }
});

console.log('📜 Voice navigation script loaded!');

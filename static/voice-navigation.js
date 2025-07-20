class VoiceNavigator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.initSpeechRecognition();
        this.initAnimations();
        this.startListening();
    }

    initAnimations() {
        // Initialize Typewriter Effect
        this.initTypewriter();

        // Initialize Morphing Text
        this.initMorphingText();
    }

    initTypewriter() {
        const typewriterElement = document.querySelector('.typewriter');
        if (!typewriterElement) return;

        const text = typewriterElement.getAttribute('data-text');
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

        const words = morphingElement.getAttribute('data-words').split(',');
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
                console.log('Voice command:', transcript);
                this.processCommand(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.log('Speech recognition error:', event.error);
            this.isListening = false;
            
            // Only restart for certain errors, avoid rapid restarts
            if (event.error === 'no-speech' || event.error === 'audio-capture') {
                setTimeout(() => {
                    this.startListening();
                }, 2000);
            } else if (event.error !== 'aborted') {
                // For other errors except 'aborted', try to restart after longer delay
                setTimeout(() => {
                    this.startListening();
                }, 3000);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            // Only restart if not intentionally stopped
            if (this.recognition) {
                setTimeout(() => {
                    this.startListening();
                }, 1000);
            }
        };
    }

    startListening() {
        if (!this.recognition || this.isListening) return;

        try {
            this.recognition.start();
            this.isListening = true;
            this.updateVoiceIndicator('listening');
        } catch (error) {
            console.log('Failed to start recognition:', error);
            setTimeout(() => {
                this.startListening();
            }, 2000);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    processCommand(command) {
        this.updateVoiceIndicator('processing');
        console.log('Processing command:', command);

        // Stop listening during command processing to prevent interference
        this.stopListening();

        if (command.includes('openai') || command.includes('open ai') || command.includes('chat') || 
            command.includes('open a') || command.includes('ai')) {
            this.navigateToChat();
            return; // Prevent restart of listening
        } else if (command.includes('return back to home') || command.includes('go back to home') || command.includes('home')) {
            this.navigateToHome();
            return; // Prevent restart of listening
        } else if (command.includes('help') || command.includes('commands')) {
            this.speakText('Available commands: Say OpenAI to start chatting. Say return back to home page to go home. Say help for this message.');
        }

        // Resume listening after a delay for non-navigation commands
        setTimeout(() => {
            this.startListening();
        }, 2000);
    }

    navigateToChat() {
        console.log('Navigating to chat...');
        this.stopListening(); // Stop listening immediately
        this.recognition = null; // Prevent restart attempts
        
        this.updateVoiceIndicator('processing');

        // Add navigation animation
        document.body.style.transition = 'opacity 0.3s ease-out';
        document.body.style.opacity = '0';

        // Navigate immediately without waiting for speech
        setTimeout(() => {
            window.location.href = '/chat';
        }, 300);
    }

    navigateToHome() {
        console.log('Navigating to home...');
        this.stopListening(); // Stop listening immediately
        this.recognition = null; // Prevent restart attempts
        
        this.updateVoiceIndicator('processing');

        // Add navigation animation
        document.body.style.transition = 'opacity 0.3s ease-out';
        document.body.style.opacity = '0';

        // Navigate immediately without waiting for speech
        setTimeout(() => {
            window.location.href = '/';
        }, 300);
    }

    updateVoiceIndicator(state) {
        const indicator = document.querySelector('.voice-orb-advanced');
        if (!indicator) return;

        indicator.className = `voice-orb-advanced ${state}`;
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.2;
            utterance.volume = 0.8;

            // Choose a female voice if available
            const voices = speechSynthesis.getVoices();
            const femaleVoice = voices.find(voice => 
                voice.name.toLowerCase().includes('female') ||
                voice.name.toLowerCase().includes('zira') ||
                voice.name.toLowerCase().includes('hazel') ||
                voice.name.toLowerCase().includes('samantha') ||
                voice.name.toLowerCase().includes('karen') ||
                voice.name.toLowerCase().includes('moira') ||
                voice.name.toLowerCase().includes('tessa') ||
                voice.name.toLowerCase().includes('veena') ||
                voice.name.toLowerCase().includes('susan') ||
                voice.name.toLowerCase().includes('fiona')
            );

            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }

            speechSynthesis.speak(utterance);
        }
    }

    showFallbackMessage() {
        const commandDisplay = document.querySelector('.command-content');
        if (commandDisplay) {
            commandDisplay.textContent = 'Speech recognition not supported. Please use a modern browser.';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceNavigator();
});
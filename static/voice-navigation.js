class VoiceNavigator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.shouldStop = false;
        this.initSpeechRecognition();
        this.initAnimations();
        
        // Start listening after a short delay to ensure everything is initialized
        setTimeout(() => {
            this.startListening();
        }, 500);
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
        // Check for HTTPS requirement
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            console.warn('Speech recognition requires HTTPS or localhost');
            this.showFallbackMessage();
            return;
        }

        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            console.log('Using webkitSpeechRecognition');
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
            console.log('Using SpeechRecognition');
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
            console.log('Heard:', transcript); // Debug log

            if (event.results[event.results.length - 1].isFinal) {
                console.log('Final voice command:', transcript);
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
                    if (this.recognition) { // Only restart if not destroyed
                        this.startListening();
                    }
                }, 3000);
                return;
            }
            
            // For other errors, restart with delay
            if (event.error === 'audio-capture' || event.error === 'not-allowed') {
                this.updateVoiceIndicator('error');
                setTimeout(() => {
                    if (this.recognition) {
                        this.startListening();
                    }
                }, 5000);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            // Only restart if recognition object exists and we haven't stopped intentionally
            if (this.recognition && !this.shouldStop) {
                setTimeout(() => {
                    this.startListening();
                }, 1500);
            }
        };
    }

    startListening() {
        if (!this.recognition || this.isListening || this.shouldStop) return;

        try {
            this.shouldStop = false;
            this.recognition.start();
            this.isListening = true;
            this.updateVoiceIndicator('listening');
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

        // More flexible matching for "OpenAI"
        if (command.includes('openai') || command.includes('open ai') || command.includes('open a i') || 
            command.includes('chat') || command.includes('open a') || command.includes('ai') ||
            command.includes('open eye') || command.includes('opener') || command.includes('opening')) {
            console.log('Navigation command detected!');
            this.navigateToChat();
            return; // Prevent restart of listening
        } else if (command.includes('return back to home') || command.includes('go back to home') || command.includes('home')) {
            this.navigateToHome();
            return; // Prevent restart of listening
        } else if (command.includes('about this website') || command.includes('about') || command.includes('what is this website') || command.includes('about page')) {
            this.navigateToAbout();
            return; // Prevent restart of listening
        } else if (command.includes('help') || command.includes('commands')) {
            this.speakText('Available commands: Say OpenAI to start chatting. Say about this website to learn more. Say return back to home page to go home. Say help for this message.');
        } else {
            console.log('Unrecognized command:', command);
            // Provide feedback for unrecognized commands
            this.speakText('Command not recognized. Say OpenAI to start chatting, about this website to learn more, or help for commands.');
        }
    }

    navigateToAbout() {
        console.log('Navigating to about...');
        this.stopListening(); // Stop listening immediately
        this.recognition = null; // Prevent restart attempts
        this.updateVoiceIndicator('processing');
        document.body.style.transition = 'opacity 0.3s ease-out';
        document.body.style.opacity = '0';
        setTimeout(() => {
            window.location.href = '/about';
        }, 300);
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
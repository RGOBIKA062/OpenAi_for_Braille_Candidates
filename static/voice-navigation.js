// Voice Navigation for your web app
// Enhanced voice navigation system for braille candidates

// Global TTS activation gate shared across pages
if (typeof window.__ttsActivated === 'undefined') {
    window.__ttsActivated = false;
}

class VoiceNavigator {
    constructor() {
    console.log('VoiceNavigator: initializing...');
        // Initialize on all pages for better accessibility
        this.recognition = null;
    this.isListening = false;
    this.isProcessing = false;
    this.hasEverStarted = false; // once true, allow restarts without extra gesture
    // For accessibility: default to activated so no click is required
    this.userActivated = true;
    // Allow auto start attempts continuously until we succeed
    this.allowAutoStart = true;
        this.commandBuffer = '';
        this.lastCommandTime = 0;
        this.commandTimeout = 2000; // 2 seconds to wait for complete command
        this.selectedVoice = null;
        this.ttsQueue = [];
        
        this.setupTTSActivation();

        // Do not start voice navigation on chat page to avoid mic conflicts
        const path = (window.location && window.location.pathname) || '';
        this.isChatPage = path.startsWith('/chat');
        if (this.isChatPage) {
            console.log('VoiceNavigator: Disabled on chat page to prevent conflicts');
            return;
        }

    this.initSpeechRecognition();
    // Attempt to get mic permission and start immediately (no click)
    this.ensureMicPermissionAndStart();

    // Provide a live region only (no extra UI/buttons)
    this.insertLiveHint();
    }
    
    initSpeechRecognition() {
        // Reset any existing recognition
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.log('VoiceNavigator: Error stopping existing recognition:', e);
            }
            this.recognition = null;
        }
        
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('VoiceNavigator: Speech recognition not supported');
            return;
        }

    this.recognition = new SpeechRecognition();
        
        // More stable settings
    this.recognition.continuous = true;
    this.recognition.interimResults = true; // show interim transcripts too
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            console.log('VoiceNavigator: Speech recognition started');
            this.isListening = true;
            this.hasEverStarted = true;
            this.updateVoiceIndicator('listening');
            // Try to load voices when recognition starts
            this.initVoices();
            this.updateTranscript('(listening...)');
        };

        this.recognition.onresult = (event) => {
            try {
                if (!event.results || event.results.length === 0) return;
                const idx = event.results.length - 1;
                const res = event.results[idx];
                const transcript = (res[0] && res[0].transcript ? res[0].transcript : '').trim();
                const lowered = transcript.toLowerCase();

                if (!transcript) return;

                if (res.isFinal) {
                    console.log('VoiceNavigator heard (final):', transcript);
                    this.updateTranscript(lowered);
                    this.commandBuffer = lowered;
                    this.lastCommandTime = Date.now();
                    this.checkForCommands(this.commandBuffer);
                } else {
                    console.log('VoiceNavigator heard (interim):', transcript);
                    this.updateTranscript(`${lowered} (… )`);
                }
            } catch (e) {
                console.error('VoiceNavigator: Error in result handler:', e);
            }
        };

        // Extra visibility into mic lifecycle
        this.recognition.onaudiostart = () => console.log('VoiceNavigator: audio start');
        this.recognition.onaudioend = () => console.log('VoiceNavigator: audio end');
        this.recognition.onspeechstart = () => console.log('VoiceNavigator: speech start');
        this.recognition.onspeechend = () => console.log('VoiceNavigator: speech end');

    this.recognition.onerror = (event) => {
            try {
        console.error('VoiceNavigator: Speech recognition error:', event.error);
                
                let restartNeeded = false;
                
                // Handle different error types
                switch (event.error) {
                    case 'no-speech':
                        console.log('VoiceNavigator: No speech detected');
                        restartNeeded = true;
                        break;
                    case 'audio-capture':
                        console.log('VoiceNavigator: No microphone detected');
                        // Don't restart immediately for hardware issues
                        this.updateVoiceIndicator('error');
                        restartNeeded = false;
                        // Retry permission acquisition periodically
                        this.autoRetryMicPermission();
                        break;
                    case 'not-allowed':
                        console.log('VoiceNavigator: Microphone permission denied');
                        this.updateVoiceIndicator('error');
                        // Avoid UI prompts; re-attempt permission after a short delay
                        restartNeeded = false;
                        this.autoRetryMicPermission();
                        break;
                    case 'network':
                        console.log('VoiceNavigator: Network error');
                        restartNeeded = true;
                        break;
                    case 'aborted':
                        console.log('VoiceNavigator: Recognition aborted');
                        restartNeeded = true;
                        break;
                    default:
                        // Other errors
                        console.log('VoiceNavigator: Recognition error, attempting restart...');
                        restartNeeded = true;
                }
                
                // Restart recognition if needed
                if (restartNeeded) {
                    // Mark recognition as stopped
                    this.isListening = false;
                    
                    // Recreate recognition object after a delay
                    setTimeout(() => {
                        this.recognition = null;
                        this.initSpeechRecognition();
                        this.startListening();
                    }, 1000);
                }
            } catch (e) {
                console.error('VoiceNavigator: Error in error handler:', e);
                // Last resort recovery
                setTimeout(() => {
                    this.recognition = null;
                    this.initSpeechRecognition();
                    this.startListening();
                }, 2000);
            }
        };

    this.recognition.onend = () => {
            try {
                console.log('VoiceNavigator: Speech recognition ended');
                
                // Mark as not listening
                this.isListening = false;
                
                // Clear command buffer after timeout
                setTimeout(() => {
                    this.commandBuffer = '';
                }, this.commandTimeout);
                
                // Always try to restart if we've started once and are allowed
                if (this.userActivated || this.allowAutoStart || this.hasEverStarted) {
                    console.log('VoiceNavigator: Scheduling restart after end');
                    
                    // Use a longer delay to avoid race conditions
                    setTimeout(() => {
                        // Double-check we're still not processing when the timeout fires
                        if (!this.isListening && (this.userActivated || this.allowAutoStart || this.hasEverStarted)) {
                            console.log('VoiceNavigator: Restarting after end event');
                            this.startListening();
                        } else {
                            console.log('VoiceNavigator: Not restarting - already listening or processing');
                        }
                    }, 1000);
                } else {
                    console.log('VoiceNavigator: Not restarting - processing a command');
                }
            } catch (e) {
                console.error('VoiceNavigator: Error in end handler:', e);
                // Recovery attempt with longer delay
                setTimeout(() => {
                    if (!this.isListening && (this.userActivated || this.hasEverStarted)) {
                        this.startListening();
                    }
                }, 2000);
            }
        };
    }

    setupTTSActivation() {
        if (window.__ttsActivated) return;
        const onInteract = () => {
            window.__ttsActivated = true;
            document.removeEventListener('keydown', onInteract, true);
            document.removeEventListener('mousedown', onInteract, true);
            document.removeEventListener('touchstart', onInteract, true);
            const queued = [...this.ttsQueue];
            this.ttsQueue = [];
            queued.forEach(text => this.speakText(text));
        };
        document.addEventListener('keydown', onInteract, true);
        document.addEventListener('mousedown', onInteract, true);
        document.addEventListener('touchstart', onInteract, true);
    }

    initVoices() {
        if ('speechSynthesis' in window) {
            // Clear any existing utterances
            speechSynthesis.cancel();
            
            // Select a voice
            speechSynthesis.onvoiceschanged = () => {
                const voices = speechSynthesis.getVoices();
                if (voices.length) {
                    // Prefer English female voices
                    this.selectedVoice = voices.find(v => 
                        (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira')) && 
                        v.lang.includes('en')
                    ) || voices[0];
                }
            };
            
            // Initial voice selection attempt
            const voices = speechSynthesis.getVoices();
            if (voices.length) {
                this.selectedVoice = voices.find(v => 
                    (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Zira')) && 
                    v.lang.includes('en')
                ) || voices[0];
            }
        }
    }

    startListening() {
        // Exit early if we're already listening or processing a command
        if (this.isListening || this.isProcessing) {
            console.log('VoiceNavigator: Already listening or processing, not starting again');
            return;
        }
    // With accessibility mode, proceed without explicit user gesture
    if (!this.userActivated && !this.allowAutoStart && !this.hasEverStarted) {
            console.log('VoiceNavigator: Waiting for user activation before starting recognition');
            return;
        }
        
        // First ensure we have a fresh recognition instance
        if (this.recognition) {
            try {
                // Always stop existing recognition instance to be safe
                this.recognition.stop();
                console.log('VoiceNavigator: Stopped existing recognition before starting');
            } catch (e) {
                console.log('VoiceNavigator: Error stopping existing recognition:', e);
            }
            
            // Force recreation of recognition instance to avoid state issues
            this.recognition = null;
            console.log('VoiceNavigator: Creating fresh recognition instance');
        }
        
        // Create a new recognition instance
        this.initSpeechRecognition();
        
        // Exit if initialization failed
        if (!this.recognition) {
            console.error('VoiceNavigator: Failed to initialize speech recognition');
            return;
        }
        
        // Now try to start the fresh instance
        try {
            // Add a small delay to ensure browser has cleaned up previous instance
            setTimeout(() => {
                try {
                    if (!this.isListening && !this.isProcessing) {
                        this.recognition.start();
                        this.isListening = true;
                        console.log('VoiceNavigator: Starting voice recognition...');
                    }
                } catch (error) {
                    console.error('VoiceNavigator: Error starting delayed recognition:', error);
                    // Last resort - try again with more delay
                    setTimeout(() => {
                        this.recognition = null;
                        this.initSpeechRecognition();
                        try {
                            this.recognition.start();
                            this.isListening = true;
                        } catch (e) {
                            console.error('VoiceNavigator: Final attempt to start recognition failed:', e);
                            this.showStartButton('Click here to enable voice navigation');
                        }
                    }, 1000);
                }
            }, 200);
        } catch (error) {
            console.error('VoiceNavigator: Error in startListening:', error);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
                this.isListening = false;
            } catch (error) {
                console.error('VoiceNavigator: Error stopping recognition:', error);
            }
        }
    }

    processCommand(command) {
        try {
            // Mark as processing to prevent overlapping commands
            this.isProcessing = true;
            this.updateVoiceIndicator('processing');
            console.log('VoiceNavigator processing command:', command);

            // Stop listening during command processing to prevent interference
            this.stopListening();

            // Enhanced command recognition for chat navigation
            if (command.includes('open chat') || command.includes('open ai') || command.includes('openai') || command.includes('open eye') || command.includes('open ay') || command.includes('open a y') || command.includes('open i') || 
                command.includes('open a i') || command.includes('start chat') || 
                command.includes('go to chat') || command.includes('chat page')) {
                console.log('VoiceNavigator: Chat navigation command detected!');
                this.speak('Opening chat');
                this.navigateToChat();
                return;
            }
            
            // Enhanced command recognition for home navigation
            if (command.includes('go home') || command.includes('home page') ||
                command.includes('return home') || command.includes('go to home') ||
                command.includes('back to home') || command.includes('return back to home') || command.includes('return back to home page')) {
                console.log('VoiceNavigator: Home navigation command detected!');
                this.speak('Going to home page');
                this.navigateToHome();
                return;
            }
            
            // Enhanced command recognition for about page
            if (command.includes('about this website') || command.includes('about page') || 
                command.includes('about website') || command.includes('tell me about')) {
                console.log('VoiceNavigator: About page navigation command detected!');
                this.speak('Opening about page');
                this.navigateToAbout();
                return;
            }

            // Check for help command
            if (command.includes('help') || command.includes('commands') || 
                command.includes('what can i say')) {
                console.log('VoiceNavigator: Help command detected!');
                this.showHelp();
                return;
            }
            
            // No command recognized
            console.log('VoiceNavigator: No command recognized in:', command);
            
        } catch (e) {
            console.error('VoiceNavigator: Error processing command:', e);
        } finally {
            // Always reset processing state and restart listening
            setTimeout(() => {
                this.isProcessing = false;
                this.startListening();
            }, 500);
        }
    }

    checkForCommands(command) {
        try {
            const now = Date.now();
            const cleanCommand = command.toLowerCase().trim();

            // Check for custom page-specific commands first
            if (this.customCommands) {
                for (const cmd in this.customCommands) {
                    if (cleanCommand.includes(cmd)) {
                        console.log(`VoiceNavigator: Executing custom command "${cmd}"`);
                        this.customCommands[cmd]();
                        this.commandBuffer = ''; // Clear buffer
                        return;
                    }
                }
            }
            
            // Enhanced command detection for "open chat" and "open ai"
            if (cleanCommand.includes('open chat') || cleanCommand.includes('open ai') || cleanCommand.includes('openai') || cleanCommand.includes('open eye') || cleanCommand.includes('open ay') || cleanCommand.includes('open a y') || cleanCommand.includes('open i') || 
                cleanCommand.includes('open a i') || cleanCommand.includes('start chat') || 
                cleanCommand.includes('go to chat') || cleanCommand.includes('chat page')) {
                console.log('VoiceNavigator: Chat navigation command detected!');
                this.speak('Opening chat');
                this.navigateToChat();
                this.commandBuffer = ''; // Clear buffer after successful command
                return;
            }
            
            // Enhanced command detection for home navigation
            if (cleanCommand.includes('go home') || cleanCommand.includes('home page') ||
                cleanCommand.includes('return home') || cleanCommand.includes('go to home') ||
                cleanCommand.includes('back to home') || cleanCommand.includes('return back to home') || cleanCommand.includes('return back to home page')) {
                console.log('VoiceNavigator: Home navigation command detected!');
                this.speak('Going to home page');
                this.navigateToHome();
                this.commandBuffer = ''; // Clear buffer after successful command
                return;
            }
            
            // Enhanced command detection for about page
            if (cleanCommand.includes('about this website') || cleanCommand.includes('about page') || 
                cleanCommand.includes('about website') || cleanCommand.includes('tell me about')) {
                console.log('VoiceNavigator: About page navigation command detected!');
                this.speak('Opening about page');
                this.navigateToAbout();
                this.commandBuffer = ''; // Clear buffer after successful command
                return;
            }

            // Check for help command
            if (cleanCommand.includes('help') || cleanCommand.includes('commands') || 
                cleanCommand.includes('what can i say')) {
                console.log('VoiceNavigator: Help command detected!');
                this.showHelp();
                this.commandBuffer = ''; // Clear buffer after successful command
                return;
            }
            
            // Clear command buffer after a timeout
            if (now - this.lastCommandTime > this.commandTimeout) {
                this.commandBuffer = '';
            }
        } catch (e) {
            console.error('VoiceNavigator: Error checking for commands:', e);
            this.commandBuffer = ''; // Clear on error
        }
    }

    navigateToAbout() {
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/about';
        }, 500);
    }

    navigateToChat() {
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/chat';
        }, 500);
    }

    navigateToHome() {
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    }

    updateVoiceIndicator(state) {
        const indicator = document.getElementById('voiceIndicator');
        if (indicator) {
            // Remove all state classes
            indicator.classList.remove('listening', 'processing', 'error');
            
            // Add appropriate state class
            if (state === 'listening' || state === 'processing' || state === 'error') {
                indicator.classList.add(state);
            }
        }
    }

    speakText(text) {
        if (!('speechSynthesis' in window)) {
            console.error('VoiceNavigator: Text-to-speech not supported');
            return;
        }
        
        if (!window.__ttsActivated) {
            this.ttsQueue.push(text);
            return;
        }
        
        try {
            speechSynthesis.cancel(); // Cancel any ongoing speech
            const utterance = new SpeechSynthesisUtterance(text);
            
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }
            
            speechSynthesis.speak(utterance);
        } catch (e) {
            console.error('VoiceNavigator: Error speaking text:', e);
        }
    }
    
    // Alias for speakText for consistency
    speak(text) {
        this.speakText(text);
    }

    // Start recognition only after a user gesture (click/touch/key)
    setupRecognitionActivation() {
        const activator = () => {
            console.log('VoiceNavigator: User activation detected');
            this.userActivated = true;
            try { this.startListening(); } catch (e) { console.error('VoiceNavigator: activation start failed', e); }
            document.removeEventListener('mousedown', activator, true);
            document.removeEventListener('touchstart', activator, true);
            document.removeEventListener('keydown', activator, true);
            // Update hint if present
            const hint = document.getElementById('voiceNavHint');
            if (hint) hint.textContent = 'Voice navigation active. Try saying: open chat, about this website, go home.';
            // Remove start button if visible
            const btn = document.getElementById('voiceNavStart');
            if (btn) btn.remove();
        };
        document.addEventListener('mousedown', activator, true);
        document.addEventListener('touchstart', activator, true);
        document.addEventListener('keydown', activator, true);
    }

    insertLiveHint() {
        try {
            if (document.getElementById('voiceNavHint')) return;
            const region = document.createElement('div');
            region.id = 'voiceNavHint';
            region.setAttribute('aria-live', 'polite');
            region.style.position = 'absolute';
            region.style.width = '1px';
            region.style.height = '1px';
            region.style.overflow = 'hidden';
            region.style.clip = 'rect(1px, 1px, 1px, 1px)';
            region.style.clipPath = 'inset(50%)';
            region.style.whiteSpace = 'nowrap';
            region.style.border = '0';
            region.textContent = 'Voice navigation ready. Click or press any key, then speak your command.';
            document.body.appendChild(region);
        } catch (e) { /* ignore */ }
    }

    insertDebugPanel() {
        // Keep a minimal live transcript without requiring clicks
        try {
            if (document.getElementById('voiceNavDebug')) return;
            const panel = document.createElement('div');
            panel.id = 'voiceNavDebug';
            panel.style.position = 'fixed';
            panel.style.bottom = '10px';
            panel.style.left = '10px';
            panel.style.padding = '6px 10px';
            panel.style.background = 'rgba(0,0,0,0.6)';
            panel.style.color = '#fff';
            panel.style.fontSize = '12px';
            panel.style.borderRadius = '8px';
            panel.style.zIndex = '9999';
            panel.style.userSelect = 'none';
            panel.textContent = 'Voice: (idle)';
            document.body.appendChild(panel);
        } catch (_) {}
    }

    updateTranscript(text) {
        try {
            const panel = document.getElementById('voiceNavDebug');
            if (panel) panel.textContent = `Voice: ${text}`;
        } catch (_) {}
    }

    showStartButton() { /* no-op: clicks not required for accessibility */ }

    ensureMicPermissionAndStart() {
        // Try starting immediately; browsers that allow will start now
        this.startListening();
        // Periodically attempt to start again in case permissions change
        this._autoStartTimer = setInterval(() => {
            if (!this.isListening) {
                this.startListening();
            } else if (this._autoStartTimer) {
                clearInterval(this._autoStartTimer);
                this._autoStartTimer = null;
            }
        }, 3000);
    }

    autoRetryMicPermission() {
        if (this._permRetryTimer) return;
        this._permRetryTimer = setInterval(() => {
            if (!this.isListening) {
                this.startListening();
            } else {
                clearInterval(this._permRetryTimer);
                this._permRetryTimer = null;
            }
        }, 5000);
    }

    tryAutoStart() {
        // Attempt to start immediately (may be blocked in some browsers)
        this.allowAutoStart = true;
        this.startListening();
        // Turn off bypass shortly after
        setTimeout(() => { this.allowAutoStart = false; }, 2000);
    }

    showFallbackMessage() {
        console.log('Command not recognized. Say open chat to start chatting, or help for commands');
        this.speak('Command not recognized. Say open chat to start chatting or help for commands');
    }

    showHelp() {
        const helpText = 'You can say: open chat, go home, about this website, or help';
        this.speak(helpText);
    }

    addCommands(commands) {
        if (!this.customCommands) {
            this.customCommands = {};
        }
        // Merge new commands
        Object.assign(this.customCommands, commands);
    }
}

// Initialize voice navigation on page load
document.addEventListener('DOMContentLoaded', () => {
    window.voiceNavigator = new VoiceNavigator();
});

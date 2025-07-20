
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
        } else if (command.includes('home') || command.includes('back') || command.includes('return')) {
            this.navigateToHome();
        } else if (command.includes('help') || command.includes('commands')) {
            this.speakText('Available commands: Say OpenAI to start chatting. Say return back to home page to go home. Say help for this message.');
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

    navigateToHome() {
        this.speakText('Returning to home page');
        this.updateVoiceIndicator('processing');
        
        // Add navigation animation
        document.body.style.transition = 'opacity 0.5s ease-out';
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location.href = '/';
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
        const instruction = document.querySelector('.instruction');
        instruction.innerHTML = 'Voice recognition not supported. <a href="/chat" style="color: #fff; text-decoration: underline;">Click here to chat</a>';
    }
}

// Initialize voice navigation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new VoiceNavigator();
    initializeDigitalRain();
});

// Digital Rain Effect
function initializeDigitalRain() {
    const rainContainer = document.getElementById('digitalRain');
    const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const columnCount = Math.floor(window.innerWidth / 20);
    
    for (let i = 0; i < columnCount; i++) {
        createRainColumn(i, rainContainer, characters);
    }
}

function createRainColumn(columnIndex, container, chars) {
    const column = document.createElement('div');
    column.style.position = 'absolute';
    column.style.left = columnIndex * 20 + 'px';
    column.style.top = '-100px';
    column.style.width = '20px';
    
    const dropCount = Math.floor(Math.random() * 20) + 10;
    
    for (let i = 0; i < dropCount; i++) {
        setTimeout(() => {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.textContent = chars[Math.floor(Math.random() * chars.length)];
            drop.style.left = columnIndex * 20 + Math.random() * 10 + 'px';
            drop.style.animationDuration = (Math.random() * 3 + 2) + 's';
            drop.style.animationDelay = Math.random() * 2 + 's';
            
            container.appendChild(drop);
            
            setTimeout(() => {
                if (drop.parentNode) {
                    drop.parentNode.removeChild(drop);
                }
            }, 5000);
        }, i * 200 + Math.random() * 1000);
    }
    
    // Restart column after delay
    setTimeout(() => {
        createRainColumn(columnIndex, container, chars);
    }, (dropCount * 200) + Math.random() * 3000 + 5000);
}

// Enhanced loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 1.2s ease-in';
    
    // Create loading particles effect
    const loadingEffect = document.createElement('div');
    loadingEffect.style.position = 'fixed';
    loadingEffect.style.top = '0';
    loadingEffect.style.left = '0';
    loadingEffect.style.width = '100%';
    loadingEffect.style.height = '100%';
    loadingEffect.style.background = 'radial-gradient(circle, rgba(0,255,255,0.3) 0%, transparent 70%)';
    loadingEffect.style.zIndex = '1000';
    loadingEffect.style.transition = 'opacity 1s ease-out';
    document.body.appendChild(loadingEffect);
    
    setTimeout(() => {
        document.body.style.opacity = '1';
        loadingEffect.style.opacity = '0';
        
        setTimeout(() => {
            if (loadingEffect.parentNode) {
                loadingEffect.parentNode.removeChild(loadingEffect);
            }
        }, 1000);
    }, 200);
    
    // Add particle burst effect on load
    setTimeout(() => {
        createParticleBurst();
    }, 1500);
});

function createParticleBurst() {
    const burstContainer = document.createElement('div');
    burstContainer.style.position = 'fixed';
    burstContainer.style.top = '50%';
    burstContainer.style.left = '50%';
    burstContainer.style.transform = 'translate(-50%, -50%)';
    burstContainer.style.pointerEvents = 'none';
    burstContainer.style.zIndex = '10';
    document.body.appendChild(burstContainer);
    
    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
        particle.style.borderRadius = '50%';
        particle.style.boxShadow = '0 0 10px currentColor';
        
        const angle = (i / 12) * Math.PI * 2;
        const distance = 100 + Math.random() * 100;
        const duration = 1 + Math.random() * 0.5;
        
        particle.style.animation = `
            particleBurst ${duration}s ease-out forwards
        `;
        
        particle.style.setProperty('--end-x', Math.cos(angle) * distance + 'px');
        particle.style.setProperty('--end-y', Math.sin(angle) * distance + 'px');
        
        burstContainer.appendChild(particle);
    }
    
    // Add CSS animation for particle burst
    if (!document.getElementById('particleBurstStyle')) {
        const style = document.createElement('style');
        style.id = 'particleBurstStyle';
        style.textContent = `
            @keyframes particleBurst {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--end-x), var(--end-y)) scale(0);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        if (burstContainer.parentNode) {
            burstContainer.parentNode.removeChild(burstContainer);
        }
    }, 2000);
}

// Responsive adjustments
window.addEventListener('resize', () => {
    const rainContainer = document.getElementById('digitalRain');
    if (rainContainer) {
        rainContainer.innerHTML = '';
        setTimeout(initializeDigitalRain, 100);
    }
});

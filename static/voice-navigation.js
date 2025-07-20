
class VoiceNavigator {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.initSpeechRecognition();
        this.initAnimations();
        this.startListening();
    }

    initAnimations() {
        // Initialize Neural Network Canvas
        this.initNeuralNetwork();
        
        // Initialize Particle System
        this.initParticleSystem();
        
        // Initialize Matrix Rain
        this.initMatrixRain();
        
        // Initialize Typewriter Effect
        this.initTypewriter();
        
        // Initialize Morphing Text
        this.initMorphingText();
        
        // Initialize Card Particles
        this.initCardParticles();
    }

    initNeuralNetwork() {
        const canvas = document.getElementById('neuralCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const nodes = [];
        const connections = [];
        
        // Create nodes
        for (let i = 0; i < 50; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1
            });
        }
        
        const animate = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Update and draw nodes
            nodes.forEach((node, i) => {
                node.x += node.vx;
                node.y += node.vy;
                
                if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
                
                // Draw node
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 255, 255, 0.6)`;
                ctx.fill();
                
                // Draw connections
                nodes.forEach((otherNode, j) => {
                    if (i !== j) {
                        const dist = Math.hypot(node.x - otherNode.x, node.y - otherNode.y);
                        if (dist < 100) {
                            ctx.beginPath();
                            ctx.moveTo(node.x, node.y);
                            ctx.lineTo(otherNode.x, otherNode.y);
                            ctx.strokeStyle = `rgba(255, 0, 255, ${0.3 - dist / 300})`;
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                        }
                    }
                });
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    initParticleSystem() {
        const container = document.getElementById('particleSystem');
        
        setInterval(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * window.innerWidth + 'px';
            particle.style.width = particle.style.height = Math.random() * 4 + 2 + 'px';
            particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
            
            container.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 20000);
        }, 500);
    }

    initMatrixRain() {
        const container = document.getElementById('matrixRain');
        const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        
        for (let i = 0; i < 50; i++) {
            const char = document.createElement('div');
            char.className = 'matrix-char';
            char.textContent = characters[Math.floor(Math.random() * characters.length)];
            char.style.left = Math.random() * window.innerWidth + 'px';
            char.style.animationDuration = (Math.random() * 5 + 5) + 's';
            char.style.animationDelay = Math.random() * 5 + 's';
            
            container.appendChild(char);
        }
    }

    initTypewriter() {
        const typewriterElement = document.querySelector('.typewriter');
        const text = typewriterElement.getAttribute('data-text');
        const cursor = typewriterElement.querySelector('.cursor');
        
        typewriterElement.innerHTML = '<span class="cursor">|</span>';
        
        let index = 0;
        const type = () => {
            if (index < text.length) {
                typewriterElement.innerHTML = text.substring(0, index + 1) + '<span class="cursor">|</span>';
                index++;
                setTimeout(type, 100);
            }
        };
        
        setTimeout(type, 2000);
    }

    initMorphingText() {
        const morphingElement = document.querySelector('.morphing-text');
        const words = morphingElement.getAttribute('data-words').split(',');
        let currentWordIndex = 0;
        
        setInterval(() => {
            currentWordIndex = (currentWordIndex + 1) % words.length;
            morphingElement.textContent = words[currentWordIndex];
        }, 3000);
    }

    initCardParticles() {
        document.querySelectorAll('.card-particles').forEach(container => {
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.className = 'card-particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 4 + 's';
                particle.style.animationDuration = (Math.random() * 2 + 3) + 's';
                
                container.appendChild(particle);
            }
        });
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
        } else if (command.includes('return back to home') || command.includes('go back to home') || command.includes('home')) {
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

    updateVoiceIndicator(status) {
        const orbCore = document.querySelector('.orb-core');
        const commandIndicator = document.querySelector('.command-indicator');
        
        switch(status) {
            case 'listening':
                if (orbCore) {
                    orbCore.style.boxShadow = '0 0 80px rgba(0, 255, 0, 0.8)';
                }
                if (commandIndicator) {
                    commandIndicator.style.background = '#00ff00';
                }
                break;
            case 'processing':
                if (orbCore) {
                    orbCore.style.boxShadow = '0 0 80px rgba(255, 165, 0, 0.8)';
                }
                if (commandIndicator) {
                    commandIndicator.style.background = '#ffa500';
                }
                break;
            case 'error':
                if (orbCore) {
                    orbCore.style.boxShadow = '0 0 80px rgba(255, 0, 0, 0.8)';
                }
                if (commandIndicator) {
                    commandIndicator.style.background = '#ff0000';
                }
                break;
        }
    }

    showFallbackMessage() {
        const instruction = document.querySelector('.command-content');
        if (instruction) {
            instruction.textContent = 'Speech recognition not supported. Please use a modern browser.';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceNavigator();
    
    // Handle window resize for canvas
    window.addEventListener('resize', () => {
        const canvas = document.getElementById('neuralCanvas');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    });
});

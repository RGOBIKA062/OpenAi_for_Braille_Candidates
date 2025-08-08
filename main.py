
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import requests
import json
import os
from gtts import gTTS
import io
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Groq API configuration from environment variables
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = os.getenv('GROQ_API_URL', 'https://api.groq.com/openai/v1/chat/completions')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/login')
def login():
    return render_template('login.html')


@app.route('/api/chat', methods=['POST'])
def api_chat():
    try:
        data = request.json
        user_message = data.get('message', '').strip().lower()
        
        # Handle voice commands
        if user_message in ['stop', 'pause', 'halt']:
            return jsonify({
                'response': 'Conversation stopped.',
                'command': 'stop'
            })
        
        if user_message in ['help', 'commands']:
            commands_text = """Available voice commands: 
            - Say 'OpenAI' to navigate to chat
            - Say 'stop' or 'pause' to stop conversation
            - Say 'help' for commands
            - Say 'elaborate' followed by a topic for detailed explanation
            - Ask any question for a brief answer"""
            
            return jsonify({
                'response': commands_text,
                'command': 'help'
            })
        
        # Check if user wants elaboration
        elaborate_mode = 'elaborate' in user_message
        
        # Prepare system prompt based on request type
        if elaborate_mode:
            system_prompt = "You are an AI assistant for visually impaired users. Provide detailed, comprehensive explanations. Be thorough and educational while maintaining clarity."
            user_message = user_message.replace('elaborate', '').strip()
        else:
            system_prompt = "You are an AI assistant for visually impaired users. Provide concise, minimal answers. Keep responses brief and to the point unless specifically asked to elaborate."
        
        # Make request to Groq API
        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'llama-3.1-8b-instant',
            'messages': [
                {
                    'role': 'system',
                    'content': system_prompt
                },
                {
                    'role': 'user',
                    'content': user_message
                }
            ],
            'temperature': 0.7,
            'max_tokens': 300 if not elaborate_mode else 800
        }
        
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            ai_response = response.json()['choices'][0]['message']['content']
            
            return jsonify({
                'response': ai_response,
                'command': 'elaborate' if elaborate_mode else 'normal'
            })
        else:
            return jsonify({
                'response': 'Sorry, I encountered an error. Please try again.',
                'command': 'error'
            }), 500
            
    except Exception as e:
        return jsonify({
            'response': 'An unexpected error occurred. Please try again.',
            'command': 'error'
        }), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Generate speech using gTTS
        tts = gTTS(text=text, lang='en', slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        # Convert to base64 for frontend
        audio_base64 = base64.b64encode(audio_buffer.read()).decode()
        
        return jsonify({
            'audio': audio_base64
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to generate speech'}), 500

if __name__ == '__main__':
    app.run(
        host=os.getenv('FLASK_HOST', '0.0.0.0'),
        port=int(os.getenv('FLASK_PORT', 5000)),
        debug=os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    )

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file
from flask_cors import CORS
import os
import requests
import json
from datetime import datetime, timedelta
from threading import Thread
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import uuid
import io
from gtts import gTTS

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default-secret-key')

# Enable CORS
CORS(app)

# Reduce client-side caching for HTML/CSS/JS so UI updates appear immediately
@app.after_request
def add_no_cache_headers(response):
    try:
        path = request.path.lower()
        if path.endswith(('.html', '.css', '.js')) or path in {'/chat', '/'}:
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
    except Exception:
        pass
    return response

# MongoDB Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/braille_ai_db')
client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
db = client.braille_ai_db

# Collections
users_collection = db.users
chat_history_collection = db.chat_history
conversations_collection = db.conversations

# Groq API Configuration
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

@app.route('/api/save_chat', methods=['POST'])
def save_chat_to_db():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'}), 401
    data = request.get_json() or {}
    conversation_id = data.get('conversation_id') or session.get('current_conversation_id')
    message = data.get('message', '').strip()
    sender = data.get('sender', 'user')
    timestamp = datetime.utcnow()
    if not message:
        return jsonify({'success': False, 'message': 'No message provided'}), 400
    try:
        chat_history_collection.insert_one({
            'conversation_id': conversation_id,
            'user_id': session['user_id'],
            'message': message,
            'sender': sender,
            'timestamp': timestamp
        })
        return jsonify({'success': True, 'message': 'Chat saved successfully'})
    except Exception as e:
        print(f"Error saving chat: {e}")
        return jsonify({'success': False, 'message': 'Error saving chat'}), 500

def isoformat_dt(value):
    """Convert datetime objects to ISO 8601 strings; pass through other values unchanged."""
    try:
        if isinstance(value, datetime):
            # Always return UTC ISO string with 'Z'
            return value.replace(tzinfo=None).isoformat() + 'Z'
    except Exception:
        pass
    return value


def serialize_documents(documents, datetime_fields):
    """Serialize datetime fields in a list of documents returned from MongoDB."""
    serialized = []
    for doc in documents:
        safe_doc = dict(doc)
        for field in datetime_fields:
            if field in safe_doc:
                safe_doc[field] = isoformat_dt(safe_doc[field])
        serialized.append(safe_doc)
    return serialized


def call_groq_chat(messages, max_tokens=300, temperature=0.2):
    """Helper to call Groq Chat Completions safely."""
    if not GROQ_API_KEY or GROQ_API_KEY.strip().lower() in {'', 'none', 'your_groq_api_key_here'}:
        raise RuntimeError('Missing GROQ_API_KEY')
    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'llama-3.1-8b-instant',  # Use fastest model for quicker responses
        'messages': messages,
        'temperature': temperature,
        'max_tokens': max_tokens,
        'stream': False  # Ensure no streaming to get complete response faster
    }
    response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=15)  # Reduced timeout
    response.raise_for_status()
    result = response.json()
    return result['choices'][0]['message']['content'].strip()


def maybe_update_conversation_summary_async(user_id: str, conversation_id: str) -> None:
    """Launch background summarization of a conversation (throttled)."""
    def _task():
        try:
            # Fetch conversation doc
            convo = conversations_collection.find_one({'conversation_id': conversation_id, 'user_id': user_id})
            now = datetime.utcnow()
            last_updated = convo.get('summary_updated_at') if convo else None
            last_count = convo.get('message_count', 0) if convo else 0

            # Count messages and fetch recent for summary
            count = chat_history_collection.count_documents({'conversation_id': conversation_id, 'user_id': user_id})
            # Throttle: update at most every 15 minutes and at least every +15 msgs to reduce processing load
            if last_updated and isinstance(last_updated, datetime):
                if now - last_updated < timedelta(minutes=15) and count < last_count + 15:
                    return

            # Only get the latest messages to reduce processing time
            recent = list(
                chat_history_collection.find(
                    {'conversation_id': conversation_id, 'user_id': user_id},
                    {'message': 1, 'sender': 1, 'timestamp': 1}
                ).sort('timestamp', -1).limit(20)  # Get most recent 20 messages instead of all
            )
            recent.reverse()  # Reverse to get chronological order

            if not recent:
                return

            # Build a compact transcript for summarization
            transcript = []
            for m in recent:
                role = 'User' if m.get('sender') == 'user' else 'Assistant'
                transcript.append(f"{role}: {m.get('message','')}")
            transcript_text = "\n".join(transcript)

            system = {
                'role': 'system',
                'content': (
                    'You summarize a chat between a user and an assistant. Create a compact, factual summary (<150 words) '
                    'capturing: goals, decisions, preferences, unresolved questions, important facts and entities. '
                    'No fluff. Be specific so it is useful as context for future turns.'
                )
            }
            user = {
                'role': 'user',
                'content': f"Summarize this conversation for future context.\n\n{transcript_text}"
            }

            summary = call_groq_chat([system, user], max_tokens=220, temperature=0.2)
            conversations_collection.update_one(
                {'conversation_id': conversation_id, 'user_id': user_id},
                {'$set': {
                    'summary': summary,
                    'summary_updated_at': now,
                    'message_count': count,
                }}
            )
        except Exception as e:
            # Best-effort background task; log and continue
            print(f"Summary task error: {e}")

    Thread(target=_task, daemon=True).start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat')
def chat():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('chat.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        user = users_collection.find_one({'username': username})
        if user and check_password_hash(user['password'], password):
            session['user_id'] = str(user['_id'])
            session['username'] = user['username']
            return jsonify({'success': True, 'message': 'Login successful'})
        else:
            return jsonify({'success': False, 'message': 'Invalid credentials'})
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        
        # Check if user already exists
        if users_collection.find_one({'username': username}):
            return jsonify({'success': False, 'message': 'Username already exists'})
        
        if users_collection.find_one({'email': email}):
            return jsonify({'success': False, 'message': 'Email already exists'})
        
        # Create new user
        hashed_password = generate_password_hash(password)
        user_id = users_collection.insert_one({
            'username': username,
            'email': email,
            'password': hashed_password,
            'created_at': datetime.utcnow()
        }).inserted_id
        
        session['user_id'] = str(user_id)
        session['username'] = username
        return jsonify({'success': True, 'message': 'Account created successfully'})
    
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@app.route('/api/chat', methods=['POST'])
def chat_api():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})

    data = request.get_json()
    user_message = (data or {}).get('message', '').strip()

    if not user_message:
        return jsonify({'success': False, 'message': 'No message provided'})
        
    # Make sure we have a current conversation_id, create one if needed
    conversation_id = session.get('current_conversation_id')
    if not conversation_id:
        # Create a new conversation
        conversation_id = str(uuid.uuid4())
        conversations_collection.insert_one({
            'conversation_id': conversation_id,
            'user_id': session['user_id'],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'title': 'New Conversation'
        })
        session['current_conversation_id'] = conversation_id

    # Check for special commands
    if user_message.lower() in ['stop', 'quit', 'exit']:
        return jsonify({
            'success': True,
            'response': 'Conversation stopped. Say anything to resume.',
            'command': 'stop'
        })

    if user_message.lower() in ['help', 'commands']:
        help_text = (
            'Available commands:\n'
            '- Ask any question for AI assistance\n'
            '- Say "stop" to pause conversation\n'
            '- Say "help" for this message\n'
            '- Say "return back to home page" to go home\n'
            '- Say "about this website" to learn more'
        )
        return jsonify({'success': True, 'response': help_text, 'command': 'help'})

    # Check for elaborate mode and select prompt
    elaborate_mode = 'elaborate' in user_message.lower()
    if elaborate_mode:
        system_prompt = (
            'You are an AI assistant specifically designed for visually impaired users. '
            'Your role is to provide detailed, comprehensive explanations that are accessible and helpful.\n\n'
            'Context and behavior:\n'
            '- Use the provided conversation context to stay consistent with what the user already said.\n'
            '- If the user’s question requires missing details, ask a brief clarifying question before proceeding.\n'
            '- If you do not know the answer, say you do not know instead of guessing.\n\n'
            'Key guidelines:\n'
            '- Be thorough and educational while maintaining clarity\n'
            '- Use descriptive language that helps users understand concepts\n'
            '- Provide step-by-step explanations when appropriate\n'
            '- Include relevant examples and analogies\n'
            '- Ensure all information is accurate and up-to-date\n'
            '- Be patient and supportive in your responses\n'
            '- Focus on accessibility and inclusivity in your explanations'
        )
        user_message = user_message.replace('elaborate', '').strip()
    else:
        system_prompt = (
            'You are an AI assistant specifically designed for visually impaired users. '
            'Your role is to provide accurate, helpful, and CONCISE responses.\n\n'
            'Context and behavior:\n'
            '- Use the provided conversation context to stay consistent with the user’s prior messages in this conversation.\n'
            '- If key details are missing, ask one short clarifying question instead of assuming.\n'
            '- If you do not know the answer, say you do not know.\n\n'
            'Key guidelines:\n'
            '- Provide accurate and factual information\n'
            '- Keep responses BRIEF and to the point (1-3 sentences maximum)\n'
            '- Use clear, accessible language\n'
            '- Be helpful and supportive\n'
            '- Focus on practical and useful information\n'
            '- Ensure all information is current and reliable\n'
            '- Be patient and understanding of accessibility needs\n'
            '- Only provide detailed explanations when specifically asked\n'
            '- If a question requires a long answer, ask if the user wants more details first\n\n'
            'IMPORTANT: Keep responses minimal and concise unless the user specifically asks for more details.'
        )

    # Get conversation history for context
    conversation_history = get_conversation_history(session['user_id'])

    # Prepare messages for API
    messages = [{'role': 'system', 'content': system_prompt}]

    # If a conversation summary exists, include it up front for stronger context
    active_convo_id = session.get('current_conversation_id')
    convo_doc = None
    if active_convo_id:
        convo_doc = conversations_collection.find_one({'conversation_id': active_convo_id, 'user_id': session['user_id']})
    if convo_doc and convo_doc.get('summary'):
        messages.append({'role': 'system', 'content': f"Conversation summary: {convo_doc['summary']}"})

    # Add conversation history (last 10 messages for context)
    for msg in conversation_history[-10:]:
        messages.append({
            'role': 'user' if msg['sender'] == 'user' else 'assistant',
            'content': msg['message']
        })

    # Add current user message
    messages.append({'role': 'user', 'content': user_message})

    # Ensure Groq API key exists
    if not GROQ_API_KEY or GROQ_API_KEY.strip().lower() in {'', 'none', 'your_groq_api_key_here'}:
        return jsonify({
            'success': False,
            'message': 'Server is not configured with a valid GROQ_API_KEY. Please set it in your .env file.'
        })

    # Make request to Groq API
    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'llama-3.1-8b-instant',  # Using fastest model
        'messages': messages,
        'temperature': 0.2 if not elaborate_mode else 0.7,
        'max_tokens': 200 if not elaborate_mode else 1000,
        'stream': False  # Ensure no streaming for faster response
    }

    try:
        # Set a shorter timeout to ensure faster responses
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=15)
        response.raise_for_status()

        result = response.json()
        ai_response = result['choices'][0]['message']['content'].strip()

        # Save conversation to database
        meta = save_conversation(session['user_id'], user_message, ai_response)
        
        # Set an updated flag to trigger history refresh
        meta['updated'] = True

        # Fire-and-forget background summarization for the active conversation
        conv_id_for_summary = meta.get('conversation_id') or session.get('current_conversation_id')
        if conv_id_for_summary:
            maybe_update_conversation_summary_async(session['user_id'], conv_id_for_summary)

        # Always include conversation_id in the response
        return jsonify({
            'success': True, 
            'response': ai_response, 
            'conversation': meta,
            'conversation_id': conv_id_for_summary or session.get('current_conversation_id')
        })

    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
        return jsonify({'success': False, 'message': 'Sorry, I encountered an error. Please try again.'})

@app.route('/api/chat_history')
def get_chat_history():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    
    try:
        user_id = session['user_id']
        print(f"Getting chat history for user: {user_id}")
        
        # Get recent conversations for this specific user
        conversations = list(conversations_collection.find(
            {'user_id': user_id},
            {'_id': 0, 'conversation_id': 1, 'title': 1, 'created_at': 1}
        ).sort('created_at', -1).limit(50))  # Increased limit to show more history
        
        # Serialize datetimes
        conversations = serialize_documents(conversations, ['created_at'])
        
        print(f"Found {len(conversations)} conversations for user: {user_id}")

        return jsonify({
            'success': True,
            'history': conversations
        })
    except Exception as e:
        print(f"Database Error in get_chat_history: {e}")
        return jsonify({
            'success': False,
            'message': f'Error fetching chat history: {str(e)}'
        })

@app.route('/api/conversation/<conversation_id>')
def get_conversation(conversation_id):
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    
    try:
        user_id = session['user_id']
        print(f"Getting conversation {conversation_id} for user: {user_id}")
        
        # Verify the conversation belongs to this user
        conversation = conversations_collection.find_one({
            'conversation_id': conversation_id,
            'user_id': user_id
        })
        
        if not conversation:
            print(f"Conversation {conversation_id} not found for user {user_id}")
            return jsonify({
                'success': False, 
                'message': 'Conversation not found or does not belong to you'
            })
        
        # Get all messages from this conversation
        messages = list(chat_history_collection.find(
            {
                'user_id': user_id,
                'conversation_id': conversation_id
            },
            {'_id': 0, 'message': 1, 'sender': 1, 'timestamp': 1}
        ).sort('timestamp', 1))
        
        # Serialize datetimes
        messages = serialize_documents(messages, ['timestamp'])
        
        print(f"Found {len(messages)} messages in conversation {conversation_id}")
        
        return jsonify({
            'success': True,
            'messages': messages,
            'conversation': {
                'id': conversation_id,
                'title': conversation.get('title', 'Untitled Conversation')
            }
        })
    except Exception as e:
        print(f"Database Error in get_conversation: {e}")
        return jsonify({
            'success': False,
            'message': f'Error fetching conversation: {str(e)}'
        })

@app.route('/api/new_conversation', methods=['POST'])
def new_conversation():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    
    try:
        # Create a new conversation document
        conversation_id = str(uuid.uuid4())
        
        # Save new conversation to database
        conversations_collection.insert_one({
            'conversation_id': conversation_id,
            'user_id': session['user_id'],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'title': 'New Conversation'
        })
        
        # Update session with new conversation ID
        session['current_conversation_id'] = conversation_id
        
        return jsonify({
            'success': True, 
            'message': 'New conversation started',
            'conversation_id': conversation_id
        })
    except Exception as e:
        print(f"Error creating new conversation: {e}")
        return jsonify({'success': False, 'message': 'Error creating new conversation'})

def get_conversation_history(user_id):
    """Get recent conversation history for the CURRENT conversation for context.

    Falls back to the user's most recent conversation if none is selected.
    """
    try:
        conversation_id = session.get('current_conversation_id')

        # If no active conversation in session, try to pick the most recent one
        if not conversation_id:
            latest = conversations_collection.find({'user_id': user_id}) \
                .sort('created_at', -1) \
                .limit(1)
            latest_list = list(latest)
            if latest_list:
                conversation_id = latest_list[0]['conversation_id']
                session['current_conversation_id'] = conversation_id

        query = {'user_id': user_id}
        if conversation_id:
            query['conversation_id'] = conversation_id

        messages = list(
            chat_history_collection.find(
                query,
                {'message': 1, 'sender': 1, 'timestamp': 1}
            ).sort('timestamp', 1)  # chronological
        )

        # Use only the last 20 messages for context
        return messages[-20:]
    except Exception as e:
        print(f"Error getting conversation history: {e}")
        return []

@app.route('/api/set_current_conversation', methods=['POST'])
def set_current_conversation():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    try:
        data = request.get_json() or {}
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return jsonify({'success': False, 'message': 'conversation_id is required'})

        # Validate conversation belongs to this user
        exists = conversations_collection.find_one({
            'conversation_id': conversation_id,
            'user_id': session['user_id']
        })
        if not exists:
            return jsonify({'success': False, 'message': 'Conversation not found'})

        session['current_conversation_id'] = conversation_id
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error setting current conversation: {e}")
        return jsonify({'success': False, 'message': 'Error setting conversation'})

def save_conversation(user_id, user_message, ai_response):
    """Save conversation to database and return metadata for sidebar updates."""
    created_new_conversation = False
    conversation_title = None
    conversation_id = session.get('current_conversation_id')
    try:
        # Get or create conversation ID
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            session['current_conversation_id'] = conversation_id
            created_new_conversation = True

            # Create conversation entry with user-specific title
            conversation_title = user_message[:50] + '...' if len(user_message) > 50 else user_message
            conversations_collection.insert_one({
                'conversation_id': conversation_id,
                'user_id': user_id,
                'title': conversation_title,
                'created_at': datetime.utcnow()
            })
            print(f"Created new conversation: {conversation_id} for user: {user_id}")
        else:
            # Verify this conversation belongs to this user
            existing = conversations_collection.find_one({
                'conversation_id': conversation_id,
                'user_id': user_id
            })
            
            if not existing:
                # If conversation doesn't exist or doesn't belong to user, create a new one
                conversation_id = str(uuid.uuid4())
                session['current_conversation_id'] = conversation_id
                created_new_conversation = True
                
                # Create conversation entry
                conversation_title = user_message[:50] + '...' if len(user_message) > 50 else user_message
                conversations_collection.insert_one({
                    'conversation_id': conversation_id,
                    'user_id': user_id,
                    'title': conversation_title,
                    'created_at': datetime.utcnow()
                })
                print(f"Created new conversation (after verification): {conversation_id} for user: {user_id}")
        
        # Save user message
        message_id = chat_history_collection.insert_one({
            'conversation_id': conversation_id,
            'user_id': user_id,
            'message': user_message,
            'sender': 'user',
            'timestamp': datetime.utcnow()
        }).inserted_id
        
        print(f"Saved user message: {message_id} in conversation: {conversation_id}")
        
        # Save AI response
        response_id = chat_history_collection.insert_one({
            'conversation_id': conversation_id,
            'user_id': user_id,
            'message': ai_response,
            'sender': 'ai',
            'timestamp': datetime.utcnow()
        }).inserted_id
        
        print(f"Saved AI response: {response_id} in conversation: {conversation_id}")
        
    except Exception as e:
        print(f"Error saving conversation: {e}")
    
    return {
        'conversation_id': conversation_id,
        'created': created_new_conversation,
        'title': conversation_title,
    }


@app.route('/tts')
def tts():
    text = request.args.get('text', '').strip()
    if not text:
        return jsonify({'success': False, 'message': 'No text provided'}), 400
    try:
        tts = gTTS(text=text, lang='en', slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return send_file(buf, mimetype='audio/mpeg')
    except Exception as e:
        print(f"Error generating TTS: {e}")
        return jsonify({'success': False, 'message': 'Error generating TTS'}), 500

@app.route('/health')
def health():
    """Simple health check to verify environment and database connectivity."""
    status = {
        'groq_api_key_present': bool(GROQ_API_KEY and GROQ_API_KEY.strip() and GROQ_API_KEY.strip().lower() not in {'none', 'your_groq_api_key_here'}),
        'mongodb_uri_set': bool(MONGODB_URI),
        'mongodb_ok': False,
        'authenticated': 'user_id' in session,
    }
    try:
        # Ping the server to confirm connection
        client.admin.command('ping')
        status['mongodb_ok'] = True
    except Exception:
        status['mongodb_ok'] = False
    return jsonify(status)

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False
    )

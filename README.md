# OpenAI for Braille Candidates

An AI-powered chatbot designed specifically for visually impaired users with comprehensive voice navigation and accessibility features.

## 🎯 Project Overview

This innovative application provides accessible AI assistance for Braille candidates and visually impaired users through voice-controlled navigation and intelligent chat capabilities. Built with modern web technologies and designed with accessibility in mind.

## 🚀 Key Features

- **🎤 Voice Navigation**: Complete voice control for all navigation and features
- **🤖 AI Chatbot**: Powered by Groq API with Llama 3.1 model for accurate responses
- **💾 Chat History**: Persistent conversation history with MongoDB integration
- **🔐 User Authentication**: Secure login and signup system
- **📱 Responsive Design**: Works perfectly on all devices
- **♿ Accessibility**: Designed specifically for visually impaired users
- **🎯 Context Awareness**: AI remembers conversation history for better responses

## 🛠️ Technical Stack

### Backend
- **Python 3.8+**
- **Flask** - Web framework
- **MongoDB** - Database for chat history and user data
- **Groq API** - AI model integration (Llama 3.1-8b-instant)
- **Web Speech API** - Voice recognition and synthesis

### Frontend
- **HTML5/CSS3** - Modern, responsive design
- **JavaScript** - Interactive features and voice control
- **Web Speech API** - Client-side voice processing

### Deployment
- **Railway** - Easy deployment platform
- **MongoDB Atlas** - Cloud database
- **Environment Variables** - Secure configuration

## 📋 Prerequisites

- Python 3.8 or higher
- MongoDB (local or MongoDB Atlas)
- Groq API key
- Modern web browser with Web Speech API support

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd OpenAi_for_Braille_Candidates
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Groq API Key
GROQ_API_KEY=your_groq_api_key_here

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/braille_ai_db

# Flask Configuration
FLASK_SECRET_KEY=your-super-secret-key-change-this-in-production
FLASK_DEBUG=False

# Server Configuration
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
```

### 4. Database Setup
Ensure MongoDB is running locally or update the `MONGODB_URI` to point to your MongoDB Atlas cluster.

### 5. Run the Application
```bash
python main.py
```

The application will be available at `http://localhost:5000`

## 🎮 Voice Commands

### Navigation Commands
- **"OpenAI"** or **"open chat"** - Navigate to chat page
- **"return back to home page"** - Return to home page
- **"about this website"** - Navigate to about page
- **"go back to home"** - Return to home page

### Chat Commands
- **"help"** - Show available commands
- **"stop"** - Stop current conversation
- Ask any question naturally for AI assistance
- Say **"elaborate"** followed by a topic for detailed explanations

## 📁 Project Structure

```
OpenAi_for_Braille_Candidates/
├── main.py                 # Flask application and API endpoints
├── requirements.txt        # Python dependencies
├── .env                   # Environment variables (create this)
├── README.md              # Project documentation
├── static/                # Static assets
│   ├── styles.css         # Main stylesheet
│   ├── chat.css           # Chat interface styles
│   ├── chat.js            # Chat functionality
│   ├── voice-navigation.js # Voice navigation system
│   ├── favicon.ico        # Website icon
│   └── favicon.svg        # SVG icon
└── templates/             # HTML templates
    ├── index.html         # Home page
    ├── chat.html          # Chat interface
    ├── login.html         # Login page
    ├── signup.html        # Signup page
    └── about.html         # About page
```

## 🌐 Deployment

### Railway Deployment

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)

2. **Connect Repository**
   - Connect your GitHub repository to Railway

3. **Environment Variables**
   - Add the following environment variables in Railway dashboard:
     - `GROQ_API_KEY`
     - `MONGODB_URI`
     - `FLASK_SECRET_KEY`

4. **Deploy**
   - Railway will automatically detect the Python project and deploy

### MongoDB Atlas Setup

1. **Create MongoDB Atlas Account**
   - Sign up at [mongodb.com/atlas](https://mongodb.com/atlas)

2. **Create Cluster**
   - Create a free cluster

3. **Get Connection String**
   - Copy the connection string and update `MONGODB_URI` in environment variables

## 🔧 Configuration

### AI Model Configuration
The application uses the Groq API with the Llama 3.1-8b-instant model. You can modify the model parameters in `main.py`:

```python
payload = {
    'model': 'llama-3.1-8b-instant',
    'messages': messages,
    'temperature': 0.7,
    'max_tokens': 200  # Adjust for response length
}
```

### Voice Recognition Settings
Voice recognition settings can be modified in the JavaScript files:

```javascript
this.recognition.continuous = true;
this.recognition.interimResults = true;
this.recognition.lang = 'en-US';
```

## 🎯 Target Users

This application is specifically designed for:

- **Visually Impaired Users**: Complete voice navigation and control
- **Braille Candidates**: Accessible AI assistance for learning and daily tasks
- **Accessibility Advocates**: Example of inclusive technology design
- **Students and Professionals**: Quick access to AI assistance

## 🔮 Future Enhancements

- Multi-language support for voice commands
- Advanced conversation analytics
- Integration with screen readers
- Voice customization options
- Offline mode capabilities
- Advanced accessibility features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team

## 🙏 Acknowledgments

- Groq API for providing the AI model
- MongoDB for database services
- Web Speech API for voice capabilities
- Flask community for the web framework

---

**Built with ❤️ for accessibility and inclusion**

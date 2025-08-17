// Deprecated: chat history is managed inline in templates/chat.html now.

// Chat History Manager
document.addEventListener('DOMContentLoaded', function() {
    // Initialize global variable to store the active conversation ID
    window.activeConversationId = null;
    
    // Function to set the active conversation ID
    window.setActiveConversationId = function(id) {
        console.log('Setting active conversation ID:', id);
        window.activeConversationId = id;
        
        // Update active highlight in sidebar
        highlightActiveConversation(id);
        
        // Send to server
        fetch('/api/set_current_conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: id })
        }).catch(error => {
            console.error('Error setting current conversation:', error);
        });
    };
    
    // Function to highlight the active conversation in sidebar
    function highlightActiveConversation(id) {
        const items = document.querySelectorAll('.history-item');
        items.forEach(item => {
            if (item.dataset && item.dataset.conversationId === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    // Function to load a specific conversation
    window.loadConversation = function(id) {
        console.log('Loading conversation:', id);
        
        fetch(`/api/conversation/${id}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Set as active conversation
                    window.activeConversationId = id;
                    
                    // Clear the chat container
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        chatMessages.innerHTML = '';
                    }
                    
                    // Check if we have messages
                    if (data.messages && data.messages.length > 0) {
                        // Add each message to the chat
                        data.messages.forEach(msg => {
                            // Create the message element
                            const messageDiv = document.createElement('div');
                            messageDiv.className = `${msg.sender}-message`;
                            messageDiv.innerHTML = `<div class="message-content">${msg.message}</div>`;
                            
                            // Add to container
                            chatMessages.appendChild(messageDiv);
                        });
                        
                        // Scroll to bottom
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    } else {
                        // Show welcome message for empty conversations
                        chatMessages.innerHTML = `
                            <div class="welcome-message ai-message" style="align-self: flex-start; margin-right: auto; background-color: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 10px 15px;">
                                <div class="message-content">
                                    <p>👋 Welcome! I'm your AI assistant designed specifically for visually impaired users. I can help you with:</p>
                                    <ul>
                                        <li>Answering questions with concise, accurate responses</li>
                                        <li>Providing detailed explanations when you ask for more</li>
                                        <li>Helping with navigation and voice commands</li>
                                        <li>Remembering our conversation history</li>
                                    </ul>
                                    <p>Just speak naturally or type your questions. Say "help" for voice commands.</p>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Highlight in sidebar
                    highlightActiveConversation(id);
                } else {
                    console.error('Error loading conversation:', data.message);
                }
            })
            .catch(error => {
                console.error('Error loading conversation:', error);
            });
    };
    
    // Function to load chat history
    window.loadChatHistory = function() {
        console.log('Loading chat history');
        
        fetch('/api/conversations')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Get the history list container
                    const historyList = document.getElementById('chatHistoryList');
                    if (!historyList) return;
                    
                    // Clear existing history
                    historyList.innerHTML = '';
                    
                    // Check if we have conversations
                    if (data.conversations && data.conversations.length > 0) {
                        // Add each conversation to the list
                        data.conversations.forEach(conversation => {
                            // Create the history item
                            const historyItem = document.createElement('div');
                            historyItem.className = 'history-item';
                            historyItem.dataset.conversationId = conversation.conversation_id;
                            
                            // Format the title and date
                            const displayTitle = conversation.title ? 
                                (conversation.title.length > 25 ? conversation.title.substring(0, 25) + '...' : conversation.title) : 
                                'Untitled Conversation';
                            
                            const displayDate = new Date(conversation.created_at).toLocaleString();
                            
                            // Set the HTML content
                            historyItem.innerHTML = `
                                <div class="history-title">${displayTitle}</div>
                                <div class="history-date">${displayDate}</div>
                            `;
                            
                            // Add click event to load the conversation
                            historyItem.addEventListener('click', () => {
                                window.loadConversation(conversation.conversation_id);
                            });
                            
                            // Add to the list
                            historyList.appendChild(historyItem);
                        });
                        
                        // Highlight active conversation
                        highlightActiveConversation(window.activeConversationId);
                        
                        // If no active conversation, load the most recent
                        if (!window.activeConversationId && data.conversations.length > 0) {
                            window.loadConversation(data.conversations[0].conversation_id);
                        }
                    } else {
                        // No conversations - show empty state
                        historyList.innerHTML = '<div class="empty-history">No conversations yet</div>';
                        
                        // Create new conversation automatically
                        document.getElementById('newChatBtn').click();
                    }
                } else {
                    console.error('Error loading chat history:', data.message);
                }
            })
            .catch(error => {
                console.error('Error loading chat history:', error);
            });
    };
    
    // Load chat history on page load
    window.loadChatHistory();
});

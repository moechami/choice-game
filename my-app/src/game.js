const { ipcRenderer } = require('electron');
let isFirstMessage = true;

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.querySelector('button[onclick="sendMessage()"]');
    let isFirstMessage = true;  // Declare the isFirstMessage variable

    function appendMessage(message, isUser = false) {
        const messageElement = document.createElement('p');
        messageElement.innerHTML = message.replace(/\n/g, '<br>');
        messageElement.className = isUser ? 'user-message' : 'ai-message';
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
            appendMessage(message, true);
            ipcRenderer.send('send-message', message);
            userInput.value = '';
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    ipcRenderer.on('game-response', (event, response) => {
        appendMessage(response.story);
        appendMessage(response.options);
        if (isFirstMessage) {
            isFirstMessage = false;
            userInput.disabled = false;
            sendButton.disabled = false;
        }
    });

    // Start the game when the page loads
    window.onload = () => {
        userInput.disabled = true;
        sendButton.disabled = true;
        ipcRenderer.send('start-game');
    };

    // Expose sendMessage function to global scope for the onclick attribute in HTML
    window.sendMessage = sendMessage;
});

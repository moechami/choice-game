const { ipcRenderer } = require('electron');
let isFirstMessage = true;

// Load the typing sound
const typingSound = new Audio('assets/typing.mp3');
const audioClips = [
    'assets/audio1.mp3',
    'assets/audio2.mp3',
    'assets/audio3.mp3'
];

function createAudioElement(src) {
    const audio = new Audio(src);
    audio.volume = 0.05;
    return audio;
}

const audioElements = audioClips.map(createAudioElement);

// Function to play audio in sequence
function playAudioSequence(index = 0) {
    if (index >= audioElements.length) {
        index = 0; // Reset to the first audio element after the last one
    }
    const currentAudio = audioElements[index];
    currentAudio.play();
    currentAudio.onended = () => {
        playAudioSequence(index + 1); // Play the next audio in sequence when the current one ends
    };
}

window.addEventListener('load', () => {
    playAudioSequence(); // Start the audio sequence
});

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const imageContainer = document.getElementById('image-container');
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

    function appendImage(base64Image) {
        imageContainer.innerHTML = ''; // Clear any existing content
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${base64Image}`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        imageContainer.appendChild(img);
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
        // Play the typing sound
        typingSound.currentTime = 0; // Reset the sound to the beginning
        typingSound.play();

        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    ipcRenderer.on('game-response', (event, response) => {
        appendMessage(response.story);
        appendMessage(response.options);
        if (response.image) {
            appendImage(response.image);
        }
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

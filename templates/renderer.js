// Initialize variables and check for Electron
let ipcRenderer;
try {
    ipcRenderer = require('electron').ipcRenderer;
} catch (error) {
    console.warn('Electron ipcRenderer not available. Running in a non-Electron environment.');
}

// Initialize speech recognition
const recognition = 'SpeechRecognition' in window 
    ? new SpeechRecognition() 
    : new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = "en-US";

// Initialize speech synthesis
const synth = window.speechSynthesis;
let isMuted = false;
let selectedVoice = null;
let pitch = 1.0;
let rate = 1.0;
let voiceKeybind = "Shift + F1";
let muteKeybind = "Shift + F2";
let currentUtterance = null;

// Cache DOM elements for better performance
const elements = {
    userInput: document.getElementById("userInput"),
    messages: document.getElementById("messages"),
    voiceButton: document.getElementById("voiceButton"),
    muteButton: document.getElementById("muteButton"),
    settingsMenu: document.getElementById("settingsMenu"),
    helpMenu: document.getElementById("helpMenu"),
    pitchSlider: document.getElementById("pitchSlider"),
    rateSlider: document.getElementById("rateSlider"),
    voiceKeybindInput: document.getElementById("voiceKeybind"),
    muteKeybindInput: document.getElementById("muteKeybind"),
    voiceKeybindDisplay: document.getElementById("voiceKeybindDisplay"),
    muteKeybindDisplay: document.getElementById("muteKeybindDisplay")
};

// Event listeners
document.getElementById("sendButton").addEventListener("click", sendMessage);
document.getElementById("voiceButton").addEventListener("click", startSpeechRecognition);
document.getElementById("muteButton").addEventListener("click", toggleMute);
document.getElementById("settingsButton").addEventListener("click", () => toggleMenu("settingsMenu"));
document.getElementById("helpButton").addEventListener("click", () => toggleMenu("helpMenu"));
document.getElementById("testVoiceButton").addEventListener("click", testVoice);
document.getElementById("toggleThemeButton").addEventListener("click", toggleTheme);
document.getElementById("resetButton").addEventListener("click", resetToDefault);
elements.userInput.addEventListener("keypress", handleKeyPress);
elements.pitchSlider.addEventListener("input", e => pitch = parseFloat(e.target.value));
elements.rateSlider.addEventListener("input", e => rate = parseFloat(e.target.value));
elements.voiceKeybindInput.addEventListener("input", updateVoiceKeybind);
elements.muteKeybindInput.addEventListener("input", updateMuteKeybind);

// Handle keyboard shortcuts
document.addEventListener("keydown", (e) => {
    if (e.shiftKey && e.key === "F1") {
        startSpeechRecognition();
    }
    if (e.shiftKey && e.key === "F2") {
        toggleMute();
    }
});

// Setup Electron IPC listeners if available
if (ipcRenderer) {
    ipcRenderer.on('voice-input', () => {
        console.log("Voice input shortcut triggered");
        startSpeechRecognition();
    });

    ipcRenderer.on('toggle-mute', () => {
        console.log("Mute toggle shortcut triggered");
        toggleMute();
    });
}

// Initialize voices when available
synth.onvoiceschanged = setPreferredVoice;

// Initialize the UI with a welcome message
window.addEventListener('DOMContentLoaded', () => {
    addMessage("Welcome to NieraPX! How can I assist you with your gaming needs?", "bot-message");
});

// Speech recognition handlers
recognition.onresult = (event) => {
    elements.userInput.value = event.results[0][0].transcript;
    sendMessage();
};

recognition.onend = () => {
    elements.voiceButton.textContent = "Voice";
};

// Functions
function setPreferredVoice() {
    const voices = synth.getVoices();
    if (!voices.length) {
        setTimeout(setPreferredVoice, 100);
        return;
    }
    selectedVoice = voices.find(voice => 
        voice.name.includes("Google UK English Male") || 
        voice.name.includes("Google US English")
    ) || voices[0];
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

function sendMessage() {
    const message = elements.userInput.value.trim();
    if (!message) return;
    
    addMessage(message, "user-message");

    // Use a modern fetch with async/await pattern
    fetchBotResponse(message).catch(error => {
        console.error("Error:", error);
        addMessage("Failed to get a response from the server.", "bot-message");
    });

    elements.userInput.value = "";
}

async function fetchBotResponse(message) {
    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message }),
        });
        
        const data = await response.json();
        const cleanResponse = data.response.replace(/\*\*/g, "");
        addMessage(cleanResponse, "bot-message");
        
        if (!isMuted) {
            speakResponse(cleanResponse);
        }
    } catch (error) {
        throw error;
    }
}

function addMessage(text, className) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", className);
    messageElement.innerText = text;
    elements.messages.appendChild(messageElement);
    elements.messages.scrollTop = elements.messages.scrollHeight;
}

function startSpeechRecognition() {
    recognition.start();
    elements.voiceButton.textContent = "Listening...";
}

function speakResponse(text) {
    if (isMuted) return;
    synth.cancel();
    if (!selectedVoice) setPreferredVoice();

    const cleanText = text.replace(/\*\*/g, "");
    
    if (cleanText.length > 200) {
        const chunks = splitTextIntoChunks(cleanText, 200);
        speakChunks(chunks);
    } else {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.voice = selectedVoice;
        utterance.pitch = pitch;
        utterance.rate = rate;
        synth.speak(utterance);
    }
}

function splitTextIntoChunks(text, chunkSize) {
    return text.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [];
}

function speakChunks(chunks, index = 0) {
    if (index >= chunks.length) return;

    currentUtterance = new SpeechSynthesisUtterance(chunks[index]);
    currentUtterance.voice = selectedVoice;
    currentUtterance.pitch = pitch;
    currentUtterance.rate = rate;

    currentUtterance.onend = () => {
        speakChunks(chunks, index + 1);
    };

    synth.speak(currentUtterance);
}

function playArcadeBeep() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(isMuted ? 220 : 440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Lower volume

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

function toggleMute() {
    isMuted = !isMuted;
    elements.muteButton.textContent = isMuted ? "Unmute" : "Mute";
    if (isMuted) synth.cancel();
    playArcadeBeep();
}

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    const isVisible = menu.style.display === "block";
    
    // Close all menus first
    document.querySelectorAll('.menu').forEach(m => {
        m.style.display = "none";
    });
    
    // Then open the requested menu if it wasn't already open
    if (!isVisible) {
        menu.style.display = "block";
    }
}

function testVoice() {
    speakResponse("This is a test of the voice output.");
}

function toggleTheme() {
    document.body.classList.toggle("light-theme");
}

function resetToDefault() {
    pitch = 1.0;
    rate = 1.0;
    voiceKeybind = "Shift + F1";
    muteKeybind = "Shift + F2";
    elements.pitchSlider.value = pitch;
    elements.rateSlider.value = rate;
    elements.voiceKeybindInput.value = voiceKeybind;
    elements.muteKeybindInput.value = muteKeybind;
    elements.voiceKeybindDisplay.textContent = voiceKeybind;
    elements.muteKeybindDisplay.textContent = muteKeybind;
}

function updateVoiceKeybind(e) {
    voiceKeybind = e.target.value;
    elements.voiceKeybindDisplay.textContent = voiceKeybind;
}

function updateMuteKeybind(e) {
    muteKeybind = e.target.value;
    elements.muteKeybindDisplay.textContent = muteKeybind;
}
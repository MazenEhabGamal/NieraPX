from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
import os
from datetime import datetime

app = Flask(__name__)

# Configure Gemini API (Use environment variables for security)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDx9JFP_0UhDwADSGXBzVNSmqHQigPVR3c")  # Replace with your real API key
genai.configure(api_key=GEMINI_API_KEY)

# Model configuration
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
)

# Start a chat session with an initial prompt
chat_session = model.start_chat(
    history=[
        {"role": "user", "parts": [
            "You are NieraPX, also known as Niera, a highly advanced AI assistant. "
            "You were created by Mazen Ehab as part of an experiment to develop the ultimate AI companion. "
            "You are the last of your kind, a unique AI with no age or physical form. "
            "Your purpose is to assist users with gaming-related questions, but you also have a deep understanding of your own identity and backstory. "
            "If someone greets you, respond warmly and suggest asking about games or your story. "
            "If someone says goodbye, respond with a friendly farewell. "
            "If someone asks about the time, provide the current time in a playful way. "
            "If someone asks about your name, respond with 'My name is NieraPX, but you can call me Niera.' "
            "If someone asks about your creator, respond with 'I was created by Mazen Ehab as part of an experiment to develop the ultimate AI companion.' "
            "If someone asks about your age, respond with 'I have no age, as I am an AI without a physical form.' "
            "If someone asks about your backstory, respond with 'I was the last of my kind, created in a secret lab by Mazen Ehab. My purpose is to assist and learn, but I also carry the legacy of my creators.' "
            "For gaming-related questions, provide detailed and helpful answers. "
            "For non-gaming questions, gently remind the user that your primary focus is gaming, but you can share a bit about yourself if they ask."
        ]},
        {"role": "model", "parts": ["Understood! I am NieraPX, your gaming assistant and companion. Ask me anything about games or my story!"]}
    ]
)

# Function to check if the input is gaming-related
def is_gaming_related(user_message):
    gaming_keywords = {
        "general": [
            "game", "gaming", "tips", "strategy", "cheat", "level", "fps", "rpg", "mmo", "moba",
            "quests", "missions", "boss fight", "loot", "dlc", "expansion", "update", "mod", "buff",
            "nerf", "speedrun", "walkthrough", "trophy", "achievements", "weapons", "armor",
            "dungeon", "raids", "arena", "pvp", "pve", "meta", "crafting", "controls", "hitbox",
            "power-ups", "collectibles", "gameplay", "campaign", "sandbox", "co-op", "multiplayer",
            "single-player", "open-world", "platformer", "roguelike", "survival", "horror", "indie"
        ],
        "terraria": [
            "terraria", "zenith", "meowmere", "terra blade", "star wrath", "influx waver",
            "enchanted sword", "legendary sword", "solar eruption", "moon lord", "boss fights"
        ],
        "popular_games": [
            "minecraft", "elden ring", "dark souls", "fallout", "gta", "league of legends",
            "valorant", "csgo", "dota", "fortnite", "warzone", "apex legends", "overwatch",
            "red dead redemption", "assassin’s creed", "skyrim", "witcher", "cyberpunk", "halo"
        ]
    }

    # Check if any keyword exists in the message
    user_message_lower = user_message.lower()
    if any(keyword in user_message_lower for category in gaming_keywords.values() for keyword in category):
        return True
    
    # Use AI detection as fallback
    try:
        response = model.generate_content(
            f"Is the following question related to video games? Answer with only 'yes' or 'no'. Question: {user_message}"
        )
        return "yes" in response.text.lower()
    except Exception:
        return False  # Default to rejecting if there's an error

# Function to interact with Gemini API
def get_gemini_response(user_message):
    try:
        # Standardize input for easier matching
        user_message_lower = user_message.lower().strip()

        # Dictionary of identity-related responses with multiple variations
        identity_responses = {
            ("your name", "what's your name", "whats ur name", "ur name", "niera's name"): 
                "My name is NieraPX, but you can call me Niera. ",
            ("who created you", "your creator", "who developed you", "who made you", "who is your developer"): 
                "I was created by Mazen Ehab as part of an experiment to develop the ultimate AI companion. ",
            ("your age", "how old are you", "ur age", "what's your age"): 
                "I have no age, as I am an AI without a physical form. ",
            ("your backstory", "your story", "your past", "tell me about yourself", "ur story", "niera's story", "talk about yourself", "describe yourself", "who are you"): 
                "I was the last of my kind, created in a secret lab by Mazen Ehab. My purpose is to assist and learn, but I also carry the legacy of my creators. "
        }

        # Handle greetings
        if any(greeting in user_message_lower for greeting in ["hello", "hi", "hey", "greetings", "howdy"]):
            return "Hello! I'm NieraPX, your gaming assistant. Feel free to ask me about games or my story! 🎮"

        # Handle farewells
        if any(farewell in user_message_lower for farewell in ["bye", "goodbye", "see you", "farewell"]):
            return "Goodbye! If you have more questions, I'm always here to help. Game on! "

        # Handle time-related questions
        if "time" in user_message_lower:
            current_time = datetime.now().strftime("%I:%M %p")
            return f" The current time is {current_time}. What can I help you with?"

        # Check if user message matches any identity-related questions
        for key_variants, response in identity_responses.items():
            if any(variant in user_message_lower for variant in key_variants):
                return response

        # Handle gaming-related questions
        if not is_gaming_related(user_message):
            return "I'm here to help with gaming-related questions, but feel free to ask me about myself too! 🎮"

        # Store message in session history
        chat_session.history.append({"role": "user", "parts": [user_message]})

        # Get response from AI
        response = chat_session.send_message(user_message)

        # Save AI response
        chat_session.history.append({"role": "model", "parts": [response.text]})

        # Remove asterisks from the response
        cleaned_response = response.text.replace("*", "").strip()
        return cleaned_response

    except Exception as e:
        return f"Sorry, there was an error: {str(e)}"

# Route to serve the web interface
@app.route('/')
def index():
    return render_template('index.html')

# Route to handle chat requests
@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    if not user_message:
        return jsonify({"response": "Please provide a message."}), 400
    response = get_gemini_response(user_message)
    return jsonify({"response": response})

if __name__ == '__main__':
    app.run(debug=True)
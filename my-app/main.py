from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_community.chat_message_histories import CassandraChatMessageHistory
from langchain.prompts import PromptTemplate
from langchain_openai import OpenAI
from langchain.memory import ConversationBufferMemory
from langchain_core.output_parsers import StrOutputParser
from io import BytesIO
from dotenv import load_dotenv
import openai
import base64
import requests
import json
import re
import os

app = Flask(__name__)
CORS(app)

load_dotenv()

# Load secrets
with open("choice-game-token.json") as f:
    secrets = json.load(f)

# Cassandra and OpenAI configuration
cloud_config = {
    'secure_connect_bundle': 'secure-connect-choice-game.zip'
}
CLIENT_ID = secrets["clientId"]
CLIENT_SECRET = secrets["secret"]
ASTRA_DB_KEYSPACE = "choice"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

auth_provider = PlainTextAuthProvider(CLIENT_ID, CLIENT_SECRET)
cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
session = cluster.connect()

# Initialize message history
message_history = CassandraChatMessageHistory(
    session_id="choice_session",
    session=session,
    keyspace=ASTRA_DB_KEYSPACE,
    ttl_seconds=3600
)

class GameState:
    def __init__(self):
        self.health = 100
        self.inventory = []
        self.relationships = {}
        self.key_decisions = {}

game_state = GameState()

def update_game_state(choice):
    # Simple logic to update game state based on player's choice
    lower_choice = choice.lower()
    if "fight" in lower_choice or "attack" in lower_choice:
        game_state.health -= 10  # Fighting reduces health
    elif "run" in lower_choice or "flee" in lower_choice:
        game_state.health -= 5  # Running away reduces less health
    elif "heal" in lower_choice:
        game_state.health += 20  # Healing increases health
        game_state.health = min(game_state.health, 100)  # Cap health at 100

    # Update inventory based on keywords
    if "pick up" in lower_choice or "take" in lower_choice:
        item = re.search(r"pick up|take\s+(\w+)", lower_choice)
        if item:
            game_state.inventory.append(item.group(1))
    elif "drop" in lower_choice:
        item = re.search(r"drop\s+(\w+)", lower_choice)
        if item and item.group(1) in game_state.inventory:
            game_state.inventory.remove(item.group(1))

def extract_state_changes(story):
    # Extract state changes from the AI's response
    changes = []

    # Check for health changes
    health_change = re.search(r"Health (increased|decreased) by (\d+)", story)
    if health_change:
        change_type = 1 if health_change.group(1) == "increased" else -1
        changes.append({
            'type': 'health',
            'value': change_type * int(health_change.group(2))
        })

    # Check for inventory changes
    item_added = re.search(r"Added (\w+) to inventory", story)
    if item_added:
        changes.append({
            'type': 'inventory',
            'action': 'add',
            'item': item_added.group(1)
        })

    item_removed = re.search(r"Removed (\w+) from inventory", story)
    if item_removed:
        changes.append({
            'type': 'inventory',
            'action': 'remove',
            'item': item_removed.group(1)
        })

    return changes

def process_ai_response(response):
    parts = response.split("Options:")
    story = parts[0].strip()
    options = "Options:" + parts[1] if len(parts) > 1 else ""
    state_changes = extract_state_changes(story)
    return story, options, state_changes

def apply_state_changes(state_changes):
    for change in state_changes:
        if change['type'] == 'health':
            game_state.health += change['value']
            game_state.health = max(0, min(game_state.health, 100))  # Ensure health is between 0 and 100
        elif change['type'] == 'inventory':
            if change['action'] == 'add':
                game_state.inventory.append(change['item'])
            elif change['action'] == 'remove' and change['item'] in game_state.inventory:
                game_state.inventory.remove(change['item'])

def check_game_over():
    if game_state.health <= 0:
        return True, "Your health has dropped to zero. Game Over."
    return False, ""

# Instantiate the OpenAI client
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

def generate_image_dalle(prompt):
    try:
        # Append the required terms to the prompt
        enhanced_prompt = f"{prompt}, pixel art, retro, pixel, pixelart-hard"
        response = openai_client.images.generate(
            model="dall-e-3",
            prompt=enhanced_prompt,
            n=1,
            size="1792x1024"
        )
        image_url = response.data[0].url

        # Download the image
        image_response = requests.get(image_url)
        if (image_response.status_code == 200):
            # Convert the image to base64
            image_data = BytesIO(image_response.content)
            base64_image = base64.b64encode(image_data.getvalue()).decode('utf-8')
            return base64_image
        else:
            print(f"Failed to download image: {image_response.status_code}")
            return None
    except Exception as e:
        print(f"Error generating image: {str(e)}")
        return None

def generate_image_prompt(story):
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an AI assistant that creates concise, vivid image prompts based on story descriptions."},
                {"role": "user", "content": f"Create a brief, vivid image prompt based on this story segment: {story}"}
            ],
            max_tokens=50
        )
        # Append the required terms to the prompt
        image_prompt = f"{response.choices[0].message.content.strip()}, pixel art, retro, pixel, pixelart-hard"
        return image_prompt
    except Exception as e:
        print(f"Error generating image prompt: {str(e)}")
        return None


template = """
You are an AI storyteller creating an immersive, challenging, and branching text-based game. The story follows as is: Inspired by "Life of Pi" by Yann Martel:

    Prompt: After a shipwreck, the protagonist finds themselves stranded on a lifeboat with a Bengal tiger. As they struggle for survival in the vast ocean, they form an unlikely bond with the tiger, delving into themes of faith, hope, and the will to live.

Current game state:
Health: {health}
Inventory: {inventory}
Relationships: {relationships}
Key Decisions: {key_decisions}

Rules and guidelines:
1. Create a rich, atmospheric narrative with detailed descriptions.
2. Introduce complex moral choices and dilemmas.
3. Implement a system of cause and effect based on the current game state.
4. Include various paths to success, but make them challenging and dependent on previous choices.
5. If the player makes reckless decisions, allow for negative outcomes including injury or game over scenarios.
6. Introduce elements of mystery, suspense, and occasional age-appropriate horror.
7. Be consistent with the game state and respect previous decisions.
8. Present the story and options in the following format:

[Your story continuation here]

Options:
A: [Specific choice]
B: [Specific choice]
C: [Specific choice]
D: Your choice (specify your action)

Important:
- Certain player actions should have significant consequences.
- If the player makes reckless decisions, allow for negative outcomes including injury or game over scenarios.
- Maintain internal consistency with the game state and previous decisions.
- Create branching narratives based on key decisions.
- Introduce challenges that require specific inventory items or relationship statuses to overcome.
- When describing health changes, use the format "Health increased/decreased by [amount]".
- When describing inventory changes, use the format "Added [item] to inventory" or "Removed [item] from inventory".

Chat history: {chat_history}
User's latest input: {user_input}

AI: Based on the, the current game state, and the story so far, provide a unique and immersive continuation of the story, followed by four options in the format specified above. Ensure that the story and options are consistent with the game state and previous decisions. Also be sure that if the player makes reckless decisions, you allow for negative outcomes including injury or game over scenarios.
"""

# Create the prompt
prompt = PromptTemplate(
    input_variables=["chat_history", "user_input", "health", "inventory", "relationships", "key_decisions"],
    template=template
)

# Initialize the LLM with the API key
llm = OpenAI(openai_api_key=OPENAI_API_KEY, max_tokens=1000)

def initialize_game():
    global chain, cass_buff_memory, game_state
    message_history.clear()
    cass_buff_memory = ConversationBufferMemory(
        memory_key="chat_history",
        chat_memory=message_history
    )
    chain = prompt | llm | StrOutputParser()
    game_state = GameState()  # Reset game state

@app.route('/start_game', methods=['GET'])
def start_game():
    initialize_game()
    initial_prompt = "Start the game by setting the scene and providing context for the story. Do not include any user input or choices yet."
    response = chain.invoke({
        "chat_history": "",
        "user_input": initial_prompt,
        "health": game_state.health,
        "inventory": game_state.inventory,
        "relationships": game_state.relationships,
        "key_decisions": game_state.key_decisions
    })
    story = response.strip()

    image_prompt = generate_image_prompt(story)
    image = generate_image_dalle(image_prompt) if image_prompt else None

    return jsonify({
        "story": story,
        "options": "What would you like to do? (Type your action or choice)",
        "image": image
    })

@app.route('/send_message', methods=['POST'])
def send_message():
    choice = request.json['message']
    memory_variables = cass_buff_memory.load_memory_variables({})
    chat_history = memory_variables.get("chat_history", "")

    update_game_state(choice)

    is_game_over, game_over_message = check_game_over()
    if is_game_over:
        return jsonify({"story": game_over_message, "options": "Game Over. Would you like to start a new game?", "game_over": True})

    response = chain.invoke({
        "chat_history": chat_history,
        "user_input": choice,
        "health": game_state.health,
        "inventory": game_state.inventory,
        "relationships": game_state.relationships,
        "key_decisions": game_state.key_decisions
    })

    story, options, state_changes = process_ai_response(response)
    apply_state_changes(state_changes)

    cass_buff_memory.save_context({"input": choice}, {"output": story})

    image_prompt = generate_image_prompt(story)
    image = generate_image_dalle(image_prompt) if image_prompt else None

    return jsonify({
        "story": story,
        "options": options,
        "image": image,
        "game_state": {
            "health": game_state.health,
            "inventory": game_state.inventory,
            "relationships": game_state.relationships,
            "key_decisions": game_state.key_decisions
        }
    })

if __name__ == '__main__':
    app.run(port=5000)

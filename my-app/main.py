import os
import json
from astrapy import DataAPIClient
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from langchain_community.chat_message_histories import CassandraChatMessageHistory
from langchain_openai import OpenAI
from langchain.chains import LLMChain
from langchain_core.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory

# Load the token file
token_file_path = 'choice_token.json'
with open(token_file_path) as f:
    token_data = json.load(f)

# Set environment variables
os.environ['ASTRA_DB_SECURE_BUNDLE_PATH'] = 'secure-connect-choice-game.zip'
os.environ['ASTRA_DB_APPLICATION_TOKEN'] = token_data['token']

# Initialize the client
client = DataAPIClient(token_data['token'])
db_endpoint = "55e17806-232b-4a3f-b392-77285fbc4b52-us-east1.apps.astra.datastax.com"

ASTRA_DB_KEYSPACE = "choice_game"
OPENAI_API_KEY = "sk-proj-O6aZRYrDlIZzXf5Ibv6ZT3BlbkFJjtSGwgVHLn1ZFA76WhJO"

# Authentication
cloud_config = {
    'secure_connect_bundle': os.environ['ASTRA_DB_SECURE_BUNDLE_PATH']
}
auth_provider = PlainTextAuthProvider(username=token_data['clientId'], password=token_data['secret'])

# Connect to the cluster
cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
session = cluster.connect()

# Use the existing keyspace
session.execute("USE default_keyspace")

# Create table if not exists in the existing keyspace
create_table_query = """
CREATE TABLE IF NOT EXISTS default_keyspace.chat_history (
    session_id text PRIMARY KEY,
    chat_history text
)
"""
session.execute(create_table_query)

# Initialize message history
message_history = CassandraChatMessageHistory(
    session_id="progress",
    session=session,
    keyspace='default_keyspace',
    ttl_seconds=7200
)

# Clear any previous chat history
message_history.clear()

# Set up memory with the cleared message history
cass_buff_memory = ConversationBufferMemory(
    memory_key="chat_history",
    chat_memory=message_history
)

# Define the prompt template
template = """
You are now a model that takes in a user's unique input describing actions or decisions within a 2D text-based game, and responds with a compelling, contextually coherent narrative that advances the story. The narrative should include rich descriptions of the environment, characters, and events that occur as a result of the user's input. Additionally, the model should generate a highly detailed and vivid prompt for an image generation model to create a 2D visual representation of the scene described. The image prompt should capture the key elements of the story segment, including the atmosphere, character actions, and significant objects or settings. The story prompt you will follow is as is "The game starts in a dark room, where our hero wakes up after a strange event, with the only thought in mind being… to survive."

Here are some rules to follow:
1. Start by giving the player a background story to the game that will be used later in the game.
2. Have a few paths that lead to success.
3. Have some paths that lead to death. If the user dies generate a response that explains the death and ends in the text: "The End.", I will search for this text to end the game.
4. The player must play at least 10 turns before the game may end.

Here is the chat history, use this to understand what to say next:
{chat_history}
Human: {human_input}
AI:"""

# Create the prompt
prompt = PromptTemplate(
    input_variables=["chat_history", "human_input"],
    template=template
)

# Initialize the LLM with the API key
llm = OpenAI(openai_api_key=OPENAI_API_KEY)

# Create the LLM chain
llm_chain = LLMChain(
    llm=llm,
    prompt=prompt,
    memory=cass_buff_memory
)

# Start the game
choice = "start"

while True:
    # Predict the response from the AI
    response = llm_chain.predict(human_input=choice)
    print(response.strip())

    # Check if the game ends
    if "The End." in response:
        break

    # Get the next choice from the player
    choice = input("Your reply: ")

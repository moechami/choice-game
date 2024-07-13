from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from langchain_community.chat_message_histories import CassandraChatMessageHistory
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import OpenAI
from langchain.memory import ConversationBufferMemory
import json

cloud_config = {
    'secure_connect_bundle': 'secure-connect-choice-game.zip'
}

with open("choice-game-token.json") as f:
    secrets = json.load(f)

CLIENT_ID = secrets["clientId"]
CLIENT_SECRET = secrets["secret"]
ASTRA_DB_KEYSPACE = "choice"
OPENAI_API_KEY = "sk-proj-3EgJJ000nZ6N2yomnXWFT3BlbkFJAuvMz8n8OSldJHwHSICb"

auth_provider = PlainTextAuthProvider(CLIENT_ID, CLIENT_SECRET)
cluster = Cluster(cloud=cloud_config, auth_provider=auth_provider)
session = cluster.connect()

message_history = CassandraChatMessageHistory(
    session_id="choice session",
    session=session,
    keyspace=ASTRA_DB_KEYSPACE,
    ttl_seconds=3600
)

message_history.clear()

cass_buff_memory = ConversationBufferMemory(
    memory_key="chat_history",
    chat_memory=message_history
)

template = """
You are now a model that takes in a user's unique input describing actions or decisions within a 2D text-based game, and responds with a compelling, contextually coherent narrative that advances the story. The narrative should include rich descriptions of the environment, characters, and events that occur as a result of the user's input. Here is a general story prompt you can follow: The protagonist is an eight-year-old boy who, upon waking one night, realizes he's completely alone at home. He decides to uncover what happened to his family, but in the darkness, everything looks different…

Here are some rules to follow:
1. Start by asking the player to choose some kind of weapons that will be used later in the game. Then wait for the users input to move forward
2. Have a few paths that lead to success
3. Have some paths that lead to death. If the user dies generate a response that explains the death and ends in the text: "The End.", I will search for this text to end the game

Here is the chat history, use this to understand what to say next: {chat_history}
User: {user_input}
AI:"""

prompt = PromptTemplate(
    input_variables=["chat_history", "user_input"],
    template=template
)

llm = OpenAI(openai_api_key=OPENAI_API_KEY)
llm_chain = LLMChain(
    llm=llm,
    prompt=prompt,
    memory=cass_buff_memory
)

choice = "start"

while True:
    response = llm_chain.predict(user_input=choice)
    print(response.strip())

    if "The End." in response:
        break

    choice = input("Your reply: ")

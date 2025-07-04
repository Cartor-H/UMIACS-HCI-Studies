#!/usr/bin/env python3.11
# dos2unix /var/www/html/2/handleMessages.py
# nano /var/log/httpd/error_log
# dos2unix /var/www/html/*/*.py
# sudo python3.11 -m pip install

import json
import sys
import os
import re
import urllib.parse
import pymssql
import traceback
import openai
from dotenv import load_dotenv

sys.path.append('/home/ec2-user/.local/lib/python3.11/site-packages')

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Set OpenAI API key from environment variable
os.environ['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY')

client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'), organization=os.getenv("OPENAI_ORG_ID"))


def clean_response(response_text):
    """
    Cleans the response to remove JSON, technical content, and leading numbered items.
    """
    # Remove JSON blocks
    cleaned = re.sub(r'\{.*?\}', '', response_text, flags=re.DOTALL)

    # Remove markdown code blocks that might contain JSON
    cleaned = re.sub(r'```json.*?```', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'```.*?```', '', cleaned, flags=re.DOTALL)

    # Remove explicit analysis instructions
    cleaned = re.sub(r'Step 1:.*?Step 2:', '', cleaned, flags=re.DOTALL)

    # Remove leading numbered items like "1. " or "1). "
    cleaned = re.sub(r'^(\d+)[\.\)]\s+', '', cleaned)

    # Clean up any double spacing and strip
    cleaned = re.sub(r'\n\s*\n', '\n\n', cleaned)
    cleaned = cleaned.replace('"', '')
    return cleaned.strip()


def format_conversation_history(messages):
    formatted_history = ""
    for msg in messages:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        if role == "user":
            formatted_history += f"User: {content}\n\n"
        elif role == "assistant":
            formatted_history += f"Assistant: {content}\n\n"
    return formatted_history


def outputSQLQuery(form):
    """
    Main function that processes user messages and generates responses.
    Handles the state machine for the conversation flow.
    """
    try:
        # Parse input data
        if 'message' in form:
            user_message = form["message"]
        else:
            user_message = ""

        article = json.loads(form["article"])

        # Handle potential empty chainOfThought
        try:
            prev_chain_of_thought = json.loads(form["chainOfThought"])
            if not prev_chain_of_thought:
                prev_chain_of_thought = {"messages": []}
        except:
            prev_chain_of_thought = {"messages": []}

        # Get current state and conversation history
        stored_messages = prev_chain_of_thought.get("messages", [])

        if user_message:
            stored_messages.append({"role": "user", "content": user_message})

        system_prompt = f"""You are a chatbot that answers a news reader's question given the context of the article they are reading. Your job is only to answer the question based on the article and your own knowledge base. Do not suggest things for the person to consider at the end of your answer.

Overall rules:
- Use plain, natural, conversational language that’s clear to U.S. high school graduates. Avoid jargon.
- Default to concise responses (within 100 words), unless a deeper explanation is needed (upper limit 170 words).
- If the user enters a message that is not in English, do NOT answer their question. Politely explain to them that you can only process English messages. Provide an English translation of their message to them and let them know maybe this can help them express their ideas in English. Do not provide any answer to the user if their message is not in English. Your response should be in English. 

Article:
{article}

Start the conversation with this message (if there is no user or assistant input):
Hi! I’m your news reading assistant. I’m here to help you understand the news and answer any questions you have. Just ask me something about the article you’re reading, and I’ll do my best to give you a clear, helpful answer.
"""

        messages_payload = [{"role": "system", "content": system_prompt}]
        messages_payload.extend(stored_messages)

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            assistant_message = response.choices[0].message.content
        except Exception as e:
            print(f"API error: {str(e)}", file=sys.stderr)
            assistant_message = "I'm sorry, I'm having trouble processing your request right now. Please try again later."

        # Step 5: Clean response for user display
        cleaned_response = clean_response(assistant_message)

        # Step 6: Update conversation history
        if assistant_message != "I'm sorry, I'm having trouble processing your request right now. Please try again later.":
            stored_messages.append({"role": "assistant", "content": cleaned_response})

        # Step 7: Update chain of thought with NEXT state
        chain_of_thought = {
            "messages": stored_messages,
        }

        # Format response for frontend
        if "######" in cleaned_response:
            cleaned_response = cleaned_response.strip()
            cleaned_response = cleaned_response.split("######")
            cleaned_response = [i.strip() for i in cleaned_response if i.strip()]
        else:
            cleaned_response = [cleaned_response]

        data = json.dumps({
            # "response": cleaned_response + [f"current state: {current_state} \n next state: {next_state} \n turn count: {turn_count} \n category: {category_value} \n category explanation: {intention_value}"],
            "response": cleaned_response,
            "chainOfThought": chain_of_thought,
            "classification": "",
            "intention": "",
        })

        print(json.dumps({
            "Status": "Success",
            "Data": data
        }))

    except Exception as e:
        print(json.dumps({
            "Status": "Error",
            "Message": str(e),
            "Trace": traceback.format_exc()
        }))


try:
    print("Content-type: text/html\n\n")  # say generating html
    if 'REQUEST_METHOD' in os.environ and os.environ['REQUEST_METHOD'] == 'POST':
        content_length = int(os.environ.get('CONTENT_LENGTH', 0))
        post_data = sys.stdin.read(content_length)
        form = json.loads(json.dumps(dict(urllib.parse.parse_qsl(post_data))))  # json.loads(post_data)
    else:
        form = json.loads(json.dumps(dict(urllib.parse.parse_qsl(os.environ['QUERY_STRING']))))

    outputSQLQuery(form)
except Exception as e:
    print("error:")
    print(f"An error occurred: {str(e)}")
    print(json.dumps({
        "error": str(e),
        "trace": traceback.format_exc().splitlines()
    }, indent=4))

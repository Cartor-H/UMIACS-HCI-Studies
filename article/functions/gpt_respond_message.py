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

client = openai.OpenAI()


def is_classification_only_state(state):
    """
    Determines if a state is only for classification and doesn't need to generate a response.
    """
    classification_only_states = ["User_Question_Processing"]
    return state in classification_only_states


def extract_thought_analysis(response_text):
    """
    Extracts thought analysis JSON from the response if present.
    """
    try:
        # Look for JSON in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            thought_analysis = json.loads(json_str)

            # Check if it has the expected keys for a thought analysis
            expected_keys = ["thought", "information", "assumptions", "pov"]
            if any(key in thought_analysis for key in expected_keys):
                return thought_analysis
    except:
        pass

    return None


def clean_response(response_text):
    """
    Cleans the response to remove JSON and other technical content.
    """
    # Remove JSON blocks
    cleaned = re.sub(r'\{.*?\}', '', response_text, flags=re.DOTALL)

    # Remove markdown code blocks that might contain JSON
    cleaned = re.sub(r'```json.*?```', '', cleaned, flags=re.DOTALL)
    cleaned = re.sub(r'```.*?```', '', cleaned, flags=re.DOTALL)

    # Remove explicit analysis instructions
    cleaned = re.sub(r'Step 1:.*?Step 2:', '', cleaned, flags=re.DOTALL)

    # Clean up any double spacing and strip
    cleaned = re.sub(r'\n\s*\n', '\n\n', cleaned)
    return cleaned.strip()


def generate_prompt_for_state(state, user_message, article, prev_chain_of_thought, stored_messages,
                              classification_result=None):
    """
    Generates the appropriate prompt based on the current state.
    """
    article_context = f"""
NEWS ARTICLE TITLE: {article["Title"]}

NEWS ARTICLE CONTENT: {article["Content"]}
    """

    conversation_context = ""
    if stored_messages:
        conversation_context = f"""
Conversation history:
{format_conversation_history(stored_messages)}
        """

    if state == "beginning":
        return f"""You are a news reading assistant. Your goal is to discuss news content with a user to guide them critically engage with the news content and generate takeaways. You will be answering the user's question and also ask follow-up questions to them to explore their thinking process together. Use plain English that can be easily understood by high-school graduates. When asking questions to the user, ask gently and politely, do NOT pressure users to answer your questions. Unless the instructions are provided to you in direct quotation, you should adapt the instruction to fit the context of the news article and your conversation with the user. Avoid repeating the same questions to the user, paraphrase if you are asking similar follow-up questions throughout the conversation.

{article_context}

Start the conversation with this message:
Hi! I am a chatbot and I'm here to can help you explore and understand the content of this news article. Let me know what you would like to start with:
1. Explain the meaning of words to you.
2. Summarize the content for you.
3. Discuss the news content with you.
"""

    elif state == "Waiting_User_Input":
        return f"""You are a news reading assistant helping a user engage with a news article.

{article_context}
{conversation_context}

The user has just said: "{user_message}"

I've already classified this as a {classification_result} type message.

Provide a helpful response based on this message type:
- If coordination: Acknowledge and ask what they'd like to discuss about the article.
- If conversation end: Thank them and let them know they can return to resume the discussion.

Your response should be conversational and encouraging further engagement with the article.
"""

    elif state == "Chatbot_Follow-up":
        return f"""The user has shared a statement with you and it does not have a clear question or request for you to provide a direct response. To continue the conversation, you will guide the user to elaborate on their thought to move the conversation forward.

{article_context}
{conversation_context}

User's statement: "{user_message}"

Determine which type of statement this is and respond accordingly:
- If about the user themselves (interests, background): Thank them for sharing and ask if there's anything they'd like to discuss with two example questions.
- If a comment or personal opinion about the article: Acknowledge their opinion and ask what makes them think this way.
- If referring to specific content without personal opinion: Ask if they'd like to know anything about this text.
- If not relevant to the person or article: Politely explain you don't understand and ask them to rephrase.
"""

    elif state == "User_Literal_Question":
        category = prev_chain_of_thought.get('category', classification_result.get('category', 1))
        return f"""The user has asked a question about literal meaning or summarization of the article. 

{article_context}
{conversation_context}

User's question: "{user_message}"

Category: {category} (1=word explanation, 2=summary)

1. Provide a clear, informative answer to the user's question.
2. Then, ask if they are interested in discussing the news content further, suggesting possible topics from the article they might want to explore.
"""

    elif state == "User_Factual_Question":
        return f"""The user has asked for factual information related to the news article.

{article_context}
{conversation_context}

User's question: "{user_message}"

1. Provide an accurate answer based on the article's content. If the information isn't in the article, acknowledge this limitation.
2. Specify whether your information comes from the article itself or general knowledge.
3. Ask what prompted their interest in this information - how it relates to broader topics in the article or to their personal interests.
"""

    elif state == "User_Interpretive_Question":
        return f"""The user has asked a question that requires interpretation of the news content.

{article_context}
{conversation_context}

User's question: "{user_message}"

Please follow these steps in your response:

1. First, develop your thought in these areas (for your own thinking):
   - Thought: Form an opinion, analysis, or interpretation responding to the user's question
   - Information: Identify factual information from the article that supports your thought
   - Assumptions: Recognize assumptions underlying your thought
   - PoV: Consider the perspective you're taking

2. In your response to the user:
   - Share only your thought and the supporting information
   - Ask if this thought makes sense to them
   - Offer to explore additional information or alternative perspectives

Your response should be thoughtful but conversational, inviting further discussion rather than presenting a definitive answer.
"""

    elif state == "Waiting_User_Response_to_Thought":
        thought_analysis = prev_chain_of_thought.get('thought_analysis', {})
        thought_json = json.dumps(thought_analysis) if thought_analysis else "No previous thought analysis available"

        return f"""You've shared a thought with the user about the news article, and they've responded.

{article_context}
{conversation_context}

Your previous thought analysis: {thought_json}

User's response: "{user_message}"

I've classified their response as: {classification_result}

Based on this classification, respond accordingly:
- If agreement: Either conclude if you've covered both additional info and alternative thoughts, or offer to explore uncovered aspects.
- If disagreement: Ask what makes them disagree and offer to explore alternative perspectives.
- If request for information: Provide relevant information, update your thought, and check if it makes sense.
- If new facts: Acknowledge their input, update your thought incorporating their information, and check if it makes sense.
- If personal thought: Compare your thought with theirs, highlighting differences in information, assumptions, and perspective.
- If alternative perspectives: Explain assumptions underlying the current thought and how changing them affects the conclusion.
- If new point-of-view: Consider what information would be relevant from this new perspective and share an updated thought.

Your response should maintain the conversational flow while deepening the analysis.
"""

    else:
        # Default prompt for any unhandled state
        return f"""You are a news reading assistant helping a user engage with a news article.

{article_context}
{conversation_context}

User's message: "{user_message}"

Provide a helpful response to continue the conversation.
"""


def determine_next_state(current_state, classification_result):
    """
    Determines the next state based on current state and classification result.
    """
    if current_state == "beginning":
        return "Waiting_User_Input"

    elif current_state == "Waiting_User_Input":
        if classification_result == "question_or_interest":
            return "User_Question_Processing"
        elif classification_result == "statement":
            return "Chatbot_Follow-up"
        elif classification_result == "coordination":
            return "Waiting_User_Input"
        elif classification_result == "conversation_end":
            return "Conversation_End"
        else:
            return "Waiting_User_Input"

    elif current_state == "User_Question_Processing":
        category = classification_result.get("category", 4)
        if category in [1, 2]:
            return "User_Literal_Question"
        elif category == 4:
            return "User_Factual_Question"
        elif category in [3, 5, 6]:
            return "User_Interpretive_Question"
        else:
            return "Waiting_User_Input"

    elif current_state == "User_Literal_Question":
        return "Waiting_User_Input"

    elif current_state == "User_Factual_Question":
        return "Waiting_User_Input"

    elif current_state == "User_Interpretive_Question":
        return "Waiting_User_Response_to_Thought"

    elif current_state == "Waiting_User_Response_to_Thought":
        if classification_result == "subject_change":
            return "Waiting_User_Input"
        elif classification_result == "done":
            return "Waiting_User_Input"
        else:
            return "Waiting_User_Response_to_Thought"

    elif current_state == "Chatbot_Follow-up":
        return "Waiting_User_Input"

    elif current_state == "Conversation_End":
        return "beginning"

    else:
        return "Waiting_User_Input"  # Default fallback


def classify_user_message(user_message, article, state):
    """
    Classifies user messages for internal state transitions.
    Uses a lighter-weight model for classification tasks.
    """
    classification_prompt = ""

    if state == "Waiting_User_Input":
        # Classify message type: question, statement, coordination, or conversation end
        classification_prompt = f"""
        Classify this user message about a news article into one of these categories:
        - "question_or_interest": a question or expression of interest to discuss content
        - "statement": a statement without a clear question or request
        - "coordination": coordination messages like greetings or acknowledgments
        - "conversation_end": indication that the user has finished the discussion

        NEWS ARTICLE TITLE: {article["Title"]}
        USER MESSAGE: "{user_message}"

        RESPOND WITH ONLY ONE WORD: "question_or_interest", "statement", "coordination", or "conversation_end"
        """
    elif state == "User_Question_Processing":
        # Classify question type into categories 1-6
        classification_prompt = f"""
        Classify this user question about a news article by determining these variables:

        A: Is about word explanation? (1=yes, 0=no)
        B: Is about text summary? (1=yes, 0=no)
        C: Is about factual information with definite answers? (1=yes, 0=no)
        D: Is about interpretation? (0=no, 1=mentioned in article, 2=extended from article)
        E: Is about potential action to be taken? (1=yes, 0=no)

        NEWS ARTICLE TITLE: {article["Title"]}
        USER QUESTION: "{user_message}"

        Determine category:
        - If A=1: Category=1
        - Elif B=1: Category=2
        - Elif E=1: Category=6
        - Elif D=1: Category=3
        - Elif D=2: Category=5
        - Elif C=1: Category=4
        - Else: Choose closest category

        RESPOND WITH JSON ONLY: {"A": 0 or 1, "B": 0 or 1, "C": 0 or 1, "D": 0 or 1 or 2, "E": 0 or 1, "category": 1-6}
        """
    elif state == "Waiting_User_Response_to_Thought":
        # Classify response to a thought
        classification_prompt = f"""
        Classify this user response to a previously shared thought:

        Determine which type:
        - "agreement": User agrees with the thought
        - "disagreement": User disagrees or is uncertain
        - "request_info": User asked for more information
        - "new_facts": User pointed to different factual information
        - "personal_thought": User shared their own thought
        - "alt_perspectives": User asked to explore alternative perspectives
        - "new_pov": User shared a new point-of-view to explore
        - "subject_change": User changed the subject
        - "done": User is done with this question

        USER RESPONSE: "{user_message}"

        RESPOND WITH ONLY ONE WORD from the options above.
        """

    if classification_prompt:
        try:
            # Use GPT-3.5 for classification to optimize cost/performance
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": classification_prompt}],
                max_tokens=100
            )
            result = response.choices[0].message.content.strip()

            # If expecting JSON, try to parse it
            if state == "User_Question_Processing":
                try:
                    # Extract JSON if embedded in text
                    json_match = re.search(r'\{.*\}', result, re.DOTALL)
                    if json_match:
                        result = json.loads(json_match.group(0))
                    else:
                        # Default if no JSON found
                        result = {"category": 4}  # Default to factual question
                except:
                    result = {"category": 4}  # Default to factual question

            return result
        except Exception as e:
            print(f"Classification error: {str(e)}", file=sys.stderr)
            # Default fallbacks based on state
            if state == "Waiting_User_Input":
                return "question_or_interest"
            elif state == "User_Question_Processing":
                return {"category": 4}
            elif state == "Waiting_User_Response_to_Thought":
                return "agreement"

    return None


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
        user_message = form["message"]
        article = json.loads(form["article"])

        # Handle potential empty chainOfThought
        try:
            prev_chain_of_thought = json.loads(form["chainOfThought"])
            if not prev_chain_of_thought:
                prev_chain_of_thought = {"state": "beginning", "messages": []}
        except:
            prev_chain_of_thought = {"state": "beginning", "messages": []}

        # Get current state and conversation history
        current_state = prev_chain_of_thought.get("state", "beginning")
        stored_messages = prev_chain_of_thought.get("messages", [])

        if current_state != "beginning":
            stored_messages.append({"role": "user", "content": user_message})

        # Step 1: Process current state
        classification_result = None

        if is_classification_only_state(current_state):
            # For classification-only states, just classify and move to next state
            if current_state == "User_Question_Processing":
                classification_result = classify_user_message(user_message, article, current_state)

            # Determine next state based on classification
            next_state = determine_next_state(current_state, classification_result)

            # For classification-only states, we'll generate a response based on the next state
            prompt = generate_prompt_for_state(
                next_state,
                user_message,
                article,
                prev_chain_of_thought,
                stored_messages,
                classification_result
            )
        else:
            # For response states, classify if needed
            if current_state in ["Waiting_User_Input", "Waiting_User_Response_to_Thought"]:
                classification_result = classify_user_message(user_message, article, current_state)

            next_state = determine_next_state(current_state, classification_result)

            # Generate prompt based on CURRENT state for response states
            prompt = generate_prompt_for_state(
                current_state,
                user_message,
                article,
                prev_chain_of_thought,
                stored_messages,
                classification_result
            )

        # Step 4: Get response from ChatGPT
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
            next_state = current_state  # Maintain current state on error

        # Step 3: Extract thought analysis if applicable
        if current_state == "User_Interpretive_Question" or next_state == "User_Interpretive_Question":
            thought_analysis = extract_thought_analysis(assistant_message)
            if thought_analysis:
                prev_chain_of_thought["thought_analysis"] = thought_analysis

        # Step 4: Clean response for user display
        cleaned_response = clean_response(assistant_message)

        # Step 5: Update conversation history
        stored_messages.append({"role": "assistant", "content": cleaned_response})


        # Get category from classification or previous state
        category = None
        if current_state == "User_Question_Processing" and isinstance(classification_result, dict):
            category = classification_result.get("category")
        elif "category" in prev_chain_of_thought:
            category = prev_chain_of_thought["category"]

        # Step 7: Update chain of thought with NEXT state
        chain_of_thought = {
            "state": next_state,
            "messages": stored_messages
        }

        # Add category if available
        if category is not None:
            chain_of_thought["category"] = category

        # Preserve thought analysis if present
        if "thought_analysis" in prev_chain_of_thought:
            chain_of_thought["thought_analysis"] = prev_chain_of_thought["thought_analysis"]

        # Format category for frontend
        category_value = str(category) if category is not None else ""

        # Step 9: Return response
        data = json.dumps({
            "response": cleaned_response,
            "chainOfThought": chain_of_thought,
            "classification": category_value
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
    print("{error:")
    print(f"An error occurred: {str(e)}")
    print(json.dumps({
        "error": str(e),
        "trace": traceback.format_exc().splitlines()
    }, indent=4))

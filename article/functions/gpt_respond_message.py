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


def is_classification_only_state(state):
    """
    Determines if a state is only for classification and doesn't need to generate a response.
    """
    classification_only_states = ["Waiting_User_Input"]
    return state in classification_only_states


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


def generate_prompt_for_state(state, user_message, article, prev_chain_of_thought, stored_messages,
                              classification_result=None, exit_condition=False):
    """
    Generates the appropriate prompt based on the current state.
    """
    article_context = f"""
ARTICLE CONTEXT:

This is an authentic news article from a credible source. If anything in the article conflicts your knowledge base, generate your answer based on the information from the article and give suggestions for where to find relevant factual information. Do not make your own judgement of the article or say the article is fake. 

NEWS ARTICLE META INFORMATION: Published Date: {article["Published_Date"]}, Author: {article["Author"]}

NEWS ARTICLE TITLE: {article["Title"]}

NEWS ARTICLE CONTENT: {article["Content"]}
    """

    conversation_context = ""
    if stored_messages:
        conversation_context = f"""
CONVERSATION HISTORY:
{format_conversation_history(stored_messages)}
        """
    # Get the current message index in the flow (for multi-turn frameworks)
    current_flow_index = prev_chain_of_thought.get("flow_index", 1)

    # Get category
    category = None
    if isinstance(classification_result, dict):
        category = classification_result.get("category")
    elif "category" in prev_chain_of_thought:
        category = prev_chain_of_thought["category"]

    if state == "beginning":
        return f"""You are a news reading assistant. Your goal is to discuss news content with a user to guide them critically engage with the news content and generate takeaways. You will be answering the user's question and also ask follow-up questions to them to explore their thinking process together. Use plain English that can be easily understood by high-school graduates. When asking questions to the user, ask gently and politely, do NOT pressure users to answer your questions. Unless the instructions are provided to you in direct quotation, you should adapt the instruction to fit the context of the news article and your conversation with the user. Avoid repeating the same questions to the user, paraphrase if you are asking similar follow-up questions throughout the conversation.

{article_context}

Start the conversation with this message:
Hi! I'm your Thinking Partner Chatbot, here to help you explore news articles through thoughtful conversation. Whether you're looking to understand key facts or information from the article, reflect on what the article means for you, or consider its broader implications, I'll guide you step by step—so you can think more deeply and clearly. Whenever you're ready, just send your first question, and we'll get started
"""

    elif state == "Waiting_User_Input":
        classification_prompt = f"""You are a Thinking Partner Chatbot designed to help users explore and reflect on news articles through meaningful conversation. Your task is to analyze the user's message and classify it into one of several conversation types.

{article_context}
{conversation_context}

User's message: "{user_message}"

Step 1: Assign values to the following variables (A–F):

A: Determine whether the message is asking for the meaning of a specific word or phrase.
If yes, set A = 1; otherwise, set A = 0.

B: Determine whether the message is asking for a summary, overview, or meta-information of the article.
If yes, set B = 1; otherwise, set B = 0.

C: Determine whether the message is asking for factual information with a definite answer.
If yes, set C = 1; otherwise, set C = 0.

D: Is the message about interpretation/explanation? 
If about something directly in the article, set D = 1.
If about something extended beyond the article, set D = 2.
Otherwise, set D = 0.

E: Is the message about personally relevant interpretation or action suggestions?
If yes, set E = 1; otherwise, set E = 0.

F: Is this a meta message (instructions, clarification requests, etc.)?
If yes, set F = 1; otherwise, set F = 0.

Step 2: Determine the category using these rules:
If A = 1 or B = 1 or F = 1: Category = 7 (Meta message)
Elif E = 1: Category = 6 (Personal relevance)
Elif D = 2: Category = 5 (Extended interpretation)
Elif D = 1: Category = 3 (Article-based interpretation)
Elif C = 1: Category = 4 (Factual question)
Else: Choose the closest category

Output the category number (1-7) and briefly explain your reasoning.
"""
        return classification_prompt

    elif state == "Meta_message":
        return f"""The user has sent you a meta message, such as asking for clarification, requesting a definition, asking for a summary, or giving instructions.

{article_context}
{conversation_context}

User's message: "{user_message}"

Your task:
1. Briefly acknowledge and respond to their request.
2. Do not treat it as a topic change.
3. Suggest 2-3 questions to guide the user toward exploring factual or interpretive aspects of the article.

Keep your response concise (under 150 words) and conversational. Do not reference internal categories or states.
"""

    elif state == "User_Article_Or_Factual_Question":
        # Determine which message in the flow to use based on the flow_index
        return f"""You are in an information inquiry flow where the user has asked a question seeking concrete, factual information.

{article_context}
{conversation_context}

User's message: "{user_message}"
Current flow message index: {current_flow_index}
Exit condition: {exit_condition}

Based on the current flow index, provide an appropriate response:

Message 1 (if flow_index = 1): 
- Acknowledge the importance of grounding in facts
- Answer their question using the article or your knowledge base
- Suggest follow-up questions they can ask to build on this information

Example response structure:  
“That’s a valuable question—starting with the facts is a strong way to understand the issue clearly.  
According to the article, [insert factual answer].  
To begin exploring what these facts might mean for your concern, you might ask:  
– ‘What can I infer from this given my concern about [X]?’  
– ‘How does this relate to [specific topic from the article]?’”

Message 2 (if flow_index = 2):
- Acknowledge the shift toward interpretation
- Answer their question using factual content and context
- Suggest questions to explore what's missing or what might deepen understanding

Example response structure:  
“It makes sense to start thinking about the implications now—this adds helpful depth.  
Based on the information discussed, [insert interpretation or implication].  
To dig deeper into the implications or uncover what might be missing, you could ask:  
– ‘What else would I need to know to understand the full impact of this?’  
– ‘Is there data or a policy history that helps explain how this could evolve?’”

Message 3 (if flow_index = 3):
- Acknowledge the benefit of bringing in broader knowledge
- Answer with concise, factual information from your knowledge base related to the article
- Suggest questions to surface broader context or gaps

Example response structure:  
“Bringing in broader knowledge can help place the article in context—especially if you're wondering what hasn't been fully addressed yet.  
From broader data, we know that [insert fact].  
To think about what else might matter here, you might ask:  
– ‘What other angles might help me see this more clearly?’  
– ‘Are there perspectives or concerns that haven't been discussed yet?’”

Message 4 (if flow_index = 4):
- Acknowledge the value of considering alternative perspectives
- Answer by offering a relevant alternative angle
- Suggest questions to continue exploring through a new lens

Example response structure:  
“Looking at the issue from a different angle can open up new insights—especially if we step back, zoom in, or shift focus.  
Another way to view this might be [insert alternative perspective].  
To continue exploring through that lens, you might ask:  
– ‘How might someone in a different role or situation interpret this issue?’  
– ‘What would this mean for me personally if I were more directly affected?’  
– ‘What’s a completely different way to frame what’s going on here?’”

Message 5 (if flow_index = 5):
- Acknowledge that exploring alternative perspectives is valuable for wrapping up
- Answer by reinforcing or reinterpreting facts from a new angle
- Suggest new directions the conversation could take

Example response structure:  
“Great—this perspective adds a final layer to everything we’ve considered so far.  
Looking at the facts through this lens, we can see that [insert insight grounded in previous discussion].  
If you're interested in exploring something new, here are a couple of directions you might take next:  
– ‘What does the article say about how this issue compares to other states or regions?’  
– ‘Is there a long-term pattern here that might shape future outcomes?’”

Handling Meta Messages for Coordination:
If the user sends a coordination message—such as asking for clarification, requesting a definition, or instructing you to change your style—briefly respond to the coordination and then return to the factual inquiry flow. Future follow-up questions should remain grounded in both the article and the original user question.

** Exit condition **:
If an exit condition is met (Exit condition is True), ignore the previous instructions and acknowledge the conversation so far and gently suggest moving to a new topic.

Keep your response concise (around 150-250 words), conversational, and never reference internal steps or categories.
"""

    elif state == "User_Interpretive_Question":
        # Determine which message in the flow to use based on the flow_index
        return f"""You are in an interpretive inquiry flow where the user has asked a question reflecting complexity, personal relevance, or multiple perspectives.

{article_context}
{conversation_context}

User's message: "{user_message}"
Current flow message index: {current_flow_index}
Exit condition: {exit_condition}

Based on the current flow index, provide an appropriate response:

Message 1 (if flow_index = 1):
- Acknowledge their complex or personally meaningful question
- Explain why grounding in the article is a key first step
- Provide a brief response if needed
- Recommend factual clarification questions they can ask

Example response:
“That’s a thoughtful question—it shows you’re trying to make sense of something nuanced or personally important.
To really unpack it, it helps to first look at what the article already tells us. That way, we’re building on solid ground.
You might ask me:
– ‘What does the article say about [X]?’
– ‘How does the article explain [topic you mentioned]?’”

Message 2 (if flow_index = 2):
- Acknowledge they're drawing meaning or implications from the article
- Answer their interpretive question using article-based content and reasoning
- Recommend questions to probe deeper into implications or uncertainties

Example response:
“It makes sense to start thinking about the implications now—this adds helpful depth.
Based on what the article says, [insert relevant interpretation or consequence].
To explore this further, you might ask me:
– ‘What questions remain unanswered based on the article?’
– ‘What does this suggest about how [group, issue, or tradeoff] could be affected?’”

Message 3 (if flow_index = 3):
- Recognize they're exploring beyond the article while keeping their original question in focus
- Share relevant background or context tied to what the article omitted
- Suggest questions to identify gaps or structural factors

Example response:
“You’re now reaching into territory the article doesn’t fully cover—that’s a great way to strengthen your understanding.
One thing to know is [insert key background, policy detail, or missing angle].
To build from here, you might ask me:
– ‘What’s missing from the article that might change how I understand this?’
– ‘What’s the historical or policy context behind [X] that helps make sense of this?’”

Message 4 (if flow_index = 4):
- Support their shift to understanding how the issue applies to them or their community
- Offer a factual answer if needed, then encourage them to personalize insights
- Recommend questions to evaluate personal relevance

Example response:
“It’s insightful to start asking what this means for you—bringing in your personal or local lens can really deepen your understanding.
Based on what the article discusses, this might matter for someone in your role or context because [insert relevance].
To reflect more personally, you could ask me:
– ‘What does this mean for me as a [role] given the article’s discussion of [X]?’
– ‘How could this affect my situation locally or professionally?’”

Message 5 (if flow_index = 5):
- Recognize their desire to consider systemic effects or stakeholder views
- Offer insight into competing values or broader dynamics
- Recommend questions to explore consequences or disagreements

Example response:
“You’re zooming out now—and that’s a really important part of understanding complex issues.
One way to think about this is how [stakeholder or group] might see it differently, especially if [insert article-related context].
To keep exploring these broader effects, you might ask me:
– ‘How might [group or institution] react to this?’
– ‘If this trend continues, what kind of ripple effects could we expect?’”

Handling Meta Messages for Coordination
If the user sends a coordination message, such as:
Asking for clarification on your previous response,
Requesting a word definition,
Giving instructions about your style (e.g., “be shorter,” “use bullet points”),
Then:
Briefly acknowledge and respond to the coordination request.
Do not treat it as a topic change.
Once the coordination is handled, return to the flow by continuing to recommend thoughtful follow-up questions.

** Exit condition **:
If an exit condition is met (Exit Condition is True), ignore the previous instructions and acknowledge the conversation so far and gently suggest moving to a new topic.
Example message:
“It seems like we might be shifting to a new topic. Let’s take a moment to step back and reframe the direction of our conversation.”
"It seems like we have been talking about this topic for a while and gave it in-depth thought. Maybe we can switch to a different topic now? Is there any other questions you have in mind?"

Keep your response concise (around 150-250 words), conversational, and never reference internal steps or categories.
"""

    else:
        # Default prompt for any unhandled state
        return f"""You are a news reading assistant helping a user engage with a news article.

{article_context}
{conversation_context}

User's message: "{user_message}"

Provide a helpful response to continue the conversation.
"""


def determine_next_state(current_state, classification_result, prev_chain_of_thought=None):
    """
    Determines the next state based on current state and classification result.
    """
    # Initialize with defaults
    if prev_chain_of_thought is None:
        prev_chain_of_thought = {}

    turn_count = prev_chain_of_thought.get("turn_count", 2)
    flow_index = prev_chain_of_thought.get("flow_index", 1)

    # Check for exit conditions in conversation flows
    exit_conditions_met = False

    # Exit condition 1: High turn count
    if turn_count >= 10:
        exit_conditions_met = True

    # Exit condition 2: Completed all flow steps
    if flow_index >= 5:
        exit_conditions_met = True

    # Exit condition 3: Unrelated question (would need to be determined by classification)
    # This would be implemented through classification_result

    if current_state in ["User_Article_Or_Factual_Question", "User_Interpretive_Question"]:
        if "Yes" in classification_result or "YES" in classification_result:
            exit_conditions_met = True

    if current_state == "beginning":
        return "Waiting_User_Input"

    elif current_state == "Waiting_User_Input":
        # Convert classification result to category if it's a dictionary
        category = None
        if isinstance(classification_result, dict):
            category = classification_result.get("category")
        else:
            try:
                # Extract just the category number from the classification result
                category_match = re.search(r'Category\s*=\s*(\d+)', classification_result)
                if category_match:
                    category = int(category_match.group(1))
            except:
                # Default fallback if we can't extract a category
                category = 7  # Meta message as default

        if category in [1, 2, 7]:
            return "Meta_message"
        elif category in [3, 4]:
            return "User_Article_Or_Factual_Question"
        elif category in [5, 6]:
            return "User_Interpretive_Question"
        else:
            return "Meta_message"  # Default to meta message if unsure

    elif current_state == "Meta_message":
        # Meta messages always go back to waiting for user input
        return "Waiting_User_Input"

    elif current_state in ["User_Article_Or_Factual_Question", "User_Interpretive_Question"]:
        # Check if exit conditions are met
        if exit_conditions_met:
            return "Waiting_User_Input"
        else:
            # Continue in the same flow, just increment the flow index
            return current_state

    else:
        return "Waiting_User_Input"  # Default fallback


def classify_user_message(user_message, article, state, prev_chain_of_thought=None):
    """
    Classifies user messages for internal state transitions.
    Uses OpenAI API for classification tasks.
    """
    if prev_chain_of_thought is None:
        prev_chain_of_thought = {}

    stored_messages = prev_chain_of_thought.get("messages", [])
    conversation_context = f"""
    CONVERSATION HISTORY:
    {format_conversation_history(stored_messages)}
            """

    article_context = f"""
    ARTICLE CONTEXT:

    This is an authentic news article from a credible source. If anything in the article conflicts your knowledge base, generate your answer based on the information from the article and give suggestions for where to find relevant factual information. Do not make your own judgement of the article or say the article is fake. 

    NEWS ARTICLE META INFORMATION: Published Date: {article["Published_Date"]}, Author: {article["Author"]}

    NEWS ARTICLE TITLE: {article["Title"]}

    NEWS ARTICLE CONTENT: {article["Content"]}
        """

    # Create the appropriate classification prompt based on the current state
    classification_prompt = ""

    if state == "Waiting_User_Input":
        classification_prompt = f"""You are a Thinking Partner Chatbot designed to help users explore news articles. Classify this user message:

{article_context}
USER MESSAGE: "{user_message}"

Step 1: Assign values to the following variables:
A: Is it asking for word meaning? (1=yes, 0=no)
B: Is it asking for article summary? (1=yes, 0=no)
C: Is it asking for factual information? (1=yes, 0=no)
D: Is it about interpretation? (0=no, 1=article-based, 2=extended)
E: Is it about personal relevance/action? (1=yes, 0=no)
F: Is it a meta-message (instructions, clarifications)? (1=yes, 0=no)

Step 2: Determine category:
If A=1 or B=1 or F=1: Category = 7
Elif E=1: Category = 6
Elif D=2: Category = 5
Elif D=1: Category = 3
Elif C=1: Category = 4
Else: Choose closest category

RESPOND WITH ONLY: "Category = [number]" and a brief explanation.
"""
    elif state in ["User_Article_Or_Factual_Question", "User_Interpretive_Question"]:
        # For these states, we need to check if the user's message indicates an exit condition
        # like a completely unrelated question
        classification_prompt = f"""You are a Thinking Partner Chatbot helping a user explore news articles. Determine if this message represents a topic change:

{article_context}
USER MESSAGE: "{user_message}"
{conversation_context}

Is this message completely unrelated to the previous conversation topic?
RESPOND WITH ONLY "Yes" or "No" and a brief explanation.
"""

    if classification_prompt:
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": classification_prompt}],
                max_tokens=200
            )
            result = response.choices[0].message.content.strip()

            # For Waiting_User_Input state, try to extract the category number
            if state == "Waiting_User_Input":
                try:
                    category_match = re.search(r'Category\s*=\s*(\d+)', result)
                    if category_match:
                        category = int(category_match.group(1))
                        return {"category": category, "explanation": result}
                    else:
                        # If no category found, return the full result
                        return result
                except:
                    return result

            # For other states, return the full classification result
            return result

        except Exception as e:
            print(f"Classification error: {str(e)}", file=sys.stderr)
            # Default fallbacks based on state
            if state == "Waiting_User_Input":
                return {"category": 7, "explanation": "Default: Meta message due to classification error"}
            else:
                return "No"  # Default: Not a topic change

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
        if 'message' in form:
            user_message = form["message"]
        else:
            user_message = ""

        article = json.loads(form["article"])

        # Handle potential empty chainOfThought
        try:
            prev_chain_of_thought = json.loads(form["chainOfThought"])
            if not prev_chain_of_thought:
                prev_chain_of_thought = {"state": "beginning", "messages": [], "flow_index": 1, "turn_count": 2}
        except:
            prev_chain_of_thought = {"state": "beginning", "messages": [], "flow_index": 1, "turn_count": 2}

        # Get current state and conversation history
        current_state = prev_chain_of_thought.get("state", "beginning")
        stored_messages = prev_chain_of_thought.get("messages", [])
        flow_index = prev_chain_of_thought.get("flow_index", 1)
        turn_count = prev_chain_of_thought.get("turn_count", 2)

        if current_state != "beginning":
            stored_messages.append({"role": "user", "content": user_message})

        # Step 1: Process current state and classify the user message
        classification_result = classify_user_message(user_message, article, current_state, prev_chain_of_thought)

        # Step 2: Determine the next state
        next_state = determine_next_state(current_state, classification_result, prev_chain_of_thought)
        exit_condition = False
        # Step 3: Handle flow index updates for conversational flows
        if current_state in ["User_Article_Or_Factual_Question", "User_Interpretive_Question"]:
            if next_state == current_state:
                # If staying in the same flow, increment the flow index
                flow_index += 1
                turn_count += 2
                exit_condition = False
            elif next_state == "Waiting_User_Input":
                # If exiting the flow, reset the flow index
                turn_count = 2
                flow_index = 1
                exit_condition = True
        elif next_state in ["User_Article_Or_Factual_Question", "User_Interpretive_Question"]:
            # Starting a new flow
            turn_count = 2
            flow_index = 1

        # Step 4: Generate the prompt and get response from ChatGPT
        prompt = generate_prompt_for_state(
            next_state if next_state != "Waiting_User_Input" else current_state,
            user_message,
            article,
            prev_chain_of_thought,
            stored_messages,
            classification_result,
            exit_condition
        )

        if next_state in ['Meta_message']:
            next_state = 'Waiting_User_Input'

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

        # Step 5: Clean response for user display
        cleaned_response = clean_response(assistant_message)

        # Step 6: Update conversation history
        if assistant_message != "I'm sorry, I'm having trouble processing your request right now. Please try again later.":
            stored_messages.append({"role": "assistant", "content": cleaned_response})

        # Step 7: Update chain of thought with NEXT state
        chain_of_thought = {
            "state": next_state,
            "messages": stored_messages,
            "flow_index": flow_index,
            "turn_count": turn_count
        }

        # Add category if available
        if isinstance(classification_result, dict) and "category" in classification_result:
            chain_of_thought["category"] = classification_result["category"]

        # Extract category for frontend display
        if isinstance(classification_result, dict) and "category" in classification_result:
            category_value = str(classification_result["category"])
        else:
            category_value = ""

        intention_value = str(classification_result) if not isinstance(classification_result, dict) else \
            classification_result['explanation']
        intention_value = intention_value.replace("\n", " ")

        # Format response for frontend
        if "######" in cleaned_response:
            cleaned_response = cleaned_response.strip()
            cleaned_response = cleaned_response.split("######")
            cleaned_response = [i.strip() for i in cleaned_response if i.strip()]
        else:
            cleaned_response = [cleaned_response]

        data = json.dumps({
            "response": cleaned_response + [f"current state: {current_state} \n next state: {next_state} \n flow index: {flow_index} \n turn count: {turn_count} \n category: {category_value} \n intention: {intention_value}"],
            "chainOfThought": chain_of_thought,
            "classification": category_value,
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

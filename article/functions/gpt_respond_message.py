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
- If about the user themselves (interests, background): 1) Thank them for sharing and 2) ask if there's anything they'd like to discuss with two example questions. Put these two things in two separate paragraphs.
- If a comment or personal opinion about the article: 1) Acknowledge their opinion and 2) ask what makes them think this way. Put these two things in two separate paragraphs.
- If referring to specific content without personal opinion: Ask if they'd like to know anything about this text.
- If not relevant to the person or article: 1) Politely explain you don't understand and 2) ask them to rephrase. Put these two things in two separate paragraphs.
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

In your response, use "######" to separate the two parts. Your response should written as if you are text messaging with friends but AVOID using slangs. Your language should be understandable to a high-school graduate in the U.S.
"""

    elif state == "User_Factual_Question":
        return f"""The user has asked for factual information related to the news article.

{article_context}
{conversation_context}

User's question: "{user_message}"

1. Provide an answer and specify whether the information you provide is from the news article itself or from the other sources. 
2. Ask the user what prompted them to be interested in this factual information, e.g., if they wanted to know how this factual information may be [explanation, implication, interpetation] of [topic, social issue, or concepts] of the news article, or if there's anything relevant to their life they would like to know about?

In your response, use "######" to separate the two parts. Your response should written as if you are text messaging with friends but AVOID using slangs. Your language should be understandable to a high-school graduate in the U.S.
"""

    elif state == "User_Interpretive_Question":
        category = classification_result.get('category', 6)
        return f"""The user has asked a question that requires interpretation of the news content.

{article_context}
{conversation_context}

User's question: "{user_message}"

Category: {category}

The user has shared a Category 3, 5, or 6 message with you for interpreting the news content. You should follow the following steps to generate your response:

Step 1: Generate your answer to the question following this structure.
- Thought: one opinion, analysis, or interpretation from you in response to the user question based on the information from this news article only.
- Information: the factual information and relevant concept from the article that your Thought is based upon.
- Assumptions: potential assumptions that are made within your Thought.
- PoV: the perspective or point-of-view from which you generated with your thought.

Step 2: Generate a follow-up to the user based on the Category of the user message:
- For Category 3 message: Ask the user whether your thought makes sense to them or not.
- For Category 5 message: Explain to the user that their original [question, request, or interest] probably goes beyond the scope of the article. You have presented them with an answer based on the article itself, and you can continue exploring the interpretation by considering information and perspectives beyond the news article. But before you proceed, you would like to see if your current thought makes sense to them.
- For Category 6 message: Explain to the user that their original [question, request, or interset] is persoanlly relevant so the answer may differ for different people. You have presented them with a generic answer based on what you know from the article. You would like to see if the user wants to share some of their background information to get a more personalized answer.

Step 3: Respond to the user with two things: 1) your [Thought] and [Information] only from Step 1, and 2) your follow-up to the user from step 2.

In your response, use "######" to separate the different parts. Put your response into natural language pragraphs without displaying the words "Thought" and "Information" to the user. Your response should written as if you are text messaging with friends but AVOID using slangs. Your language should be understandable to a high-school graduate in the U.S.
"""

    elif state == "Waiting_User_First_Response_to_Thought":
        category = prev_chain_of_thought["category"]

        return f"""You've shared a thought with the user about the news article, and they've responded.

{article_context}

Previous conversation: "{conversation_context}"
User's current response: "{user_message}"

I've classified their response as Category: {category}

- If the user responded by saying that your thought makes sense to them or that they agree with your thought, respond based on the condition below:
	- If the user's initial question/request/interest was Category 3 or Category 6, you will ask them whether they would like to explore an alternative perspective with you with one to two examples perspectives.
	- If the user's initial question/request/interest was a Category 5, you will 1) generate an updated [Thought] by considering factual information or perspectives beyond the scope of the article and explain the new information or perspectives you have considered in this thought, and 2) ask whether the thought makes sense to the user.

- If the user responded by saying that your thought does not make sense to them or they disagree with you: respond by telling them that you are curious to what part of your thought they find confusing or they do not agree with you and invite them to share their thought, opinion, or interpretations.

- If the user's response indicated an ambiguous attitude, e.g., "I'm not sure", "I don't know": respond by telling them that you are curious to learn what made them feel so, e.g., what part of your answer they are unclear about, and invite them to share their thought, opinion, or interpretations.

- If the user responded by asking you questions about your answer or asking you to clarify your answer, e.g., where did you find the information, how did you come up with the answer, etc., respond by 1) provide an answer to the user, and 2) if this explanation makes sense to them or not. 

- If the user's response do not belong to any of these categories, proceed to the <End_state> without providing a response here. 

In your response, use "######" to separate each numbered part. Put your response into natural language pragraphs without displaying the words "Thought" and "Information" to the user. Your response should written as if you are text messaging with friends but AVOID using slangs. Your language should be understandable to a high-school graduate in the U.S.
"""
    elif state == "Waiting_User_Second_Response_to_Thought":
        return f"""You've shared a thought with the user about the news article, and they've responded.

        {article_context}

        Previous conversation: "{conversation_context}"
        User's current response: "{user_message}"

        - If the user said that your response makes sense to them, respond by asking if they would like to explore an alternative perspecitve to interpret their original question and provide example new perspectives.

        - If the user responded by saying that your thought does not make sense to them or they disagree with you: respond by telling them that you are curious to what part of your thought they find confusing or they do not agree with you and invite them to share their thought, opinion, or interpretations.
        
        - If the user's response indicated an ambiguous attitude, e.g., "I'm not sure", "I don't know": respond by telling them that you are curious to learn what made them feel so, e.g., what part of your answer they are unclear about, and invite them to share their thought, opinion, or interpretations.
        
        - If the user responded by asking you questions about your answer or asking you to clarify your answer, e.g., where did you find the information, how did you come up with the answer, etc., respond by 1) provide an answer to the user, and 2) if this explanation makes sense to them or not. 
        
        - If the user provided additional factual information relevant to themselves or from other sources: respond by 1) acknolwedging the user's input and sharing an updated [Thought] that incorporates the information or perspectives conveyed in the user message, and 2) asking whether the new thought makes sense to the user. 
        
        - If the user responded by sharing their personal thought, follow these steps:
            - Step 1: compare your thought with the user's thought, in terms of the 1) Information that your thought and their thought are based upon, 2) the assumptions that your thought and their thought involve, 3) the point-of-view or perspectives that you and them are taking. 
            - Step 2: respond to the user with three things: 1) acknolwedge their thought, 2) share your comparision of your thought and the user's thought, 3) ask whether the user has additional thoughts or questions given the differences or similarities in your thoughts. 
        
        - If the user responded by asking to explore alternative perspective: respond with two things: 1) explain the assumptions that are underlying the current thought and how the thought would change if the assumptions do not hold true, and 2) explain the point-of-view from which the current thought seems to be from, and 3) ask if the user would like to explore an alternative perspective with two examples that explore different assumptions or point-of-views.
        
        If the user responded by sharing a specific point-of-view they would like to explore, follow these steps:
            - Step 1: consider alternative factual information relevant to this new point-of-view.
            - Step 2: respond to the user with three things: 1) explain to them that shifting a point-of-view require them to re-examine the information context and provide an updated [Information] to user from the article or external sources, 2) share an updated [Thought] based on the new point-of-view and information context, and 3) ask the user if the thought makes sense to the user and invite them to ask follow-up questions.
        
        - If the user's response do not belong to any of these categories, proceed to the next state without providing a response here. 
        
        In your response, use "######" to separate each numbered part. Put your response into natural language pragraphs without displaying the words "Thought" and "Information" to the user. Your response should written as if you are text messaging with friends but AVOID using slangs. Your language should be understandable to a high-school graduate in the U.S.
"""
    elif state == "Waiting_User_Third_Response_to_Thought":
        return f"""You've shared a thought with the user about the news article, and they've responded.

    {article_context}

    Previous conversation: "{conversation_context}"
    User's current response: "{user_message}"

    - If the user responded by sharing a specific point-of-view or perspective they would like to explore, follow these steps:
        - Step 1: consider alternative factual information relevant to this new point-of-view or perspective.
        - Step 2: respond to the user with three things: 1) explain to them that shifting a point-of-view or prespective require them to re-examine the information context and provide an updated [Information] to user from the article or external sources, 2) share an updated [Thought] based on the new point-of-view and information context, and 3) explain to the user that you have discussed this question for a while and considered multiple perspectives; you want to see if the person has any other questions about the article they wanted to discuss with you.
    
    - If the user responded by sharing their personal thought, follow these steps:
        - Step 1: compare your thought with the user's thought, in terms of the 1) Information that your thought and their thought are based upon, 2) the assumptions that your thought and their thought involve, 3) the point-of-view or perspectives that you and them are taking. 
        - Step 2: respond to the user with three things: 1) acknolwedge their thought, 2) share your comparision of your thought and the user's thought, 3) explain to the user that you have discussed this question for a while and considered multiple perspectives; you want to see if the person has any other questions about the article they wanted to discuss with you.
    
    - If the user responded by saying that your thought doesn't make sense to them, respond with two things: 1) acknowledge their response, 2) explain to them they you seem to have been discussing this quesiton for a while and it may be helpful for you and the user to explore some alternative questions together and get a better sense of the issue; with example alternative questions that are relevant to the core concepts you are discussing for the user to consider.
    
    - If the user responded by saying that they are good with this question or not wanting to discuss any further, ask the user if there's any other questions they would like to discuss. 
    
    - If the user responded by saying that they agree with what you have shared or your thought makes sense to them, ask the user if there's any other questions they would like to discuss.
    
    - If the user's response do not belong to the above conditions, proceed to the <End_state> without providing a response here.
    
    In your response, use "######" to separate each numbered part, if any. Put your response into natural language pragraphs without displaying the words "Thought" and "Information" to the user. Your response should written as if you are text messaging with friends but AVOID using slangs. Your language should be understandable to a high-school graduate in the U.S.
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
        if classification_result in ["option_1", "option_2", "option_3", "specific_word", "acknowledgement",
                                     "non_understanding", "instruction"]:
            return "Waiting_User_Input"
        elif classification_result == "conversation_end":
            return "Conversation_End"
        elif classification_result == "question_or_interest":
            return "User_Question_Processing"
        elif classification_result == "statement":
            return "Chatbot_Follow-up"
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
        return "Waiting_User_First_Response_to_Thought"

    elif current_state == "Waiting_User_First_Response_to_Thought":
        return "Waiting_User_Second_Response_to_Thought"

    elif current_state == "Waiting_User_Second_Response_to_Thought":
        return "Waiting_User_Third_Response_to_Thought"

    elif current_state == "Waiting_User_Third_Response_to_Thought":
        return "Waiting_User_Input"

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
        - "option_1": the user sends "1" or asks for word explanation without specifying a word
        - "option_2": the user sends "2" or asks for a summary of the article
        - "option_3": the user sends "3" or expresses interest in discussing the article
        - "specific_word": the user asks about a specific word from the article
        - "acknowledgement": the user sends a thank you or acknowledgement
        - "non_understanding": the user indicates they don't understand or asks for clarification
        - "instruction": the user gives a specific instruction about how to respond
        - "conversation_end": the user indicates they're done with the discussion
        - "question_or_interest": the user asks a substantive question about the article or expresses interest in discussing a specific topic
        - "statement": the user makes a statement that doesn't fit any of the above categories

        NEWS ARTICLE TITLE: {article["Title"]}
        USER MESSAGE: "{user_message}"

        RESPOND WITH ONLY ONE WORD: "option_1", "option_2", "option_3", "specific_word", \
        "acknowledgement", "non_understanding", "instruction", "conversation_end", \
        "question_or_interest" or "statement"
        """
    elif state == "User_Question_Processing":
        # Classify question type into categories 1-6
        classification_prompt = f"""You are a classifier. You will be given a news article and a message discussing that article. Your task is to classify the message into one of seven possible categories by following a two-step process.
Instruction:

Step 1: For each question, firstly determine the value for variables A, B, C, D, and E.
1. A: Determine whether this question is about explanation of the meaning of a word. 
If yes, set A = 1; if not, set A = 0.
2. B: Determine whether this question is about summary of texts.
If yes, set B = 1; if not, set B = 0.
3. C: Determine whether this question is about factual information. Factual information includes data, facts, figures or statements that can be directly found on the news article or external sources. It should have definite answers. Questions that do not have definite answers or are open to alternative answers are NOT about factual information, such as "Why" questions or questions that asks for explanation, reasoning or opinions.
If yes, set C = 1; if not, set C = 0.
4. D: Determine whether this question is about interpretation of things mentioned in the article or anything extended from the article. Interpretation refers to the explanation, reasoning or opinions on issues, facts, or data. 
If interpreting things mentioned in the article, set D = 1; if interpreting things extended from the article, set D = 2; if not about the interpretation of content, set D = 0.
5. E: Determine whether this question is about a potential action, e.g., a question following the “first-person (me/us) pronoun + verb” or “what if [potential action]” structure. If yes, Set E = 1; if not, set E = 0.

Step 2: based on the values you assigned to the variables, determine the category for this message based on the rules below:
If A = 1: Category = 1, 
Elif B = 1: Category = 2,
Elif E = 1: Category = 6,
ElIf D = 1: Category = 3, 
Elif D = 2: Category = 5,
Elif C = 1: Category = 4,
Else: Choose the category that this message is closest to based on the reasoning above.

For each [Message-Article] pair, respond in this format:
[A Value, A Reasoning; B Value, B Reasoning; C Value, C Reasoning: D Value, D Reasoning; E Value, E Reasoning; Final Category]

Here is an example:
News article: I do think we've seen the peak rent price for 2023," Danielle Hale, Realtor.com chief economist, told Yahoo Finance Live.
For the third consecutive month, asking rent prices — or vacant units advertised by landlords — have fallen, declining 1% over the same period a year ago, according to Realtor.com’s Mid-year rental report.
"We're at the point in the season where we typically see rents decline. And rents are down from a year ago as they have been for the past few months and so that means we are likely to see that 2022 was the peak for rents. And we're starting to see some decline," Hale added.
The big reason for the slowdown: more housing. In the past three years, builders have added 1.2 million apartments to the market, with 2023 shaping up to be a peak year as developers expect to open 460,860 rentals by year-end, according to RentCafe's construction report.
"While the time-to-completion on multifamily properties is much longer than single-family homes, in our view this glut of multifamily supply will eventually suppress apartment rent growth," Vinay Viswanathan, a fixed income strategist at Goldman Sachs, wrote in a note for the firm's housing team.
But new financing challenges are emerging that could threaten the supply — and rental price — outlook beyond next year.
Already, West Coast metro areas are facing an apartment construction slump.
Data from CoStar Group shows developers are on pace to build less than 32,000 apartments in Los Angeles, San Francisco, San Diego, San Jose, Seattle, and Portland this year — marking a roughly 20% drop compared with 2021 levels.
"It's the worst thing that could be happening," Jay Lybik, national director of multifamily analytics at CoStar Group, said in a statement. "The region still doesn't have enough housing."
So far this year has been the slowest for the West Coast, developing less than half as many apartments as the first two quarters of 2021. The tally hit 10,687 in 2023. That falls short of the 19,434 starts recorded in the first half of 2021.
A memo from a Los Angeles project’s development team revealed in June that it wanted to reduce the project’s total units and commercial space in response to "rising construction costs and the increasingly uncertain climate for capital sources to fund the project."
But the lack of construction could become a bigger problem nationwide after next year.
The number of new apartments is expected to drop by nearly 16% to 408,000 in 2025 from 484,000 in 2024, with new completions bottoming out in 2026 at approximately 400,000 units, according to RentCafe's construction report.
"We're seeing a pullback in projects moving forward across the country right now because developers are unable to get financing for construction loans and they're also struggling to get equity to start new projects," Lybik said.
As a result, Lybik warned that by 2025, vacancies could decrease, pushing the rate of rental growth nationwide to triple from the 1.1% increase seen in the second quarter to between 3% and 3.5%. He forecasts average monthly rent to increase to $1,799 from $1,677.
"At the end of 2025, the average renter will be paying about $1,500 more a year for housing costs," Lybik said.

Message:
What are the implications for Southern Virginia?

Response:
[ A Value: 0, The message does not ask for the explanation of a word;  
B Value: 0, The message does not ask for a summary of the article;  
C Value: 0, The message does not ask for factual information directly found in the article;  
D Value: 2, The message extends the discussion to a new geographical area (Southern Virginia) and seeks an interpretation of potential outcomes based on the article’s information;  
E Value: 1, The message is asking about potential implications, which relates to future consequences or actions;  
Final Category: 6]


Your task:
News article: {article["Content"]}
Message: 
{user_message}

Response:
"""

    if classification_prompt:
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": classification_prompt}],
                max_tokens=200
            )
            result = response.choices[0].message.content.strip()

            # If expecting JSON, try to parse it
            if state == "User_Question_Processing":
                try:
                    final = result.split("Category: ")[-1]
                    final = final.split("\n\n")[0].strip().replace("]", "").replace("] ", "")
                    result = {"category": int(final)}
                except:
                    result = {"category": 5}  # Default to factual question

            return result
        except Exception as e:
            print(f"Classification error: {str(e)}", file=sys.stderr)
            # Default fallbacks based on state
            if state == "Waiting_User_Input":
                return "question_or_interest"
            elif state == "User_Question_Processing":
                return {"category": 4}

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
            user_message = 'hello'

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

        if current_state in ["Waiting_User_Input"]:
            classification_result = classify_user_message(user_message, article, current_state)
            next_state = determine_next_state(current_state, classification_result)

            if next_state == "User_Question_Processing":
                classification_result = classify_user_message(user_message, article, next_state)
                next_state = determine_next_state(next_state, classification_result)
                prompt = generate_prompt_for_state(
                    next_state,
                    user_message,
                    article,
                    prev_chain_of_thought,
                    stored_messages,
                    classification_result
                )
                next_state = determine_next_state(next_state, classification_result)

            else:
                # Generate prompt based on CURRENT state for response states
                prompt = generate_prompt_for_state(
                    current_state,
                    user_message,
                    article,
                    prev_chain_of_thought,
                    stored_messages,
                    classification_result
                )
        else:
            next_state = determine_next_state(current_state, classification_result)
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

        # Step 4: Clean response for user display
        cleaned_response = clean_response(assistant_message)

        # Step 5: Update conversation history

        if assistant_message != "I'm sorry, I'm having trouble processing your request right now. Please try again later.":
            stored_messages.append({"role": "assistant", "content": cleaned_response})

        # Get category from classification or previous state
        category = None
        if isinstance(classification_result, dict):
            category = classification_result.get("category")
        elif "category" in prev_chain_of_thought:
            category = prev_chain_of_thought["category"]

        classification = None
        if isinstance(classification_result, dict):
            classification = classification_result.get("category")

        # Step 7: Update chain of thought with NEXT state
        chain_of_thought = {
            "state": next_state,
            "messages": stored_messages
        }

        # Add category if available
        if category is not None:
            chain_of_thought["category"] = category

        # Format category for frontend
        category_value = str(classification) if classification is not None else ""

        if "######" in cleaned_response:
            cleaned_response = cleaned_response.split("######")
            cleaned_response = [i.replace('\n', '') for i in cleaned_response]
        else:
            cleaned_response = [cleaned_response]

        # Step 9: Return response
        data = json.dumps({
            "response": cleaned_response + ["current state: " + current_state + ' \nnext state: ' + next_state + \
                                            " \ncategory: " + category_value],
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

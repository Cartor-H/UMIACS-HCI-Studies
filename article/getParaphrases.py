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
from openai import OpenAI
from dotenv import load_dotenv

sys.path.append('/home/ec2-user/.local/lib/python3.11/site-packages')

# Load environment variables from .env file
load_dotenv('/var/www/html/9/.env')

# Set OpenAI API key from environment variable
os.environ['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY')

# def lexer(str):
#     tokens = []
#     while str!="":
#         if   re.match(re.compile(r'_[_'),        str[:1]): tokens.append(str[:1]); str = str[1:]
#         elif re.match(re.compile(r'_]_'),        str[:1]): tokens.append(str[:1]); str = str[1:]
#         elif re.match(re.compile(r'_:_'),        str[:1]): tokens.append(str[:1]); str = str[1:]
#         elif re.match(re.compile(r'_msg_'),      str[:1]): tokens.append(str[:1]); str = str[1:]
#         elif re.match(re.compile(r'_selStart_'), str[:1]): tokens.append(str[:1]); str = str[1:]
#         elif re.match(re.compile(r'_selStop_'),  str[:1]): tokens.append(str[:1]); str = str[1:]
#         else:
#             tokens.append(str[:1])
#             str = str[1:]
#
# def parser(tokens):
#     tree = []
#     for i in range(len(tokens)):
#         if tokens[i] == "_[_":
#             tree.append()
#
#     return tree


def parsePrompt(prompt, message, selectStart, selectEnd):
    for i in range(len(prompt)):
        str = prompt[i]["content"]
        # tokens = lexer(str)
        # tree = parser(tokens)
        str = re.sub(re.compile(r'_msg__\[__selStart__:__selEnd__]_'),            message[selectStart     : selectEnd      ], str)
        str = re.sub(re.compile(r'_msg__\[_(\d+)_:__selEnd__]_'),       lambda x: message[int(x.group(1)) : selectEnd      ], str)
        str = re.sub(re.compile(r'_msg__\[__selStart__:_(\d+)_]_'),     lambda x: message[selectStart     : int(x.group(1))], str)
        str = re.sub(re.compile(r'_msg__\[_(\d+)_:__selStart__]_'),     lambda x: message[int(x.group(1)) : selectStart    ], str)
        str = re.sub(re.compile(r'_msg__\[__selEnd__:_(\d+)_]_'),       lambda x: message[selectEnd       : int(x.group(1))], str)
        str = re.sub(re.compile(r'_msg__\[_(\d+)_:_(\d+)_]_'),          lambda x: message[int(x.group(1)) : int(x.group(2))], str)
        str = re.sub(re.compile(r'_msg_'), message, str)
        prompt[i]["content"] = str
    return prompt


def outputSQLQuery(form):



    message     = form["message"]
    selectStart = int(form["selectStart"])
    selectEnd   = int(form["selectEnd"])
    prompt      = form["prompt"]

    prompt = json.loads(prompt)

    prompt = parsePrompt(prompt, message, selectStart, selectEnd)

    # prompt = ""
    # if selectStart > 0:
    #     prompt = [
    #         {"role": "system", "content": "Generate three paraphrases for this message by following the instructions."
    #                                       "Focus on the selected text, but still respond with the full sentence."},
    #         {"role": "user", "content": message},
    #         {"role": "system", "content": "Highlighted Text:"},
    #         {"role": "system", "content": message[selectStart:selectEnd]},
    #         {"role": "system", "content": """
    #         Paraphrase instruction:
    #         Generate three paraphrases for this message by following the instructions.
    #         You mentioned equity here. I need to know more.
    #
    #         Paraphrase instruction:
    #         1. This is a message from a conversation. The speaker is learning about two houses they may want to purchase from another person.
    #         2. Your paraphrases should use natural English expressions and sentence structure.
    #         3. For each paraphrase, explain it following the logic below.
    #         - If the paraphrase changes expression of the message's factual meaning, e.g., a question, a description, label it "content".
    #         - If the paraphrase changes tone by more than 3 points between 0 (most causal, conversational, or affective) and 10 (most formal, polite, or objective), label it "tone".
    #         - If both conditions apply, label it "content and tone".
    #         4. Make sure each paraphrase has __at least one label__.
    #         5. Respond JSON format following the example below. You can put your rationale for the tone and content change answers in the rationale field.
    #         {
    #         paraphrases : [
    #         {msg : "", rationale : "For your thoughts ChatGPT", tone : true|false, content : true|false},
    #         {msg : "", rationale : "For your thoughts ChatGPT", tone : true|false, content : true|false},
    #         {msg : "", rationale : "For your thoughts ChatGPT", tone : true|false, content : true|false}]
    #         }
    #         """}
    #     ]
    # else:
    #     prompt = [
    #         {"role": "system", "content": "Generate three paraphrases for this message by following the instructions."},
    #         {"role": "user", "content": message},
    #         {"role": "system", "content": """
    #         Paraphrase instruction:
    #         Generate three paraphrases for this message by following the instructions.
    #         You mentioned equity here. I need to know more.
    #
    #         Paraphrase instruction:
    #         1. This is a message from a conversation. The speaker is learning about two houses they may want to purchase from another person.
    #         2. Your paraphrases should use natural English expressions and sentence structure.
    #         3. For each paraphrase, explain it following the logic below.
    #         - If the paraphrase changes expression of the message's factual meaning, e.g., a question, a description, label it "content".
    #         - If the paraphrase changes tone by more than 3 points between 0 (most causal, conversational, or affective) and 10 (most formal, polite, or objective), label it "tone".
    #         - If both conditions apply, label it "content and tone".
    #         4. Make sure each paraphrase has __at least one label__.
    #         5. Respond JSON format following the example below. You can put your rationale for the tone and content change answers in the rationale field.
    #         {
    #         paraphrases : [
    #         {msg : "", rationale : "For your thoughts ChatGPT", tone : true|false, content : true|false},
    #         {msg : "", rationale : "For your thoughts ChatGPT", tone : true|false, content : true|false},
    #         {msg : "", rationale : "For your thoughts ChatGPT", tone : true|false, content : true|false}]
    #         }
    #         """}
    #     ]

    client = OpenAI()

    completion = client.chat.completions.create(
        model="gpt-3.5-turbo-0125",
        response_format={ "type": "json_object" },
        messages= prompt
            # {"role": "system", "content": "Generate three different paraphrases for the following sentence."
            #                               "Return the paraphrases in the following json format:"
            #                               "{paraphrases : [\"\", \"\", \"\"]}"},
            # {"role": "user", "content": message}
    )

    data = completion.choices[0].message.content

    if data:
        # json_data = ''.join([row[0] for row in data])  # Concatenate the values from each row
        print(json.dumps({
            "Status" : "Success",
            "Prompt" : prompt,
            "Data" : data}))
    else:
        print(json.dumps({"Status" : "No Data"}))

try:
    print("Content-type: text/html\n\n")   # say generating html
    if 'REQUEST_METHOD' in os.environ and os.environ['REQUEST_METHOD'] == 'POST':
        content_length = int(os.environ.get('CONTENT_LENGTH', 0))
        post_data = sys.stdin.read(content_length)
        form = json.loads(json.dumps(dict(urllib.parse.parse_qsl(post_data)))) # json.loads(post_data)
    else:
        form = json.loads(json.dumps(dict(urllib.parse.parse_qsl(os.environ['QUERY_STRING']))))

    outputSQLQuery(form)
except Exception as e:
    print("{error:")
    print(f"An error occurred: {str(e)}")
    print(f"\nTrace: {str(e.traceback)}")
    print("}")
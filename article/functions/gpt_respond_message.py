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
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Set OpenAI API key from environment variable
os.environ['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY')


def outputSQLQuery(form):
    message = form["message"]

    # prompt = ""

    # client = OpenAI()

    # completion = client.chat.completions.create(
    #     model="gpt-3.5-turbo-0125",
    #     response_format={ "type": "json_object" },
    #     messages=prompt
    # )

    # data = completion.choices[0].message.content

    # Msg to be sent to the user
    response = "yuhang test"

    # Chain of thought or state for internal use (JSON object)
    chain_of_thought = {}
    
    # Classification of user msg
    # - ""/null: no classification
    # - "%d": classification number if classified
    classification = ""
    
    data = json.dumps({"response": response, "chain of thought": chain_of_thought, "classification": classification})

    if data:
        # json_data = ''.join([row[0] for row in data])  # Concatenate the values from each row
        print(json.dumps({
            "Status": "Success",
            "Data": data}))
    else:
        print(json.dumps({"Status": "No Data"}))


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
    print(f"\nTrace: {str(e.traceback)}")
    print("}")

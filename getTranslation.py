#!/usr/bin/env python3.11
# dos2unix /var/www/html/2/handleMessages.py
# nano /var/log/httpd/error_log
# dos2unix /var/www/html/*/*.py /var/www/html/*.py
# sudo python3.11 -m pip install

# import cgitb
# cgitb.enable()

import json
import sys
import os
import urllib.parse
from urllib.parse import quote_plus
import pymssql
import requests
import time
import re
from dotenv import load_dotenv

sys.path.append('/home/ec2-user/.local/lib/python3.11/site-packages')

# Load environment variables from .env file
load_dotenv('/var/www/html/.env')

def outputAPIQuery(form):
    import requests

    message = form["message"]
    language = form["language"]

    def query(payload):
        response = requests.post(API_URL, headers=headers, json=payload)
        return response.json()

    if language == "English" and re.findall("(^|\W+)(Hello|Hi|oh hi)($|\W+)", message, flags=re.IGNORECASE):

        # if so, split the sentence into individual words
        word_list = (message.split(' '))

        # identify the target words from individual word list and replace the word
        if len(word_list) == 1 or (re.findall("(^|\W+)(oh hi)($|\W+)", message, flags=re.IGNORECASE) and len(word_list) == 2):
            print(json.dumps({
                "Status": "Success",
                "TranslateAttempt": -1,
                "Data": re.sub(r'\b(hi|hello|oh hi)\b', '你好', message, flags=re.IGNORECASE)  # '(^|\W+)(hi|hello|Hello|Hi)($|\W+)'
            }))
            return


    try:
        API_URL = "https://" + (os.getenv('API_URL_MANDARIN') if language == "Mandarin" else os.getenv('API_URL_ENGLISH'))
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {os.getenv('API_KEY_PAID')}",
            "Content-Type": "application/json"
        }

        data = query({
            "inputs": message,
        })
    except:
        API_URL = "https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-" + ("zh-en" if language == "Mandarin" else "en-zh")
        headers = {"Authorization": f"Bearer {os.getenv('API_KEY_FREE')}"}

        data = query({
            "inputs": message,
        })






    API_URL = "https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-" + ("zh-en" if language == "Mandarin" else "en-zh")
    headers = {"Authorization": f"Bearer {os.getenv('API_KEY_FREE')}"}

    for i in range(4):
        waitTime = 5

        if data and isinstance(data, list) and len(data) >= 1 and "translation_text" in data[0]:
            print(json.dumps({
                "Status": "Success",
                "TranslateAttempt": i,
                "Data": data[0]["translation_text"]
            }))
            break
        elif data and isinstance(data, dict) and "estimated_time" in data:
            waitTime = data["estimated_time"]
        # else:
            # print(json.dumps({
            #     "Status": "No Data"
            # }))

        time.sleep(waitTime)

        if i < 3:
            data = query({
                "inputs": message,
            })

    if not data:
        print(json.dumps({
            "Status": "Error",
            "TranslateAttempt": "TranslateAttempt",
            "Message": "API request failed",
            "Data": "Translation Failed"
        }))

try:
    print("Content-type: text/html\n\n")   # say generating html
    if 'REQUEST_METHOD' in os.environ and os.environ['REQUEST_METHOD'] == 'POST':
        content_length = int(os.environ.get('CONTENT_LENGTH', 0))
        post_data = sys.stdin.read(content_length)
        form = json.loads(json.dumps(dict(urllib.parse.parse_qsl(post_data)))) # json.loads(post_data)
    else:
        form = json.loads(json.dumps(dict(urllib.parse.parse_qsl(os.environ['QUERY_STRING']))))

    outputAPIQuery(form)
except Exception as e:
    print("{error:")
    print(f"An error occurred: {str(e)}")
    print(f"\nTrace: {str(e.with_traceback)}")
    print("}")
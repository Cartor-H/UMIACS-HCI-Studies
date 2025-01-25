#!/usr/bin/env python3.11
# dos2unix /var/www/html/2/handleMessages.py
# nano /var/log/httpd/error_log

# import cgitb
# cgitb.enable()

import json
import sys
import os
import urllib.parse
import pymssql
from dotenv import load_dotenv

sys.path.append('/home/ec2-user/.local/lib/python3.11/site-packages')

# Load environment variables from .env file
load_dotenv('/var/www/html/6/.env')

def outputSQLQuery(form):

    connection = {
        'host': os.getenv('DB_HOST'),
        'username': os.getenv('DB_USERNAME'),
        'password': os.getenv('DB_PASSWORD'),
        'db': os.getenv('DB_NAME')
    }
    con=pymssql.connect(connection['host'],connection['username'],connection['password'],connection['db'])

    cursor=con.cursor()

    mID = form["mID"]
    translationClickTime = form["translationClickTime"]
    firstButtonClicked   = form["firstButtonClicked"]
    firstButtonChoice    = form["firstButtonChoice"]
    firstButtonTime      = form["firstButtonTime"]
    secondButtonChoice   = form["secondButtonChoice"]
    secondButtonTime     = form["secondButtonTime"]

    cursor.execute("INSERT INTO Annotations (MessageID, TranslationClickTime, FirstButtonClicked, FirstButtonChoice, "
                   "FirstButtonTime, SecondButtonChoice, SecondButtonTime)"
                   "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                   (mID, translationClickTime, firstButtonClicked, firstButtonChoice, firstButtonTime,
                    secondButtonChoice, secondButtonTime))
    con.commit()

    cursor.close()
    con.close()
    print(json.dumps({"Status" : "Success"}))

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
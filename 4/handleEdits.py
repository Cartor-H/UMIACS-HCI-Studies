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
load_dotenv('/var/www/html/4/.env')

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
    time = form["time"]
    sender = form['senderID']
    source = form['source']
    keys = form['keys']
    translation = form['translation']
    reTranslated = form['reTranslated']
    editedTranslation = form['editedTranslation']

    cursor.execute("INSERT INTO Edits (MessageID, Time, SenderID, Source, Translation, EditedTranslation, Retranslated, KeysPressed)"
                   "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                   (mID, time, sender, source, translation, editedTranslation, reTranslated, keys))
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
#!/usr/bin/env python3.11
# dos2unix /var/www/html/1/getMessages.py
# nano /var/log/httpd/error_log

import json
import sys
import os
import urllib.parse
import pymssql
import traceback
from dotenv import load_dotenv

sys.path.append('/home/ec2-user/.local/lib/python3.11/site-packages')

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

def outputSQLQuery(form):

    connection = {
        'host': os.getenv('DB_HOST'),
        'username': os.getenv('DB_USERNAME'),
        'password': os.getenv('DB_PASSWORD'),
        'db': os.getenv('DB_NAME')
    }
    con=pymssql.connect(connection['host'],connection['username'],connection['password'],connection['db'])
    cursor=con.cursor()

    articleID = form["articleID"]
    userID = form["userID"]


    cursor.execute("SELECT TOP 1 [Action] as ChatState FROM ArticleOpenHistory " \
    "WHERE [Action]!= 'open' AND [Action] != 'close' " \
    "AND ArticleID=%s AND UserID=%s " \
    "ORDER BY ActionDate DESC FOR JSON AUTO", (articleID, userID))
    data = cursor.fetchall()

    if data:
        # json_data = ''.join(data[0]) # Get the first row of the result
        json_data = json.loads(data[0][0])[0] # Get the first row of the result
        print(json.dumps({
            "Status" : "Success",
            "Data" : json_data}))
    else:
        print(json.dumps({
            "Status" : "Success",
            "Data" :  {
                "ChatState": "InitialTakeaways"}
                }))
        
    cursor.close()
    con.close()

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
    print(json.dumps({
        "error": str(e),
        "trace": traceback.format_exc()
    }))

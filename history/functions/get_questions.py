#!/usr/bin/env python3.11
# dos2unix /var/www/html/1/getMessages.py
# nano /var/log/httpd/error_log

# IMPORTANT!!
# When installing packages, use `sudo python3.11 -m pip install <package>` otherwise server errors (code 500) will occur
# Ideally a virtual environment should be used, but this started as a simple script and doing so now would cause too much downtime
# and take time away from making new features

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

    cursor.execute("SELECT * FROM MessageClassifications FOR JSON AUTO")
    questions_data = cursor.fetchall()

    userID = form['userID']

    cursor.execute("""
        SELECT * FROM Articles
        WHERE ID IN (SELECT articleID FROM MessageClassifications WHERE userID=%s)
        FOR JSON AUTO
    """, (userID))
    articles_data = cursor.fetchall()

    if articles_data and questions_data:
        articles_json = ''.join([row[0] for row in articles_data])
        questions_json = ''.join([str(row[0]) for row in questions_data])
        print(json.dumps({
            "Status": "Success",
            "Data": {
                "Articles": articles_json,
                "Questions": questions_json
            }
        }))
    else:
        print(json.dumps({"Status": "No Data"}))

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
    print(json.dumps({
        "Status": "Error",
        "Message": str(e),
        "Traceback": traceback.format_exc()
    }))
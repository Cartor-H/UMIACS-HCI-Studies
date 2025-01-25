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

load_dotenv('/home/cartorh/Desktop/Money/Research Job/Research Server/www/html/8/.env')

def outputSQLQuery(form):

    connection={
        'host': os.getenv('DB_HOST'),
        'username': os.getenv('DB_USERNAME'),
        'password': os.getenv('DB_PASSWORD'),
        'db': os.getenv('DB_NAME')
    }
    con=pymssql.connect(connection['host'],connection['username'],connection['password'],connection['db'])

    cursor=con.cursor()

    mID = form["mID"]
    messages = json.loads(form["englishMessages"])
    times = json.loads(form["snapshotTimes"])

    cursor.executemany("INSERT INTO Snapshots (MessageID, EnglishMessage, Time) VALUES (%s, %s, %s)",
                       [(mID, message, time) for message, time in zip(messages, times)])
    con.commit()

    cursor.close()
    con.close()
    print(json.dumps({"Status" : "Success",
                      "Data" : [(mID, message, time) for message, time in zip(messages, times)]}))

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
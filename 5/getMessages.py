#!/usr/bin/env python3.11
# dos2unix /var/www/html/2/getMessages.py
# nano /var/log/httpd/error_log

import json
import sys
import os
import urllib.parse
import pymssql
from dotenv import load_dotenv

sys.path.append('/home/ec2-user/.local/lib/python3.11/site-packages')

# Load environment variables from .env file
load_dotenv('/var/www/html/5/.env')

def outputSQLQuery(form):

    connection = {
        'host': os.getenv('DB_HOST'),
        'username': os.getenv('DB_USERNAME'),
        'password': os.getenv('DB_PASSWORD'),
        'db': os.getenv('DB_NAME')
    }
    con=pymssql.connect(connection['host'],connection['username'],connection['password'],connection['db'])
    cursor=con.cursor()

    to = form["to"]
    sender = form['from']
    trial = form['trial']

    cursor.execute("SELECT "
                   "M.MessageID, "
                   "M.Time, "
                   "M.SenderLanguage, "
                   "M.SenderID, "
                   "M.ReceiverID, "
                   "M.MandarinMessage, "
                   "M.EnglishMessage, "
                   "M.TrialNumber, "
                   # "A.FirstButtonClicked, A.FirstButtonChoice, A.SecondButtonChoice "
                   "ISNULL(A.FirstButtonClicked, '') AS FirstButtonClicked, "
                   "ISNULL(A.FirstButtonChoice, '') AS FirstButtonChoice, "
                   "ISNULL(A.SecondButtonChoice, '') AS SecondButtonChoice "
                   "FROM Messages AS M "
                   "LEFT JOIN Annotations AS A ON M.MessageID = A.MessageID "
                   "WHERE (((M.SenderID = %s AND M.ReceiverID = %s) OR (M.SenderID = %s AND M.ReceiverID = %s))) "
                   "AND M.TrialNumber = %s "
                   "ORDER BY M.Time "
                   "FOR JSON PATH",
                   (sender, to, to, sender, trial))
    data = cursor.fetchall()

    if data:
        json_data = ''.join([row[0] for row in data])  # Concatenate the values from each row
        print(json.dumps({
            "Status" : "Success",
            "Data" : json_data}))
    else:
        print(json.dumps({"Status" : "No Data"}))

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
    print(f"\nTrace: {str(e.traceback)}")
    print("}")
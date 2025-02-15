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
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def outputSQLQuery(form):

    connection = {
        'host': os.getenv('DB_HOST'),
        'username': os.getenv('DB_USERNAME'),
        'password': os.getenv('DB_PASSWORD'),
        'db': os.getenv('DB_NAME')
    }
    con=pymssql.connect(connection['host'],connection['username'],connection['password'],connection['db'])
    cursor=con.cursor()

    ID = form["articleID"]

    cursor.execute("SELECT ID, Title, Published_Date, Description, Image_ID, Content, Author FROM articles WHERE ID=%s FOR JSON AUTO", (ID,))
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

    # cursor = cnxn.cursor()
    # query = u"SELECT default_password FROM student2022 where Student_ID like ? and password like ? FOR JSON AUTO"
    # cursor.execute(query,[sID, userPassword])
    # data = cursor.fetchall()
    # if data:
    #     print('[]')
    #     return
    #
    # cursor = cnxn.cursor()
    # cursor.execute("INSERT INTO student2022 (Student_ID, First_Name, Last_Name, password, default_password)"
    #                "VALUES (?,?,?,?,?)", [sID, fName, lName, userPassword, 0])
    # cursor.commit()
    #
    # cursor.execute("SELECT CAST((SELECT * FROM student2022 FOR JSON AUTO) AS VARCHAR(MAX))", [])
    # data = cursor.fetchall()
    # if data:
    #     print(data[0][0])
    # else:
    #     print('[]')

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

# try:
#     # import cgi
#     print("Content-type: text/html\n\n")   # say generating html
#     # print("<html><body>hello world</body></html>")
#     # outputSQLQuery()
# except:
#     print("Uh Oh")
#     # import cgi
#     # cgitb.handler()
#     # cgi.print_exception()                 # catch and print errors


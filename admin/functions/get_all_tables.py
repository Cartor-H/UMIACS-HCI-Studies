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


    ALLOWED_TABLES = [
        "Articles",
        "Messages",
        #"Users",
        "ArticleOpenHistory",
        "UserReadArticleHistory",
        "MessageClassifications",
        "ChainOfThought",
        "ArticleCategories",
    ]


    tables = json.loads(form.get('tables', []))
    if not tables:
        print(json.dumps({"Status": "No Data"}))
        return

    data = {}
    for table in tables:
        if table not in ALLOWED_TABLES:
            print(json.dumps({
                "Status": "Error",
                "Message": "Table not allowed",
                "Table": table
            }))
            return
        # print(table,"\n")
        query = "SELECT * FROM {} FOR JSON AUTO".format(table)
        cursor.execute(query)
        tableData = cursor.fetchall()
        json_data = ''.join([row[0] for row in tableData])  # Concatenate the values from each row
        data[table] = json_data

    if data:
        # json_data = ''.join([row[0] for row in data])  # Concatenate the values from each row
        print(json.dumps({
            "Status" : "Success",
            "Data" : json.dumps(data)}))
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
    print(json.dumps({
        "Status": "Error",
        "Message": str(e),
        "Traceback": traceback.format_exc()
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
"""
Traceback (most recent call last):
    File "/var/www/html/home/functions/getArticles.py", line 78, in <module>
        outputSQLQuery(form)
    File "/var/www/html/home/functions/getArticles.py", line 31, in outputSQLQuery
        con=pymssql.connect(connection['host'],connection['username'],connection['password'],connection['db'])
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    File "src/pymssql/_pymssql.pyx", line 647, in pymssql._pymssql.connect
    File "src/pymssql/_mssql.pyx", line 2109, in pymssql._mssql.connect
    File "src/pymssql/_mssql.pyx", line 609, in pymssql._mssql.MSSQLConnection.__init__
TypeError: argument of type 'NoneType' is not iterable
"""
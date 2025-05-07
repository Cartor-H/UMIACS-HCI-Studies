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
import boto3
import datetime
import random
import base64

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

    ID = form["ID"]
    header = form["Header"]
    subpage = form["Subpage"]
    fileName = form["FileName"]
    fileType = form["FileType"]
    fileSize = form["FileSize"]
    fileData = form["FileData"]

    # cursor.execute("SELECT ID, Title, Published_Date, Description, Image_ID, Content, Author FROM articles WHERE userId=%s FOR JSON AUTO", (ID,))
    # data = cursor.fetchall()

    # Get the file extension (jpeg) from profilePic to add to the filename
    # profilePic is of the form "data:image/jpeg;base64,/9j/4QAW..."
    extension = fileData.split("/")[1].split(";")[0]

    # Convert the raw base64 image (profilePicRaw64) to a file
    image_data = base64.b64decode(fileData.split(",")[1])


    # Generate a random filename
    filename = f"{datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}-{random.randint(0, 1000000)}.{extension}"

    # Use the IAM role assigned to the EC2 instance for authentication
    s3 = boto3.client("s3")

    # Upload the image_data and filename to the S3 bucket
    s3.put_object(Bucket=os.getenv('BUCKET_NAME'), Key=filename, Body=image_data)


    # Add UserID, FileName, and other details to the Images table
    cursor.execute("""
    INSERT INTO Images (userId, fileName, subPage, header)
    VALUES (%s, %s, %s, %s)
    """, (ID, filename, subpage, header))
    con.commit()


    print(json.dumps({ "Status" : "Success", "FileName": filename}))

    # if data:
    #     json_data = ''.join([row[0] for row in data])  # Concatenate the values from each row
    #     print(json.dumps({
    #         "Status" : "Success",
    #         "Data" : json_data}))
    # else:
    #     print(json.dumps({"Status" : "No Data"}))

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
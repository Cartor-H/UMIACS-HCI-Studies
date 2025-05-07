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
    cursor=con.cursor(as_dict=True)

    s3 = boto3.client("s3")

    ID = form["ID"]

    query = """
            SELECT fileName, header, subpage, date
            FROM Images
            WHERE userId = %s
            ORDER BY date DESC
            """
            
    cursor.execute(query, (ID,))
    rows = cursor.fetchall()
    
    # Create a list to store image data
    images_data = []
    
# Process each row
    for row in rows:
        try:
            file_name = row['fileName']
            
            # Option 1: Generate a presigned URL (temporary link)
            # This URL will expire after the specified time (3600 seconds = 1 hour)
            """
            presigned_url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': bucket_name,
                    'Key': file_name
                },
                ExpiresIn=3600  # URL expires in 1 hour
            )
            """
            
            # Option 2: Get file content and encode as base64
            # Uncomment this if you want to include the actual file data
            # instead of or in addition to the presigned URL
            response = s3.get_object(
                Bucket=os.getenv('BUCKET_NAME'),
                Key=file_name
            )
            file_content = response['Body'].read()
            encoded_string = base64.b64encode(file_content).decode('utf-8')
            
            
            # Create image data object
            image_data = {
                'fileName': row['fileName'],
                'header': row['header'],
                'subpage': row['subpage'],
                'date': row['date'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(row['date'], datetime.datetime) else str(row['date']),
                'fileData': encoded_string,
                # Uncomment the line below if you want to include the file data
                # 'fileData': encoded_string
            }
            
            # Add to images list
            images_data.append(image_data)
        except Exception as e:
            print(f"Error processing file {row['fileName']}: {str(e)}")
            continue


    print(json.dumps({ "Status" : "Success",
                       "Data"   : images_data}))

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
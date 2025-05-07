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
import re

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
    
    # Get S3 client
    s3 = boto3.client("s3")
    
    # Check if this is a batch upload (folder) or single file

    print(form.keys())
    ID = form["ID"]
    files_data = json.loads(form["files"])
    
    # Track successful and failed uploads
    results = {
        "success": [],
        "failed": [],
        "updated": [],
        "skipped": []
    }
    
    # Process each file in the folder structure
    for file_info in files_data:
        try:
            # Extract metadata from path
            # Expected format: [userID]/[weekNumber]/[subPage]-[header].png
            path_parts = file_info["path"].split('/')
            if len(path_parts) != 3:
                results["failed"].append({
                    "file": file_info["path"],
                    "reason": "Invalid path structure"
                })
                continue
                
            # Extract metadata from path
            user_id = path_parts[0]
            week_number = path_parts[1]
            
            # Extract subPage and header from filename
            # Expected format: [subPage]-[header].png
            filename_pattern = r'^(\d+)-(.+)\.\w+$'
            filename_match = re.match(filename_pattern, path_parts[2])
            
            if not filename_match:
                results["failed"].append({
                    "file": file_info["path"],
                    "reason": "Invalid filename format"
                })
                continue
                
            sub_page = filename_match.group(1)
            header = filename_match.group(2).replace('_', ' ')
            
            # Get file metadata
            last_modified = datetime.datetime.fromtimestamp(file_info["lastModified"]/1000)  # Convert ms to seconds
            file_type = file_info["type"]
            file_size = file_info["size"]
            
            # Extract base64 data
            file_data = file_info["data"]
            # Convert the raw base64 image to binary
            image_data = base64.b64decode(file_data.split(",")[1])
            
            # Generate S3 filename with structure: userID/weekNumber/subPage-header.extension
            extension = file_data.split("/")[1].split(";")[0]
            s3_key = f"{user_id}/{week_number}/{sub_page}-{header.replace(' ', '_')}.{extension}"
            
            # Check if image already exists in the database
            cursor.execute("""
                SELECT fileName, date FROM Images 
                WHERE userId=%s AND header=%s AND subPage=%s AND weekNumber=%s
            """, (user_id, header, sub_page, week_number))
            
            existing_image = cursor.fetchone()
            
            if existing_image:
                existing_filename, existing_upload_date = existing_image
                
                # Check if the new image is newer
                if last_modified > existing_upload_date:
                    # Delete old image from S3
                    try:
                        s3.delete_object(Bucket=os.getenv('BUCKET_NAME'), Key=existing_filename)
                    except Exception as e:
                        print(f"Warning: Could not delete old file {existing_filename}: {str(e)}")
                    
                    # Upload new image to S3
                    s3.put_object(Bucket=os.getenv('BUCKET_NAME'), Key=s3_key, Body=image_data)
                    
                    # Update record in database
                    cursor.execute("""
                        UPDATE Images 
                        SET fileName=%s, date=%s 
                        WHERE userId=%s AND header=%s AND subPage=%s AND weekNumber=%s
                    """, (s3_key, last_modified, user_id, header, sub_page, week_number))
                    
                    results["updated"].append(s3_key)
                else:
                    # Skip this file as it's older than the existing one
                    results["skipped"].append({
                        "file": file_info["path"],
                        "reason": "Existing file is newer"
                    })
                    continue
            else:
                # New file - upload to S3
                s3.put_object(Bucket=os.getenv('BUCKET_NAME'), Key=s3_key, Body=image_data)
                
                # Add new record to database
                cursor.execute("""
                    INSERT INTO Images (userId, fileName, subPage, header, weekNumber, date)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (user_id, s3_key, sub_page, header, week_number, last_modified))
                
                results["success"].append(s3_key)
                
            con.commit()
                
        except Exception as e:
            results["failed"].append({
                "file": file_info["path"],
                "reason": str(e)
            })
    
    # Return results
    print(json.dumps({
        "Status": "Success",
        "Processed": len(files_data),
        "Added": len(results["success"]),
        "Updated": len(results["updated"]),
        "Skipped": len(results["skipped"]),
        "Failed": len(results["failed"]),
        "FullFailed:": results["failed"],
    }))

    # Close database connection
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
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
load_dotenv('/var/www/html/.env')

def outputSQLQuery(form):

    database = form['database']

    connection = {
        'host': os.getenv('DB_HOST'),
        'username': os.getenv('DB_USERNAME'),
        'password': os.getenv('DB_PASSWORD'),
        'db': database
    }
    con = pymssql.connect(connection['host'], connection['username'], connection['password'], connection['db'])
    cursor = con.cursor()

    trial = form['trial']

    response = {}

    # Execute Message History
    if (database=="3"):
        cursor.execute("""
            SELECT [MessageID],
            [Time],
            [SenderLanguage],
            [SenderID],
            [ReceiverID],
            [MandarinMessage],
            [EnglishMessage]
            -- ,CASE WHEN [SenderLanguage] = 'Mandarin' THEN 'No' ELSE 'Yes' END AS SelfWriting -- If There is NOT an Edits table in this database
            ,CASE -- If There is an Edits table in this database
                WHEN M.[SenderLanguage] = 'English' THEN 'Yes'
                ELSE
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM Edits E
                            WHERE E.[MessageID] = M.[MessageID]
                                AND E.[KeysPressed] IS NOT NULL
                                AND E.[KeysPressed] != ''
                        ) THEN 'Yes'
                        ELSE 'No'
                    END
            END AS SelfWriting
           ,[TrialNumber]
            FROM Messages M
            WHERE TrialNumber = %s
        """, trial)
        data = cursor.fetchall()
        if data:
            json_data = data #''.join([row[0] for row in data])
            response["Message_History"] = {
                "Status": "Success",
                "Data": json_data,
                "Headers": [desc[0] for desc in cursor.description]
            }
        else:
            response["Message_History"] = {"Status": "No Data"}


    # Execute Edit History
    if (database=="3"):
        cursor.execute("""
        SELECT E.[MessageID],
               E.[Time],
               E.[SenderID],
               E.[Source] AS SourceMessage,
               E.Translation AS OriginalTranslation,
               E.EditedTranslation AS FinalMessage,
               CASE WHEN E.Translation = E.EditedTranslation THEN 'No' ELSE 'Yes' END AS TranslationChanged,
               CASE WHEN E.KeysPressed IS NOT NULL AND E.KeysPressed != '' THEN 'Yes' ELSE 'No' END AS SelfWriting,
               E.[KeysPressed]
        FROM Edits E
        JOIN Messages M ON E.MessageID = M.MessageID
        WHERE M.TrialNumber = %s
        """, trial)
        data = cursor.fetchall()
        if data:
            json_data = data #''.join([row[0] for row in data])
            response["Edit_History"] = {
                "Status": "Success",
                "Data": json_data,
                "Headers": [desc[0] for desc in cursor.description]
            }
        else:
            response["Edit_History"] = {"Status": "No Data"}

    # Execute the third SQL query and fetch the result
    if (database=="3" or database=="6" or database=="7"):
        cursor.execute(f"""
        SELECT S.[MessageID]
              ,S.[MessageStageID]
              ,S.[EnglishMessage]
              ,S.[Time]
        FROM [{database}].[dbo].[Snapshots] S
        JOIN Messages M ON S.MessageID = M.MessageID
        WHERE M.TrialNumber = %s
        """, trial)
        data = cursor.fetchall()
        if data:
            json_data = data #''.join([row[0] for row in data])
            response["Snapshot_History"] = {
                "Status": "Success",
                "Data": json_data,
                "Headers": [desc[0] for desc in cursor.description]
            }
        else:
            response["Snapshot_History"] = {"Status": "No Data"}

    # Execute the Annotations
    if (database=="5"):
        cursor.execute("""
        SELECT A.*
        FROM Annotations A
        JOIN Messages M ON A.MessageID = M.MessageID
        WHERE M.TrialNumber = %s
        """, trial)
        data = cursor.fetchall()
        if data:
            json_data = data #''.join([row[0] for row in data])
            response["Annotation_History"] = {
                "Status": "Success",
                "Data": json_data,
                "Headers": [desc[0] for desc in cursor.description]
            }
        else:
            response["Annotation_History"] = {"Status": "No Data"}

    # Get Messages For Condition 5
    if (database=="5" or database=="6" or database=="7"):
        cursor.execute("""
        SELECT *
        FROM Messages
        WHERE TrialNumber = %s
        """, trial)
        data = cursor.fetchall()
        if data:
            json_data = data #''.join([row[0] for row in data])
            response["Message_History"] = {
                "Status": "Success",
                "Data": json_data,
                "Headers": [desc[0] for desc in cursor.description]
            }
        else:
            response["Message_History"] = {"Status": "No Data"}

    if (database=="6"):
        cursor.execute("""
        SELECT E.[MessageID],
               E.[Time],
               E.[SenderID],
               E.[Source] AS SourceMessage,
               E.Translation AS OriginalTranslation,
               E.EditedTranslation AS FinalMessage,
               Paraphrased               ,
               ParaphraseSource          ,
               ParaphraseSourceSel       ,
               ParaphraseOutput1_Text    ,
               ParaphraseOutput1_Tone    ,
               ParaphraseOutput1_Content ,
               ParaphraseOutput2_Text    ,
               ParaphraseOutput2_Tone    ,
               ParaphraseOutput2_Content ,
               ParaphraseOutput3_Text    ,
               ParaphraseOutput3_Tone    ,
               ParaphraseOutput3_Content ,
               SelfBeforePara            ,
               SelfAfterPara             ,
               CASE WHEN E.Translation = E.EditedTranslation THEN 'No' ELSE 'Yes' END AS TranslationChanged,
               CASE WHEN E.KeysPressed IS NOT NULL AND E.KeysPressed != '' THEN 'Yes' ELSE 'No' END AS SelfWriting,
               E.[KeysPressed]
        FROM Edits E
        JOIN Messages M ON E.MessageID = M.MessageID
        WHERE M.TrialNumber = %s
        """, trial)
        data = cursor.fetchall()
        if data:
            json_data = data #''.join([row[0] for row in data])
            response["Edit_History"] = {
                "Status": "Success",
                "Data": json_data,
                "Headers": [desc[0] for desc in cursor.description]
            }
        else:
            response["Edit_History"] = {"Status": "No Data"}


    if (database=="7"):
        cursor.execute("""
        SELECT E.[MessageID],
               E.[Time],
               E.[SenderID],
               E.[Source] AS SourceMessage,
               E.Translation AS OriginalTranslation,
               E.EditedTranslation AS FinalMessage,
               Paraphrased            ,
               ParaphraseSource       ,
               ParaphraseSourceSel    ,
               ParaphrasePushedTime   ,
               ParaphraseReturnTime   ,
               ParaphraseOutput1_Text ,
               ParaphraseOutput2_Text ,
               SelfBeforePara         ,
               SelfAfterPara          ,
               CASE WHEN E.Translation = E.EditedTranslation THEN 'No' ELSE 'Yes' END AS TranslationChanged,
               CASE WHEN E.KeysPressed IS NOT NULL AND E.KeysPressed != '' THEN 'Yes' ELSE 'No' END AS SelfWriting,
               E.[KeysPressed]
        FROM Edits E
        JOIN Messages M ON E.MessageID = M.MessageID
        WHERE M.TrialNumber = %s
        """, trial)
        data = cursor.fetchall()
        if data:
            json_data = data #''.join([row[0] for row in data])
            response["Edit_History"] = {
                "Status": "Success",
                "Data": json_data,
                "Headers": [desc[0] for desc in cursor.description]
            }
        else:
            response["Edit_History"] = {"Status": "No Data"}

    print(json.dumps(response, default=str))

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
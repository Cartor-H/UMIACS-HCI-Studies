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

# Load environment variables from .env file
load_dotenv('/var/www/html/6/.env')

def outputSQLQuery(form):

    connection = {
        'host': os.getenv('DB_HOST'),
        'username': os.getenv('DB_USERNAME'),
        'password': os.getenv('DB_PASSWORD'),
        'db': os.getenv('DB_NAME')
    }
    con=pymssql.connect(connection['host'],connection['username'],connection['password'],connection['db'])

    cursor=con.cursor()

    mID = form["mID"]
    time = form["time"]
    sender = form['senderID']
    source = form['source']
    keys = form['keys']
    translation = form['translation']
    reTranslated = form['reTranslated']
    editedTranslation = form['editedTranslation']
    paraphrased               = form['Paraphrased']
    paraphraseSource          = form['ParaphraseSource'         ] if 'ParaphraseSource'          in form else ""
    paraphraseSourceSel       = form['ParaphraseSourceSel'      ] if 'ParaphraseSourceSel'       in form else ""
    paraphraseOutput1_Text    = form['ParaphraseOutput1_Text'   ] if 'ParaphraseOutput1_Text'    in form else ""
    paraphraseOutput1_Tone    = form['ParaphraseOutput1_Tone'   ] if 'ParaphraseOutput1_Tone'    in form else ""
    paraphraseOutput1_Content = form['ParaphraseOutput1_Content'] if 'ParaphraseOutput1_Content' in form else ""
    paraphraseOutput2_Text    = form['ParaphraseOutput2_Text'   ] if 'ParaphraseOutput2_Text'    in form else ""
    paraphraseOutput2_Tone    = form['ParaphraseOutput2_Tone'   ] if 'ParaphraseOutput2_Tone'    in form else ""
    paraphraseOutput2_Content = form['ParaphraseOutput2_Content'] if 'ParaphraseOutput2_Content' in form else ""
    paraphraseOutput3_Text    = form['ParaphraseOutput3_Text'   ] if 'ParaphraseOutput3_Text'    in form else ""
    paraphraseOutput3_Tone    = form['ParaphraseOutput3_Tone'   ] if 'ParaphraseOutput3_Tone'    in form else ""
    paraphraseOutput3_Content = form['ParaphraseOutput3_Content'] if 'ParaphraseOutput3_Content' in form else ""
    selfBeforePara            = form['SelfBeforePara']
    selfAfterPara             = form['SelfAfterPara']

    cursor.execute("INSERT INTO Edits (MessageID, Time, SenderID, Source, Translation, EditedTranslation, Retranslated, KeysPressed,"
                   "Paraphrased              ,"
                   "ParaphraseSource         ,"
                   "ParaphraseSourceSel      ,"
                   "ParaphraseOutput1_Text   ,"
                   "ParaphraseOutput1_Tone   ,"
                   "ParaphraseOutput1_Content,"
                   "ParaphraseOutput2_Text   ,"
                   "ParaphraseOutput2_Tone   ,"
                   "ParaphraseOutput2_Content,"
                   "ParaphraseOutput3_Text   ,"
                   "ParaphraseOutput3_Tone   ,"
                   "ParaphraseOutput3_Content,"
                   "SelfBeforePara           ,"
                   "SelfAfterPara             "
                   ")"
                   "VALUES (%s, %s, %s, %s, %s, %s, %s, %s,"
                   " %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                   (mID, time, sender, source, translation, editedTranslation, reTranslated, keys,
                    paraphrased              ,
                    paraphraseSource         ,
                    paraphraseSourceSel      ,
                    paraphraseOutput1_Text   ,
                    paraphraseOutput1_Tone   ,
                    paraphraseOutput1_Content,
                    paraphraseOutput2_Text   ,
                    paraphraseOutput2_Tone   ,
                    paraphraseOutput2_Content,
                    paraphraseOutput3_Text   ,
                    paraphraseOutput3_Tone   ,
                    paraphraseOutput3_Content,
                    selfBeforePara           ,
                    selfAfterPara
                    ))
    con.commit()

    cursor.close()
    con.close()
    print(json.dumps({"Status" : "Success"}))

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
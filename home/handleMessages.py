#!/usr/bin/env python3.11
# dos2unix /var/www/html/1/handleMessages.py
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
load_dotenv('/var/www/html/9/.env')

def outputSQLQuery(form):
    # print(sys.path)

    # import pyodbc
    # server = 'database-2.c2upl2uwejtd.us-east-2.rds.amazonaws.com'
    # database = '1'
    # username = 'admin'
    # password = 'L3arn2Le4rn'
    # driver = '{ODBC Driver 18 for SQL Server}' # Driver you need to connect to the database {SQL Server}
    # port = '1433'
    # cnxn = pyodbc.connect('DRIVER='+driver+';PORT=port;SERVER='+server
    #                       +';PORT='+port+';DATABASE='+database
    #                       +';UID='+username+';PWD={'+password
    #                       +';Encrypt=no;TrustServerCertificate=yes}')

    # import pymssql

    connection = {
        'host': os.getenv('DB_HOST'),
        'username': os.getenv('DB_USERNAME'),
        'password': os.getenv('DB_PASSWORD'),
        'db': os.getenv('DB_NAME')
    }
    con=pymssql.connect(connection['host'],connection['username'],connection['password'],connection['db'])

    cursor=con.cursor()

    # form = cgi.FieldStorage()
    to = form["to"]
    sender = form['from']
    trial = form['trial']
    message = form['message']

    cursor.execute("INSERT INTO Messages (SenderID, ReceiverID, Message, TrialNumber) VALUES (%s, %s, %s, %s)",
                   (sender, to, message, trial))
    con.commit()


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

#!/usr/bin/env python3

# print("Hello World")
import cgitb
cgitb.enable()

def textToImage():
  import json

  form = cgi.FieldStorage()
  promt = form.getvalue('prompt')
  seed = form.getvalue('seed')


  # import sys
  # sys.path.append('/var/www/stable-diffusion-webui/modules')
  # sys.path.append('/var/www/stable-diffusion-webui') # Add the directory containing txt2img to the system path
  # print(sys.path)
  # #from ..stable-diffusion-webui.modules.txt2img import txt2img
  # #from ........home.'ec2-user'.stable-diffusion-webui.modules.txt2img import txt2img
  # txt2img = __import__("txt2img.txt2img")

  import torch
  from diffusers import StableDiffusionPipeline

  model_id = "CompVis/stable-diffusion-v1-4"
  device = "cuda"


  pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16)
  pipe = pipe.to(device)

  prompt = "a photo of an astronaut riding a horse on mars"
  image = pipe(prompt).images[0]

  image.save("astronaut_rides_horse.png")

  # Do something with the prompt and seed variables, such as generating an image.
  print(json.dumps({"success": True, "message": "Image generated successfully"}))

try:
  import cgi
  print("Content-type: text/html\n\n")   # say generating html
  textToImage()
except:
  import cgi
  cgitb.handler()
  cgi.print_exception()                 # catch and print errors


#
# import cgi
# textToImage()

# import json
# import sys
# sys.path.insert(0, '/home/ec2-user/stable-diffusion-webui/modules/') # Add the directory containing txt2img to the system path
# from txt2img import txt2img
#
# # from /home/ec2-user/stable-diffusion-webui/modules/txt2img.py import txt2img
#
#
# def textToImage():
#   data = json.loads(input())
#   prompt = data["prompt"]
#   seed = data["seed"]
#   # Do something with the prompt and seed variables, such as generating an image.
#   response = {"success": True, "message": "Image generated successfully"}
#   print(json.dumps(response))
#
# textToImage()

"""

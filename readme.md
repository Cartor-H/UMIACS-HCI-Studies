# Architecture




# Accessing Server
* Currently the server is accessed based on allowed IP addresses, which I change depending on where I'm working from.
  I will attempt to make it based on a vpn network instead. That way others can log in regardless of where they are,
  and it's more secure.
## Website
* Testing Link: http://52.15.204.7/home/?userID=1
* https://system-fai-im.info/home/?userID=1
* https://system-fai-im.info/
* http://52.15.204.7/
* When checking for updates make sure to do command + shift + r

## File Transfer
- `ssh -i "<Path>/ResearchServerKey.pem" ec2-user@ec2-52-15-204-7.us-east-2.compute.amazonaws.com`
- `scp -i "<Path>/ResearchServerKey.pem" -r "<Local_Path>/gpt_resond_message.py" ec2-user@ec2-52-15-204-7.us-east-2.compute.amazonaws.com:/var/www/html/article/gpt_resond_message.py`
- `scp -i "<Path>/ResearchServerKey.pem" -r "<Path>/Research Server/www/html/home" ec2-user@ec2-52-15-204-7.us-east-2.compute.amazonaws.com:/var/www/html/`
- `scp -i "<Path>/ResearchServerKey.pem" -r "<Path>/Research Server/www/html/article" ec2-user@ec2-52-15-204-7.us-east-2.compute.amazonaws.com:/var/www/html/`


# Adding Functions

## Naming Conventions:
To maintain a consistent and organized project structure, follow these naming conventions for Python files handling various tasks.

### SQL Database & S3 File Get Requests
- **Format:** `get_<entity>.py`
- **Purpose:** Handles SQL queries &/or S3 files (images, pdfs, etc) that retrieve data.
- **Examples:**
  - `get_messages.py`
  - `get_articles.py`
  - `get_article_photos.py`
  - `get_users.py`

### SQL Save Requests
- **Format:** `save_<entity>.py`
- **Purpose:** Handles SQL queries that save or update data in the database.
- **Examples:**
  - `save_message.py`
  - `save_article.py`
  - `save_user.py`

### S3 File Store Requests
- **Format:** `store_<entity>.py`
- **Purpose:** Handles S3 File uploads that save or update data in the S3 filesyste.
- **Examples:**
  - `store_article_pdf.py`
  - `store_article_icon.py`
  - `store_article_photos.py`

### Sending a Prompt to ChatGPT
- **Format:** `gpt_<action>_<entity>.py`
- **Purpose:** Handles interactions with ChatGPT, such as generating or classifying content.
- **Examples:**
  - `gpt_classify_message.py`
  - `gpt_generate_summary.py`
  - `gpt_analyze_sentiment.py`

## Folder Structure for Web Pages
To ensure a structured and maintainable web application, organize your files as follows:

```
/history
│── index.html
│── script.js
└── /functions
    │── get_history.py
    ...
/articles
│── index.html
│── script.js
└── /functions
    │── get_messages.py
    │── save_message.py
    │── get_article.py
    ...
/home
│── index.html
│── script.js
│── style.css
└── /functions
    │── get_articles.py
```

### Why This Structure?
- **Separation of Concerns:** Keeps Python logic separate from front-end files.
- **Scalability:** Facilitates growth and modularity.
- **Clarity:** Ensures each file’s role is easily identifiable.
- **Security** Helps prevent exploitation of sql queries and api keys.


## Saving and Adding to the Server

### Python Functions
1) Make sure to run `chmod +x <file path>` or `chmod +x /var/www/html/*/*/*.py` so that the file is executable by the server.
2) When installing packages, use `sudo python3.11 -m pip install <package>` otherwise server errors (code 500) will occur
   Ideally a virtual environment should be used, but this started as a simple script and doing so now would cause too much downtime and take time away from making new features.
3) If updloading files from a windows system be sure to run `dos2unix <file_path>` or `dos2unix /var/www/html/*/*/*.py` so that the file is readable by the server.



# SQL Structure

## Tables:

### Users
  **goal:** A list of all the user ID's that you want to keep track of. If they aren't listed here, they are not included in the study.
            This is helpful for sorting out test userIDs from the real userIDs.

```SQL
USE News_Interface;

-- make table `UserReadArticleHistory`
-- ID prim key, identity
-- UserID foreign key
-- ArticleID foreign key
-- ReadTime datetime2(7)

CREATE TABLE UserReadArticleHistory (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    ArticleID INT NOT NULL,
    ReadTime DATETIME2(7) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (ArticleID) REFERENCES Articles(ID)
);

-- make table `ArticleOpenHistory`
-- ID - prim key , identity
-- Action nvarchar(50)
-- ActionDate datetime2(7)
-- ArticleID int
-- UserID int

CREATE TABLE [dbo].[ArticleOpenHistory](
    [ID] [int] IDENTITY(1,1) NOT NULL,
    [Action] [nvarchar](50) NULL,
    [ActionDate] [datetime2](7) NULL,
    [ArticleID] [int] NULL,
    [UserID] [int] NULL,
)

-- make table `Users`
-- UserID prim key , identity
-- DisplayName nvarchar(50)
-- TestUser boolean

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    DisplayName NVARCHAR(50),
    TestUser BIT
);
```

# SSL / https
Certificate: /etc/pki/tls/certs/ssl_cert.pem

Private Key: /etc/pki/tls/private/ssl_priv_key.key

Chain Certificate: /etc/pki/tls/certs/origin_ca_rsa_root.pem

# Architecture




# Accessing Server




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
/articles
│── index.html
│── script.js
└── /functions
    │── get_messages.py
    │── save_message.py
    │── gpt_classify_message.py
```

### Why This Structure?
- **Separation of Concerns:** Keeps Python logic separate from front-end files.
- **Scalability:** Facilitates growth and modularity.
- **Clarity:** Ensures each file’s role is easily identifiable.

By following these conventions and structures, you ensure consistency, maintainability, and ease of collaboration across the project.










# SSL / https
Certificate: /etc/pki/tls/certs/ssl_cert.pem

Private Key: /etc/pki/tls/private/ssl_priv_key.key

Chain Certificate: /etc/pki/tls/certs/origin_ca_rsa_root.pem



# IMPORTANT!!
When installing packages, use `sudo python3.11 -m pip install <package>` otherwise server errors (code 500) will occur

Ideally a virtual environment should be used, but this started as a simple script and doing so now would cause too much downtime
and take time away from making new features
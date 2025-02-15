# SSL / https
Certificate: /etc/pki/tls/certs/ssl_cert.pem

Private Key: /etc/pki/tls/private/ssl_priv_key.key

Chain Certificate: /etc/pki/tls/certs/origin_ca_rsa_root.pem



# IMPORTANT!!
When installing packages, use `sudo python3.11 -m pip install <package>` otherwise server errors (code 500) will occur

Ideally a virtual environment should be used, but this started as a simple script and doing so now would cause too much downtime
and take time away from making new features
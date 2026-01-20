FROM ubuntu:18.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    apache2 \
    mysql-server \
    php \
    php-mysql \
    libapache2-mod-php \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone SQLi Labs
WORKDIR /var/www/html
RUN git clone https://github.com/Audi-1/sqli-labs.git

# Check what we actually cloned (for debugging)
RUN ls -R /var/www/html/sqli-labs/ || echo "Clone failed"

# Set permissions
RUN chown -R www-data:www-data /var/www/html/sqli-labs
RUN chmod -R 755 /var/www/html/sqli-labs

# Configure Apache
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Configure MySQL
RUN mkdir -p /var/run/mysqld && chown mysql:mysql /var/run/mysqld

EXPOSE 80

# Start services and create database manually (no setup-db.sql dependency)
CMD service mysql start && \
    sleep 10 && \
    mysql -e "CREATE DATABASE IF NOT EXISTS security;" && \
    mysql -e "USE security; \
    CREATE TABLE IF NOT EXISTS users ( \
        id int(3) NOT NULL AUTO_INCREMENT, \
        username varchar(20) NOT NULL, \
        password varchar(20) NOT NULL, \
        PRIMARY KEY (id) \
    );" && \
    mysql -e "USE security; \
    INSERT IGNORE INTO users (id, username, password) VALUES \
    (1, 'Dumb', 'Dumb'), \
    (2, 'Angelina', 'I-kill-you'), \
    (3, 'Dummy', 'p@ssword'), \
    (4, 'secure', 'crappy'), \
    (5, 'stupid', 'stupidity'), \
    (6, 'superman', 'genious'), \
    (7, 'batman', 'mob!le'), \
    (8, 'admin', 'admin'), \
    (9, 'admin1', 'admin1'), \
    (10, 'admin2', 'admin2'), \
    (11, 'admin3', 'admin3'), \
    (12, 'dhakkan', 'dumbo'), \
    (14, 'admin4', 'admin4');" && \
    service apache2 start && \
    tail -f /var/log/apache2/error.log
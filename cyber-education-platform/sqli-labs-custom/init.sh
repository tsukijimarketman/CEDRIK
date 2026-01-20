#!/bin/bash
service mysql start
sleep 5

mysql <<MYSQL
CREATE DATABASE IF NOT EXISTS security;
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY '123456';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
USE security;
SOURCE /var/www/html/sqli-labs/sql-connections/setup-db.sql;
MYSQL

service apache2 start
tail -f /var/log/apache2/error.log
#!/bin/bash
# User data script — Data Tier EC2 (Amazon Linux 2023)
# Installs MySQL 8.0. Run db.sql manually after first boot.

set -euo pipefail

yum update -y

# MySQL 8.0 community repo
wget -q https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm
rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
dnf install -y mysql80-community-release-el9-1.noarch.rpm
dnf install -y mysql-community-server

systemctl enable mysqld
systemctl start mysqld

echo "MySQL installed. Retrieve temp password with:"
echo "  sudo grep 'temporary password' /var/log/mysqld.log"
echo "Then run: sudo mysql_secure_installation"
echo "And restore schema: mysql -u root -p < data-tier/db.sql"

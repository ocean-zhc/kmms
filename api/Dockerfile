FROM php:8.2-apache

# 安装 PostgreSQL 和 cURL 扩展
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libcurl4-openssl-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 启用 Apache rewrite 模块
RUN a2enmod rewrite

# 允许 .htaccess
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /var/www/html

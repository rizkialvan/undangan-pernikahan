FROM php:8.2-fpm

RUN apt-get update --fix-missing
RUN apt-get install -y zip unzip libonig-dev libicu-dev
RUN apt-get install -y libzip-dev libpq-dev
RUN apt-get install -y build-essential libssl-dev zlib1g-dev
RUN apt-get install -y libpng-dev libjpeg62-turbo-dev libwebp-dev libfreetype6-dev
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp
RUN docker-php-ext-install pdo zip pdo_pgsql pgsql opcache intl bcmath mbstring gd exif
RUN docker-php-ext-enable pdo zip pdo_pgsql pgsql opcache intl bcmath mbstring gd exif

COPY /api/php.ini /usr/local/etc/php/conf.d/opcache.ini
COPY /api/php-fpm-tuning.conf /usr/local/etc/php-fpm.d/zz-tuning.conf

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY . /var/www
WORKDIR /var/www

RUN chown -R www-data:www-data /var/www && \
    chmod -R 755 /var/www && \
    chmod -R 775 /var/www/cache

RUN composer install --prefer-dist --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-mongodb

RUN --mount=type=secret,id=env,target=/var/www/.env \
    php saya view:cache

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
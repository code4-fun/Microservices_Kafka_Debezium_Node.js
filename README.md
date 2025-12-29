Данный проект представляет собой форк приложения по продаже 
билетов из курса Стивена Гридера **Microservices with Node.js and React**,
существенно переработанный и расширенный с целью:

- модернизации технологического стека,

- внедрения production-подходов к событийной архитектуре,

- повышения надёжности, наблюдаемости и расширяемости системы.

## Изменения по сравнению с оригинальным проектом

### Event-driven архитектура

- Устаревший **NATS Streaming** заменен на **Apache Kafka**,

- Реализованы **Retry**-механизмы, **DLQ**-топики для неуспешных 
  сообщений.

### Схемы событий и контрактная совместимость

- Для описания и валидации событий используется **Confluent Schema
  Registry**,

- Все события сериализуются с помощью **AVRO**-схем,

- **TypeScript**-типы не используются в качестве контрактов между 
  сервисами,

- Контроль совместимости схем осуществляется на уровне **Schema
  Registry**.

### Transactional Outbox

Во всех сервисах реализован паттерн **Transactional Outbox**, 
обеспечивающий атомарность записи бизнес-данных и событий.

#### Orders service (PostgreSQL)

- В сервисе orders Вместо **MongoDB** + **Mongoose** используется
  **PostgreSQL** + **Prisma**,

- Для публикации событий применяется:

  - **Confluent Kafka Connect**,

  - **Debezium PostgreSQL Connector**,

  - **Debezium Outbox Event Router SMT**,

- **Debezium** реплицирует изменения напрямую из **WAL**-лога PostgreSQL в 
  raw-топики **Kafka**,

- Для обработки этих событий реализован выделенный воркер, который:

  - потребляет стрим из raw-топиков,

  - валидирует и публикует сообщения в обычные топики с использованием
    заранее зарегистрированных **AVRO**-схем.

  Примечание:
  **ksqlDB** и **Kafka Streams** не используются, так как они не подходят
  для сценариев, где требуется строгая валидация пользовательских 
  **AVRO**-схем, зарегистрированных заранее.

#### MongoDB-based сервисы

- MongoDB во всех сервисах настроена в режиме **single-member 
  Replica Set** для поддержки транзакций,

- Добавлена коллекция **outbox**,

- Запись бизнес-данных и события в **outbox** выполняется в рамках одной
  транзакции.

  #### Outbox worker

- Поскольку **Debezium MongoDB Connector**:

  - не поддерживает **Debezium Outbox Event Router**,

  - не позволяет использовать пользовательские **AVRO**-схемы,

  реализован отдельный Node.js-воркер, который:

  - читает события из коллекции **outbox**,

  - кодирует их в **AVRO**,

  - публикует сообщения в **Kafka**,

  - реализует **Retry**-механизм,

  - отправляет неуспешные сообщения в **DLQ**-топики,

  - дополнительно сохраняет их в коллекцию **outbox_dlq**.

### Тестирование

Для тестов в сервисе **orders** используется **Testcontainers**.

## Запуск проекта

Локально проект можно запустить выполнив следующие шаги

```shell
# Сборка и пуш Docker-образов

docker build -t dockerhub_username/auth:latest auth

docker build -t dockerhub_username/tickets:latest tickets

docker build -t dockerhub_username/expiration:latest expiration

docker build -t dockerhub_username/payments:latest payments

docker build -t dockerhub_username/orders:latest orders

docker build -t dockerhub_username/client:latest client

docker build -t dockerhub_username/kafka-topics-job:latest infra/k8s/kafka/topics-job

docker build -t dockerhub_username/kafka-connect-debezium:latest infra/k8s/kafka/kafka-connect

# Применение ingress-nginx манифеста

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Создание секретов

kubectl create secret generic jwt-secret --from-literal=JWT_KEY=asdf --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic orders-postgres-credentials \
--from-literal=POSTGRES_USER=postgres \
--from-literal=POSTGRES_PASSWORD=postgres \
--from-literal=DATABASE_URL="postgresql://postgres:postgres@orders-postgres-srv:5432/orders?schema=public" \
--dry-run=client -o yaml | kubectl apply -f -

echo "Creating Stripe secret..."
kubectl create secret generic stripe-secret \
--from-literal STRIPE_KEY=sk_test_xxx \
--dry-run=client -o yaml | kubectl apply -f -

kubectl create secret tls ticketing-tls --cert=infra/certs/ticketing.dev.pem --key=infra/certs/ticketing.dev-key.pem --dry-run=client -o yaml | kubectl apply -f -

#Starting Skaffold

skaffold dev

```



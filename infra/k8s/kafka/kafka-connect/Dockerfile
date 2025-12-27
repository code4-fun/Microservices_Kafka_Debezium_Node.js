FROM confluentinc/cp-kafka-connect:7.6.0

ENV DEBEZIUM_VERSION=2.6.0.Final

RUN mkdir -p /usr/share/java/debezium

# Debezium Postgres connector
RUN curl -L -o /tmp/debezium-postgres.tar.gz \
    https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/${DEBEZIUM_VERSION}/debezium-connector-postgres-${DEBEZIUM_VERSION}-plugin.tar.gz \
    && tar -xzf /tmp/debezium-postgres.tar.gz -C /usr/share/java/debezium \
    && rm /tmp/debezium-postgres.tar.gz

# Debezium SMTs
RUN curl -L -o /usr/share/java/debezium/debezium-outbox-event-router.jar \
    https://repo1.maven.org/maven2/io/debezium/debezium-outbox-event-router/${DEBEZIUM_VERSION}.jar

RUN curl -L -o /usr/share/java/debezium/debezium-transformations.jar \
    https://repo1.maven.org/maven2/io/debezium/debezium-transformations/${DEBEZIUM_VERSION}/debezium-transformations-${DEBEZIUM_VERSION}.jar

ENV CONNECT_PLUGIN_PATH="/usr/share/java"
ENV KAFKA_HEAP_OPTS="-Xms512m -Xmx1g"

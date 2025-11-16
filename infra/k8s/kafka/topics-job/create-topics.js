const { Kafka } = require('kafkajs');
const { Topics } = require('@aitickets123654/common-kafka');

async function run() {
  const brokers = [process.env.KAFKA_URL || 'kafka-srv:9092'];
  const kafka = new Kafka({ clientId: 'topics-creator', brokers });
  const admin = kafka.admin();
  await admin.connect();

  const allTopics = Object.values(Topics);
  const existing = await admin.listTopics();

  for (const topic of allTopics) {
    if (!existing.includes(topic)) {
      console.log(`Creating topic ${topic}`);
      await admin.createTopics({
        topics: [{ topic, numPartitions: 2, replicationFactor: 1 }],
        waitForLeaders: true,
      });
    } else {
      console.log(`Topic ${topic} already exists`);
    }
  }

  await admin.disconnect();
  console.log('All topics ensured.');
}

run().catch(err => {
  console.error('Topic creation failed:', err);
  process.exit(1);
});

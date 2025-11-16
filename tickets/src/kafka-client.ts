import { Kafka, Producer, Admin, Consumer } from 'kafkajs';

class KafkaClient {
  private _kafka?: Kafka;
  private _producer?: Producer;
  private _admin?: Admin;
  private _consumers: Consumer[] = [];

  get kafka() {
    if (!this._kafka) {
      throw new Error('Kafka not initialized');
    }
    return this._kafka;
  }

  get producer() {
    if (!this._producer) {
      throw new Error('Producer not initialized');
    }
    return this._producer;
  }

  get admin() {
    if (!this._admin) {
      throw new Error('Admin not initialized');
    }
    return this._admin;
  }

  async connect({
    clientId,
    brokers,
  }: {clientId: string; brokers: string[]}) {
    this._kafka = new Kafka({
      clientId,
      brokers
    });
    this._admin = this._kafka.admin();
    await this._admin.connect();

    this._producer = this._kafka.producer();
    await this._producer.connect();

    console.log(`Kafka connected as ${clientId}`);
  }

  createConsumer(groupId: string) {
    const consumer = this.kafka.consumer({ groupId });
    this._consumers.push(consumer);
    return consumer;
  }

  async disconnect() {
    if (this._producer) await this._producer.disconnect();
    if (this._admin) await this._admin.disconnect();
    for (const consumer of this._consumers) {
      await consumer.disconnect();
    }
    console.log('Kafka disconnected');
  }
}

export const kafkaClient = new KafkaClient();

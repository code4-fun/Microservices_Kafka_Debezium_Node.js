export const kafkaClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  createConsumer: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    run: jest.fn().mockImplementation(async ({ eachMessage }) => {
      kafkaClient.__mockEachMessage = eachMessage;
    }),
    commitOffsets: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  }),
  producer: {
    send: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  },
  admin: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    listTopics: jest.fn().mockResolvedValue([]),
    createTopics: jest.fn().mockResolvedValue(true),
  },

  __mockEachMessage: undefined as any,
}

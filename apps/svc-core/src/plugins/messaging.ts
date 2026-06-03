import amqp from "amqplib";
import type { Channel, ConfirmChannel, ChannelModel, GetMessage } from "amqplib";
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import {
  assertEmailTopology,
  emailQueues,
  publishEmailVerificationRequested,
  type EmailVerificationRequestedMessage,
} from "@cm/messaging/email";
import {
  assertWidgetTopology,
  publishWidgetProcessingRequested,
  publishWidgetProcessingRetry,
  widgetQueues,
  type WidgetProcessingRequestedMessage,
} from "@cm/messaging/widget";
import {
  assertWidgetConsumerTopology,
  publishWidgetConsumerProcessingRequested,
  widgetConsumerQueues,
  type WidgetConsumerProcessingRequestedMessage,
} from "@cm/messaging/widget-consumer";
import {
  assertTopicRoutingTopology,
  publishTopicRoutingDemoMessage,
  topicRoutingBindings,
  type TopicRoutingDemoMessage,
} from "@cm/messaging/topic-routing";
import {
  assertPriorityQueueTopology,
  priorityQueueQueues,
  publishPriorityQueueProcessingRequested,
  type PriorityQueueProcessingRequestedMessage,
} from "@cm/messaging/priority-queue";

export type TopicRoutingQueueOverview = {
  key: string;
  queue: string;
  bindingPattern: string;
  description: string;
  messageCount: number;
  messages: TopicRoutingDemoMessage[];
};

export type PriorityQueueOverview = {
  messageCount: number;
};

export type QueueOverview = {
  queue: string;
  messageCount: number;
  consumerCount: number;
};

export type MessagingClient = {
  publishEmailVerificationRequested(message: EmailVerificationRequestedMessage): Promise<void>;
  publishWidgetProcessingRequested(message: WidgetProcessingRequestedMessage): Promise<void>;
  publishWidgetProcessingRetry(message: WidgetProcessingRequestedMessage): Promise<void>;
  publishWidgetConsumerProcessingRequested(message: WidgetConsumerProcessingRequestedMessage): Promise<void>;
  publishTopicRoutingDemoMessage(message: TopicRoutingDemoMessage): Promise<void>;
  publishPriorityQueueProcessingRequested(message: PriorityQueueProcessingRequestedMessage): Promise<void>;
  getNextWidgetProcessingMessage(): Promise<GetMessage | false>;
  getNextWidgetDeadLetterMessage(): Promise<GetMessage | false>;
  getNextPriorityQueueMessage(): Promise<GetMessage | false>;
  getWidgetProcessingMessageCount(): Promise<number>;
  getWidgetRetryMessageCount(): Promise<number>;
  getWidgetDeadLetterMessageCount(): Promise<number>;
  getWidgetConsumerMessageCount(): Promise<number>;
  getEmailDispatchQueueOverview(): Promise<QueueOverview>;
  getWidgetConsumerQueueOverview(): Promise<QueueOverview>;
  getTopicRoutingQueueOverviews(): Promise<TopicRoutingQueueOverview[]>;
  getPriorityQueueOverview(): Promise<PriorityQueueOverview>;
  ackWidgetProcessingMessage(message: GetMessage): void;
  rejectWidgetProcessingMessage(message: GetMessage, requeue: boolean): void;
  ackWidgetDeadLetterMessage(message: GetMessage): void;
  rejectWidgetDeadLetterMessage(message: GetMessage, requeue: boolean): void;
  ackPriorityQueueMessage(message: GetMessage): void;
  rejectPriorityQueueMessage(message: GetMessage, requeue: boolean): void;
  purgeWidgetQueues(): Promise<void>;
  purgeWidgetConsumerQueue(): Promise<void>;
  purgeTopicRoutingQueues(): Promise<void>;
  purgePriorityQueue(): Promise<void>;
};

type MessagingPluginOptions = {
  rabbitMqUrl: string;
};

async function messagingPluginImpl(
  app: FastifyInstance,
  opts: MessagingPluginOptions,
): Promise<void> {
  const connection = await amqp.connect(opts.rabbitMqUrl) as ChannelModel;
  const channel = await connection.createConfirmChannel() as ConfirmChannel;
  const widgetConsumerChannel = await connection.createChannel() as Channel;

  await assertEmailTopology(channel);
  await assertWidgetTopology(channel);
  await assertWidgetTopology(widgetConsumerChannel);
  await assertWidgetConsumerTopology(channel);
  await assertWidgetConsumerTopology(widgetConsumerChannel);
  await assertTopicRoutingTopology(channel);
  await assertTopicRoutingTopology(widgetConsumerChannel);
  await assertPriorityQueueTopology(channel);
  await assertPriorityQueueTopology(widgetConsumerChannel);

  app.decorate("messaging", {
    publishEmailVerificationRequested: async (message: EmailVerificationRequestedMessage) => {
      await publishEmailVerificationRequested(channel, message);
    },
    publishWidgetProcessingRequested: async (message: WidgetProcessingRequestedMessage) => {
      await publishWidgetProcessingRequested(channel, message);
    },
    publishWidgetProcessingRetry: async (message: WidgetProcessingRequestedMessage) => {
      await publishWidgetProcessingRetry(channel, message);
    },
    publishWidgetConsumerProcessingRequested: async (message: WidgetConsumerProcessingRequestedMessage) => {
      await publishWidgetConsumerProcessingRequested(channel, message);
    },
    publishTopicRoutingDemoMessage: async (message: TopicRoutingDemoMessage) => {
      await publishTopicRoutingDemoMessage(channel, message);
    },
    publishPriorityQueueProcessingRequested: async (message: PriorityQueueProcessingRequestedMessage) => {
      await publishPriorityQueueProcessingRequested(channel, message);
    },
    getNextWidgetProcessingMessage: async () => {
      return widgetConsumerChannel.get(widgetQueues.processing, { noAck: false });
    },
    getNextWidgetDeadLetterMessage: async () => {
      return widgetConsumerChannel.get(widgetQueues.deadLetter, { noAck: false });
    },
    getNextPriorityQueueMessage: async () => {
      return widgetConsumerChannel.get(priorityQueueQueues.processing, { noAck: false });
    },
    getWidgetProcessingMessageCount: async () => {
      const result = await widgetConsumerChannel.checkQueue(widgetQueues.processing);
      return result.messageCount;
    },
    getWidgetRetryMessageCount: async () => {
      const result = await widgetConsumerChannel.checkQueue(widgetQueues.retry);
      return result.messageCount;
    },
    getWidgetDeadLetterMessageCount: async () => {
      const result = await widgetConsumerChannel.checkQueue(widgetQueues.deadLetter);
      return result.messageCount;
    },
    getWidgetConsumerMessageCount: async () => {
      const result = await widgetConsumerChannel.checkQueue(widgetConsumerQueues.processing);
      return result.messageCount;
    },
    getEmailDispatchQueueOverview: async () => {
      const result = await widgetConsumerChannel.checkQueue(emailQueues.dispatch);

      return {
        queue: emailQueues.dispatch,
        messageCount: result.messageCount,
        consumerCount: result.consumerCount,
      };
    },
    getWidgetConsumerQueueOverview: async () => {
      const result = await widgetConsumerChannel.checkQueue(widgetConsumerQueues.processing);

      return {
        queue: widgetConsumerQueues.processing,
        messageCount: result.messageCount,
        consumerCount: result.consumerCount,
      };
    },
    getTopicRoutingQueueOverviews: async () => {
      return Promise.all(topicRoutingBindings.map(async (binding) => {
        const result = await widgetConsumerChannel.checkQueue(binding.queue);
        const messages = await peekTopicRoutingMessages(widgetConsumerChannel, binding.queue);

        return {
          key: binding.key,
          queue: binding.queue,
          bindingPattern: binding.bindingPattern,
          description: binding.description,
          messageCount: result.messageCount,
          messages,
        };
      }));
    },
    getPriorityQueueOverview: async () => {
      const result = await widgetConsumerChannel.checkQueue(priorityQueueQueues.processing);

      return {
        messageCount: result.messageCount,
      };
    },
    ackWidgetProcessingMessage: (message: GetMessage) => {
      widgetConsumerChannel.ack(message);
    },
    rejectWidgetProcessingMessage: (message: GetMessage, requeue: boolean) => {
      widgetConsumerChannel.reject(message, requeue);
    },
    ackWidgetDeadLetterMessage: (message: GetMessage) => {
      widgetConsumerChannel.ack(message);
    },
    rejectWidgetDeadLetterMessage: (message: GetMessage, requeue: boolean) => {
      widgetConsumerChannel.reject(message, requeue);
    },
    ackPriorityQueueMessage: (message: GetMessage) => {
      widgetConsumerChannel.ack(message);
    },
    rejectPriorityQueueMessage: (message: GetMessage, requeue: boolean) => {
      widgetConsumerChannel.reject(message, requeue);
    },
    purgeWidgetQueues: async () => {
      await widgetConsumerChannel.purgeQueue(widgetQueues.processing);
      await widgetConsumerChannel.purgeQueue(widgetQueues.retry);
      await widgetConsumerChannel.purgeQueue(widgetQueues.deadLetter);
    },
    purgeWidgetConsumerQueue: async () => {
      await widgetConsumerChannel.purgeQueue(widgetConsumerQueues.processing);
    },
    purgeTopicRoutingQueues: async () => {
      for (const binding of topicRoutingBindings) {
        await widgetConsumerChannel.purgeQueue(binding.queue);
      }
    },
    purgePriorityQueue: async () => {
      await widgetConsumerChannel.purgeQueue(priorityQueueQueues.processing);
    },
  } satisfies MessagingClient);

  app.addHook("onClose", async () => {
    await widgetConsumerChannel.close();
    await channel.close();
    await connection.close();
  });
}

export const messagingPlugin = fp(messagingPluginImpl, {
  name: "messaging-plugin",
});

async function peekTopicRoutingMessages(
  channel: Channel,
  queue: string,
): Promise<TopicRoutingDemoMessage[]> {
  const messages: GetMessage[] = [];

  for (let index = 0; index < 5; index += 1) {
    const message = await channel.get(queue, { noAck: false });

    if (!message) {
      break;
    }

    messages.push(message);
  }

  for (const message of messages) {
    channel.nack(message, false, true);
  }

  return messages.flatMap((message) => {
    try {
      return [JSON.parse(message.content.toString("utf8")) as TopicRoutingDemoMessage];
    } catch {
      return [];
    }
  });
}

### Email

@cm/messaging
  Defines message shape, routing key, queue, exchange.

svc-core auth route
  Creates an EmailSendRequestedMessage.

RabbitMQ
  Stores/routes the message by exchange + routing key.
  Does not understand the business payload.

email-dispatcher
  Consumes the queue.
  Validates payload against EmailSendRequestedMessageSchema.
  Calls @cm/email.sendEmail(message.email).

# Mental Model

RabbitMQ is the postal service.
Routing key is the address label.
EmailSendRequestedMessage is the letter inside the envelope.
email-dispatcher is the person who opens the letter and knows what to do.

# Local Startup

npm run infra:up
npm run infra:workers:up
npm run api:dev

In a second terminal:
npm run public:dev

npm run healthcare-transform:dev
npm run healthcare-transform:docker:up

You only need the Cloudflare tunnel if you want to test Resend webhooks:
npm run email-webhooks:tunnel

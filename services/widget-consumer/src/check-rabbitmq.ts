import amqp from "amqplib";

const rabbitMqUrl = process.env.RABBITMQ_URL?.trim();

if (!rabbitMqUrl) {
  console.error("RABBITMQ_URL is required");
  process.exitCode = 1;
} else {
  const connection = await amqp.connect(rabbitMqUrl);

  try {
    const channel = await connection.createChannel();
    await channel.close();
    console.log("RabbitMQ connection check passed");
  } finally {
    await connection.close();
  }
}

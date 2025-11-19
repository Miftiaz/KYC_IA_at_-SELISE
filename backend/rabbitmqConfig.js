// rabbitmqConfig.js
import amqp from 'amqplib';
import 'dotenv/config'; 

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const PDF_QUEUE = 'pdf_generation_queue';
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 10;

let connection = null;
let reconnectAttempts = 0;

export async function connectRabbitMQ() {
  try {
    console.log(`[RabbitMQ] Attempting connection to ${RABBITMQ_URL}...`);
    connection = await amqp.connect(RABBITMQ_URL);
    
    reconnectAttempts = 0;
    console.log('[RabbitMQ] Connected to RabbitMQ successfully');
    
    // Handle connection errors
    connection.on('error', (error) => {
      console.error('[RabbitMQ] Connection error:', error);
      connection = null;
    });
    
    connection.on('close', () => {
      console.warn('[RabbitMQ] Connection closed, will attempt to reconnect...');
      connection = null;
      scheduleReconnect();
    });
    
    return connection;
  } catch (error) {
    console.error('[RabbitMQ] Failed to connect to RabbitMQ:', error.message);
    reconnectAttempts++;
    
    if (reconnectAttempts < MAX_RETRIES) {
      console.log(`[RabbitMQ] Scheduling reconnect attempt ${reconnectAttempts}/${MAX_RETRIES} in ${RECONNECT_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
      return connectRabbitMQ();
    } else {
      console.error('[RabbitMQ] Max reconnection attempts reached. Please check if RabbitMQ is running.');
      throw error;
    }
  }
}

function scheduleReconnect() {
  if (reconnectAttempts < MAX_RETRIES) {
    reconnectAttempts++;
    setTimeout(() => {
      console.log(`[RabbitMQ] Reconnecting... (attempt ${reconnectAttempts}/${MAX_RETRIES})`);
      connectRabbitMQ().catch((err) => {
        console.error('[RabbitMQ] Reconnection failed:', err.message);
      });
    }, RECONNECT_DELAY);
  }
}


export async function getChannel() {
  if (!connection) {
    await connectRabbitMQ();
  }
  
  // If connection is invalid, try to reconnect
  if (connection && connection.closed) {
    console.warn('[RabbitMQ] Detected closed connection, reconnecting...');
    connection = null;
    await connectRabbitMQ();
  }
  
  return await connection.createChannel();
}

export async function publishPDFTask(applicationId) {
  try {
    console.log(`[RabbitMQ] Publishing PDF task for applicationId: ${applicationId}`);
    const channel = await getChannel();
    await channel.assertQueue(PDF_QUEUE, { durable: true });
    
    const message = {
      applicationId,
      timestamp: new Date(),
    };

    channel.sendToQueue(
      PDF_QUEUE,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log(`[RabbitMQ] PDF task published successfully for application ${applicationId}`);
  } catch (error) {
    console.error('[RabbitMQ] Error publishing PDF task:', error);
    throw error;
  }
}

export async function consumePDFTasks(callback) {
  try {
    const channel = await getChannel();
    await channel.assertQueue(PDF_QUEUE, { durable: true });
    
    channel.prefetch(1); // Process one task at a time
    
    channel.consume(PDF_QUEUE, async (msg) => {
      if (msg) {
        try {
          const task = JSON.parse(msg.content.toString());
          await callback(task);
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing PDF task:', error);
          channel.nack(msg, false, true); // Requeue on error
        }
      }
    });

    console.log('PDF worker started, waiting for tasks...');
  } catch (error) {
    console.error('Error setting up PDF consumer:', error);
    throw error;
  }
}

export { PDF_QUEUE };

import 'dotenv/config';
import http from 'http';
import connectDB from './db/index.js';
import app from './app.js';
import { initSocketIO } from './utils/socket.js';

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
initSocketIO(httpServer);

connectDB()
  .then(() => {
    const server = httpServer.listen(PORT, () => {
      console.log(`⚙️  Server is running at http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      console.error('❌ Server startup failed:', err.message);
      console.error(err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.log('❌ Failed to connect DB: ', err.message);
    console.error(err);
    process.exit(1);
  });

// Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {
  console.log(`❌ Shutting down the server due to Unhandled Promise Rejection`);
  console.error(err);
  process.exit(1);
});

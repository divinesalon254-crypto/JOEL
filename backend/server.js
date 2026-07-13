const express = require('express');
const cors = require('cors');
const prisma = require('./db/prismaClient');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const servicesRouter = require('./routes/services');
const customersRouter = require('./routes/customers');
const bookingsRouter = require('./routes/bookings');
const messagesRouter = require('./routes/messages');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/messages', messagesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

const express = require('express');
const prisma = require('../db/prismaClient');

const router = express.Router();

// Get all messages
router.get('/', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      include: {
        customer: true,
        user: true,
        booking: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { customerId: parseInt(req.params.customerId) },
      include: {
        booking: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread messages
router.get('/unread', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { isRead: false },
      include: {
        customer: true,
        booking: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: true,
        user: true,
        booking: true
      }
    });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message to customer
router.post('/', async (req, res) => {
  try {
    const { subject, body, messageType, customerId, userId, bookingId } = req.body;

    if (!subject || !body || !customerId || !userId || !bookingId) {
      return res.status(400).json({ error: 'Subject, body, customerId, userId, and bookingId are required' });
    }

    const message = await prisma.message.create({
      data: {
        subject,
        body,
        messageType: messageType || 'notification',
        customerId: parseInt(customerId),
        userId: parseInt(userId),
        bookingId: parseInt(bookingId)
      },
      include: {
        customer: true,
        user: true,
        booking: true
      }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
  try {
    const message = await prisma.message.update({
      where: { id: parseInt(req.params.id) },
      data: { isRead: true },
      include: {
        customer: true,
        booking: true
      }
    });

    res.json(message);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    await prisma.message.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

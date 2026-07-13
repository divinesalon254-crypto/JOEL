const express = require('express');
const prisma = require('../db/prismaClient');
const { generateBookingNumber } = require('../utils/bookingUtils');

const router = express.Router();

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        customer: true,
        service: true,
        user: true,
        messages: true
      }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: true,
        service: true,
        user: true,
        messages: true
      }
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bookings by status
router.get('/status/:status', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: req.params.status },
      include: {
        customer: true,
        service: true,
        user: true
      }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create booking
router.post('/', async (req, res) => {
  try {
    const { customerId, serviceId, appointmentDate, notes, userId } = req.body;

    if (!customerId || !serviceId || !appointmentDate) {
      return res.status(400).json({ error: 'CustomerId, serviceId, and appointmentDate are required' });
    }

    // Verify customer and service exist
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) }
    });
    const service = await prisma.service.findUnique({
      where: { id: parseInt(serviceId) }
    });

    if (!customer || !service) {
      return res.status(400).json({ error: 'Invalid customer or service' });
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        customerId: parseInt(customerId),
        serviceId: parseInt(serviceId),
        userId: parseInt(userId || 1),
        appointmentDate: new Date(appointmentDate),
        notes: notes || null,
        status: 'pending'
      },
      include: {
        customer: true,
        service: true,
        user: true
      }
    });

    // Send confirmation message to customer
    await prisma.message.create({
      data: {
        subject: 'Booking Confirmation - Divine Salon & Barbershop',
        body: `Your booking has been received. Booking #${booking.bookingNumber}. Service: ${service.name}. Appointment: ${new Date(appointmentDate).toLocaleString()}. We will confirm soon!`,
        messageType: 'notification',
        customerId: parseInt(customerId),
        userId: parseInt(userId || 1),
        bookingId: booking.id
      }
    });

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update booking status (Accept/Reject)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        customer: true,
        service: true,
        user: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: {
        customer: true,
        service: true,
        user: true,
        messages: true
      }
    });

    // Send message to customer based on status
    let messageBody = '';
    let messageType = '';

    switch (status) {
      case 'accepted':
        messageType = 'confirmation';
        messageBody = `Great news! Your booking #${booking.bookingNumber} for ${booking.service.name} has been ACCEPTED. Appointment: ${new Date(booking.appointmentDate).toLocaleString()}. Amount: $${booking.service.price}. Thank you for choosing Divine Salon & Barbershop!`;
        break;
      case 'rejected':
        messageType = 'rejection';
        messageBody = `Unfortunately, your booking #${booking.bookingNumber} for ${booking.service.name} has been rejected. Please contact us to reschedule. Sorry for any inconvenience!`;
        break;
      case 'completed':
        messageType = 'confirmation';
        messageBody = `Your appointment #${booking.bookingNumber} is now completed. Thank you for visiting Divine Salon & Barbershop! We hope to see you again soon.`;
        break;
      case 'cancelled':
        messageType = 'notification';
        messageBody = `Your booking #${booking.bookingNumber} has been cancelled. If you'd like to reschedule, please contact us.`;
        break;
    }

    if (messageBody) {
      await prisma.message.create({
        data: {
          subject: `Booking Update - ${status.toUpperCase()} (#${booking.bookingNumber})`,
          body: messageBody,
          messageType,
          customerId: booking.customerId,
          userId: booking.userId,
          bookingId: booking.id
        }
      });
    }

    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete booking
router.delete('/:id', async (req, res) => {
  try {
    await prisma.booking.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

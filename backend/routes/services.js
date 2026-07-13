const express = require('express');
const prisma = require('../db/prismaClient');

const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true }
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create service (admin only)
router.post('/', async (req, res) => {
  try {
    const { name, description, price, duration, category } = req.body;

    if (!name || !price || !duration || !category) {
      return res.status(400).json({ error: 'Name, price, duration, and category are required' });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        duration: parseInt(duration),
        category
      }
    });

    res.status(201).json(service);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Service name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update service
router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, duration, category, isActive } = req.body;

    const service = await prisma.service.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(duration && { duration: parseInt(duration) }),
        ...(category && { category }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json(service);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete service
router.delete('/:id', async (req, res) => {
  try {
    await prisma.service.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

'use strict';

const { Router } = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const {
  createCapsule,
  listCapsules,
  getCapsule,
  openCapsule,
  deleteCapsule,
  getCapsuleStats,
} = require('../controllers/capsule.controller');

const router = Router();

// All /api/capsules routes require authentication
router.use(requireAuth);

router.post('/', createCapsule);
router.get('/', listCapsules);
router.get('/stats', getCapsuleStats);
router.get('/:id', getCapsule);
router.post('/:id/open', openCapsule);
router.delete('/:id', deleteCapsule);

module.exports = router;

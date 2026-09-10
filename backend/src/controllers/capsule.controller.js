'use strict';

const { z } = require('zod');
const mongoose = require('mongoose');
const { Capsule } = require('../models/Capsule.model');
const User = require('../models/User.model');
const logger = require('../utils/logger');

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createCapsuleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(20000, 'Message too long'),
  unlockAt: z.string().datetime({ message: 'unlockAt must be a valid ISO 8601 date-time' }).transform((v) => new Date(v)),
  tags: z
    .array(z.string().min(1).max(32))
    .max(10, 'At most 10 tags allowed')
    .default([]),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  status: z.enum(['sealed', 'unlockable', 'opened', 'all']).default('all'),
  sort: z.enum(['newest', 'oldest', 'unlockSoon']).default('newest'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Strip sensitive fields from capsule for locked state response.
 * Returns everything except message and attachments when locked.
 */
function serializeCapsule(capsule, forOwner) {
  const obj = capsule.toJSON ? capsule.toJSON() : { ...capsule };

  if (!forOwner) {
    // Public view: omit content entirely
    delete obj.message;
    delete obj.attachments;
  } else if (obj.status === 'sealed') {
    // Owner but still sealed: omit content
    delete obj.message;
    delete obj.attachments;
  }

  return obj;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/capsules
 */
async function createCapsule(req, res, next) {
  try {
    const data = createCapsuleSchema.parse(req.body);

    // Ensure unlock date is in the future
    if (data.unlockAt <= new Date()) {
      return res.status(422).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Unlock date must be in the future' },
      });
    }

    // Sanitize tags
    const tags = [...new Set(data.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];

    const capsule = await Capsule.create({
      owner: req.user.userId,
      title: data.title,
      message: data.message,
      unlockAt: data.unlockAt,
      tags,
      status: 'sealed',
    });

    // Increment user capsule count
    await User.findByIdAndUpdate(req.user.userId, { $inc: { capsuleCount: 1 } });

    logger.info({ event: 'capsule.created', capsuleId: capsule._id, userId: req.user.userId }, 'Capsule created');

    return res.status(201).json({
      success: true,
      data: { capsule: serializeCapsule(capsule, true) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/capsules
 */
async function listCapsules(req, res, next) {
  try {
    const { page, limit, status, sort } = listQuerySchema.parse(req.query);

    const filter = { owner: req.user.userId, deletedAt: null };
    if (status !== 'all') filter.status = status;

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      unlockSoon: { unlockAt: 1 },
    };

    const [capsules, total] = await Promise.all([
      Capsule.find(filter)
        .sort(sortMap[sort])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Capsule.countDocuments(filter),
    ]);

    // Strip message/attachments for sealed capsules
    const serialized = capsules.map((c) => {
      const obj = { ...c };
      if (obj.status === 'sealed') {
        delete obj.message;
        delete obj.attachments;
      }
      return obj;
    });

    return res.status(200).json({
      success: true,
      data: {
        capsules: serialized,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/capsules/:id
 */
async function getCapsule(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid capsule ID' },
      });
    }

    const capsule = await Capsule.findOne({ _id: id, deletedAt: null }).populate('owner', 'username displayName');
    if (!capsule) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Capsule not found' },
      });
    }

    const isOwner = req.user && capsule.owner._id.toString() === req.user.userId;

    return res.status(200).json({
      success: true,
      data: { capsule: serializeCapsule(capsule, isOwner) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/capsules/:id/open
 * Mark an unlockable capsule as opened (user explicitly opens it).
 */
async function openCapsule(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid capsule ID' },
      });
    }

    const capsule = await Capsule.findOne({ _id: id, owner: req.user.userId, deletedAt: null });
    if (!capsule) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Capsule not found' },
      });
    }

    if (capsule.status === 'sealed') {
      return res.status(423).json({
        success: false,
        error: { code: 'CAPSULE_LOCKED', message: 'This capsule is still sealed until ' + capsule.unlockAt.toISOString() },
      });
    }

    if (capsule.status === 'opened') {
      return res.status(200).json({
        success: true,
        data: { capsule: capsule.toJSON() },
      });
    }

    capsule.status = 'opened';
    capsule.openedAt = new Date();
    await capsule.save();

    logger.info({ event: 'capsule.opened', capsuleId: capsule._id, userId: req.user.userId }, 'Capsule opened');

    return res.status(200).json({
      success: true,
      data: { capsule: capsule.toJSON() },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/capsules/:id
 */
async function deleteCapsule(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid capsule ID' },
      });
    }

    const capsule = await Capsule.findOne({ _id: id, owner: req.user.userId, deletedAt: null });
    if (!capsule) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Capsule not found' },
      });
    }

    capsule.deletedAt = new Date();
    await capsule.save();

    await User.findByIdAndUpdate(req.user.userId, { $inc: { capsuleCount: -1 } });

    logger.info({ event: 'capsule.deleted', capsuleId: capsule._id, userId: req.user.userId }, 'Capsule soft-deleted');

    return res.status(200).json({ success: true, data: { message: 'Capsule deleted' } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/capsules/stats — aggregate stats for authenticated user
 */
async function getCapsuleStats(req, res, next) {
  try {
    const [stats, recentlyUnlocked] = await Promise.all([
      Capsule.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(req.user.userId), deletedAt: null } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Capsule.countDocuments({
        owner: req.user.userId,
        status: 'unlockable',
        deletedAt: null,
      }),
    ]);

    const countByStatus = { sealed: 0, unlockable: 0, opened: 0 };
    for (const s of stats) countByStatus[s._id] = s.count;

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          ...countByStatus,
          total: countByStatus.sealed + countByStatus.unlockable + countByStatus.opened,
          awaitingOpen: recentlyUnlocked,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createCapsule, listCapsules, getCapsule, openCapsule, deleteCapsule, getCapsuleStats };

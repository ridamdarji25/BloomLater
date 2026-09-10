'use strict';

const mongoose = require('mongoose');

const CAPSULE_STATUSES = ['sealed', 'unlockable', 'opened'];

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, maxlength: 255 },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true, maxlength: 128 },
    size: { type: Number, required: true, min: 0 },
    storageKey: { type: String, required: true }, // disk path or S3 key
  },
  { _id: true }
);

const capsuleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title must not be empty'],
      maxlength: [120, 'Title must not exceed 120 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [20000, 'Message must not exceed 20,000 characters'],
    },
    unlockAt: {
      type: Date,
      required: [true, 'Unlock date is required'],
      validate: {
        validator: function (v) {
          // Only enforce future date on creation (not updates by cron)
          if (this.isNew) return v > new Date();
          return true;
        },
        message: 'Unlock date must be in the future',
      },
    },
    status: {
      type: String,
      enum: { values: CAPSULE_STATUSES, message: 'Invalid capsule status: {VALUE}' },
      default: 'sealed',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 10,
        message: 'A capsule may have at most 10 tags',
      },
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: 'A capsule may have at most 20 attachments',
      },
    },
    openedAt: {
      type: Date,
      default: null,
    },
    // Soft-delete
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for common query patterns
capsuleSchema.index({ owner: 1, createdAt: -1 });
capsuleSchema.index({ owner: 1, status: 1 });
capsuleSchema.index({ unlockAt: 1, status: 1 }); // for the cron job query

// Virtual: is this capsule currently locked?
capsuleSchema.virtual('isLocked').get(function () {
  return this.status === 'sealed' && this.unlockAt > new Date();
});

// Virtual: progress percentage toward unlock (0–100)
capsuleSchema.virtual('progressPercent').get(function () {
  if (this.status !== 'sealed') return 100;
  const total = this.unlockAt - this.createdAt;
  const elapsed = Date.now() - this.createdAt;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
});

// Query helper: exclude deleted capsules
capsuleSchema.query.active = function () {
  return this.where({ deletedAt: null });
};

const Capsule = mongoose.model('Capsule', capsuleSchema);

module.exports = { Capsule, CAPSULE_STATUSES };

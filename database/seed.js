'use strict';

/**
 * Seed script — creates a demo user and sample capsules.
 * Run standalone: node database/seed.js
 * Or via docker-compose after services are up.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bloomlater';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Demo1234!';

// Inline schemas (no circular deps)
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true, select: false },
  displayName: String,
  capsuleCount: { type: Number, default: 0 },
  lastActiveAt: { type: Date, default: Date.now },
}, { timestamps: true });

const capsuleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  unlockAt: { type: Date, required: true },
  status: { type: String, enum: ['sealed', 'unlockable', 'opened'], default: 'sealed' },
  tags: [String],
  attachments: { type: Array, default: [] },
  openedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Capsule = mongoose.model('Capsule', capsuleSchema);

const now = new Date();

const DEMO_USER = {
  email: 'demo@bloomlater.app',
  username: 'demouser',
  displayName: 'Demo User',
};

const DEMO_CAPSULES = [
  {
    title: 'A letter to my future self',
    message: `Dear future me,

I'm writing this on ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. 
The world feels big right now, and there's so much I don't know yet. By the time you read this, 
I hope you've figured out some of it.

I'm hoping you still love the things that made you feel alive. I'm hoping you've been kind 
to yourself and to others. I'm hoping you've taken risks — the ones that mattered.

This moment will always have existed. It was real.

With love,
Me (then)`,
    unlockAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    status: 'sealed',
    tags: ['self', 'future', 'reflection'],
  },
  {
    title: 'My predictions for the next decade',
    message: `Technology predictions — sealed ${now.getFullYear()}:

1. AI assistants will be embedded in nearly every software product.
2. Electric vehicles will surpass 50% of new car sales in major markets.
3. At least one major social network as we know it today will no longer exist.
4. Space tourism will become something middle-class people can actually afford.
5. Remote work will stabilize at roughly 30-40% of knowledge workers.

I wonder how many of these I got right.

Let's see when you open this.`,
    unlockAt: new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years from now
    status: 'sealed',
    tags: ['technology', 'predictions', 'future'],
  },
  {
    title: 'Things I want to remember about today',
    message: `Today I'm sealing a small snapshot of life as it is right now.

The music I can't stop listening to. The coffee shop I work from on Tuesdays.
The way light comes through the window at 4pm.
The small things that feel ordinary but won't always be.

I'm capturing this because one day, "today" will feel like a long time ago.
And I want to remember that it was enough. More than enough.

It was good.`,
    unlockAt: new Date(now.getTime() - 1000), // already in the past — status = unlockable
    status: 'unlockable',
    tags: ['memory', 'life', 'gratitude'],
  },
  {
    title: 'A message I already opened',
    message: `This capsule has already been opened.

It was a simple message: "You made it."

And I did.`,
    unlockAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    status: 'opened',
    openedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // opened yesterday
    tags: ['milestone', 'opened'],
  },
];

async function seed() {
  console.log('🌱 BloomLater seed script starting…');
  console.log(`📡 Connecting to: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  console.log('✅ Connected to MongoDB');

  // Check if demo user already exists
  let user = await User.findOne({ email: DEMO_USER.email });

  if (user) {
    console.log(`👤 Demo user already exists: ${DEMO_USER.email}`);
  } else {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);
    user = await User.create({ ...DEMO_USER, password: hashedPassword });
    console.log(`👤 Created demo user: ${DEMO_USER.email} (password: ${DEMO_PASSWORD})`);
  }

  // Clear existing demo capsules
  const deleted = await Capsule.deleteMany({ owner: user._id });
  if (deleted.deletedCount > 0) {
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing demo capsules`);
  }

  // Create capsules
  const capsules = await Capsule.insertMany(
    DEMO_CAPSULES.map((c) => ({ ...c, owner: user._id }))
  );

  // Update user capsule count
  await User.findByIdAndUpdate(user._id, { capsuleCount: capsules.length });

  console.log(`📦 Created ${capsules.length} demo capsules:`);
  capsules.forEach((c) => {
    console.log(`   • [${c.status.toUpperCase().padEnd(10)}] ${c.title}`);
  });

  console.log('\n✨ Seed complete!');
  console.log(`\n🔑 Login credentials:`);
  console.log(`   Email:    ${DEMO_USER.email}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

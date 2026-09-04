require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setupWorkers() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('../models/User');
  const Worker = require('../models/Worker');

  // 1. Ensure 'pk' is verified
  const pkUser = await User.findOne({ email: 'princekworld1@gmail.com' });
  if (pkUser) {
    pkUser.role = 'WORKER';
    pkUser.isVerified = true;
    await pkUser.save();

    await Worker.findOneAndUpdate(
      { user: pkUser._id },
      {
        $set: {
          verificationStatus: 'VERIFIED',
          status: 'AVAILABLE',
          serviceCategory: 'electrician-plumber',
          skills: ['Electrician', 'Plumber', 'Switchboard Wiring', 'Pipe Leakage Repair'],
          hourlyRate: 299,
          rating: 4.9,
          experienceYears: 5,
        }
      },
      { upsert: true, new: true }
    );
    console.log('Worker 1 (pk) updated & verified');
  }

  // Common password hash for test accounts: Password@123
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 2. Setup Ravi Maurya as Worker
  let raviUser = await User.findOne({ email: 'amail4raviranjan@gmail.com' });
  if (raviUser) {
    raviUser.role = 'WORKER';
    raviUser.isVerified = true;
    await raviUser.save();

    await Worker.findOneAndUpdate(
      { user: raviUser._id },
      {
        $set: {
          address: raviUser.address || 'Kumarbag, Bettiah',
          city: raviUser.city || 'Bettiah',
          state: raviUser.state || 'Bihar',
          pincode: raviUser.pincode || '845450',
          serviceCategory: 'ac-appliance',
          skills: ['AC Repair', 'AC Gas Refill', 'Refrigerator Service', 'Washing Machine Repair'],
          experienceYears: 4,
          hourlyRate: 399,
          rating: 4.88,
          totalJobs: 32,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          status: 'AVAILABLE',
        }
      },
      { upsert: true, new: true }
    );
    console.log('Worker 2 (Ravi Maurya) updated & verified');
  }

  // 3. Setup king as Worker
  let kingUser = await User.findOne({ email: 'princekkc4142@gmail.com' });
  if (kingUser) {
    kingUser.role = 'WORKER';
    kingUser.isVerified = true;
    await kingUser.save();

    await Worker.findOneAndUpdate(
      { user: kingUser._id },
      {
        $set: {
          address: kingUser.address || 'Bettiah, West Champaran',
          city: kingUser.city || 'Bettiah',
          state: kingUser.state || 'Bihar',
          pincode: kingUser.pincode || '845438',
          serviceCategory: 'cleaning-pest',
          skills: ['Deep Home Cleaning', 'Bathroom Cleaning', 'Sofa Cleaning', 'Pest Control'],
          experienceYears: 3,
          hourlyRate: 249,
          rating: 4.92,
          totalJobs: 54,
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          status: 'AVAILABLE',
        }
      },
      { upsert: true, new: true }
    );
    console.log('Worker 3 (King Prince) updated & verified');
  }

  // 4. Create Worker 4: Sunil Sharma (Painting & Carpentry)
  let sunilUser = await User.findOne({ phone: '8651318873' });
  if (!sunilUser) {
    sunilUser = await User.create({
      name: 'Sunil Sharma',
      phone: '8651318873',
      email: 'sunil.sharma@sevasetu.ai',
      passwordHash,
      role: 'WORKER',
      isVerified: true,
      address: 'Station Road, Bettiah',
      city: 'Bettiah',
      state: 'Bihar',
      pincode: '845438',
    });
  } else {
    sunilUser.role = 'WORKER';
    sunilUser.isVerified = true;
    await sunilUser.save();
  }

  await Worker.findOneAndUpdate(
    { user: sunilUser._id },
    {
      $set: {
        address: 'Station Road, Bettiah',
        city: 'Bettiah',
        state: 'Bihar',
        pincode: '845438',
        serviceCategory: 'home-painting',
        skills: ['Home Painting', 'Wall Waterproofing', 'Wood Polishing', 'Furniture Repair'],
        experienceYears: 6,
        hourlyRate: 499,
        rating: 4.85,
        totalJobs: 65,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        status: 'AVAILABLE',
      }
    },
    { upsert: true, new: true }
  );
  console.log('Worker 4 (Sunil Sharma) created & verified');

  // 5. Create Worker 5: Pooja Verma (Salon & Beauty)
  let poojaUser = await User.findOne({ phone: '8651318874' });
  if (!poojaUser) {
    poojaUser = await User.create({
      name: 'Pooja Verma',
      phone: '8651318874',
      email: 'pooja.verma@sevasetu.ai',
      passwordHash,
      role: 'WORKER',
      isVerified: true,
      address: 'Main Market, Bettiah',
      city: 'Bettiah',
      state: 'Bihar',
      pincode: '845438',
    });
  } else {
    poojaUser.role = 'WORKER';
    poojaUser.isVerified = true;
    await poojaUser.save();
  }

  await Worker.findOneAndUpdate(
    { user: poojaUser._id },
    {
      $set: {
        address: 'Main Market, Bettiah',
        city: 'Bettiah',
        state: 'Bihar',
        pincode: '845438',
        serviceCategory: 'women-salon',
        skills: ['Facial & Cleanup', 'Waxing & Threading', 'Hair Styling', 'Pedicure & Manicure'],
        experienceYears: 5,
        hourlyRate: 349,
        rating: 4.95,
        totalJobs: 78,
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        status: 'AVAILABLE',
      }
    },
    { upsert: true, new: true }
  );
  console.log('Worker 5 (Pooja Verma) created & verified');

  const allWorkers = await Worker.find().populate('user', 'name phone email role');
  console.log('\n--- VERIFIED WORKERS IN SYSTEM ---');
  allWorkers.forEach((w, idx) => {
    console.log(`${idx + 1}. ${w.user?.name} (${w.user?.phone}) | ${w.serviceCategory} | ${w.verificationStatus}`);
  });

  process.exit(0);
}

setupWorkers().catch(e => {
  console.error(e);
  process.exit(1);
});

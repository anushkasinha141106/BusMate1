import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const loadJson = (filePath) => {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return [];
};

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Users
  console.log('👤 Seeding default users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@smartbus.gov.in' },
    update: {},
    create: {
      email: 'admin@smartbus.gov.in',
      name: 'System Administrator',
      password: passwordHash,
      role: 'admin',
      phone: '+91 98220 11000'
    }
  });

  const agentUser = await prisma.user.upsert({
    where: { email: 'agent@pmpml.org' },
    update: {},
    create: {
      email: 'agent@pmpml.org',
      name: 'PMPML Swargate Depot Desk',
      password: passwordHash,
      role: 'agent',
      agencyName: 'PMPML Central Agency',
      phone: '+91 98220 22000'
    }
  });

  const commuterUser = await prisma.user.upsert({
    where: { email: 'commuter@gmail.com' },
    update: {},
    create: {
      email: 'commuter@gmail.com',
      name: 'Rahul Sharma',
      password: passwordHash,
      role: 'passenger',
      phone: '+91 98765 43210'
    }
  });

  console.log(`✅ Users created: admin (${adminUser.email}), agent (${agentUser.email}), commuter (${commuterUser.email})`);

  // 2. Seed Routes from Kaggle transit data
  console.log('🛣️  Seeding transit routes...');
  const routesData = loadJson(path.resolve(__dirname, '../../src/data/routes.json'));

  const routeCodesMap = new Set();

  for (const r of routesData) {
    if (!routeCodesMap.has(r.routeId)) {
      routeCodesMap.add(r.routeId);
      await prisma.route.upsert({
        where: { routeCode: r.routeId },
        update: {
          routeName: r.routeName || r.routeNumber,
          origin: r.origin,
          destination: r.destination,
          distanceKm: parseFloat(r.distanceKm) || 10,
          estimatedMin: parseInt(r.distanceKm * 2.5) || 30,
          baseFare: parseFloat(r.fare) || 30
        },
        create: {
          routeCode: r.routeId,
          routeName: r.routeName || r.routeNumber,
          origin: r.origin,
          destination: r.destination,
          distanceKm: parseFloat(r.distanceKm) || 10,
          estimatedMin: parseInt(r.distanceKm * 2.5) || 30,
          baseFare: parseFloat(r.fare) || 30
        }
      });
    }
  }
  console.log(`✅ Seeded ${routeCodesMap.size} transit routes.`);

  // 2B. Seed Explicit Authentic PMPML Intra-City Routes (Swargate ⇄ Pune Station)
  console.log('🚌 Seeding authentic PMPML intra-city routes & schedules...');
  const pmpmlRoutes = [
    {
      routeCode: 'PMPML_RT_5',
      routeName: 'PMPML Route 5 (Swargate ➔ Pune Station via Nana Peth & Sassoon)',
      origin: 'Swargate, Pune',
      destination: 'Railway Station, Pune',
      distanceKm: 5.8,
      estimatedMin: 20,
      baseFare: 15
    },
    {
      routeCode: 'PMPML_RT_3',
      routeName: 'PMPML Route 3 (Swargate ➔ Pune Station via Khajina Vihir / Circular)',
      origin: 'Swargate, Pune',
      destination: 'Railway Station, Pune',
      distanceKm: 6.2,
      estimatedMin: 22,
      baseFare: 10
    },
    {
      routeCode: 'PMPML_RT_4_ATAL',
      routeName: 'PMPML Route 4 ATAL (Swargate ➔ Pune Station Metro Feeder)',
      origin: 'Swargate, Pune',
      destination: 'Railway Station, Pune',
      distanceKm: 5.5,
      estimatedMin: 18,
      baseFare: 10
    },
    {
      routeCode: 'PMPML_RT_24',
      routeName: 'PMPML Route 24 (Katraj / Swargate ➔ Pune Station Main Terminus)',
      origin: 'Swargate, Pune',
      destination: 'Railway Station, Pune',
      distanceKm: 7.0,
      estimatedMin: 25,
      baseFare: 15
    }
  ];

  for (const pr of pmpmlRoutes) {
    routeCodesMap.add(pr.routeCode);
    await prisma.route.upsert({
      where: { routeCode: pr.routeCode },
      update: pr,
      create: pr
    });
  }

  // 3. Seed Trips
  console.log('🚌 Seeding trips...');
  let tripsCreated = 0;

  // 3A. Authentic PMPML Departures (Swargate ⇄ Pune Station)
  const todayStr = new Date().toISOString().split('T')[0];
  const pmpmlTrips = [
    {
      tripCode: 'PMPML-TRIP-01',
      routeCode: 'PMPML_RT_5',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML E-Bus (Olectra/Tata EV AC)',
      busNumber: 'MH 14 BT 3310',
      departureTime: '06:15',
      arrivalTime: '06:35',
      duration: '20m',
      departureDate: todayStr,
      baseFare: 15,
      totalSeats: 24,
      ratings: 4.8,
      reviewsCount: 312,
      amenities: 'Low Floor / Wheelchair Ramp,CCTV Surveillance,Digital Display / Next Stop Audio,USB Mobile Charging,Electric AC',
      bookedSeats: JSON.stringify(['1A', '2B'])
    },
    {
      tripCode: 'PMPML-TRIP-02',
      routeCode: 'PMPML_RT_3',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML City Diesel/CNG Standard Seater',
      busNumber: 'MH 14 BT 3311',
      departureTime: '06:45',
      arrivalTime: '07:07',
      duration: '22m',
      departureDate: todayStr,
      baseFare: 10,
      totalSeats: 24,
      ratings: 4.5,
      reviewsCount: 245,
      amenities: 'Low Floor / Wheelchair Ramp,CCTV Surveillance,USB Mobile Charging',
      bookedSeats: JSON.stringify(['3C', '4D'])
    },
    {
      tripCode: 'PMPML-TRIP-03',
      routeCode: 'PMPML_RT_4_ATAL',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML Metro Feeder / ATAL Shuttle',
      busNumber: 'MH 14 BT 3312',
      departureTime: '07:15',
      arrivalTime: '07:33',
      duration: '18m',
      departureDate: todayStr,
      baseFare: 10,
      totalSeats: 24,
      ratings: 4.9,
      reviewsCount: 428,
      amenities: 'Low Floor / Wheelchair Ramp,CCTV Surveillance,Digital Display / Next Stop Audio,Electric AC',
      bookedSeats: JSON.stringify(['1B'])
    },
    {
      tripCode: 'PMPML-TRIP-04',
      routeCode: 'PMPML_RT_24',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML City Diesel/CNG Standard Seater',
      busNumber: 'MH 14 BT 3313',
      departureTime: '07:45',
      arrivalTime: '08:10',
      duration: '25m',
      departureDate: todayStr,
      baseFare: 15,
      totalSeats: 24,
      ratings: 4.6,
      reviewsCount: 198,
      amenities: 'CCTV Surveillance,USB Mobile Charging,Low Floor / Wheelchair Ramp',
      bookedSeats: JSON.stringify(['2A', '5B'])
    },
    {
      tripCode: 'PMPML-TRIP-05',
      routeCode: 'PMPML_RT_5',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML E-Bus (Olectra/Tata EV AC)',
      busNumber: 'MH 14 BT 3314',
      departureTime: '08:30',
      arrivalTime: '08:50',
      duration: '20m',
      departureDate: todayStr,
      baseFare: 15,
      totalSeats: 24,
      ratings: 4.8,
      reviewsCount: 356,
      amenities: 'Low Floor / Wheelchair Ramp,CCTV Surveillance,Digital Display / Next Stop Audio,USB Mobile Charging,Electric AC',
      bookedSeats: JSON.stringify(['1C', '6D'])
    },
    {
      tripCode: 'PMPML-TRIP-06',
      routeCode: 'PMPML_RT_4_ATAL',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML Metro Feeder / ATAL Shuttle',
      busNumber: 'MH 14 BT 3315',
      departureTime: '09:15',
      arrivalTime: '09:33',
      duration: '18m',
      departureDate: todayStr,
      baseFare: 10,
      totalSeats: 24,
      ratings: 4.9,
      reviewsCount: 512,
      amenities: 'Low Floor / Wheelchair Ramp,CCTV Surveillance,Digital Display / Next Stop Audio,Electric AC,USB Mobile Charging',
      bookedSeats: JSON.stringify(['3A', '3B'])
    },
    {
      tripCode: 'PMPML-TRIP-07',
      routeCode: 'PMPML_RT_3',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML E-Bus (Olectra/Tata EV AC)',
      busNumber: 'MH 14 BT 3316',
      departureTime: '10:30',
      arrivalTime: '10:52',
      duration: '22m',
      departureDate: todayStr,
      baseFare: 15,
      totalSeats: 24,
      ratings: 4.7,
      reviewsCount: 220,
      amenities: 'Low Floor / Wheelchair Ramp,CCTV Surveillance,Digital Display / Next Stop Audio,Electric AC',
      bookedSeats: JSON.stringify(['4A'])
    },
    {
      tripCode: 'PMPML-TRIP-08',
      routeCode: 'PMPML_RT_24',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML City Diesel/CNG Standard Seater',
      busNumber: 'MH 14 BT 3317',
      departureTime: '12:00',
      arrivalTime: '12:24',
      duration: '24m',
      departureDate: todayStr,
      baseFare: 15,
      totalSeats: 24,
      ratings: 4.5,
      reviewsCount: 165,
      amenities: 'CCTV Surveillance,Low Floor / Wheelchair Ramp',
      bookedSeats: JSON.stringify(['2C', '5D'])
    },
    {
      tripCode: 'PMPML-TRIP-09',
      routeCode: 'PMPML_RT_5',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML E-Bus (Olectra/Tata EV AC)',
      busNumber: 'MH 14 BT 3318',
      departureTime: '14:30',
      arrivalTime: '14:50',
      duration: '20m',
      departureDate: todayStr,
      baseFare: 15,
      totalSeats: 24,
      ratings: 4.8,
      reviewsCount: 289,
      amenities: 'Low Floor / Wheelchair Ramp,CCTV Surveillance,Digital Display / Next Stop Audio,USB Mobile Charging,Electric AC',
      bookedSeats: JSON.stringify(['1D', '6A'])
    },
    {
      tripCode: 'PMPML-TRIP-10',
      routeCode: 'PMPML_RT_4_ATAL',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML Metro Feeder / ATAL Shuttle',
      busNumber: 'MH 14 BT 3319',
      departureTime: '17:30',
      arrivalTime: '17:50',
      duration: '20m',
      departureDate: todayStr,
      baseFare: 10,
      totalSeats: 24,
      ratings: 4.9,
      reviewsCount: 620,
      amenities: 'Low Floor / Wheelchair Ramp,CCTV Surveillance,Digital Display / Next Stop Audio,Electric AC',
      bookedSeats: JSON.stringify(['2B', '4B'])
    },
    {
      tripCode: 'PMPML-TRIP-11',
      routeCode: 'PMPML_RT_5',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML City Diesel/CNG Standard Seater',
      busNumber: 'MH 14 BT 3320',
      departureTime: '21:15',
      arrivalTime: '21:33',
      duration: '18m',
      departureDate: todayStr,
      baseFare: 20,
      totalSeats: 24,
      ratings: 4.6,
      reviewsCount: 174,
      amenities: 'CCTV Surveillance,USB Mobile Charging',
      bookedSeats: JSON.stringify(['5A'])
    },
    {
      tripCode: 'PMPML-TRIP-12',
      routeCode: 'PMPML_RT_5',
      operatorName: 'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
      busCategory: 'PMPML City Diesel/CNG Standard Seater',
      busNumber: 'MH 14 BT 3321',
      departureTime: '22:45',
      arrivalTime: '23:02',
      duration: '17m',
      departureDate: todayStr,
      baseFare: 20,
      totalSeats: 24,
      ratings: 4.5,
      reviewsCount: 110,
      amenities: 'CCTV Surveillance',
      bookedSeats: JSON.stringify(['6B'])
    }
  ];

  for (const pt of pmpmlTrips) {
    await prisma.trip.upsert({
      where: { tripCode: pt.tripCode },
      update: pt,
      create: pt
    });
    tripsCreated++;
  }
  const tripsData = loadJson(path.resolve(__dirname, '../../src/data/trips.json')).slice(0, 50);

  const operators = [
    'PMPML (Pune Mahanagar Parivahan Mahamandal Ltd)',
    'PMPML E-Bus (Olectra/Tata EV AC)',
    'PMPML City Diesel/CNG Standard Seater',
    'PMPML Metro Feeder / ATAL Shuttle'
  ];

  const busCategories = [
    'Urban City Bus (2+2 Seater, Low Floor)',
    'Electric AC City Bus (2+2 Low Floor)',
    'City Diesel/CNG Standard Seater (2+2)',
    'Metro Feeder / ATAL Shuttle'
  ];

  // Additional transit trips from Kaggle dataset

  for (let i = 0; i < tripsData.length; i++) {
    const t = tripsData[i];
    if (!routeCodesMap.has(t.route)) continue;

    const operator = operators[i % operators.length];
    const category = busCategories[i % busCategories.length];
    const departureTime = t.departure || '07:30';
    
    // Calculate arrival time
    const [h, m] = departureTime.split(':').map(Number);
    const arrH = (h + 1) % 24;
    const arrivalTime = `${String(arrH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // Sample booked seats
    const bookedSeats = [];
    const sampleSeatCount = Math.min(12, Math.floor((t.recordedBookings || 20) / 3));
    for (let s = 1; s <= sampleSeatCount; s++) {
      bookedSeats.push(`${s}${s % 2 === 0 ? 'A' : 'B'}`);
    }

    await prisma.trip.upsert({
      where: { tripCode: t.tripId },
      update: {},
      create: {
        tripCode: t.tripId,
        routeCode: t.route,
        operatorName: operator,
        busCategory: category,
        busNumber: t.bus || `MH 12 QX ${1000 + i}`,
        departureTime,
        arrivalTime,
        duration: '1h 20m',
        departureDate: t.date || new Date().toISOString().split('T')[0],
        baseFare: 40 + (i % 5) * 15,
        totalSeats: 40,
        ratings: 4.2 + ((i % 8) * 0.1),
        reviewsCount: 45 + (i * 7),
        amenities: 'WiFi,Charging Point,Water Bottle,Reading Light,Air Conditioning',
        bookedSeats: JSON.stringify(bookedSeats)
      }
    });
    tripsCreated++;
  }

  console.log(`✅ Seeded ${tripsCreated} scheduled bus trips.`);

  // 4. Seed an initial confirmed booking for testing
  const sampleTrip = await prisma.trip.findFirst();
  if (sampleTrip) {
    const existingBooking = await prisma.booking.findFirst({
      where: { pnr: 'PNR-778899' }
    });

    if (!existingBooking) {
      await prisma.booking.create({
        data: {
          pnr: 'PNR-778899',
          tripId: sampleTrip.id,
          userId: commuterUser.id,
          passengerDetails: JSON.stringify([
            { name: 'Rahul Sharma', age: 29, gender: 'male', seatNumber: '4A' },
            { name: 'Pooja Sharma', age: 27, gender: 'female', seatNumber: '4B' }
          ]),
          contactEmail: commuterUser.email,
          contactPhone: commuterUser.phone,
          boardingPoint: 'Swargate Terminal Gate 2',
          droppingPoint: 'Pune Station Platform Road',
          selectedSeats: JSON.stringify(['4A', '4B']),
          fareBreakdown: JSON.stringify({ baseFare: 110, gst: 5.5, convenienceFee: 15, total: 130.5 }),
          totalAmount: 130.5,
          paymentMethod: 'UPI',
          paymentStatus: 'PAID',
          status: 'CONFIRMED'
        }
      });
      console.log('✅ Seeded demo booking with PNR: PNR-778899');
    }
  }

  console.log('🎉 Database seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

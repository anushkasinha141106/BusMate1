import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../../src/data');

const loadJson = (filename, defaultVal) => {
  try {
    const fullPath = path.join(dataDir, filename);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    }
  } catch (err) {}
  return defaultVal;
};

const fallbackRoutes = loadJson('routes.json', []);
const fallbackTrips = loadJson('trips.json', []);

export const getRoutes = async (req, res, next) => {
  try {
    if (prisma) {
      try {
        const routes = await prisma.route.findMany({
          include: {
            _count: {
              select: { trips: true }
            }
          },
          orderBy: { routeCode: 'asc' }
        });

        if (routes && routes.length > 0) {
          return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            count: routes.length,
            routes
          });
        }
      } catch (dbErr) {
        console.warn('[BusController] PostgreSQL not initialized yet, serving fallback dataset.');
      }
    }

    // Graceful fallback
    res.status(200).json({
      success: true,
      source: 'Kaggle Transit Dataset (Fallback)',
      count: fallbackRoutes.length,
      routes: fallbackRoutes.map(r => ({
        id: r.routeId,
        routeCode: r.routeId,
        routeName: r.routeName || r.routeNumber,
        origin: r.origin,
        destination: r.destination,
        distanceKm: r.distanceKm,
        baseFare: r.fare,
        stations: r.stations
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const searchBuses = async (req, res, next) => {
  try {
    const { from, to, date, busType, operator, minFare, maxFare } = req.query;

    if (prisma) {
      try {
        const where = {};
        if (date) where.departureDate = date;

        if (from || to) {
          where.route = {};
          if (from) {
            const cleanFrom = from.split(',')[0].trim();
            where.route.origin = { contains: cleanFrom, mode: 'insensitive' };
          }
          if (to) {
            const cleanTo = to.split(',')[0].trim();
            where.route.destination = { contains: cleanTo, mode: 'insensitive' };
          }
        }

        if (busType) where.busCategory = { contains: busType, mode: 'insensitive' };
        if (operator) where.operatorName = { contains: operator, mode: 'insensitive' };

        if (minFare || maxFare) {
          where.baseFare = {};
          if (minFare) where.baseFare.gte = parseFloat(minFare);
          if (maxFare) where.baseFare.lte = parseFloat(maxFare);
        }

        const trips = await prisma.trip.findMany({
          where,
          include: {
            route: true,
            seatHolds: {
              where: { expiresAt: { gt: new Date() } }
            }
          },
          orderBy: { departureTime: 'asc' }
        });

        if (trips && trips.length > 0) {
          const formatted = trips.map(t => {
            let permanentlyBooked = [];
            try {
              permanentlyBooked = JSON.parse(t.bookedSeats || '[]');
            } catch (e) {}

            const temporaryHeld = [];
            t.seatHolds.forEach(hold => {
              try {
                temporaryHeld.push(...JSON.parse(hold.seats || '[]'));
              } catch (e) {}
            });

            const unavailable = new Set([...permanentlyBooked, ...temporaryHeld]).size;
            return {
              id: t.id,
              tripId: t.tripCode,
              tripCode: t.tripCode,
              routeCode: t.routeCode,
              route: t.route,
              operatorName: t.operatorName,
              busCategory: t.busCategory,
              busNumber: t.busNumber,
              departureTime: t.departureTime,
              arrivalTime: t.arrivalTime,
              duration: t.duration,
              departureDate: t.departureDate,
              fare: t.baseFare,
              totalSeats: t.totalSeats,
              availableSeats: Math.max(0, t.totalSeats - unavailable),
              ratings: t.ratings,
              reviewsCount: t.reviewsCount,
              amenities: t.amenities ? t.amenities.split(',') : []
            };
          });

          return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            count: formatted.length,
            filters: { from, to, date, busType, operator },
            trips: formatted
          });
        }
      } catch (dbErr) {
        console.warn('[BusController] PostgreSQL query failed, using Kaggle transit fallback.');
      }
    }

    // Fallback search across Kaggle dataset
    let results = [...fallbackTrips];
    if (from || to) {
      // Find matching routes
      const matchingRouteIds = fallbackRoutes
        .filter(r => (!from || r.origin?.toLowerCase().includes(from.toLowerCase()) || r.stations?.some(s => s.toLowerCase().includes(from.toLowerCase()))) &&
                     (!to || r.destination?.toLowerCase().includes(to.toLowerCase()) || r.stations?.some(s => s.toLowerCase().includes(to.toLowerCase()))))
        .map(r => r.routeId);

      if (matchingRouteIds.length > 0) {
        results = results.filter(t => matchingRouteIds.includes(t.route));
      }
    }

    if (date) {
      const dateFiltered = results.filter(t => t.date === date);
      if (dateFiltered.length > 0) results = dateFiltered;
    }

    const formattedFallback = results.slice(0, 30).map((t, i) => ({
      id: t.tripId || `trip_${i}`,
      tripId: t.tripId || `trip_${i}`,
      tripCode: t.tripId || `TRIP_${i}`,
      routeCode: t.route || 'LINE_SWAR_STN',
      operatorName: i % 2 === 0 ? 'PMPML Pune Pride Express' : 'MSRTC Shivneri Volvo AC',
      busCategory: i % 2 === 0 ? 'Volvo Multi-Axle AC' : 'Standard Express 2+2',
      busNumber: t.bus || `MH 12 RN ${1000 + i}`,
      departureTime: t.departure || '07:30',
      arrivalTime: '08:45',
      duration: '1h 15m',
      departureDate: t.date || new Date().toISOString().split('T')[0],
      fare: 45 + (i % 4) * 10,
      totalSeats: t.capacity || 52,
      availableSeats: Math.max(0, (t.capacity || 52) - (t.recordedBookings || 25)),
      ratings: 4.5,
      reviewsCount: 88,
      amenities: ['WiFi', 'Charging Point', 'Air Conditioning']
    }));

    res.status(200).json({
      success: true,
      source: 'Kaggle Transit Dataset (Fallback)',
      count: formattedFallback.length,
      filters: { from, to, date, busType, operator },
      trips: formattedFallback
    });
  } catch (error) {
    next(error);
  }
};

export const getBusSeats = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (prisma) {
      try {
        const trip = await prisma.trip.findFirst({
          where: { OR: [{ id }, { tripCode: id }] },
          include: {
            seatHolds: { where: { expiresAt: { gt: new Date() } } }
          }
        });

        if (trip) {
          let bookedSeats = [];
          try { bookedSeats = JSON.parse(trip.bookedSeats || '[]'); } catch (e) {}

          const heldSeats = [];
          trip.seatHolds.forEach(hold => {
            try { heldSeats.push(...JSON.parse(hold.seats || '[]')); } catch (e) {}
          });

          return res.status(200).json({
            success: true,
            source: 'PostgreSQL Database (Prisma)',
            trip: {
              id: trip.id,
              tripCode: trip.tripCode,
              operatorName: trip.operatorName,
              busCategory: trip.busCategory,
              departureTime: trip.departureTime,
              fare: trip.baseFare,
              totalSeats: trip.totalSeats,
              bookedSeats,
              heldSeats,
              allUnavailableSeats: Array.from(new Set([...bookedSeats, ...heldSeats]))
            }
          });
        }
      } catch (dbErr) {}
    }

    // Default fallback seat map
    res.status(200).json({
      success: true,
      source: 'Default Seat Configuration (Fallback)',
      trip: {
        id,
        tripCode: id,
        operatorName: 'PMPML Pune Pride Express',
        busCategory: 'Volvo Multi-Axle AC',
        departureTime: '08:00',
        fare: 50,
        totalSeats: 40,
        bookedSeats: ['1A', '2B', '5A'],
        heldSeats: [],
        allUnavailableSeats: ['1A', '2B', '5A']
      }
    });
  } catch (error) {
    next(error);
  }
};

import { useState, useEffect } from 'react';

// Standard total seats per urban city bus (2+2 layout) in BusMate
export const TOTAL_SEATS_PER_BUS = 24;

// Default initial booked seats template per bus ID (PMPML City Bus Fleet)
const DEFAULT_INITIAL_INVENTORIES = {
  'BUS-01': ['1B', '2D', '4A', '5C'],
  'BUS-02': ['1A', '2B', '3C', '4D', '5A', '6B'],
  'BUS-03': ['2A', '3B', '4C'],
  'BUS-04': ['1B', '2C', '3D', '4A', '5B'],
  'BUS-05': ['1A', '2D', '3C', '5A'],
  'BUS-06': ['2B', '3A', '4D'],
  'BUS-07': ['1C', '2B', '3A', '4C', '5D'],
  'BUS-08': ['2A', '3C', '4B', '5A', '6C'],
  'BUS-09': ['1B', '2D', '4A', '5C'],
  'BUS-10': ['1A', '2B', '3C', '4D', '5B', '6A'],
  'BUS-11': ['2C', '3A', '4B'],
  'BUS-12': ['1D', '2A', '3B', '4C'],
  'SB-01': ['1B', '2D', '4A', '5C'],
  'SB-02': ['1A', '2B', '3C', '4D', '5A', '6B'],
  'SB-03': ['2A', '3B', '4C'],
  'SB-04': ['1B', '2C', '3D', '4A', '5B'],
  'SB-05': ['1A', '2D', '3C', '5A'],
  'SB-06': ['2B', '3A', '4D']
};

const STORAGE_KEY = 'smartbus_seat_inventory';

/**
 * Load the complete inventory state from localStorage or initialize with defaults.
 */
export const getAllInventories = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse seat inventory from storage:', err);
  }

  // Initialize and persist defaults
  const initial = {};
  Object.keys(DEFAULT_INITIAL_INVENTORIES).forEach(busId => {
    const booked = DEFAULT_INITIAL_INVENTORIES[busId];
    initial[busId] = {
      busId,
      totalSeats: TOTAL_SEATS_PER_BUS,
      bookedSeats: [...booked],
      availableSeats: Math.max(0, TOTAL_SEATS_PER_BUS - booked.length)
    };
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch (err) {
    console.error('Failed to save initial seat inventory:', err);
  }

  return initial;
};

/**
 * Get the real-time seat inventory for a specific bus.
 */
export const getBusInventory = (busId) => {
  if (!busId) {
    return {
      busId: 'DEFAULT',
      totalSeats: TOTAL_SEATS_PER_BUS,
      bookedSeats: ['L3', 'L8', 'L13', 'U4'],
      availableSeats: 18
    };
  }

  const normalizedId = String(busId).toUpperCase().trim();
  const all = getAllInventories();

  if (all[normalizedId]) {
    return all[normalizedId];
  }

  // Try alias (e.g. SB-01 vs BUS-01)
  const aliasId = normalizedId.startsWith('SB-') 
    ? normalizedId.replace('SB-', 'BUS-') 
    : (normalizedId.startsWith('BUS-') ? normalizedId.replace('BUS-', 'SB-') : normalizedId);

  if (all[aliasId]) {
    return all[aliasId];
  }

  // Fallback initial
  const defaultBooked = DEFAULT_INITIAL_INVENTORIES[normalizedId] || ['L3', 'L8', 'L13', 'U4'];
  const newRecord = {
    busId: normalizedId,
    totalSeats: TOTAL_SEATS_PER_BUS,
    bookedSeats: [...defaultBooked],
    availableSeats: Math.max(0, TOTAL_SEATS_PER_BUS - defaultBooked.length)
  };

  all[normalizedId] = newRecord;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error(e);
  }

  return newRecord;
};

/**
 * Check if a specific seat is booked on a bus.
 */
export const isSeatBooked = (busId, seatId) => {
  const inv = getBusInventory(busId);
  return inv.bookedSeats.includes(seatId);
};

/**
 * Book seats on a bus: appends seats to bookedSeats, recalculates availableSeats,
 * persists to localStorage and fires a reactive broadcast event.
 */
export const bookSeatsForBus = (busId, seatIds = []) => {
  if (!busId || !seatIds || seatIds.length === 0) return null;

  const all = getAllInventories();
  const normalizedId = String(busId).toUpperCase().trim();
  const current = getBusInventory(normalizedId);

  const cleanSeatIds = seatIds.map(s => (typeof s === 'string' ? s : s.id));

  // Merge unique seats
  const seatSet = new Set([...current.bookedSeats, ...cleanSeatIds]);
  const updatedBookedSeats = Array.from(seatSet);
  const updatedAvailableSeats = Math.max(0, current.totalSeats - updatedBookedSeats.length);

  const updatedRecord = {
    ...current,
    bookedSeats: updatedBookedSeats,
    availableSeats: updatedAvailableSeats,
    lastUpdated: new Date().toISOString()
  };

  all[normalizedId] = updatedRecord;

  // If alias exists, update alias as well for cross-compatibility
  const aliasId = normalizedId.startsWith('SB-') 
    ? normalizedId.replace('SB-', 'BUS-') 
    : (normalizedId.startsWith('BUS-') ? normalizedId.replace('BUS-', 'SB-') : null);

  if (aliasId) {
    all[aliasId] = {
      ...updatedRecord,
      busId: aliasId
    };
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to update seat inventory:', err);
  }

  // Reactive UI update notification
  window.dispatchEvent(
    new CustomEvent('smartbus_inventory_updated', {
      detail: {
        busId: normalizedId,
        bookedSeats: updatedBookedSeats,
        availableSeats: updatedAvailableSeats
      }
    })
  );

  return updatedRecord;
};

/**
 * Custom React hook for dynamic real-time inventory updates across any component.
 */
export const useBusInventory = (busId) => {
  const [inventory, setInventory] = useState(() => getBusInventory(busId));

  useEffect(() => {
    setInventory(getBusInventory(busId));

    const handleUpdate = (e) => {
      if (!busId || !e.detail?.busId) {
        setInventory(getBusInventory(busId));
        return;
      }
      const updatedBusId = e.detail.busId;
      const myBusId = String(busId).toUpperCase().trim();

      if (
        updatedBusId === myBusId ||
        updatedBusId.replace('SB-', '') === myBusId.replace('BUS-', '') ||
        updatedBusId.replace('BUS-', '') === myBusId.replace('SB-', '')
      ) {
        setInventory(getBusInventory(busId));
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setInventory(getBusInventory(busId));
      }
    };

    window.addEventListener('smartbus_inventory_updated', handleUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('smartbus_inventory_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [busId]);

  return inventory;
};

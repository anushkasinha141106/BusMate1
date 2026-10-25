// Deterministic Pseudorandom Number Generator (Linear Congruential Generator - LCG)
// Guarantees reproducible synthetic dataset generation and counterfactual experiments

export class SeededRandom {
  constructor(seed = 42) {
    this.m = 0x80000000;
    this.a = 1103515245;
    this.c = 12345;
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }

  next() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state / (this.m - 1);
  }

  // Returns integer in range [min, max]
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Returns float in range [min, max]
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  // Pick random item from array
  choice(array) {
    const idx = this.nextInt(0, array.length - 1);
    return array[idx];
  }
}

export const createPRNG = (seed = 42) => new SeededRandom(seed);

import { describe, it, expect } from 'vitest';

// Note: Since the code is in a single file without exports, we'll need to test by including the script or refactoring.
// For now, we'll assume functions are available in global scope or mock them.

// Test for prettify function
describe('prettify', () => {
  it('should return "Unnamed" for empty input', () => {
    // Assuming prettify is available globally
    expect(prettify('')).toBe('Unnamed');
    expect(prettify(null)).toBe('Unnamed');
    expect(prettify(undefined)).toBe('Unnamed');
  });

  it('should capitalize words and replace separators', () => {
    expect(prettify('hello_world')).toBe('Hello World');
    expect(prettify('test-case')).toBe('Test Case');
    expect(prettify('multiple   spaces')).toBe('Multiple Spaces');
  });

  it('should handle single word', () => {
    expect(prettify('test')).toBe('Test');
  });
});

// Test for isAncestor function
describe('isAncestor', () => {
  it('should return true if root is ancestor', () => {
    // Mock DOM elements
    const root = document.createElement('div');
    const child = document.createElement('span');
    const grandchild = document.createElement('p');
    root.appendChild(child);
    child.appendChild(grandchild);

    expect(isAncestor(root, child)).toBe(true);
    expect(isAncestor(root, grandchild)).toBe(true);
  });

  it('should return false if root is not ancestor', () => {
    const root = document.createElement('div');
    const other = document.createElement('span');

    expect(isAncestor(root, other)).toBe(false);
  });

  it('should return true for self', () => {
    const root = document.createElement('div');
    expect(isAncestor(root, root)).toBe(true);
  });
});

// Test for PLANET_DATA
describe('PLANET_DATA', () => {
  it('should have 7 planets including Sun', () => {
    expect(PLANET_DATA).toHaveLength(7);
  });

  it('should include Sun at distance 0', () => {
    const sun = PLANET_DATA.find(p => p.name === 'Sun');
    expect(sun).toBeDefined();
    expect(sun.distance).toBe(0);
    expect(sun.emissive).toBeDefined();
  });

  it('should have Mercury as first planet', () => {
    const mercury = PLANET_DATA.find(p => p.name === 'Mercury');
    expect(mercury).toBeDefined();
    expect(mercury.distance).toBe(10);
    expect(mercury.color).toBe(0x888888);
  });

  it('should have Earth with blue color', () => {
    const earth = PLANET_DATA.find(p => p.name === 'Earth');
    expect(earth).toBeDefined();
    expect(earth.color).toBe(0x4444ff);
  });
});

// Test for updateControlStatus
describe('updateControlStatus', () => {
  it('should update control mode text', () => {
    // Mock the DOM element
    const mockElement = { textContent: '' };
    global.document.getElementById = jest.fn(() => mockElement);

    updateControlStatus('Test Mode');

    expect(mockElement.textContent).toBe('Test Mode');
  });
});

// Test for checkPlanetProximity
describe('checkPlanetProximity', () => {
  it('should find nearby planet within threshold', () => {
    // Mock spaceship and planets
    global.spaceship = { position: { x: 10, y: 0, z: 0 } };
    global.PLANETS = [
      { name: 'Mercury', worldPosition: { x: 10, y: 0, z: 0 }, mesh: {} }
    ];
    global.proximityThreshold = 25;
    global.nearbyPlanet = null;

    checkPlanetProximity();

    expect(nearbyPlanet).toBe(PLANETS[0]);
  });

  it('should not find planet outside threshold', () => {
    global.spaceship = { position: { x: 50, y: 0, z: 0 } };
    global.PLANETS = [
      { name: 'Mercury', worldPosition: { x: 10, y: 0, z: 0 }, mesh: {} }
    ];
    global.nearbyPlanet = null;

    checkPlanetProximity();

    expect(nearbyPlanet).toBe(null);
  });
});
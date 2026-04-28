const logic = require('./logic.js');

// Test 1: 8:00 min/mi conversion
const paceSecs = 8 * 60;
const converted = logic.convertPace(paceSecs, 'mi');
console.log(`8:00 min/mi is ${logic.formatTime(converted)} min/km`);
console.assert(logic.formatTime(converted) === '04:58', 'Conversion failed for 8:00 min/mi');

// Test 2: 5:00 min/km conversion
const paceSecsKm = 5 * 60;
const convertedToMi = logic.convertPace(paceSecsKm, 'km');
console.log(`5:00 min/km is ${logic.formatTime(convertedToMi)} min/mi`);
console.assert(logic.formatTime(convertedToMi) === '08:03', 'Conversion failed for 5:00 min/km');

// Test 3: Calculate 5K time for 8:00 min/mi
const time5k = logic.calculateFinishTime(paceSecs, 'mi', logic.raceDistancesKm['5k']);
console.log(`5K time at 8:00 min/mi is ${logic.formatTime(time5k)}`);
console.assert(logic.formatTime(time5k) === '24:51', '5K calculation failed');

// Test 4: Calculate marathon time for 8:00 min/mi
const timeMarathon = logic.calculateFinishTime(paceSecs, 'mi', logic.raceDistancesKm['full']);
console.log(`Marathon time at 8:00 min/mi is ${logic.formatTime(timeMarathon)}`);
console.assert(logic.formatTime(timeMarathon) === '3:29:34' || logic.formatTime(timeMarathon) === '03:29:34' || logic.formatTime(timeMarathon) === '3:29:33', 'Marathon calculation failed');

console.log("All tests passed!");
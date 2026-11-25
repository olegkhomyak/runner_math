const assert = require('assert').strict;
const logic = require('./logic.js');

// 1. Pace conversions
assert.equal(logic.formatTime(logic.convertPace(8 * 60, 'mi')), '04:58', '8:00 min/mi -> 04:58 min/km');
assert.equal(logic.formatTime(logic.convertPace(5 * 60, 'km')), '08:03', '5:00 min/km -> 08:03 min/mi');

// 2. Finish time calculations
assert.equal(
    logic.formatTime(logic.calculateFinishTime(8 * 60, 'mi', logic.raceDistancesKm['5k'])),
    '24:51',
    '5K at 8:00/mi should be 24:51'
);
assert.equal(
    logic.formatTime(logic.calculateFinishTime(8 * 60, 'mi', logic.raceDistancesKm['full'])),
    '3:29:45',
    'Marathon at 8:00/mi should be 3:29:45'
);
assert.equal(logic.calculateFinishTime(0, 'mi', 5), 0, 'Zero pace returns 0');

// 3. Reverse pace calculations
const sub20PaceMi = Math.round(logic.calculatePaceFromTimeAndDistance(20 * 60, logic.raceDistancesKm['5k'], 'mi'));
assert.equal(logic.formatTime(sub20PaceMi), '06:26', '20:00 5K -> 06:26/mi');
const sub20PaceKm = Math.round(logic.calculatePaceFromTimeAndDistance(20 * 60, logic.raceDistancesKm['5k'], 'km'));
assert.equal(logic.formatTime(sub20PaceKm), '04:00', '20:00 5K -> 04:00/km');

// 4. Treadmill speed <-> pace conversions
assert.equal(logic.paceToSpeed(8 * 60, 'mi', 'mph').toFixed(1), '7.5', '8:00/mi -> 7.5 mph');
assert.equal(logic.paceToSpeed(8 * 60, 'mi', 'kmh').toFixed(1), '12.1', '8:00/mi -> 12.1 km/h');
assert.equal(logic.paceToSpeed(5 * 60, 'km', 'kmh').toFixed(1), '12.0', '5:00/km -> 12.0 km/h');
assert.equal(Math.round(logic.speedToPace(7.5, 'mph', 'mi')), 480, '7.5 mph -> 480s/mi');
assert.equal(Math.round(logic.speedToPace(12, 'kmh', 'km')), 300, '12 km/h -> 300s/km');
assert.equal(Math.round(logic.speedToPace(12, 'kmh', 'mi')), 483, '12 km/h -> 08:03/mi');

// 5. Distance conversions
assert.equal(logic.convertMilesToKm(1).toFixed(6), '1.609344');
assert.equal(logic.convertKmToMiles(5).toFixed(3), '3.107');

// 6. formatTime rollover edge cases
assert.equal(logic.formatTime(59.6), '01:00', '59.6s rolls over to 01:00');
assert.equal(logic.formatTime(3599.6), '1:00:00', '3599.6s rolls over to 1:00:00');
assert.equal(logic.formatTime(-5), '00:00', 'Negative seconds clamp to 00:00');

// 7. parseTime (colon-separated and mobile colon-free entries)
assert.equal(logic.parseTime('24:51'), 24 * 60 + 51);
assert.equal(logic.parseTime('3:29:34'), 3 * 3600 + 29 * 60 + 34);
assert.equal(logic.parseTime('2000'), 20 * 60, 'Colon-free 2000 -> 20:00');
assert.equal(logic.parseTime('500'), 5 * 60, 'Colon-free 500 -> 05:00');
assert.equal(logic.parseTime('13000'), 3600 + 30 * 60, 'Colon-free 13000 -> 1:30:00');
assert.equal(logic.parseTime('032934'), 3 * 3600 + 29 * 60 + 34, 'Colon-free 032934 -> 3:29:34');
assert.equal(logic.parseTime('45'), 45, 'Two-digit 45 -> 45s');
assert.equal(logic.parseTime(''), 0);
assert.equal(logic.parseTime('-5:00'), 0);
assert.equal(logic.parseTime('25:'), 0);
assert.equal(logic.parseTime('abc'), 0);

// 8. Live stopwatch digit formatting for mobile numeric keypad
assert.equal(logic.formatTimeInput(''), '');
assert.equal(logic.formatTimeInput('0'), '');
assert.equal(logic.formatTimeInput('2'), '0:02');
assert.equal(logic.formatTimeInput('0:020'), '0:20');
assert.equal(logic.formatTimeInput('0:200'), '2:00');
assert.equal(logic.formatTimeInput('2:000'), '20:00');
assert.equal(logic.formatTimeInput('14500'), '1:45:00');
assert.equal(logic.formatTimeInput('10500'), '1:05:00');
assert.equal(logic.formatTimeInput('103000'), '10:30:00');
assert.equal(logic.formatTimeInput('20:0'), '2:00', 'Backspace from 20:00 -> 2:00');
assert.equal(logic.formatTimeInput('0:0'), '', 'Backspace from 0:02 -> empty');

console.log('All strict unit tests passed!');

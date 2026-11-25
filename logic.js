// Pure running math & formatting functions
const MILES_TO_KM_EXACT = 1.609344;

// Convert pace given in seconds per unit to the other unit
// If fromUnit is 'mi', output is seconds per km
// If fromUnit is 'km', output is seconds per mi
function convertPace(seconds, fromUnit) {
    if (fromUnit === 'mi') {
        return seconds / MILES_TO_KM_EXACT;
    }
    return seconds * MILES_TO_KM_EXACT;
}

// Calculate finish time (in seconds) for a given distance in kilometers based on pace
function calculateFinishTime(paceSeconds, paceUnit, distanceKm) {
    if (!paceSeconds || paceSeconds <= 0 || !distanceKm || distanceKm <= 0) {
        return 0;
    }
    const pacePerKm = paceUnit === 'mi' ? paceSeconds / MILES_TO_KM_EXACT : paceSeconds;
    return pacePerKm * distanceKm;
}

function convertMilesToKm(miles) {
    return miles * MILES_TO_KM_EXACT;
}

function convertKmToMiles(km) {
    return km / MILES_TO_KM_EXACT;
}

// Calculate pace (in seconds per outUnit) required for a specific distance (km) and target time (seconds)
function calculatePaceFromTimeAndDistance(timeSecs, distanceKm, outUnit) {
    if (!timeSecs || timeSecs <= 0 || !distanceKm || distanceKm <= 0) {
        return 0;
    }
    const kmPaceSecs = timeSecs / distanceKm;
    if (outUnit === 'km') {
        return kmPaceSecs;
    }
    return convertPace(kmPaceSecs, 'km');
}

// Convert pace (seconds per paceUnit) into speed ('mph' or 'kmh')
function paceToSpeed(paceSeconds, paceUnit, speedUnit) {
    if (!paceSeconds || paceSeconds <= 0) {
        return 0;
    }
    const targetPaceUnit = speedUnit === 'mph' ? 'mi' : 'km';
    const paceInTarget = paceUnit === targetPaceUnit ? paceSeconds : convertPace(paceSeconds, paceUnit);
    return 3600 / paceInTarget;
}

// Convert speed ('mph' or 'kmh') into pace (seconds per outPaceUnit: 'mi' or 'km')
function speedToPace(speed, speedUnit, outPaceUnit) {
    if (!speed || speed <= 0 || isNaN(speed)) {
        return 0;
    }
    const sourcePaceUnit = speedUnit === 'mph' ? 'mi' : 'km';
    const paceInSource = 3600 / speed;
    return sourcePaceUnit === outPaceUnit ? paceInSource : convertPace(paceInSource, sourcePaceUnit);
}

// Format seconds into MM:SS or H:MM:SS
function formatTime(totalSeconds) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) {
        return '00:00';
    }
    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = Math.round(totalSeconds % 60);

    // Handle rollover where rounding seconds reaches 60
    if (s === 60) {
        s = 0;
        m++;
    }
    if (m === 60) {
        m = 0;
        h++;
    }

    const paddedM = m.toString().padStart(2, '0');
    const paddedS = s.toString().padStart(2, '0');

    if (h > 0) {
        return `${h}:${paddedM}:${paddedS}`;
    }
    return `${paddedM}:${paddedS}`;
}

// Live right-to-left stopwatch formatter for numeric keypads ("2" -> "0:02", "2000" -> "20:00", "13000" -> "1:30:00")
function formatTimeInput(rawStr) {
    if (typeof rawStr !== 'string') return '';
    const digits = rawStr.replace(/\D/g, '').replace(/^0+/, '').slice(0, 6);
    if (!digits) return '';

    const padded = digits.padStart(3, '0');
    const ss = padded.slice(-2);
    const mm = padded.slice(Math.max(0, padded.length - 4), -2);
    const hh = padded.length > 4 ? padded.slice(0, -4) : '';

    if (hh) {
        return `${hh}:${mm.padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
}

// Parse time strings like "HH:MM:SS", "MM:SS", or mobile digit-only inputs ("2000" -> 20:00, "13000" -> 1:30:00)
function parseTime(timeStr) {
    if (typeof timeStr !== 'string') return 0;
    const trimmed = timeStr.trim();
    if (!trimmed) return 0;

    if (trimmed.includes(':')) {
        const rawParts = trimmed.split(':').map(p => p.trim());
        if (rawParts.length < 2 || rawParts.length > 3) return 0;
        if (rawParts.some(p => !/^\d+$/.test(p))) return 0;

        const parts = rawParts.map(n => parseInt(n, 10));
        if (parts.length === 3) {
            return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        }
        return (parts[0] * 60) + parts[1];
    }

    // Right-to-left HHMMSS / MMSS / SS parsing for colon-free numeric mobile keypads
    if (!/^\d+$/.test(trimmed) || trimmed.length > 6) return 0;
    const secStr = trimmed.slice(-2);
    const minStr = trimmed.length > 2 ? trimmed.slice(Math.max(0, trimmed.length - 4), -2) : '0';
    const hrStr = trimmed.length > 4 ? trimmed.slice(0, -4) : '0';

    return (parseInt(hrStr, 10) * 3600) + (parseInt(minStr, 10) * 60) + parseInt(secStr, 10);
}

const raceDistancesKm = {
    '5k': 5,
    '10k': 10,
    'half': 21.0975,
    'full': 42.195
};

const exported = {
    MILES_TO_KM_EXACT,
    convertPace,
    calculateFinishTime,
    calculatePaceFromTimeAndDistance,
    paceToSpeed,
    speedToPace,
    convertMilesToKm,
    convertKmToMiles,
    formatTime,
    formatTimeInput,
    parseTime,
    raceDistancesKm
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = exported;
} else {
    window.logic = exported;
}

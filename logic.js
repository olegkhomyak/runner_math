// Logic functions
const MILES_TO_KM_EXACT = 1.609344;

// Convert pace given in seconds per unit to the other unit
// If fromUnit is 'mi', output is seconds per km
// If fromUnit is 'km', output is seconds per mi
function convertPace(seconds, fromUnit) {
    if (fromUnit === 'mi') {
        return seconds / MILES_TO_KM_EXACT;
    } else {
        return seconds * MILES_TO_KM_EXACT;
    }
}

// Calculate finish time for a given distance in kilometers based on pace
function calculateFinishTime(paceSeconds, paceUnit, distanceKm) {
    // Determine pace in seconds per km
    let pacePerKm;
    if (paceUnit === 'mi') {
        pacePerKm = paceSeconds / MILES_TO_KM_EXACT;
    } else {
        pacePerKm = paceSeconds;
    }
    
    return pacePerKm * distanceKm;
}

function convertMilesToKm(miles) {
    return miles * MILES_TO_KM_EXACT;
}

function convertKmToMiles(km) {
    return km / MILES_TO_KM_EXACT;
}

// Calculate pace required for a specific distance and time
// distanceKm is the race distance in km
// timeSecs is the target finish time in seconds
// outUnit is the desired pace unit ('mi' or 'km')
function calculatePaceFromTimeAndDistance(timeSecs, distanceKm, outUnit) {
    // First get km pace: Total time / distance
    const kmPaceSecs = timeSecs / distanceKm;
    
    if (outUnit === 'km') {
        return kmPaceSecs;
    } else {
        return convertPace(kmPaceSecs, 'km'); // convert km pace back to mi pace
    }
}

// Format seconds into MM:SS or HH:MM:SS
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);
    
    // Handle edge case where rounding seconds goes to 60
    let m = minutes;
    let h = hours;
    let s = seconds;
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

// Parse string like "HH:MM:SS" or "MM:SS" into total seconds
function parseTime(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(n => parseInt(n, 10));
    if (parts.some(isNaN)) return 0;
    
    if (parts.length === 3) {
        return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    } else if (parts.length === 2) {
        return (parts[0] * 60) + parts[1];
    } else if (parts.length === 1) {
        return parts[0];
    }
    return 0;
}

const raceDistancesKm = {
    '5k': 5,
    '10k': 10,
    'half': 21.0975,
    'full': 42.195
};

if (typeof module !== 'undefined' && module.exports) {
    // Export for testing
    module.exports = {
        convertPace,
        calculateFinishTime,
        calculatePaceFromTimeAndDistance,
        convertMilesToKm,
        convertKmToMiles,
        formatTime,
        parseTime,
        raceDistancesKm
    };
} else {
    // Make available to browser window
    window.logic = {
        convertPace,
        calculateFinishTime,
        calculatePaceFromTimeAndDistance,
        convertMilesToKm,
        convertKmToMiles,
        formatTime,
        parseTime,
        raceDistancesKm
    };
}

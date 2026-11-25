// App UI & interaction logic
document.addEventListener('DOMContentLoaded', () => {
    const MIN_PACE_SECS = 1;
    const MAX_PACE_SECS = 3599; // 59:59

    // Safe localStorage wrapper for private-browsing / restricted storage contexts
    const storage = {
        get(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                return null;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, String(value));
            } catch (e) {}
        }
    };

    function clampPace(pace) {
        if (!isFinite(pace) || isNaN(pace)) return 8 * 60;
        return Math.max(MIN_PACE_SECS, Math.min(MAX_PACE_SECS, Math.round(pace)));
    }

    // State
    let currentUnit = 'mi'; // 'mi' or 'km'
    let currentPaceSeconds = 8 * 60;
    // Anchor both units on edits so switching mi <-> km <-> mi repeatedly never drifts
    let anchorPace = {
        mi: currentPaceSeconds,
        km: clampPace(window.logic.convertPace(currentPaceSeconds, 'mi'))
    };
    let customDistUnit = 'mi';

    function setPaceFromEdit(newPaceSecs, unit = currentUnit) {
        currentUnit = unit === 'km' ? 'km' : 'mi';
        currentPaceSeconds = clampPace(newPaceSecs);
        const otherUnit = currentUnit === 'mi' ? 'km' : 'mi';
        anchorPace = {
            [currentUnit]: currentPaceSeconds,
            [otherUnit]: clampPace(window.logic.convertPace(currentPaceSeconds, currentUnit))
        };
    }

    // DOM Elements
    const btnMi = document.getElementById('btn-mi');
    const btnKm = document.getElementById('btn-km');

    const inputMinutes = document.getElementById('input-minutes');
    const inputSeconds = document.getElementById('input-seconds');
    const displayUnit = document.getElementById('display-unit');

    const convertedTime = document.getElementById('converted-time');
    const convertedUnit = document.getElementById('converted-unit');

    const inputMph = document.getElementById('input-mph');
    const inputKmh = document.getElementById('input-kmh');

    const time5k = document.getElementById('input-time-5k');
    const time10k = document.getElementById('input-time-10k');
    const timeHalf = document.getElementById('input-time-half');
    const timeFull = document.getElementById('input-time-full');
    const raceTimeInputs = document.querySelectorAll('.race-time-input[data-dist]');

    const inputCustomDist = document.getElementById('input-custom-dist');
    const btnCustomUnit = document.getElementById('btn-custom-unit');
    const timeCustom = document.getElementById('input-time-custom');

    const adjustBtns = document.querySelectorAll('.adjust-btn');

    const inputDistMiles = document.getElementById('input-miles');
    const inputDistKm = document.getElementById('input-km');
    const distPaceSummary = document.getElementById('dist-pace-summary');
    const distSummaryPace = document.getElementById('dist-summary-pace');
    const distSummaryTime = document.getElementById('dist-summary-time');
    const toggleDistancesBtn = document.getElementById('toggle-distances-btn');
    const distanceGrid = document.getElementById('distance-grid');
    const distanceRows = document.querySelectorAll('.distance-row');

    function getCustomDistanceKm() {
        const val = parseFloat(inputCustomDist.value);
        if (isNaN(val) || val <= 0) return 0;
        return customDistUnit === 'mi' ? window.logic.convertMilesToKm(val) : val;
    }

    function updateDistPaceSummary() {
        const km = parseFloat(inputDistKm.value);
        if (!isNaN(km) && km > 0) {
            distSummaryPace.textContent = `${window.logic.formatTime(currentPaceSeconds)}/${currentUnit}`;
            const finishSecs = window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, km);
            distSummaryTime.textContent = window.logic.formatTime(finishSecs);
            distPaceSummary.classList.remove('hidden');
        } else {
            distPaceSummary.classList.add('hidden');
        }
    }

    function loadState() {
        const savedUnit = storage.get('currentUnit');
        const validUnit = savedUnit === 'km' || savedUnit === 'mi' ? savedUnit : 'mi';

        const savedPace = parseInt(storage.get('currentPaceSeconds'), 10);
        if (!isNaN(savedPace)) {
            setPaceFromEdit(savedPace, validUnit);
        } else {
            setPaceFromEdit(8 * 60, validUnit);
        }

        const savedCustomDist = storage.get('customDistValue');
        if (savedCustomDist !== null) {
            inputCustomDist.value = savedCustomDist;
        }
        const savedCustomUnit = storage.get('customDistUnit');
        if (savedCustomUnit === 'mi' || savedCustomUnit === 'km') {
            customDistUnit = savedCustomUnit;
        }
    }

    function saveState() {
        storage.set('currentPaceSeconds', currentPaceSeconds);
        storage.set('currentUnit', currentUnit);
        storage.set('customDistValue', inputCustomDist.value);
        storage.set('customDistUnit', customDistUnit);
    }

    // Update UI based on state; preserves active input text when typing live
    function updateUI(options = {}) {
        const { preserveActiveInput = false } = options;
        const activeEl = preserveActiveInput ? document.activeElement : null;

        // Unit toggle buttons
        const isMi = currentUnit === 'mi';
        btnMi.classList.toggle('active', isMi);
        btnKm.classList.toggle('active', !isMi);
        btnMi.setAttribute('aria-pressed', String(isMi));
        btnKm.setAttribute('aria-pressed', String(!isMi));

        // Main pace display
        const mainMinutes = Math.floor(currentPaceSeconds / 60);
        const mainSeconds = currentPaceSeconds % 60;
        if (activeEl !== inputMinutes) {
            inputMinutes.value = mainMinutes.toString().padStart(2, '0');
        }
        if (activeEl !== inputSeconds) {
            inputSeconds.value = mainSeconds.toString().padStart(2, '0');
        }
        displayUnit.textContent = `/${currentUnit}`;

        // Converted pace display
        const converted = window.logic.convertPace(currentPaceSeconds, currentUnit);
        convertedTime.textContent = window.logic.formatTime(converted);
        convertedUnit.textContent = `/${isMi ? 'km' : 'mi'}`;

        // Treadmill speeds
        if (activeEl !== inputMph) {
            inputMph.value = window.logic.paceToSpeed(currentPaceSeconds, currentUnit, 'mph').toFixed(1);
        }
        if (activeEl !== inputKmh) {
            inputKmh.value = window.logic.paceToSpeed(currentPaceSeconds, currentUnit, 'kmh').toFixed(1);
        }

        // Standard race times
        if (activeEl !== time5k) {
            time5k.value = window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, window.logic.raceDistancesKm['5k']));
        }
        if (activeEl !== time10k) {
            time10k.value = window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, window.logic.raceDistancesKm['10k']));
        }
        if (activeEl !== timeHalf) {
            timeHalf.value = window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, window.logic.raceDistancesKm['half']));
        }
        if (activeEl !== timeFull) {
            timeFull.value = window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, window.logic.raceDistancesKm['full']));
        }

        // Custom distance row
        btnCustomUnit.textContent = customDistUnit;
        btnCustomUnit.setAttribute(
            'aria-label',
            `Custom distance unit: ${customDistUnit === 'mi' ? 'miles' : 'kilometers'}. Activate to switch.`
        );
        const customKm = getCustomDistanceKm();
        if (activeEl !== timeCustom) {
            timeCustom.value = customKm > 0
                ? window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, customKm))
                : '';
        }

        // Keep Distance tab finish-time summary synced with current pace
        updateDistPaceSummary();

        saveState();
    }

    // Segmented unit selector (no-op if clicking the already-selected unit)
    function switchUnit(targetUnit) {
        if (currentUnit === targetUnit) return;
        currentUnit = targetUnit;
        currentPaceSeconds = anchorPace[targetUnit] || clampPace(
            window.logic.convertPace(currentPaceSeconds, targetUnit === 'mi' ? 'km' : 'mi')
        );
        updateUI();
    }

    btnMi.addEventListener('click', () => switchUnit('mi'));
    btnKm.addEventListener('click', () => switchUnit('km'));

    // Press-and-hold auto-repeat on +/- adjustment buttons
    const activeStopHandlers = [];
    adjustBtns.forEach(btn => {
        const adj = parseInt(btn.dataset.adj, 10);
        let holdTimeout = null;
        let repeatInterval = null;
        let handledByPointer = false;

        function step() {
            setPaceFromEdit(currentPaceSeconds + adj);
            updateUI();
        }

        function stopHold() {
            if (holdTimeout) {
                clearTimeout(holdTimeout);
                holdTimeout = null;
            }
            if (repeatInterval) {
                clearInterval(repeatInterval);
                repeatInterval = null;
            }
        }

        activeStopHandlers.push(() => {
            stopHold();
            handledByPointer = false;
        });

        btn.addEventListener('pointerdown', e => {
            if (e.button !== undefined && e.button !== 0) return;
            stopHold();
            handledByPointer = true;
            step();
            holdTimeout = setTimeout(() => {
                repeatInterval = setInterval(step, 85);
            }, 400);
        });

        btn.addEventListener('pointerup', () => {
            stopHold();
            setTimeout(() => {
                handledByPointer = false;
            }, 50);
        });

        btn.addEventListener('pointerleave', () => {
            stopHold();
            handledByPointer = false;
        });

        btn.addEventListener('pointercancel', () => {
            stopHold();
            handledByPointer = false;
        });

        btn.addEventListener('contextmenu', e => e.preventDefault());

        btn.addEventListener('click', () => {
            if (handledByPointer) {
                handledByPointer = false;
                return;
            }
            // Keyboard Enter/Space or assistive technology activation
            step();
        });
    });

    window.addEventListener('blur', () => {
        activeStopHandlers.forEach(stop => stop());
    });

    // Live & committed pace input handling
    function parseManualPaceInputs() {
        let m = parseInt(inputMinutes.value, 10);
        let s = parseInt(inputSeconds.value, 10);
        if (isNaN(m) || m < 0) m = 0;
        if (isNaN(s) || s < 0) s = 0;
        if (s > 59) s = 59;
        return (m * 60) + s;
    }

    function handlePaceLiveInput() {
        const rawSecs = parseManualPaceInputs();
        if (rawSecs >= MIN_PACE_SECS) {
            setPaceFromEdit(rawSecs);
            updateUI({ preserveActiveInput: true });
        }
    }

    function handlePaceCommit() {
        setPaceFromEdit(parseManualPaceInputs());
        updateUI();
    }

    inputMinutes.addEventListener('input', handlePaceLiveInput);
    inputSeconds.addEventListener('input', handlePaceLiveInput);
    inputMinutes.addEventListener('change', handlePaceCommit);
    inputSeconds.addEventListener('change', handlePaceCommit);
    inputMinutes.addEventListener('blur', handlePaceCommit);
    inputSeconds.addEventListener('blur', handlePaceCommit);

    inputMinutes.addEventListener('keydown', e => {
        if (e.key === ':') {
            e.preventDefault();
            inputSeconds.focus();
            inputSeconds.select();
        } else if (e.key === 'Enter') {
            e.target.blur();
        }
    });
    inputSeconds.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.target.blur();
    });

    inputMinutes.addEventListener('focus', () => inputMinutes.select());
    inputSeconds.addEventListener('focus', () => inputSeconds.select());

    // Treadmill speed inputs (mph & km/h)
    function handleSpeedInput(inputEl, speedUnit, commit) {
        const speed = parseFloat(inputEl.value);
        if (!isNaN(speed) && speed > 0) {
            const paceSecs = window.logic.speedToPace(speed, speedUnit, currentUnit);
            setPaceFromEdit(paceSecs);
            updateUI({ preserveActiveInput: !commit });
        } else if (commit) {
            updateUI();
        }
    }

    [
        [inputMph, 'mph'],
        [inputKmh, 'kmh']
    ].forEach(([el, unit]) => {
        el.addEventListener('input', () => handleSpeedInput(el, unit, false));
        el.addEventListener('change', () => handleSpeedInput(el, unit, true));
        el.addEventListener('blur', () => handleSpeedInput(el, unit, true));
        el.addEventListener('focus', () => el.select());
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter') e.target.blur();
        });
    });

    // Reverse Pace Calculator (Standard Race Times)
    raceTimeInputs.forEach(input => {
        input.addEventListener('change', e => {
            const totalSecs = window.logic.parseTime(e.target.value);
            const distKey = e.target.dataset.dist;
            if (totalSecs > 0 && window.logic.raceDistancesKm[distKey]) {
                const distanceKm = window.logic.raceDistancesKm[distKey];
                const requiredPaceSecs = window.logic.calculatePaceFromTimeAndDistance(totalSecs, distanceKm, currentUnit);
                setPaceFromEdit(requiredPaceSecs);
            }
            updateUI();
        });
        input.addEventListener('focus', () => input.select());
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') e.target.blur();
        });
    });

    // Custom Distance Row
    inputCustomDist.addEventListener('input', () => {
        updateUI({ preserveActiveInput: true });
    });
    inputCustomDist.addEventListener('change', () => updateUI());
    inputCustomDist.addEventListener('focus', () => inputCustomDist.select());
    inputCustomDist.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.target.blur();
    });

    btnCustomUnit.addEventListener('click', () => {
        customDistUnit = customDistUnit === 'mi' ? 'km' : 'mi';
        updateUI();
    });

    timeCustom.addEventListener('change', () => {
        const customKm = getCustomDistanceKm();
        const totalSecs = window.logic.parseTime(timeCustom.value);
        if (customKm > 0 && totalSecs > 0) {
            const requiredPaceSecs = window.logic.calculatePaceFromTimeAndDistance(totalSecs, customKm, currentUnit);
            setPaceFromEdit(requiredPaceSecs);
        }
        updateUI();
    });
    timeCustom.addEventListener('focus', () => timeCustom.select());
    timeCustom.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.target.blur();
    });

    // Tabs (click, keyboard arrows, and horizontal-dominant touch swipe)
    const tabBtns = document.querySelectorAll('.tab-nav-btn');
    const tabViews = document.querySelectorAll('.tab-view');

    function switchTab(targetId, focusTab = false) {
        tabBtns.forEach(b => {
            const isSelected = b.dataset.target === targetId;
            b.classList.toggle('active', isSelected);
            b.setAttribute('aria-selected', String(isSelected));
            b.setAttribute('tabindex', isSelected ? '0' : '-1');
            if (isSelected && focusTab) {
                b.focus();
            }
        });

        tabViews.forEach(view => {
            const isTarget = view.id === targetId;
            view.classList.toggle('active', isTarget);
            view.classList.toggle('hidden', !isTarget);
        });
    }

    tabBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => switchTab(btn.dataset.target));
        btn.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const nextIdx = e.key === 'ArrowRight'
                    ? (idx + 1) % tabBtns.length
                    : (idx - 1 + tabBtns.length) % tabBtns.length;
                switchTab(tabBtns[nextIdx].dataset.target, true);
            }
        });
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let swipeIgnore = false;
    const mainArea = document.querySelector('main');

    mainArea.addEventListener('touchstart', e => {
        const target = e.target;
        swipeIgnore = Boolean(target && target.closest('input'));
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    mainArea.addEventListener('touchend', e => {
        if (swipeIgnore) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const threshold = 60;

        // Require horizontal movement > threshold AND clearly dominant over vertical scroll
        if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
            const activeTab = document.querySelector('.tab-view.active');
            if (!activeTab) return;
            if (dx < 0 && activeTab.id === 'tab-pace') {
                switchTab('tab-distance');
            } else if (dx > 0 && activeTab.id === 'tab-distance') {
                switchTab('tab-pace');
            }
        }
    }, { passive: true });

    // Distance Converter
    function updateDistancesFromMiles(save = true) {
        const miles = parseFloat(inputDistMiles.value);
        if (!isNaN(miles) && miles >= 0) {
            const km = window.logic.convertMilesToKm(miles);
            inputDistKm.value = parseFloat(km.toFixed(3));
        } else {
            inputDistKm.value = '';
        }
        if (save) {
            storage.set('distValue', inputDistMiles.value);
            storage.set('distUnit', 'mi');
        }
        updateDistPaceSummary();
    }

    function updateDistancesFromKm(save = true) {
        const km = parseFloat(inputDistKm.value);
        if (!isNaN(km) && km >= 0) {
            const miles = window.logic.convertKmToMiles(km);
            inputDistMiles.value = parseFloat(miles.toFixed(3));
        } else {
            inputDistMiles.value = '';
        }
        if (save) {
            storage.set('distValue', inputDistKm.value);
            storage.set('distUnit', 'km');
        }
        updateDistPaceSummary();
    }

    inputDistMiles.addEventListener('input', () => updateDistancesFromMiles(true));
    inputDistKm.addEventListener('input', () => updateDistancesFromKm(true));

    inputDistMiles.addEventListener('focus', () => inputDistMiles.select());
    inputDistKm.addEventListener('focus', () => inputDistKm.select());
    inputDistMiles.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.target.blur();
    });
    inputDistKm.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.target.blur();
    });

    // Clickable & keyboard-accessible Common Distance rows using exact canonical units
    function selectDistanceRow(row) {
        if (row.dataset.km) {
            inputDistKm.value = parseFloat(Number(row.dataset.km).toFixed(4));
            updateDistancesFromKm(true);
        } else if (row.dataset.mi) {
            inputDistMiles.value = parseFloat(Number(row.dataset.mi).toFixed(4));
            updateDistancesFromMiles(true);
        }
    }

    distanceRows.forEach(row => {
        row.addEventListener('click', () => selectDistanceRow(row));
        row.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectDistanceRow(row);
            }
        });
    });

    // Show All / Show Fewer Distances toggle
    toggleDistancesBtn.addEventListener('click', () => {
        const expanded = distanceGrid.classList.toggle('show-all');
        toggleDistancesBtn.textContent = expanded ? 'Show Fewer Distances' : 'Show All Distances';
        toggleDistancesBtn.setAttribute('aria-expanded', String(expanded));
    });

    // Theme Toggle Logic (targets document.documentElement to match early <head> script & CSS)
    const themeToggleBtn = document.getElementById('theme-toggle');
    const metaThemeColor = document.getElementById('meta-theme-color');

    function applyTheme(isDark) {
        const root = document.documentElement;
        root.classList.toggle('theme-dark', isDark);
        root.classList.toggle('theme-light', !isDark);
        themeToggleBtn.setAttribute('aria-pressed', String(isDark));
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#2563eb');
        }
    }

    function initTheme() {
        const savedTheme = storage.get('theme');
        const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

        if (savedTheme === 'dark' || savedTheme === 'light') {
            applyTheme(savedTheme === 'dark');
        } else {
            applyTheme(Boolean(mediaQuery && mediaQuery.matches));
        }

        if (mediaQuery && mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', e => {
                if (!storage.get('theme')) {
                    applyTheme(e.matches);
                }
            });
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const isCurrentlyDark = document.documentElement.classList.contains('theme-dark');
        const newIsDark = !isCurrentlyDark;
        applyTheme(newIsDark);
        storage.set('theme', newIsDark ? 'dark' : 'light');
    });

    initTheme();

    // Initial render
    loadState();
    updateUI();

    // Restore saved converter distance without unit rounding drift
    const savedDistValue = storage.get('distValue');
    const savedDistUnit = storage.get('distUnit');
    if (savedDistValue !== null && savedDistValue !== '') {
        if (savedDistUnit === 'km') {
            inputDistKm.value = savedDistValue;
            updateDistancesFromKm(false);
        } else {
            inputDistMiles.value = savedDistValue;
            updateDistancesFromMiles(false);
        }
    } else {
        // Backwards compatibility with legacy distMiles key
        const legacyMiles = storage.get('distMiles');
        if (legacyMiles) {
            inputDistMiles.value = legacyMiles;
            updateDistancesFromMiles(true);
        }
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const toast = document.getElementById('update-toast');
        const refreshBtn = document.getElementById('btn-refresh');
        let waitingWorker = null;

        function showUpdateToast(worker) {
            waitingWorker = worker;
            if (toast) toast.classList.remove('hidden');
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (waitingWorker) {
                    waitingWorker.postMessage({ action: 'skipWaiting' });
                }
            });
        }

        navigator.serviceWorker.register('./sw.js').then(registration => {
            if (registration.waiting && navigator.serviceWorker.controller) {
                showUpdateToast(registration.waiting);
            }

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateToast(newWorker);
                    }
                });
            });
        }).catch(registrationError => {
            console.error('SW registration failed: ', registrationError);
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    });
}

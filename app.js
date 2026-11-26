// App UI & interaction logic
document.addEventListener('DOMContentLoaded', () => {
    const logic = window.logic;
    const MIN_PACE_SECS = 1;
    const MAX_PACE_SECS = 3599; // 59:59
    const DEFAULT_PACE_SECS = 8 * 60;
    const DEFAULT_CUSTOM_DIST = '10';
    const DEFAULT_CONVERTER_KM = '5';
    const THEME_COLORS = {
        dark: '#0b1120',
        light: '#eef2f7'
    };

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
        if (!Number.isFinite(pace)) return DEFAULT_PACE_SECS;
        return Math.max(MIN_PACE_SECS, Math.min(MAX_PACE_SECS, Math.round(pace)));
    }

    // Ensure WebKit / mobile Safari commits any focused <input> before handling button taps
    function commitActiveInput() {
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT') {
            active.blur();
        }
    }

    function bindBlurOnEnter(el) {
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        });
    }

    // State
    let currentUnit = 'mi'; // 'mi' or 'km'
    let currentPaceSeconds = DEFAULT_PACE_SECS;
    // Anchor both units on edits so switching mi <-> km <-> mi repeatedly never drifts
    let anchorPace = {
        mi: currentPaceSeconds,
        km: clampPace(logic.convertPace(currentPaceSeconds, 'mi'))
    };
    let customDistUnit = 'mi';
    let lastValidCustomDist = DEFAULT_CUSTOM_DIST;
    let converterDistKm = Number(DEFAULT_CONVERTER_KM);

    function setPaceFromEdit(newPaceSecs, unit = currentUnit) {
        currentUnit = unit === 'km' ? 'km' : 'mi';
        currentPaceSeconds = clampPace(newPaceSecs);
        const otherUnit = currentUnit === 'mi' ? 'km' : 'mi';
        anchorPace = {
            [currentUnit]: currentPaceSeconds,
            [otherUnit]: clampPace(logic.convertPace(currentPaceSeconds, currentUnit))
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
        const val = logic.parseDecimal(inputCustomDist.value);
        if (isNaN(val) || val <= 0) return 0;
        return customDistUnit === 'mi' ? logic.convertMilesToKm(val) : val;
    }

    function updateDistPaceSummary() {
        if (converterDistKm > 0) {
            distSummaryPace.textContent = `${logic.formatTime(currentPaceSeconds)}/${currentUnit}`;
            const finishSecs = logic.calculateFinishTime(currentPaceSeconds, currentUnit, converterDistKm);
            distSummaryTime.textContent = logic.formatTime(finishSecs);
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
            setPaceFromEdit(DEFAULT_PACE_SECS, validUnit);
        }

        const savedCustomDist = storage.get('customDistValue');
        if (savedCustomDist !== null && logic.parseDecimal(savedCustomDist) > 0) {
            lastValidCustomDist = savedCustomDist.trim();
        } else {
            lastValidCustomDist = DEFAULT_CUSTOM_DIST;
        }
        inputCustomDist.value = lastValidCustomDist;

        const savedCustomUnit = storage.get('customDistUnit');
        if (savedCustomUnit === 'mi' || savedCustomUnit === 'km') {
            customDistUnit = savedCustomUnit;
        }
    }

    function saveState() {
        storage.set('currentPaceSeconds', currentPaceSeconds);
        storage.set('currentUnit', currentUnit);
        storage.set('customDistValue', lastValidCustomDist);
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
        const converted = logic.convertPace(currentPaceSeconds, currentUnit);
        convertedTime.textContent = logic.formatTime(converted);
        convertedUnit.textContent = `/${isMi ? 'km' : 'mi'}`;

        // Treadmill speeds
        if (activeEl !== inputMph) {
            inputMph.value = logic.paceToSpeed(currentPaceSeconds, currentUnit, 'mph').toFixed(1);
        }
        if (activeEl !== inputKmh) {
            inputKmh.value = logic.paceToSpeed(currentPaceSeconds, currentUnit, 'kmh').toFixed(1);
        }

        // Standard race times
        raceTimeInputs.forEach(input => {
            if (activeEl !== input) {
                const distKm = logic.raceDistancesKm[input.dataset.dist];
                input.value = logic.formatTime(logic.calculateFinishTime(currentPaceSeconds, currentUnit, distKm));
            }
        });

        // Custom distance row
        btnCustomUnit.textContent = customDistUnit;
        btnCustomUnit.setAttribute(
            'aria-label',
            `Custom distance unit: ${customDistUnit === 'mi' ? 'miles' : 'kilometers'}. Activate to switch.`
        );
        const customKm = getCustomDistanceKm();
        if (activeEl !== timeCustom) {
            timeCustom.value = customKm > 0
                ? logic.formatTime(logic.calculateFinishTime(currentPaceSeconds, currentUnit, customKm))
                : '';
        }

        // Keep Distance tab finish-time summary synced with current pace
        updateDistPaceSummary();

        saveState();
    }

    // Segmented unit selector (commits active input first; no-op if already on targetUnit)
    function switchUnit(targetUnit) {
        commitActiveInput();
        if (currentUnit === targetUnit) return;
        currentUnit = targetUnit;
        currentPaceSeconds = anchorPace[targetUnit] || clampPace(
            logic.convertPace(currentPaceSeconds, targetUnit === 'mi' ? 'km' : 'mi')
        );
        updateUI();
    }

    btnMi.addEventListener('click', () => switchUnit('mi'));
    btnKm.addEventListener('click', () => switchUnit('km'));

    // Press-and-hold auto-repeat on +/- adjustment buttons
    // Single taps fire via native 'click' (preventing touch pointerleave/click double-triggers);
    // holding >= 350ms starts repeating and suppresses the trailing click on release.
    const activeStopHandlers = [];
    adjustBtns.forEach(btn => {
        const adj = parseInt(btn.dataset.adj, 10);
        let holdTimeout = null;
        let repeatInterval = null;
        let suppressNextClick = false;
        let suppressResetTimer = null;

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

        function endPointer() {
            const wasRepeating = suppressNextClick;
            stopHold();
            if (wasRepeating) {
                if (suppressResetTimer) clearTimeout(suppressResetTimer);
                suppressResetTimer = setTimeout(() => {
                    suppressNextClick = false;
                    suppressResetTimer = null;
                }, 600);
            }
        }

        activeStopHandlers.push(() => {
            stopHold();
            suppressNextClick = false;
            if (suppressResetTimer) {
                clearTimeout(suppressResetTimer);
                suppressResetTimer = null;
            }
        });

        btn.addEventListener('pointerdown', e => {
            if (e.button !== undefined && e.button !== 0) return;
            commitActiveInput();
            stopHold();
            if (suppressResetTimer) {
                clearTimeout(suppressResetTimer);
                suppressResetTimer = null;
            }
            suppressNextClick = false;

            holdTimeout = setTimeout(() => {
                holdTimeout = null;
                suppressNextClick = true;
                step();
                repeatInterval = setInterval(step, 85);
            }, 350);
        });

        btn.addEventListener('pointerup', endPointer);
        btn.addEventListener('pointerleave', endPointer);
        btn.addEventListener('pointercancel', endPointer);
        btn.addEventListener('contextmenu', e => e.preventDefault());

        btn.addEventListener('click', e => {
            commitActiveInput();
            if (suppressNextClick) {
                suppressNextClick = false;
                if (suppressResetTimer) {
                    clearTimeout(suppressResetTimer);
                    suppressResetTimer = null;
                }
                e.preventDefault();
                return;
            }
            step();
        });
    });

    function stopAllActiveHolds() {
        activeStopHandlers.forEach(stop => stop());
    }

    window.addEventListener('blur', stopAllActiveHolds);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAllActiveHolds();
    });

    // Reliable select-on-focus helper that prevents mobile mouseup caret collapse
    function bindSelectOnFocus(el) {
        let justFocused = false;
        el.addEventListener('focus', () => {
            justFocused = true;
            setTimeout(() => el.select(), 0);
        });
        el.addEventListener('mouseup', e => {
            if (justFocused) {
                e.preventDefault();
                justFocused = false;
            }
        });
        el.addEventListener('blur', () => {
            justFocused = false;
        });
    }

    // Live & committed pace input handling (clears to placeholder on focus for easy one-handed entry)
    function parseManualPaceInputs() {
        const minRaw = inputMinutes.value !== '' ? inputMinutes.value : inputMinutes.placeholder;
        const secRaw = inputSeconds.value !== '' ? inputSeconds.value : inputSeconds.placeholder;
        let m = parseInt(minRaw, 10);
        let s = parseInt(secRaw, 10);
        if (isNaN(m) || m < 0) m = 0;
        if (isNaN(s) || s < 0) s = 0;
        if (s > 59) s = 59;
        return (m * 60) + s;
    }

    function handlePaceLiveInput(e) {
        const el = e.target;
        const digits = el.value.replace(/\D/g, '').slice(0, 2);
        if (el.value !== digits) {
            el.value = digits;
        }
        const rawSecs = parseManualPaceInputs();
        if (rawSecs >= MIN_PACE_SECS) {
            setPaceFromEdit(rawSecs);
            updateUI({ preserveActiveInput: true });
        }
        // Auto-advance from minutes to seconds after typing 2 digits
        if (el === inputMinutes && digits.length === 2) {
            inputSeconds.focus();
        }
    }

    function handlePaceCommit() {
        setPaceFromEdit(parseManualPaceInputs());
        updateUI();
    }

    [inputMinutes, inputSeconds].forEach(el => {
        el.addEventListener('focus', () => {
            if (el.value) {
                el.placeholder = el.value;
                el.value = '';
            }
        });
        el.addEventListener('input', handlePaceLiveInput);
        el.addEventListener('blur', handlePaceCommit);
        bindBlurOnEnter(el);
    });

    inputMinutes.addEventListener('keydown', e => {
        if (e.key === ':') {
            e.preventDefault();
            inputSeconds.focus();
        }
    });

    // Treadmill speed inputs (mph & km/h)
    function handleSpeedInput(inputEl, speedUnit, commit) {
        const speed = logic.parseDecimal(inputEl.value);
        if (!isNaN(speed) && speed > 0) {
            const paceSecs = logic.speedToPace(speed, speedUnit, currentUnit);
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
        let dirty = false;
        el.addEventListener('focus', () => {
            dirty = false;
        });
        el.addEventListener('input', () => {
            dirty = true;
            handleSpeedInput(el, unit, false);
        });
        el.addEventListener('blur', () => {
            if (dirty) {
                dirty = false;
                handleSpeedInput(el, unit, true);
            } else {
                updateUI();
            }
        });
        bindSelectOnFocus(el);
        bindBlurOnEnter(el);
    });

    // Stopwatch-style Race Time inputs (giant numeric keypad + live automatic colons while typing)
    function bindStopwatchTimeInput(input, getDistanceKm) {
        const defaultPlaceholder = input.placeholder;

        function snapCaretToEnd() {
            try {
                const len = input.value.length;
                input.setSelectionRange(len, len);
            } catch (err) {}
        }

        input.addEventListener('focus', () => {
            if (input.value) {
                input.placeholder = input.value;
                input.value = '';
            }
        });

        input.addEventListener('input', () => {
            const formatted = logic.formatTimeInput(input.value);
            if (input.value !== formatted) {
                input.value = formatted;
            }
            snapCaretToEnd();
        });

        input.addEventListener('click', snapCaretToEnd);

        input.addEventListener('blur', () => {
            input.placeholder = defaultPlaceholder;
            const distanceKm = getDistanceKm();
            const totalSecs = logic.parseTime(input.value);
            if (distanceKm > 0 && totalSecs > 0) {
                const requiredPaceSecs = logic.calculatePaceFromTimeAndDistance(totalSecs, distanceKm, currentUnit);
                setPaceFromEdit(requiredPaceSecs);
            }
            updateUI();
        });

        bindBlurOnEnter(input);
    }

    raceTimeInputs.forEach(input => {
        const distKey = input.dataset.dist;
        bindStopwatchTimeInput(input, () => logic.raceDistancesKm[distKey] || 0);

        // Make the entire race card tappable while running without double-firing native <label>
        const row = input.closest('.race-item');
        if (row) {
            row.addEventListener('click', e => {
                if (!e.target.closest('input, label, button')) {
                    input.focus();
                }
            });
        }
    });

    // Custom Distance Row
    inputCustomDist.addEventListener('input', () => {
        const val = logic.parseDecimal(inputCustomDist.value);
        if (!isNaN(val) && val > 0) {
            lastValidCustomDist = inputCustomDist.value.trim();
        }
        updateUI({ preserveActiveInput: true });
    });
    inputCustomDist.addEventListener('blur', () => {
        const val = logic.parseDecimal(inputCustomDist.value);
        if (!isNaN(val) && val > 0) {
            lastValidCustomDist = inputCustomDist.value.trim();
        } else {
            inputCustomDist.value = lastValidCustomDist;
        }
        updateUI();
    });
    bindSelectOnFocus(inputCustomDist);
    bindBlurOnEnter(inputCustomDist);

    btnCustomUnit.addEventListener('click', () => {
        commitActiveInput();
        customDistUnit = customDistUnit === 'mi' ? 'km' : 'mi';
        updateUI();
    });

    bindStopwatchTimeInput(timeCustom, getCustomDistanceKm);

    // Tabs (click, keyboard arrows/Home/End, horizontal-dominant single-finger touch swipe, and directional slide/fade)
    const tabNav = document.querySelector('.tab-navigation');
    const tabBtns = document.querySelectorAll('.tab-nav-btn');
    const tabViews = document.querySelectorAll('.tab-view');
    const tabOrder = ['tab-pace', 'tab-distance'];
    const TAB_ANIM_CLASSES = [
        'tab-leaving',
        'tab-enter-right',
        'tab-enter-left',
        'tab-leave-left',
        'tab-leave-right'
    ];
    let tabCleanupTimer = null;
    let activeTouchId = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let swipeIgnore = false;
    let swipeAxis = null;
    let activeDragView = null;
    let dragSnapTimer = null;
    const mainArea = document.querySelector('main');

    function clearTabAnimationClasses() {
        tabViews.forEach(view => {
            view.classList.remove(...TAB_ANIM_CLASSES);
        });
    }

    function clearDragStyles(view) {
        if (!view) return;
        view.style.transform = '';
        view.style.opacity = '';
        view.style.transition = '';
    }

    function resetPillDrag() {
        if (!tabNav) return;
        tabNav.classList.remove('is-dragging');
        tabNav.style.removeProperty('--tab-pill-drag');
    }

    function cancelActiveSwipeDrag(springBack = false) {
        resetPillDrag();
        if (dragSnapTimer) {
            clearTimeout(dragSnapTimer);
            dragSnapTimer = null;
        }
        if (!activeDragView) return;

        const viewToReset = activeDragView;
        activeDragView = null;

        if (springBack) {
            viewToReset.style.transition = 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s ease';
            viewToReset.style.transform = 'translate3d(0, 0, 0)';
            viewToReset.style.opacity = '1';
            dragSnapTimer = setTimeout(() => {
                dragSnapTimer = null;
                clearDragStyles(viewToReset);
            }, 190);
        } else {
            clearDragStyles(viewToReset);
        }
    }

    function switchTab(targetId, focusTab = false) {
        const currentView = document.querySelector('.tab-view.active');
        const currentId = currentView ? currentView.id : null;

        tabBtns.forEach(b => {
            const isSelected = b.dataset.target === targetId;
            b.classList.toggle('active', isSelected);
            b.setAttribute('aria-selected', String(isSelected));
            b.setAttribute('tabindex', isSelected ? '0' : '-1');
            if (isSelected && focusTab) {
                b.focus();
            }
        });

        if (tabNav) {
            tabNav.dataset.activeTab = targetId;
        }

        if (currentId === targetId) return;

        // Commit any active input edit & dismiss mobile keyboard cleanly before leaving current tab
        if (currentView && currentView.contains(document.activeElement) && document.activeElement.blur) {
            document.activeElement.blur();
        }

        cancelActiveSwipeDrag(false);
        tabViews.forEach(clearDragStyles);

        if (tabCleanupTimer) {
            clearTimeout(tabCleanupTimer);
            tabCleanupTimer = null;
        }
        clearTabAnimationClasses();

        const targetView = document.getElementById(targetId);
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!currentView || !targetView || prefersReducedMotion) {
            tabViews.forEach(view => {
                const isTarget = view.id === targetId;
                view.classList.toggle('active', isTarget);
                view.classList.toggle('hidden', !isTarget);
            });
            return;
        }

        const movingForward = tabOrder.indexOf(targetId) > tabOrder.indexOf(currentId);

        tabViews.forEach(view => {
            if (view !== currentView && view !== targetView) {
                view.classList.remove('active');
                view.classList.add('hidden');
            }
        });

        currentView.classList.remove('active');
        currentView.classList.add('tab-leaving', movingForward ? 'tab-leave-left' : 'tab-leave-right');

        targetView.classList.remove('hidden');
        // Force reflow so rapid back-and-forth switches cleanly restart keyframe animations
        void targetView.offsetWidth;
        targetView.classList.add('active', movingForward ? 'tab-enter-right' : 'tab-enter-left');

        tabCleanupTimer = setTimeout(() => {
            tabCleanupTimer = null;
            tabViews.forEach(view => {
                const isActive = view.classList.contains('active');
                view.classList.toggle('hidden', !isActive);
                view.classList.remove(...TAB_ANIM_CLASSES);
            });
        }, 270);
    }

    tabBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => switchTab(btn.dataset.target));
        btn.addEventListener('keydown', e => {
            let nextIdx = null;
            if (e.key === 'ArrowRight') {
                nextIdx = (idx + 1) % tabBtns.length;
            } else if (e.key === 'ArrowLeft') {
                nextIdx = (idx - 1 + tabBtns.length) % tabBtns.length;
            } else if (e.key === 'Home') {
                nextIdx = 0;
            } else if (e.key === 'End') {
                nextIdx = tabBtns.length - 1;
            }
            if (nextIdx !== null) {
                e.preventDefault();
                switchTab(tabBtns[nextIdx].dataset.target, true);
            }
        });
    });

    function findTrackedTouch(touchList) {
        if (activeTouchId === null) return null;
        for (let i = 0; i < touchList.length; i++) {
            if (touchList[i].identifier === activeTouchId) {
                return touchList[i];
            }
        }
        return null;
    }

    mainArea.addEventListener('touchstart', e => {
        if (e.touches.length > 1) {
            swipeIgnore = true;
            activeTouchId = null;
            cancelActiveSwipeDrag(true);
            return;
        }
        const touch = e.changedTouches[0];
        const target = e.target;
        swipeIgnore = Boolean(target && target.closest('input, .adjust-btn'));
        swipeAxis = null;
        activeTouchId = touch.identifier;
        cancelActiveSwipeDrag(false);
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true });

    mainArea.addEventListener('touchmove', e => {
        if (swipeIgnore) return;
        if (e.touches.length > 1) {
            swipeIgnore = true;
            activeTouchId = null;
            cancelActiveSwipeDrag(true);
            return;
        }
        const touch = findTrackedTouch(e.changedTouches);
        if (!touch) return;

        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        if (swipeAxis === null) {
            if (Math.hypot(dx, dy) < 10) return;
            swipeAxis = Math.abs(dx) > Math.abs(dy) * 1.35 ? 'x' : 'y';
        }
        if (swipeAxis !== 'x') return;

        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const activeTab = document.querySelector('.tab-view.active');
        if (!activeTab) return;
        activeDragView = activeTab;

        const canSwipeLeft = activeTab.id === 'tab-pace' && dx < 0;
        const canSwipeRight = activeTab.id === 'tab-distance' && dx > 0;
        const canSwitch = canSwipeLeft || canSwipeRight;

        // Responsive finger follow toward adjacent tab; subtle rubber-band resistance at outer edges
        const offsetX = canSwitch
            ? Math.max(-44, Math.min(44, dx * 0.34))
            : Math.max(-12, Math.min(12, dx * 0.09));
        const opacity = canSwitch ? Math.max(0.82, 1 - Math.abs(dx) / 520) : 1;

        activeTab.style.transition = 'none';
        activeTab.style.transform = `translate3d(${offsetX.toFixed(1)}px, 0, 0)`;
        activeTab.style.opacity = opacity.toFixed(3);

        if (tabNav) {
            if (canSwitch) {
                const pillNudge = Math.max(-18, Math.min(18, -dx * 0.14));
                tabNav.classList.add('is-dragging');
                tabNav.style.setProperty('--tab-pill-drag', `${pillNudge.toFixed(1)}px`);
            } else {
                resetPillDrag();
            }
        }
    }, { passive: true });

    function finishTouchSwipe(e, cancelled = false) {
        if (swipeIgnore) return;
        const touch = findTrackedTouch(e.changedTouches);
        if (!touch) return;
        activeTouchId = null;

        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const threshold = 55;
        const activeTab = activeDragView || document.querySelector('.tab-view.active');

        resetPillDrag();

        const shouldSwitch = !cancelled &&
            (swipeAxis === 'x' || Math.abs(dx) > Math.abs(dy) * 1.5) &&
            Math.abs(dx) > threshold;

        if (shouldSwitch && activeTab) {
            if (dx < 0 && activeTab.id === 'tab-pace') {
                clearDragStyles(activeTab);
                activeDragView = null;
                switchTab('tab-distance');
                return;
            }
            if (dx > 0 && activeTab.id === 'tab-distance') {
                clearDragStyles(activeTab);
                activeDragView = null;
                switchTab('tab-pace');
                return;
            }
        }

        // Smoothly spring back if gesture didn't cross tab switch threshold
        cancelActiveSwipeDrag(true);
    }

    mainArea.addEventListener('touchend', e => finishTouchSwipe(e, false), { passive: true });
    mainArea.addEventListener('touchcancel', e => finishTouchSwipe(e, true), { passive: true });

    // Distance Converter
    function syncDistanceInputFontSize() {
        const milesLen = (inputDistMiles.value || inputDistMiles.placeholder || '').length;
        const kmLen = (inputDistKm.value || inputDistKm.placeholder || '').length;
        const maxLen = Math.max(milesLen, kmLen);
        const scale = maxLen > 5 ? Math.max(0.52, 5.4 / maxLen) : 1;
        const scaleStr = scale.toFixed(3);
        inputDistMiles.style.setProperty('--dist-font-scale', scaleStr);
        inputDistKm.style.setProperty('--dist-font-scale', scaleStr);
    }

    function syncSelectedDistanceRow() {
        const km = logic.parseDecimal(inputDistKm.value);
        const miles = logic.parseDecimal(inputDistMiles.value);
        distanceRows.forEach(row => {
            let matches = false;
            if (row.dataset.km && !isNaN(km)) {
                matches = Math.abs(km - Number(row.dataset.km)) < 0.0005;
            } else if (row.dataset.mi && !isNaN(miles)) {
                matches = Math.abs(miles - Number(row.dataset.mi)) < 0.0005;
            }
            row.classList.toggle('selected', matches);
            row.setAttribute('aria-pressed', String(matches));
        });
    }

    function updateDistancesFromMiles(save = true) {
        const miles = logic.parseDecimal(inputDistMiles.value);
        if (!isNaN(miles) && miles >= 0) {
            converterDistKm = logic.convertMilesToKm(miles);
            inputDistKm.value = parseFloat(converterDistKm.toFixed(3));
            if (save && miles > 0) {
                storage.set('distValue', inputDistMiles.value.trim());
                storage.set('distUnit', 'mi');
            }
        } else {
            converterDistKm = 0;
            inputDistKm.value = '';
        }
        syncDistanceInputFontSize();
        syncSelectedDistanceRow();
        updateDistPaceSummary();
    }

    function updateDistancesFromKm(save = true) {
        const km = logic.parseDecimal(inputDistKm.value);
        if (!isNaN(km) && km >= 0) {
            converterDistKm = km;
            const miles = logic.convertKmToMiles(km);
            inputDistMiles.value = parseFloat(miles.toFixed(3));
            if (save && km > 0) {
                storage.set('distValue', inputDistKm.value.trim());
                storage.set('distUnit', 'km');
            }
        } else {
            converterDistKm = 0;
            inputDistMiles.value = '';
        }
        syncDistanceInputFontSize();
        syncSelectedDistanceRow();
        updateDistPaceSummary();
    }

    function cleanInvalidDistanceOnBlur(inputEl) {
        if (inputEl.value !== '' && isNaN(logic.parseDecimal(inputEl.value))) {
            inputEl.value = '';
            syncDistanceInputFontSize();
        }
    }

    inputDistMiles.addEventListener('input', () => updateDistancesFromMiles(true));
    inputDistKm.addEventListener('input', () => updateDistancesFromKm(true));
    inputDistMiles.addEventListener('blur', () => cleanInvalidDistanceOnBlur(inputDistMiles));
    inputDistKm.addEventListener('blur', () => cleanInvalidDistanceOnBlur(inputDistKm));

    bindSelectOnFocus(inputDistMiles);
    bindSelectOnFocus(inputDistKm);
    bindBlurOnEnter(inputDistMiles);
    bindBlurOnEnter(inputDistKm);

    // Clickable & keyboard-accessible Common Distance rows using exact canonical units
    function selectDistanceRow(row) {
        commitActiveInput();
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
            metaThemeColor.setAttribute('content', isDark ? THEME_COLORS.dark : THEME_COLORS.light);
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

    // Restore saved converter distance without unit rounding drift (defaulting to 5 km on fresh startup)
    function initConverterDistance() {
        const savedDistValue = storage.get('distValue');
        const savedDistUnit = storage.get('distUnit');
        if (savedDistValue !== null && logic.parseDecimal(savedDistValue) > 0) {
            if (savedDistUnit === 'km') {
                inputDistKm.value = savedDistValue;
                updateDistancesFromKm(false);
            } else {
                inputDistMiles.value = savedDistValue;
                updateDistancesFromMiles(false);
            }
            return;
        }

        // Backwards compatibility with legacy distMiles key, falling back to 5K default
        const legacyMiles = storage.get('distMiles');
        if (legacyMiles && logic.parseDecimal(legacyMiles) > 0) {
            inputDistMiles.value = legacyMiles;
            updateDistancesFromMiles(true);
        } else {
            inputDistKm.value = DEFAULT_CONVERTER_KM;
            updateDistancesFromKm(false);
        }
    }

    initTheme();
    loadState();
    initConverterDistance();
    updateUI();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const toast = document.getElementById('update-toast');
        const refreshBtn = document.getElementById('btn-refresh');
        const hadController = Boolean(navigator.serviceWorker.controller);
        let waitingWorker = null;
        let refreshing = false;

        function showUpdateToast(worker) {
            if (refreshing) return;
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

        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => {
            if (registration.waiting && navigator.serviceWorker.controller) {
                showUpdateToast(registration.waiting);
            }

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Avoid a 1-frame toast flash when skipWaiting() auto-activates immediately
                        setTimeout(() => {
                            if (!refreshing && registration.waiting === newWorker) {
                                showUpdateToast(newWorker);
                            }
                        }, 200);
                    }
                });
            });
        }).catch(registrationError => {
            console.error('SW registration failed: ', registrationError);
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hadController || refreshing) return;
            refreshing = true;
            if (toast) toast.classList.add('hidden');
            window.location.reload();
        });
    });
}

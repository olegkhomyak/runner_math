// App logic
document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentUnit = 'mi'; // 'mi' or 'km'
    let currentPaceSeconds = 8 * 60; // Default to 8:00 min/mi
    const MIN_PACE_SECS = 1;
    const MAX_PACE_SECS = 3599; // 59:59

    function clampPace(pace) {
        if (isNaN(pace)) return MIN_PACE_SECS;
        return Math.max(MIN_PACE_SECS, Math.min(MAX_PACE_SECS, pace));
    }

    // DOM Elements
    const btnMi = document.getElementById('btn-mi');
    const btnKm = document.getElementById('btn-km');
    
    const inputMinutes = document.getElementById('input-minutes');
    const inputSeconds = document.getElementById('input-seconds');
    const displayUnit = document.getElementById('display-unit');
    
    const convertedTime = document.getElementById('converted-time');
    const convertedUnit = document.getElementById('converted-unit');
    
    const time5k = document.getElementById('input-time-5k');
    const time10k = document.getElementById('input-time-10k');
    const timeHalf = document.getElementById('input-time-half');
    const timeFull = document.getElementById('input-time-full');
    const raceTimeInputs = document.querySelectorAll('.race-time-input');
    
    const adjustBtns = document.querySelectorAll('.adjust-btn');

    // Persistence
    function loadState() {
        const savedPace = localStorage.getItem('currentPaceSeconds');
        const savedUnit = localStorage.getItem('currentUnit');

        if (savedPace) currentPaceSeconds = parseInt(savedPace, 10);
        if (savedUnit) currentUnit = savedUnit;
    }

    function saveState() {
        localStorage.setItem('currentPaceSeconds', currentPaceSeconds);
        localStorage.setItem('currentUnit', currentUnit);
    }

    // Update UI based on state
    function updateUI() {
        // Update toggle buttons
        btnMi.classList.toggle('active', currentUnit === 'mi');
        btnKm.classList.toggle('active', currentUnit === 'km');

        // Update main display
        const mainMinutes = Math.floor(currentPaceSeconds / 60);
        const mainSeconds = currentPaceSeconds % 60;
        inputMinutes.value = mainMinutes.toString().padStart(2, '0');
        inputSeconds.value = mainSeconds.toString().padStart(2, '0');
        displayUnit.textContent = `/${currentUnit}`;

        // Update converted display
        const converted = window.logic.convertPace(currentPaceSeconds, currentUnit);
        convertedTime.textContent = window.logic.formatTime(converted);
        convertedUnit.textContent = `/${currentUnit === 'mi' ? 'km' : 'mi'}`;

        // Update race times (Option B: editable inputs)
        time5k.value = window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, window.logic.raceDistancesKm['5k']));
        time10k.value = window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, window.logic.raceDistancesKm['10k']));
        timeHalf.value = window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, window.logic.raceDistancesKm['half']));
        timeFull.value = window.logic.formatTime(window.logic.calculateFinishTime(currentPaceSeconds, currentUnit, window.logic.raceDistancesKm['full']));
        
        saveState();
    }

    // Event Listeners
    btnMi.addEventListener('click', () => {
        if (currentUnit === 'mi') {
            currentPaceSeconds = clampPace(Math.round(window.logic.convertPace(currentPaceSeconds, 'mi')));
            currentUnit = 'km';
        } else {
            currentPaceSeconds = clampPace(Math.round(window.logic.convertPace(currentPaceSeconds, 'km')));
            currentUnit = 'mi';
        }
        updateUI();
    });

    btnKm.addEventListener('click', () => {
        if (currentUnit === 'km') {
            currentPaceSeconds = clampPace(Math.round(window.logic.convertPace(currentPaceSeconds, 'km')));
            currentUnit = 'mi';
        } else {
            currentPaceSeconds = clampPace(Math.round(window.logic.convertPace(currentPaceSeconds, 'mi')));
            currentUnit = 'km';
        }
        updateUI();
    });

    adjustBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const adj = parseInt(e.target.dataset.adj, 10);
            currentPaceSeconds = clampPace(currentPaceSeconds + adj);
            updateUI();
        });
    });

    function handleManualInput() {
        let m = parseInt(inputMinutes.value, 10);
        let s = parseInt(inputSeconds.value, 10);
        
        if (isNaN(m)) m = 0;
        if (isNaN(s)) s = 0;
        
        // Ensure bounds
        if (s > 59) s = 59;
        if (s < 0) s = 0;
        if (m < 0) m = 0;

        currentPaceSeconds = clampPace((m * 60) + s);
        updateUI();
    }

    inputMinutes.addEventListener('change', handleManualInput);
    inputSeconds.addEventListener('change', handleManualInput);
    
    // Select contents on focus to make typing easier
    inputMinutes.addEventListener('focus', () => inputMinutes.select());
    inputSeconds.addEventListener('focus', () => inputSeconds.select());

    // Reverse Pace Calculator (Listen to race time edits)
    raceTimeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const val = e.target.value;
            const distKey = e.target.dataset.dist;
            
            const totalSecs = window.logic.parseTime(val);
            if (totalSecs > 0) {
                const distanceKm = window.logic.raceDistancesKm[distKey];
                const requiredPaceSecs = Math.round(window.logic.calculatePaceFromTimeAndDistance(totalSecs, distanceKm, currentUnit));
                
                if (requiredPaceSecs >= MIN_PACE_SECS && requiredPaceSecs <= MAX_PACE_SECS) {
                    currentPaceSeconds = requiredPaceSecs;
                }
                updateUI();
            } else {
                updateUI(); // reset on invalid input
            }
        });
        
        input.addEventListener('focus', () => input.select());
    });

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-nav-btn');
    const tabViews = document.querySelectorAll('.tab-view');

    function switchTab(targetId) {
        tabBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = Array.from(tabBtns).find(b => b.dataset.target === targetId);
        if (activeBtn) activeBtn.classList.add('active');
        
        tabViews.forEach(view => {
            if (view.id === targetId) {
                view.style.display = 'block';
                view.classList.add('active');
                view.classList.remove('hidden');
            } else {
                view.style.display = 'none';
                view.classList.remove('active');
                view.classList.add('hidden');
            }
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.target));
    });

    // Swipe to change tabs
    let touchStartX = 0;
    let touchEndX = 0;
    const mainArea = document.querySelector('main');

    mainArea.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    mainArea.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const threshold = 50; // minimum distance to be considered a swipe
        const activeTab = document.querySelector('.tab-view.active');
        if (!activeTab) return;

        if (touchStartX - touchEndX > threshold) {
            // Swipe Left
            if (activeTab.id === 'tab-pace') {
                switchTab('tab-distance');
            }
        } else if (touchEndX - touchStartX > threshold) {
            // Swipe Right
            if (activeTab.id === 'tab-distance') {
                switchTab('tab-pace');
            }
        }
    }

    // Distance Converter
    const inputDistMiles = document.getElementById('input-miles');
    const inputDistKm = document.getElementById('input-km');
    const toggleDistancesBtn = document.getElementById('toggle-distances-btn');
    const distanceGrid = document.getElementById('distance-grid');
    const distanceRows = document.querySelectorAll('.distance-row');

    function updateDistancesFromMiles() {
        const miles = parseFloat(inputDistMiles.value);
        if (!isNaN(miles)) {
            const km = window.logic.convertMilesToKm(miles);
            inputDistKm.value = parseFloat(km.toFixed(3));
        } else {
            inputDistKm.value = '';
        }
        localStorage.setItem('distMiles', inputDistMiles.value);
    }

    function updateDistancesFromKm() {
        const km = parseFloat(inputDistKm.value);
        if (!isNaN(km)) {
            const miles = window.logic.convertKmToMiles(km);
            inputDistMiles.value = parseFloat(miles.toFixed(3));
        } else {
            inputDistMiles.value = '';
        }
        localStorage.setItem('distMiles', inputDistMiles.value);
    }

    inputDistMiles.addEventListener('input', updateDistancesFromMiles);
    inputDistKm.addEventListener('input', updateDistancesFromKm);
    
    inputDistMiles.addEventListener('focus', () => inputDistMiles.select());
    inputDistKm.addEventListener('focus', () => inputDistKm.select());


    // Clickable table rows
    distanceRows.forEach(row => {
        row.addEventListener('click', () => {
            const mi = row.dataset.mi;
            if (mi) {
                inputDistMiles.value = mi;
                updateDistancesFromMiles();
            }
        });
    });

    // Toggle button
    toggleDistancesBtn.addEventListener('click', () => {
        distanceGrid.classList.toggle('show-all');
        if (distanceGrid.classList.contains('show-all')) {
            toggleDistancesBtn.textContent = 'Show Fewer Distances';
        } else {
            toggleDistancesBtn.textContent = 'Show More Distances';
        }
    });

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const iconMoon = document.getElementById('icon-moon');
    const iconSun = document.getElementById('icon-sun');
    
    function applyTheme(isDark) {
        if (isDark) {
            document.body.classList.add('theme-dark');
            document.body.classList.remove('theme-light');
            iconMoon.style.display = 'none';
            iconSun.style.display = 'block';
        } else {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
            iconMoon.style.display = 'block';
            iconSun.style.display = 'none';
        }
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            applyTheme(savedTheme === 'dark');
        } else {
            // Default to system preference
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            applyTheme(prefersDark);
            
            // Listen for system changes if no preference saved
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (!localStorage.getItem('theme')) {
                    applyTheme(e.matches);
                }
            });
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const isCurrentlyDark = document.body.classList.contains('theme-dark') || 
                                (!document.body.classList.contains('theme-light') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        const newIsDark = !isCurrentlyDark;
        applyTheme(newIsDark);
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    });

    initTheme();

    // Initial render
    loadState();
    updateUI();
    
    // Load saved distance if any
    const savedMiles = localStorage.getItem('distMiles');
    if (savedMiles) {
        inputDistMiles.value = savedMiles;
        updateDistancesFromMiles();
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(registration => {
            console.log('SW registered: ', registration);
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New update available, show toast
                        const toast = document.getElementById('update-toast');
                        const btn = document.getElementById('btn-refresh');
                        toast.classList.remove('hidden');
                        
                        btn.addEventListener('click', () => {
                            newWorker.postMessage({ action: 'skipWaiting' });
                        });
                    }
                });
            });
            
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
        
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    });
}

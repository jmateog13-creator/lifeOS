// IMPORTS REMOVED FOR LOCAL FILE COMPATIBILITY

// --- CORE LOGIC ---
let chronos = parseFloat(localStorage.getItem('poly_chronos')) || 0;
let stats = JSON.parse(localStorage.getItem('poly_stats')) || {};
let timerInt, timeLeft, isOvertime = false, xpMult = 1, currentTaskName = "";

function init() {
    renderGrid();
    updateHUD();
    updateHUD();
    checkLevel(false);
    checkStreak();

    // Bind globals for interaction (since module scope is private)
    window.startVital = startVital;
    window.startTask = startTask;
    window.stopTimer = stopTimer; // Restored
    window.goOvertime = goOvertime;
    window.spinWheel = spinWheel;
    window.recordSocial = recordSocial;
    window.toggleLogbook = toggleLogbook;
    window.resetProgress = resetProgress;
}


function renderGrid() {
    // Ensure inventory is available
    const inv = window.inventory || [];

    inv.forEach(item => {
        const btn = document.createElement('div');
        btn.className = `skill-btn cat-${item.cat}`;
        const count = stats[item.name] || 0;
        btn.innerHTML = `<span>${item.name}</span><span class="count-badge">${count}</span>`;
        btn.onclick = () => startTask(item.name, 20, 1);

        const container = document.getElementById(`grid-${item.cat}`) || document.getElementById('grid-mind');
        if (container) container.appendChild(btn);
    });
}

function updateHUD() {
    const moneyEl = document.getElementById('money-val');
    if (moneyEl) moneyEl.innerText = (chronos / 10).toFixed(2);

    // Level Update
    const levelVal = document.getElementById('level-val');
    if (levelVal) levelVal.innerText = calculateLevel();

    // Streak Update
    const streak = parseInt(localStorage.getItem('poly_streak')) || 0;
    const streakVal = document.getElementById('streak-val');
    if (streakVal) streakVal.innerText = streak;

    localStorage.setItem('poly_chronos', chronos);
    localStorage.setItem('poly_stats', JSON.stringify(stats));
}

// --- GAMIFICATION SYSTEM ---
// --- GAMIFICATION SYSTEM ---
const ACHIEVEMENTS = [
    // MILESTONES
    { id: 'first_blood', name: '👶 FIRST BLOOD', desc: 'Complete your first mission', reward: 50, condition: (s) => totalTasks(s) >= 1 },
    { id: 'novice', name: '🔨 APPRENTICE', desc: 'Complete 10 missions', reward: 100, condition: (s) => totalTasks(s) >= 10 },
    { id: 'journeyman', name: '⚔️ JOURNEYMAN', desc: 'Complete 50 missions', reward: 500, condition: (s) => totalTasks(s) >= 50 },
    { id: 'master', name: '👑 MASTER', desc: 'Complete 100 missions', reward: 1000, condition: (s) => totalTasks(s) >= 100 },

    // CATEGORY SPECIALIST
    { id: 'tech_wizard', name: '💻 TECH WIZARD', desc: '10 Tech Missions', reward: 150, condition: (s) => catTasks(s, 'tech') >= 10 },
    { id: 'maestro', name: '🎹 MAESTRO', desc: '10 Music Missions', reward: 150, condition: (s) => catTasks(s, 'music') >= 10 },
    { id: 'visualist', name: '🎨 VISUALIST', desc: '10 Studio Missions', reward: 150, condition: (s) => catTasks(s, 'studio') >= 10 },
    { id: 'maker_pro', name: '🛠️ MAKER PRO', desc: '10 Maker Missions', reward: 150, condition: (s) => catTasks(s, 'maker') >= 10 },
    { id: 'brainiac', name: '🧠 BRAINIAC', desc: '10 Mind Missions', reward: 150, condition: (s) => catTasks(s, 'mind') >= 10 },

    // SPECIFIC
    { id: 'polymath', name: '🧬 POLYMATH', desc: 'Complete at least 1 mission in every category', reward: 300, condition: (s) => hasAllCategories(s) },
    { id: 'zettel_fan', name: '✨ KNOWLEDGE KEEPER', desc: '5 Zettelkasten Sessions', reward: 200, condition: (s) => (s['brain'] || s['🧠 ZETTELKASTEN'] || 0) >= 5 },
    { id: 'social_animal', name: '🍻 SOCIAL ANIMAL', desc: 'Record 5 Social Events', reward: 100, condition: (s) => (s['SOCIAL'] || 0) >= 5 },

    // STREAKS & MONEY
    { id: 'streak_3', name: '🔥 HEATING UP', desc: '3 Day Streak', reward: 100, condition: (s, c, str) => str >= 3 },
    { id: 'streak_7', name: '🚀 UNSTOPPABLE', desc: '7 Day Streak', reward: 500, condition: (s, c, str) => str >= 7 },
    { id: 'high_roller', name: '💸 HIGH ROLLER', desc: 'Earn 50€ Lifetime', reward: 100, condition: (s, c) => c >= 500 },
    { id: 'millionaire', name: '💰 TYCOON', desc: 'Earn 200€ Lifetime', reward: 1000, condition: (s, c) => c >= 2000 },

    // TIME BASED
    { id: 'night_owl', name: '🦉 NIGHT OWL', desc: 'Complete a mission after 11 PM', reward: 50, condition: () => new Date().getHours() >= 23 },
    { id: 'early_bird', name: '🌅 EARLY BIRD', desc: 'Complete a mission before 8 AM', reward: 50, condition: () => new Date().getHours() < 8 },
    { id: 'marathon', name: '🏃 MARATHON', desc: 'Complete a 1h Session', reward: 100, condition: (s, c, str, lastTaskDuration) => lastTaskDuration >= 60 },

    // LUCK
    { id: 'lucky', name: '🍀 FEELING LUCKY', desc: 'Use Randomizer 10 times', reward: 50, condition: (s) => (s['random_uses'] || 0) >= 10 }
];

// Helpers
const totalTasks = (s) => Object.values(s).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
const catTasks = (s, cat) => {
    // Need to look up inventory categories. Since s is just names, we iterate inventory.
    if (!window.inventory) return 0;
    return window.inventory.filter(i => i.cat === cat).reduce((acc, item) => acc + (s[item.name] || 0), 0);
};

function hasAllCategories(s) {
    const cats = ['tech', 'music', 'studio', 'maker', 'mind'];
    return cats.every(c => catTasks(s, c) > 0);
}

function calculateLevel() {
    const totalTasks = Object.values(stats).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
    return Math.floor(Math.sqrt(totalTasks)) + 1;
}

function checkLevel(notify = true) {
    const currentLvl = calculateLevel();
    const storedLvl = parseInt(localStorage.getItem('poly_level')) || 1;

    if (currentLvl > storedLvl) {
        if (notify) showNotification(`🚀 LEVEL UP! NOVEL ${currentLvl} REACHED`, 'levelup');
        const snd = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg');
        snd.play().catch(e => { });
    }
    localStorage.setItem('poly_level', currentLvl);
    checkAchievements(notify);
}

function checkAchievements(notify) {
    let earned = JSON.parse(localStorage.getItem('poly_achievements')) || [];
    const streak = parseInt(localStorage.getItem('poly_streak')) || 0;
    const lastTaskDuration = window.lastTaskMins || 20;

    ACHIEVEMENTS.forEach(ach => {
        if (!earned.includes(ach.id)) {
            if (ach.condition(stats, chronos, streak, lastTaskDuration)) {
                earned.push(ach.id);

                // REWARD
                chronos += ach.reward;

                if (notify) {
                    showNotification(`🏆 UNLOCKED: ${ach.name} (+${(ach.reward / 10).toFixed(1)}€)`, 'gold');
                    const snd = new Audio('https://actions.google.com/sounds/v1/cartoon/air_horn.ogg');
                    snd.play().catch(e => { });
                }
            }
        }
    });

    localStorage.setItem('poly_achievements', JSON.stringify(earned));
    updateHUD();
}

// --- STREAKS ---
function checkStreak() {
    const lastDate = localStorage.getItem('poly_last_login');
    const today = new Date().toDateString();
    let streak = parseInt(localStorage.getItem('poly_streak')) || 0;

    if (lastDate !== today) {
        // Evaluate streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastDate === yesterday.toDateString()) {
            streak++; // Streak continues
            showNotification(`🔥 DACH STREAK: ${streak} DAYS!`, 'fire');
        } else if (lastDate) {
            // If missed more than a day, reset? Or keep it gentle? Let's reset for now.
            // Unless it's the very first time.
            const d = new Date(lastDate);
            if ((new Date() - d) > (86400000 * 2)) {
                streak = 1; // Reset to 1 (today)
            } else {
                streak++; // Grace period logic or just first day
            }
        } else {
            streak = 1; // First day ever
        }

        localStorage.setItem('poly_last_login', today);
        localStorage.setItem('poly_streak', streak);
    }

    return streak;
}

// --- RESET ---
function resetProgress() {
    if (confirm("⚠️ ARE YOU SURE? THIS WILL DELETE ALL LEVELS, XP, AND STATS.\n(It is a fresh start)")) {
        localStorage.removeItem('poly_stats');
        localStorage.removeItem('poly_chronos');
        localStorage.removeItem('poly_level');
        localStorage.removeItem('poly_achievements');
        localStorage.removeItem('poly_streak');
        localStorage.removeItem('poly_last_login');
        location.reload();
    }
}

function showNotification(msg, type = '') {
    const area = document.getElementById('notification-area');
    if (!area) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = msg;

    area.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- TIMER ---
// --- TIMER ---

// --- TIMER ---
function startTask(name, mins, mult) {
    currentTaskName = name;

    // UI Init
    document.getElementById('timer-overlay').style.display = 'flex';
    document.getElementById('current-task').innerText = name;
    document.getElementById('btn-overtime').style.display = 'none';

    // Controls: Show START, Hide STOP
    document.getElementById('btn-start').style.display = 'inline-block';
    document.getElementById('btn-stop').style.display = 'none';

    // Visual Reset
    document.getElementById('timer-display').style.color = "var(--cyan)";
    const ring = document.getElementById('timer-ring-circle');
    if (ring) {
        ring.style.stroke = 'var(--cyan)';
        ring.style.strokeDashoffset = 0;
    }

    // Logic Init (Wait for Start)
    const duration = mins * 60;
    timeLeft = duration;
    isOvertime = false;
    xpMult = mult;

    clearInterval(timerInt);
    updateTimerVis(null, duration);

    // STORE CONFIG FOR START
    window.currentTimerConfig = { duration: duration };
    window.lastTaskMins = mins;
}

function beginTimer() {
    // UI Update
    document.getElementById('btn-start').style.display = 'none';
    document.getElementById('btn-stop').style.display = 'inline-block';

    const duration = window.currentTimerConfig.duration || (20 * 60);

    // Loop
    timerInt = setInterval(() => {
        if (!isOvertime) {
            timeLeft--;
            updateTimerVis(null, duration);
            if (timeLeft <= 0) alarm();
        } else {
            chronos += (0.017 * xpMult);
            updateTimerVis("MONEY++", duration);
            updateHUD();
        }
    }, 1000);
}

function updateTimerVis(msg, totalDuration) {
    if (msg) { document.getElementById('timer-display').innerText = msg; return; }

    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('timer-display').innerText =
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    // Circular Progress Update
    const ring = document.getElementById('timer-ring-circle');
    if (ring && totalDuration) {
        const percent = timeLeft / totalDuration;
        const radius = ring.r.baseVal.value;
        // Fix for negative/NaN values if duration is 0
        if (totalDuration > 0) {
            const circumference = radius * 2 * Math.PI;
            ring.style.strokeDasharray = `${circumference} ${circumference}`;
            const offset = circumference - (percent * circumference);
            ring.style.strokeDashoffset = offset;
        }
    }
}

// --- RANDOMIZER PHYSICS ---
function spinWheel() {
    const btns = document.querySelectorAll('.skill-btn');
    if (btns.length === 0) return;

    // Config
    let speed = 50; // Initial delay in ms
    let rounds = 0;
    const maxRounds = 3; // How many full loops before stopping
    let currentIndex = 0;

    // Sound (Optional - can be added later)
    // const clickSnd = new Audio('click.mp3');

    // Remove previous active classes
    btns.forEach(b => b.classList.remove('active', 'winner-pulse'));

    const spin = () => {
        // Visual Update
        btns.forEach(b => b.classList.remove('active'));
        btns[currentIndex].classList.add('active');

        // Physics Logic
        if (rounds >= maxRounds) {
            // Slow down phase
            speed += 15; // Decelerate

            // Random Stop Condition (when speed is very slow)
            if (speed > 300) {
                // STOP!
                const winner = btns[currentIndex];
                winner.classList.add('winner-pulse');

                // Track Usage
                stats['random_uses'] = (stats['random_uses'] || 0) + 1;
                updateHUD();

                // Show notification
                const name = winner.querySelector('span').innerText;
                showNotification(`🎲 MISSION SELECTED: ${name}`, 'gold');

                // Auto-start prompt? Or just click
                setTimeout(() => winner.click(), 1000);
                return;
            }
        }

        // Move to next
        currentIndex++;
        if (currentIndex >= btns.length) {
            currentIndex = 0;
            rounds++;
        }

        // Next frame
        setTimeout(spin, speed);
    };

    spin();
}


// --- LOGBOOK COMPONENT ---
function addToHistory(taskName, duration, xp) {
    let history = JSON.parse(localStorage.getItem('poly_history')) || [];
    const entry = {
        task: taskName,
        date: new Date().toISOString(), // TIMESTAMP
        duration: duration || 20,
        xp: xp || 0
    };
    history.unshift(entry); // Add to top
    if (history.length > 50) history.pop(); // Keep last 50
    localStorage.setItem('poly_history', JSON.stringify(history));
}

function stopTimer() {
    const overlay = document.getElementById('timer-overlay');
    overlay.style.display = 'none';
    clearInterval(timerInt);

    // Logic
    if (currentTaskName) {
        // Record Stat
        stats[currentTaskName] = (stats[currentTaskName] || 0) + 1;

        // Record History
        const duration = window.currentTimerConfig.duration / 60;
        addToHistory(currentTaskName, duration, (chronos - parseFloat(document.getElementById('money-val').innerText) * 10));
        // Note: XP calc is approximate here, just logging completion.

        checkLevel(true); // Checks achievements too
        updateHUD();
    }

    // Play Sound
    const snd = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg'); // Success sound
    snd.play().catch(e => { });
}

function recordSocial() {
    stats['SOCIAL'] = (stats['SOCIAL'] || 0) + 1;
    addToHistory("🍻 SOCIAL", 0, 0);
    alert("🍻 DISFRUTA. La vida real es lo primero.");
    updateHUD();
}

function toggleLogbook() {
    const m = document.getElementById('logbook-modal');
    if (m.style.display === 'block') {
        m.style.display = 'none';
    } else {
        const c = document.getElementById('logbook-content');
        c.innerHTML = "<h3>📜 RECENT LOG (HISTORY)</h3>";

        // 1. SHOW HISTORY
        const history = JSON.parse(localStorage.getItem('poly_history')) || [];
        if (history.length === 0) c.innerHTML += "<p style='color:#666; text-align:center;'>No missions recorded yet.</p>";

        history.slice(0, 10).forEach(h => {
            const date = new Date(h.date);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString();

            c.innerHTML += `
            <div class="stat-row" style="justify-content:flex-start; gap:15px; border-bottom:1px solid #333;">
                <span style="color:var(--cyan); font-size:0.8rem; min-width:80px;">${dateStr} ${timeStr}</span>
                <span style="flex-grow:1;">${h.task}</span>
                <span style="color:var(--gold); font-size:0.8rem;">${h.duration}m</span>
            </div>`;
        });

        c.innerHTML += "<h3 style='margin-top:30px;'>📊 ALL TIME STATS</h3>";
        const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
        sorted.forEach(([k, v]) => {
            c.innerHTML += `<div class="stat-row"><span>${k}</span><span class="stat-val">x${v}</span></div>`;
        });

        m.style.display = 'block';
    }
}

// --- PERSISTENCE ---
function exportData() {
    const data = {
        chronos: chronos,
        stats: stats,
        level: localStorage.getItem('poly_level') || 1,
        date: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "javier_os_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showNotification("💾 Data Exported Successfully!", "gold");
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.chronos !== undefined && data.stats) {
                chronos = parseFloat(data.chronos);
                stats = data.stats;
                localStorage.setItem('poly_level', data.level || 1);
                updateHUD();
                checkLevel(true);
                showNotification("📂 Data Imported Successfully!", "gold");
                toggleLogbook(); // Close modal
            } else {
                alert("Invalid file format");
            }
        } catch (err) {
            alert("Error reading file: " + err);
        }
    };
    reader.readAsText(file);
}

init();

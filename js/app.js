// IMPORTS REMOVED FOR LOCAL FILE COMPATIBILITY

// --- CORE LOGIC ---
// --- CORE LOGIC ---
// ECONOMY 2.0: chronos = POINTS (PTS) | wallet = REAL MONEY (€)
let chronos = parseFloat(localStorage.getItem('poly_chronos')) || 0;
let wallet = parseFloat(localStorage.getItem('poly_wallet')) || 0.00;
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
    window.openCapricho = openCapricho;
    window.closeCapricho = closeCapricho;
    window.buyCapricho = buyCapricho;
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
    // Show Points (PTS)
    const moneyEl = document.getElementById('money-val');
    if (moneyEl) moneyEl.innerText = `${Math.floor(chronos)} PTS`;

    // Show Wallet (€) if element exists (will add to HTML next)
    const walletEl = document.getElementById('wallet-val');
    if (walletEl) walletEl.innerText = wallet.toFixed(2);

    // Level Update
    const levelVal = document.getElementById('level-val');
    if (levelVal) levelVal.innerText = calculateLevel();

    // Streak Update
    const streak = parseInt(localStorage.getItem('poly_streak')) || 0;
    const streakVal = document.getElementById('streak-val');
    if (streakVal) streakVal.innerText = streak;

    localStorage.setItem('poly_chronos', chronos);
    localStorage.setItem('poly_wallet', wallet);
    localStorage.setItem('poly_stats', JSON.stringify(stats));
}

// --- SHOP SYSTEM ---
function openShop() {
    const modal = document.getElementById('shop-modal');
    if (!modal) return;
    renderShop();
    modal.style.display = 'block';
}

function closeShop() {
    document.getElementById('shop-modal').style.display = 'none';
}

function renderShop() {
    const container = document.getElementById('shop-grid');
    if (!container) return;

    // Get stats for active items
    const inventory = JSON.parse(localStorage.getItem('poly_inventory_consumables')) || {};

    container.innerHTML = '';
    window.SHOP_ITEMS.forEach(item => {
        const owned = inventory[item.id] || 0;
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="shop-icon">${item.icon}</div>
            <div class="shop-name">${item.name}</div>
            <div class="shop-desc">${item.desc}</div>
            <div class="shop-cost">${item.cost} €</div>
            <div class="shop-owned">Owned: ${owned}</div>
            <button class="vital-btn shop-buy-btn" onclick="buyItem('${item.id}')">BUY</button>
        `;
        container.appendChild(div);
    });

    // Update Money Display in Shop
    // Update Money Display in Shop
    const moneyDisplay = document.getElementById('shop-money');
    if (moneyDisplay) moneyDisplay.innerText = `${Math.floor(chronos)} PTS`;
}

// --- BANK SYSTEM ---
// --- BANK SYSTEM ---
function openBank() {
    const modal = document.getElementById('bank-modal');
    if (!modal) return;

    document.getElementById('bank-balance').innerText = Math.floor(chronos);
    document.getElementById('exchange-input').value = 100;
    calcExchange(); // init preview

    modal.style.display = 'block';
}

function closeBank() {
    document.getElementById('bank-modal').style.display = 'none';
}

function calcExchange() {
    const input = document.getElementById('exchange-input');
    const preview = document.getElementById('exchange-preview');
    const amount = parseInt(input.value) || 0;

    // RATE: 100 PTS = 5.00€ (MOTIVATION BOOST)
    const rate = 5.00;
    const euro = (amount / 100) * rate;

    preview.innerText = `${euro.toFixed(2)} €`;
}

function performExchange() {
    const input = document.getElementById('exchange-input');
    const amount = parseInt(input.value) || 0;

    if (amount <= 0) {
        showNotification("❌ Invalid amount", "danger");
        return;
    }

    if (chronos >= amount) {
        chronos -= amount;
        // RATE: 100 PTS = 5.00€
        const rate = 5.00;
        const euro = (amount / 100) * rate;

        wallet += euro;

        updateHUD();
        // Update Modal UI
        document.getElementById('bank-balance').innerText = Math.floor(chronos);

        showNotification(`🏦 DEPOSITED ${euro.toFixed(2)}€`, 'gold');

        const aud = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg');
        aud.play().catch(e => { });

        closeBank();

    } else {
        showNotification("❌ NOT ENOUGH POINTS", "danger");
    }
}

// --- CAPRICHO SYSTEM ---
function openCapricho() {
    const modal = document.getElementById('capricho-modal');
    if (!modal) return;

    document.getElementById('capricho-wallet').innerText = wallet.toFixed(2);
    document.getElementById('capricho-item').value = "";
    document.getElementById('capricho-cost').value = "";

    modal.style.display = 'block';
}

function closeCapricho() {
    document.getElementById('capricho-modal').style.display = 'none';
}

function buyCapricho() {
    const itemInput = document.getElementById('capricho-item');
    const costInput = document.getElementById('capricho-cost');
    const item = itemInput.value.trim();
    const cost = parseFloat(costInput.value) || 0;

    if (!item) {
        showNotification("❌ Escribe qué vas a comprar", "danger");
        return;
    }

    if (cost <= 0) {
        showNotification("❌ Coste inválido", "danger");
        return;
    }

    if (wallet >= cost) {
        wallet -= cost;
        updateHUD();

        // Record in History
        addToHistory(`💸 CAPRICHO: ${item}`, 0, -cost); // Using XP slot for money display in history or just description

        showNotification(`🍭 COMPRADO: ${item} (-${cost.toFixed(2)}€)`, 'pink');

        const aud = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg');
        aud.play().catch(e => { });

        closeCapricho();
    } else {
        showNotification("❌ DINERO INSUFICIENTE EN EL BANCO", "danger");
    }
}

function buyItem(id) {
    const item = window.SHOP_ITEMS.find(i => i.id === id);
    if (!item) return;

    // Changes: Cost is now in PTS (integer check)
    if (chronos >= item.cost) {
        if (confirm(`Buy ${item.name} for ${item.cost} PTS?`)) {
            chronos -= item.cost;

            // Add to Inventory
            let inventory = JSON.parse(localStorage.getItem('poly_inventory_consumables')) || {};
            inventory[id] = (inventory[id] || 0) + 1;

            // IMMEDIATE EFFECTS
            if (id === 'wisdom') {
                stats['wisdom_used'] = (stats['wisdom_used'] || 0) + 1;
                inventory[id]--; // Consumed immediately
                checkLevel(true);
                showNotification("🧠 WISDOM CONSUMED! +1 Task Count", "purple");
            }
            else if (id === 'time_warp') {
                let streak = parseInt(localStorage.getItem('poly_streak')) || 0;
                streak++;
                localStorage.setItem('poly_streak', streak);
                inventory[id]--; // Consumed immediately
                checkStreak(); // updates UI
                showNotification("⏰ TIME WARP! Streak +1", "purple");
            }
            else if (id === 'lottery') {
                inventory[id]--; // Consumed
                const win = Math.random() < 0.01; // 1%
                if (win) {
                    // JACKPOT: 5000 POINTS
                    chronos += 5000;
                    showNotification("🎰 JACKPOT!!! +5000 PTS", "gold");
                    const snd = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg');
                    snd.play();
                } else {
                    showNotification("🎟️ No luck... try again!", "grey");
                }
            }

            localStorage.setItem('poly_inventory_consumables', JSON.stringify(inventory));
            updateHUD();
            renderShop();
            showNotification(`🛒 Bought ${item.name}`, 'gold');
        }
    } else {
        showNotification("❌ Not enough points!", "danger");
    }
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

    // EXPONENTIAL LOGIC
    // 1-20: 1 task per level
    if (totalTasks <= 20) return totalTasks + 1;

    // 20-40: 2 tasks per level
    if (totalTasks <= 60) return 21 + Math.floor((totalTasks - 20) / 2);

    // 40+: 3 tasks per level
    return 41 + Math.floor((totalTasks - 60) / 3);
}

function checkLevel(notify = true) {
    const currentLvl = calculateLevel();
    const storedLvl = parseInt(localStorage.getItem('poly_level')) || 1;

    if (currentLvl > storedLvl) {
        if (notify) {
            showNotification(`🚀 LEVEL UP! NOVEL ${currentLvl} REACHED`, 'levelup');
            const snd = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg');
            snd.play().catch(e => { });

            // BONUS EVERY 10 LEVELS
            if (currentLvl % 10 === 0) {
                const bonusPts = 2500; // ~62.50€ equivalent
                chronos += bonusPts;
                showNotification(`🎉 DECADE BONUS! +${bonusPts} PTS`, 'gold');
            }
        }
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
        } else {
            // MISSED A DAY (or more)
            // CHECK FOR FREEZE
            let inventory = JSON.parse(localStorage.getItem('poly_inventory_consumables')) || {};

            if (inventory['freeze'] > 0) {
                inventory['freeze']--;
                localStorage.setItem('poly_inventory_consumables', JSON.stringify(inventory));

                // SAVE STREAK (Do not increment, but do not reset)
                // Just update the date to today so it looks like we logged in
                showNotification(`❄️ STREAK FROZEN! consumed 1 freeze`, 'cyan');
            } else {
                // STRICT MODE: If you missed a day (or more), streak resets to 1 (today counts as 1)
                streak = 1;
                showNotification(`❄️ STREAK LOST! STARTED NEW STREAK day 1`, 'blue');
            }
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

    // CHECK CONSUMABLES
    let inventory = JSON.parse(localStorage.getItem('poly_inventory_consumables')) || {};
    let activeMult = mult;
    let activeMins = mins;

    // XP POTION
    if (inventory['xp_potion'] > 0) {
        if (confirm("🧪 Use XP POTION? (x2 XP)")) {
            activeMult *= 2;
            inventory['xp_potion']--;
            showNotification("🧪 XP BOOST ACTIVE", "purple");
        }
    }

    // GOLDEN TICKET logic needs to happen at reward time, so we need a flag.
    window.activeGoldenTicket = false;
    if (inventory['gold_ticket'] > 0) {
        if (confirm("💰 Use GOLDEN TICKET? (x2 Money)")) {
            window.activeGoldenTicket = true;
            inventory['gold_ticket']--;
            showNotification("💰 MONEY BOOST ACTIVE", "gold");
        }
    }

    // CAFFEINE SHOT
    if (inventory['caffeine'] > 0) {
        if (confirm("☕ Use CAFFEINE SHOT? (15 min timer)")) {
            activeMins = 15;
            inventory['caffeine']--;
            showNotification("☕ CAFFEINE RUSH ACTIVE", "orange");
        }
    }

    localStorage.setItem('poly_inventory_consumables', JSON.stringify(inventory));

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
    const duration = activeMins * 60;
    timeLeft = duration;
    isOvertime = false;
    xpMult = activeMult;

    clearInterval(timerInt);
    updateTimerVis(null, duration);

    // STORE CONFIG FOR START
    window.currentTimerConfig = { duration: duration };
    window.lastTaskMins = mins; // Store original mins for records
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

function alarm() {
    clearInterval(timerInt);
    isOvertime = true; // Flag to prevent multiple triggers if logic overlaps

    // 1. REWARD (Standard: 100 PTS)
    let reward = 100 * xpMult;

    // GOLDEN TICKET CHECK
    if (window.activeGoldenTicket) {
        reward *= 2;
        window.activeGoldenTicket = false;
    }

    chronos += reward;

    // 2. STATS & LEVEL
    stats[currentTaskName] = (stats[currentTaskName] || 0) + 1;

    // 3. HISTORY
    addToHistory(currentTaskName, 20, reward);

    // 4. SAVE & UPDATE
    checkStreak();
    checkLevel(true); // Checks achievements, plays sound, saves data
    updateHUD(); // Updates UI and saves to localStorage

    // 5. VICTORY SCREEN
    showVictory(currentTaskName, reward);

    // 6. AUDIO
    const snd = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    snd.play().catch(e => { });

    // 7. UI FEEDBACK (Transition to Overtime or Stop behind overlay)
    document.getElementById('timer-display').innerText = "DONE!";
    document.getElementById('timer-display').style.color = "var(--gold)";
    document.getElementById('timer-ring-circle').style.stroke = "var(--gold)";

    document.getElementById('btn-stop').innerText = "✅ FINISH & CLOSE";
    document.getElementById('btn-overtime').style.display = 'inline-block';
}

function showVictory(taskName, reward) {
    const overlay = document.getElementById('victory-overlay');
    const xpVal = document.getElementById('victory-xp');
    const moneyVal = document.getElementById('victory-money');

    xpVal.innerText = `${20 * xpMult}`; // XP Estimate
    moneyVal.innerText = `${Math.floor(reward)} PTS`;

    overlay.style.display = 'flex';

    // Play celebratory sound
    const snd = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg');
    snd.play().catch(e => { });
}

function closeVictory() {
    const overlay = document.getElementById('victory-overlay');
    overlay.style.display = 'none';

    // Also close the timer overlay to return to main menu effectively
    stopTimer();
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
function cancelTask() {
    clearInterval(timerInt);
    document.getElementById('timer-overlay').style.display = 'none';
    currentTaskName = "";
    isOvertime = false;
    // Just close, no penalties for now (or maybe checking Shield if we wanted to be strict, but USER just asked for a back button)
}

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

function goOvertime() {
    isOvertime = true;

    // UI Update
    document.getElementById('btn-overtime').style.display = 'none';
    document.getElementById('btn-stop').innerText = "STOP & COLLECT";
    document.getElementById('timer-display').style.color = "var(--cyan)";
    document.getElementById('timer-ring-circle').style.stroke = "var(--cyan)";

    // Resume Timer Loop for Overtime (Money accumulates)
    const duration = window.currentTimerConfig.duration;
    timerInt = setInterval(() => {
        chronos += (0.017 * xpMult); // ~1 Chronos per minute
        updateTimerVis("MONEY++", duration);
        updateHUD();
    }, 1000);
}

function stopTimer() {
    const overlay = document.getElementById('timer-overlay');
    overlay.style.display = 'none';
    clearInterval(timerInt);

    // Logic
    if (currentTaskName) {
        // Only record 'completion' if we are NOT in overtime (meaning alarm hasn't triggered yet)
        // If alarm triggered, we already recorded the base session stats.
        if (!isOvertime) {
            // Record Stat (Early finish)
            stats[currentTaskName] = (stats[currentTaskName] || 0) + 1;

            // Record History
            const duration = window.currentTimerConfig.duration / 60; // Or calculate actual time spent?
            // For now, logged as full duration or we could calc (duration - timeLeft/60).
            addToHistory(currentTaskName, duration, 0);
            checkStreak();
        }

        checkLevel(true); // Checks achievements too
        updateHUD();
    }

    // Play Sound
    const snd = new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg'); // Success sound
    snd.play().catch(e => { });

    // Reset flags
    isOvertime = false;
    currentTaskName = "";
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

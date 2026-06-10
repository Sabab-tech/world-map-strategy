/* ============================================================================
   GLOBAL GEOPOLITICAL SIMULATOR - GAMEPLAY & UI MECHANICS ENGINE (game-logic.js)
   ============================================================================ */

// গ্লোবাল রিসোর্স এবং আয়ের হার ইন্টিগ্রেশন (ইঞ্জিন ২ ব্যাকআপ সহ)
if (!window.resources) {
    window.resources = { cash: 1000000, oil: 50000, steel: 10000, uranium: 100, manpower: 150000 };
}
if (!window.resourceRates) {
    window.resourceRates = { cash: 100, oil: 10, steel: 5, uranium: 0, manpower: 50 };
}

// সংখ্যাকে সংক্ষেপ করার হেল্পার ফাংশন (যেমন: ১০০০০০০ -> 1.0M)
function formatGameNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return Math.floor(num).toString();
}

// টপ রিসোর্স বারের ভিজ্যুয়াল আপডেট ফাংশন
function updateResourceBarUI() {
    const cashVal = document.getElementById('res-cash');
    const oilVal = document.getElementById('res-oil');
    const steelVal = document.getElementById('res-steel');
    const uraniumVal = document.getElementById('res-uranium');
    const manpowerVal = document.getElementById('res-manpower');

    if (cashVal) {
        cashVal.innerText = formatGameNumber(window.resources.cash);
        cashVal.nextElementSibling.innerText = `+${formatGameNumber(window.resourceRates.cash)}/s`;
    }
    if (oilVal) {
        oilVal.innerText = formatGameNumber(window.resources.oil);
        oilVal.nextElementSibling.innerText = `+${formatGameNumber(window.resourceRates.oil)}/s`;
    }
    if (steelVal) {
        steelVal.innerText = formatGameNumber(window.resources.steel);
        steelVal.nextElementSibling.innerText = `+${formatGameNumber(window.resourceRates.steel)}/s`;
    }
    if (uraniumVal) {
        uraniumVal.innerText = formatGameNumber(window.resources.uranium);
        uraniumVal.nextElementSibling.innerText = `+${formatGameNumber(window.resourceRates.uranium)}/s`;
    }
    if (manpowerVal) {
        manpowerVal.innerText = formatGameNumber(window.resources.manpower);
        manpowerVal.nextElementSibling.innerText = `+${formatGameNumber(window.resourceRates.manpower)}/s`;
    }
}

// রিয়েল-টাইম আয়ের লুপ (প্রতি সেকেন্ডে একবার চলবে)
setInterval(function() {
    window.resources.cash += window.resourceRates.cash;
    window.resources.oil += window.resourceRates.oil;
    window.resources.steel += window.resourceRates.steel;
    window.resources.uranium += window.resourceRates.uranium;
    window.resources.manpower += window.resourceRates.manpower;

    updateResourceBarUI();
}, 1000);

// কমান্ড হাব মোডাল অন/অফ করার মাস্টার ফাংশন
window.toggleCommandHub = function(show) {
    const modal = document.getElementById('command-hub-modal');
    if (!modal) return;
    
    if (show) {
        modal.style.display = 'flex';
        const countryTitle = document.getElementById('modal-country-name');
        
        if (window.currentActiveCountry) {
            // যদি ম্যাপে কোনো দেশ সিলেক্ট করা থাকে
            if (countryTitle) countryTitle.innerText = `COMMAND HQ: ${window.currentActiveCountry.toUpperCase()}`;
            
            const data = window.locationsRegistry[window.currentActiveCountry];
            if (data) {
                // ডাইনামিক ইকোনমি ডেটা আপডেট
                document.getElementById('econ-gdp').innerText = data.capital ? "GDP: $1.25 Trillion" : "N/A";
                document.getElementById('econ-debt').innerText = "Debt Ratio: 55% of GDP";
                
                // ডাইনামিক মিলিটারি ডেটা আপডেট
                document.getElementById('mil-army').innerText = data.military ? `${data.military.length} Strategic Commands` : "0 Commands";
            }
        } else {
            // ডিফল্ট গ্লোবাল ভিউ
            if (countryTitle) countryTitle.innerText = "COMMAND HQ: GLOBAL MONITOR";
            document.getElementById('econ-gdp').innerText = "Global GDP: $105 Trillion";
            document.getElementById('econ-debt').innerText = "Avg Debt: 60%";
            document.getElementById('mil-army').innerText = "Global Bases Active";
        }
    } else {
        modal.style.display = 'none';
    }
};

// মোডাল ট্যাবের মধ্যে স্যুইচ করার ফাংশন
window.switchModalTab = function(event, tabId) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabPanes.forEach(pane => pane.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    const activePane = document.getElementById(tabId);
    if (activePane) activePane.classList.add('active');
};

// নেভিগেশন বাটনের সক্রিয় স্টেট (Active Style Class) পরিবর্তন করার ফাংশন
function setActiveNavButton(buttonId) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));

    const activeBtn = document.getElementById(buttonId);
    if (activeBtn) activeBtn.classList.add('active');
}

// নিচের প্যানেল ও ডক বাটনগুলোর ইভেন্ট লিসেনার সেটআপ
document.addEventListener("DOMContentLoaded", function() {
    
    // ১. হোম বাটন (স্টার)
    const btnHome = document.getElementById('btn-home');
    if (btnHome) {
        btnHome.addEventListener('click', function() {
            setActiveNavButton('btn-home');
            window.toggleCommandHub(false);
            if (window.map) {
                window.map.setView([22, 80], 2.2); // ডিফল্ট ওয়ার্ল্ড ম্যাপ জুম ভিউ
            }
        });
    }

    // ২. পার্লামেন্ট / ইন্টারনাল বাটন
    const btnPolitics = document.getElementById('btn-politics');
    if (btnPolitics) {
        btnPolitics.addEventListener('click', function() {
            setActiveNavButton('btn-politics');
            window.toggleCommandHub(true);
            // সরাসরি ইন্টারনাল ট্যাবটি ওপেন হবে
            const tabEvent = { currentTarget: document.querySelector(".tab-btn:nth-child(8)") };
            window.switchModalTab(tabEvent, 'tab-internal');
        });
    }

    // ৩. বিল্ড / কনস্ট্রাকশন বাটন
    const btnBuild = document.getElementById('btn-build');
    if (btnBuild) {
        btnBuild.addEventListener('click', function() {
            setActiveNavButton('btn-build');
            window.toggleCommandHub(true);
            // সরাসরি মেগা প্রজেক্ট ট্যাবটি ওপেন হবে
            const tabEvent = { currentTarget: document.querySelector(".tab-btn:nth-child(10)") };
            window.switchModalTab(tabEvent, 'tab-projects');
        });
    }

    // ৪. কমান্ড HQ বাটন (মাঝখানের নিয়ন বাটন)
    const btnHq = document.getElementById('btn-hq');
    if (btnHq) {
        btnHq.addEventListener('click', function() {
            setActiveNavButton('btn-hq');
            window.toggleCommandHub(true);
        });
    }

    // ৫. মিলিটারি ডক বাটন
    const btnMilitaryDock = document.getElementById('btn-military-dock');
    if (btnMilitaryDock) {
        btnMilitaryDock.addEventListener('click', function() {
            setActiveNavButton('btn-military-dock');
            window.toggleCommandHub(true);
            // সরাসরি মিলিটারি ক্যাটাগরি ওপেন হবে
            const tabEvent = { currentTarget: document.querySelector(".tab-btn:nth-child(3)") };
            window.switchModalTab(tabEvent, 'tab-military');
        });
    }

    // ৬. ডিপ্লোম্যাসি ডক বাটন
    const btnDiplomacyDock = document.getElementById('btn-diplomacy-dock');
    if (btnDiplomacyDock) {
        btnDiplomacyDock.addEventListener('click', function() {
            setActiveNavButton('btn-diplomacy-dock');
            window.toggleCommandHub(true);
            // সরাসরি ডিপ্লোম্যাসি ক্যাটাগরি ওপেন হবে
            const tabEvent = { currentTarget: document.querySelector(".tab-btn:nth-child(2)") };
            window.switchModalTab(tabEvent, 'tab-diplomacy');
        });
    }

    // ৭. সেটিংস বাটন
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', function() {
            setActiveNavButton('btn-settings');
            alert("Settings panel development in progress.");
        });
    }

    // প্রাথমিক লোডে রিসোর্স বার একবার রিফ্রেশ করা
    updateResourceBarUI();
});

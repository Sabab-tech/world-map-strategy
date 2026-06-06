try {
    // ============================================================================
    // MAP ENGINE 1: VARIABLES, REGISTRIES & HELPERS (MOBILE-OPTIMIZED)
    // ============================================================================

    window.locationsRegistry = {}; 
    window.currentActiveCountry = null; 
    window.geojsonLayer = null;
    window.selectedLayer = null;
    window.countryLookup = {};
    window.countryLabels = []; 

    // বড় এবং অসম দেশের নাম ম্যাপের কেন্দ্রে লক করার জন্য ভিজ্যুয়াল কোঅর্ডিনেট ডিকশনারি
    window.visualCenters = {
        "india": [22.8, 78.5],
        "united states of america": [39.8, -98.5],
        "russia": [61.5, 95.0],
        "canada": [56.0, -96.0],
        "china": [34.5, 103.5],
        "france": [46.5, 2.5],
        "united kingdom": [54.0, -2.5],
        "brazil": [-14.2, -51.9],
        "australia": [-25.2, 133.7],
        // ইউরোপীয় ও বলকান দেশগুলোর ওভারল্যাপ এড়াতে নিখুঁত ভিজ্যুয়াল সেন্টার
        "croatia": [45.1, 15.2],
        "bosnia and herzegovina": [44.1, 17.6],
        "montenegro": [42.8, 19.1],
        "kosovo": [42.5, 21.0],
        "slovenia": [46.1, 15.0],
        "macedonia": [41.6, 21.7]
    };

    // স্থলবেষ্টিত বা ল্যান্ডলকড দেশের তালিকা (যাতে এদের ক্ষেত্রে সমুদ্রসীমা গ্লো না দেখায়)
    window.landlockedCountries = [
        "nepal", "bhutan", "afghanistan", "mongolia", "switzerland", "austria", 
        "bolivia", "paraguay", "chad", "niger", "mali", "ethiopia", "uganda", 
        "rwanda", "burundi", "zimbabwe", "zambia", "botswana", "lesotho", 
        "swaziland", "armenia", "azerbaijan", "belarus", "kazakhstan", 
        "kyrgyzstan", "tajikistan", "turkmenistan", "uzbekistan", "moldova", 
        "slovakia", "hungary", "czech republic", "laos", "macedonia", "serbia", "kosovo"
    ];

    // সমুদ্র ও মহাসাগরের নামের তালিকা এবং স্থানাঙ্ক
    window.oceanLabelsList = [
        { name: "ATLANTIC OCEAN", lat: 25, lng: -40, fontSize: 14 },
        { name: "PACIFIC OCEAN", lat: 0, lng: -140, fontSize: 14 },
        { name: "INDIAN OCEAN", lat: -15, lng: 80, fontSize: 14 },
        { name: "SOUTHERN OCEAN", lat: -65, lng: 0, fontSize: 12 },
        { name: "ARABIAN SEA", lat: 15, lng: 65, fontSize: 10 },
        { name: "BAY OF BENGAL", lat: 15, lng: 88, fontSize: 10 },
        { name: "SOUTH CHINA SEA", lat: 12, lng: 114, fontSize: 10 },
        { name: "MEDITERRANEAN SEA", lat: 34, lng: 18, fontSize: 10 }
    ];

    // দেশের নাম সমুদ্রসীমা বিশিষ্ট (উপকূলীয়) কি না তা পরীক্ষা করার ফাংশন
    window.isCoastalCountry = function(countryName) {
        if (!countryName) return false;
        var norm = window.normalizeName(countryName);
        return !window.landlockedCountries.includes(norm);
    };

    // বড় অফিশিয়াল নামগুলোর পরিবর্তে ছোট ও দৃষ্টিনন্দন গেম-নাম পরিবর্তন করার ফাংশন
    window.getGameFriendlyName = function(name) {
        if (!name) return "";
        const mapping = {
            "democratic republic of the congo": "DR Congo",
            "central african republic": "C.A.R.",
            "united states of america": "USA",
            "united kingdom": "UK",
            "united arab emirates": "UAE",
            "republic of the congo": "Congo Rep.",
            "equatorial guinea": "Eq. Guinea",
            "dominican republic": "Dominican Rep.",
            "papua new guinea": "PNG",
            "bosnia and herzegovina": "Bosnia"
        };
        const key = name.toLowerCase().trim();
        return mapping[key] || name;
    };

    // মানচিত্রের উজ্জ্বলতা বাড়াতে আরও উজ্জ্বল ও নিয়ন কালার প্যালেট সেট করা হয়েছে
    const colorPalette = [
        '#0284c7', '#16a34a', '#dc2626', '#ca8a04', '#7c3aed', '#0d9488', 
        '#ea580c', '#2563eb', '#65a30d', '#db2777', '#0891b2', '#b45309'
    ];

    window.getCountryColor = function(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colorPalette.length;
        return colorPalette[index];
    };

    window.normalizeName = function(name) {
        return (name || "")
            .toLowerCase()
            .replace(/\(.*?\)/g, "")
            .replace(/[^a-z]/g, "")
            .trim();
    };

    window.findCountryConfig = function(geoName) {
        let key = window.normalizeName(geoName);
        if (window.countryLookup[key]) return window.countryLookup[key];
        for (let k in window.countryLookup) {
            if (k.includes(key) || key.includes(k)) {
                return window.countryLookup[k];
            }
        }
        return null;
    };

    // জুমের সাথে দেশের নাম যেন খুবই মসৃণভাবে বড়-ছোট হয় (Smooth mathematical scaling)
    window.getFontSizeForCountry = function(config, zoom) {
        var importance = (config && config.importance) ? config.importance : 3;
        var baseSize = 9;
        if (importance >= 5) {
            baseSize = zoom * 3.2;
        } else if (importance === 4) {
            baseSize = zoom * 2.6;
        } else if (importance === 3) {
            baseSize = zoom * 2.2;
        } else {
            baseSize = zoom * 1.8;
        }
        return Math.max(7.5, Math.min(baseSize, 22)); // ফন্ট সাইজ সর্বনিম্ন ৭.৫px এবং সর্বোচ্চ ২২px এর মধ্যে থাকবে
    };

    // ম্যাপের বাউন্ডারি ও জুম রেঞ্জ লিমিট এবং ম্যাপ ইনিশিয়ালাইজেশন
    window.bounds = L.latLngBounds(L.latLng(-60, -180), L.latLng(85, 180));
    window.map = L.map('map', { 
        zoomControl: false, minZoom: 3.8, maxZoom: 9, zoomSnap: 0.1, zoomDelta: 1,
        maxBounds: window.bounds, maxBoundsViscosity: 1.0, inertia: false,
        preferCanvas: true, bounceAtZoomLimits: false
    }).setView([22, 80], 3.8);

    // অফলাইন টেরেন ইমেজ ব্যাকগ্রাউন্ড হিসেবে ম্যাপে সেট করা হলো
    L.imageOverlay('./terrain-map.jpg', window.bounds, {
        opacity: 0.85,
        interactive: false
    }).addTo(window.map);

    window.hubsGroupLayer = L.layerGroup().addTo(window.map);

} catch (error) {
    console.error("ম্যাপ ইঞ্জিন ১ ফাইলে ভুল:", error);
    alert("ম্যাপ ইঞ্জিন ১ লোড হতে পারেনি! প্রকৃত এরর:\n\n" + error.stack);
        }

try {
    // ============================================================================
    // WORLD MAP STRATEGY ENGINE (FAULT-TOLERANT & OPTIMIZED FOR MOBILE)
    // ============================================================================

    var locationsRegistry = {}; 
    var currentActiveCountry = null; 
    var geojsonLayer, selectedLayer = null;
    const countryLookup = {};
    const countryLabels = []; 

    // ম্যাপের বাউন্ডারি ও জুম রেঞ্জ লিমিট
    var bounds = L.latLngBounds(L.latLng(-60, -180), L.latLng(85, 180));
    var map = L.map('map', { 
        zoomControl: false, minZoom: 3.8, maxZoom: 9, zoomSnap: 0.1, zoomDelta: 1,
        maxBounds: bounds, maxBoundsViscosity: 1.0, inertia: false,
        preferCanvas: true // মোবাইল ডিভাইসের পারফরম্যান্স বাড়াতে ক্যানভাস সক্রিয় করা হয়েছে
    }).setView([22, 80], 3.8);

    var hubsGroupLayer = L.layerGroup().addTo(map);

    // Modern Age 3 স্টাইলের সুন্দর রাজনৈতিক ভেক্টর কালার প্যালেট
    const colorPalette = [
        '#385d75', // Muted Blue
        '#416b53', // Muted Green
        '#8c4a4a', // Muted Red
        '#82693f', // Muted Gold
        '#614a6b', // Muted Purple
        '#3e6b68', // Muted Teal
        '#9e6c4f', // Muted Terracotta
        '#515470', // Muted Indigo
        '#5a733f', // Muted Olive
        '#80435c', // Muted Wine
        '#355c63', // Muted Forest-blue
        '#6e554d'  // Muted Clay
    ];

    // দেশের নামের ওপর ভিত্তি করে নির্দিষ্ট রাজনৈতিক কালার জেনারেট করার ফাংশন
    function getCountryColor(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colorPalette.length;
        return colorPalette[index];
    }

    // ===== COUNTRY NORMALIZER =====
    function normalizeName(name) {
        return (name || "")
            .toLowerCase()
            .replace(/\(.*?\)/g, "")
            .replace(/[^a-z]/g, "")
            .trim();
    }

    // ===== SMART MATCH FUNCTION =====
    function findCountryConfig(geoName) {
        let key = normalizeName(geoName);
        if (countryLookup[key]) return countryLookup[key];
        for (let k in countryLookup) {
            if (k.includes(key) || key.includes(k)) {
                return countryLookup[k];
            }
        }
        return null;
    }

    function getMarkerRadiusForZoom(zoom) {
        if (zoom <= 4.2) return 5;
        if (zoom <= 5.5) return 7;
        if (zoom <= 7.0) return 10;
        return 13; 
    }

    // অফলাইন সিটি জেসন ফাইল থেকে শহর ও হাবের ডেটা লোড
    function loadGameCities() {
        fetch('cities.json?v=' + new Date().getTime())
            .then(res => {
                if (!res.ok) throw new Error("cities.json লোড ব্যর্থ হয়েছে (Status: " + res.status + ")");
                return res.json();
            })
            .then(data => {
                if (data.regions) {
                    locationsRegistry = {};
                    for (let reg in data.regions) { Object.assign(locationsRegistry, data.regions[reg].countries); }
                } else if (data.countries) {
                    locationsRegistry = {};
                    data.countries.forEach(c => { locationsRegistry[c.name] = c; });
                } else { locationsRegistry = data; }
                console.log("Cities Database Sync Ready.");
            })
            .catch(err => {
                console.error("Waiting for cities data syncing...", err);
                // মোবাইল স্ক্রিনে সরাসরি এরর পপআপ দেখাবে
                alert("cities.json ফাইলটি ব্রাউজার লোড করতে পারেনি!\nকারণ: " + err.message);
            });
    }

    function renderCountryHubs() {
        hubsGroupLayer.clearLayers(); 
        if (!currentActiveCountry) return;

        const countryData = locationsRegistry[currentActiveCountry];
        if (!countryData) return;

        let hubs = [];
        if (countryData.capital) hubs.push({ ...countryData.capital, role: 'capital' });
        if (countryData.economic) countryData.economic.forEach(h => hubs.push({ ...h, role: 'economic' }));
        if (countryData.military) countryData.military.forEach(h => hubs.push({ ...h, role: 'military' }));
        if (countryData.secret) countryData.secret.forEach(h => hubs.push({ ...h, role: 'secret' }));

        var currentRadius = getMarkerRadiusForZoom(map.getZoom());

        hubs.forEach(hub => {
            var latitude = hub.lat, longitude = hub.lon || hub.lng;
            if (!latitude || !longitude) return;

            var color = '#38bdf8';
            if (hub.role === 'economic') color = '#eab308';
            if (hub.role === 'military') color = '#ef4444';
            if (hub.role === 'secret') color = '#a855f7';

            var hubMarker = L.circleMarker([latitude, longitude], {
                radius: currentRadius, 
                fillColor: color, color: '#ffffff', weight: 2.5, fillOpacity: 0.95
            });

            var popupContent = `
                <div class="game-popup">
                    <span class="game-popup-title">${hub.name}</span>
                    <span class="role-${hub.role || 'economic'}">${hub.role}</span>
                    <span class="game-popup-desc">${hub.description || ''}</span>
                    ${hub.status ? `<span class="game-popup-status">STATUS: ${hub.status.toUpperCase()}</span>` : ''}
                </div>
            `;
            
            hubMarker.bindPopup(popupContent, { maxWidth: 350, className: 'game-popup' });
            hubsGroupLayer.addLayer(hubMarker);
        });
    }

    // একক গ্লোবাল ইভেন্ট লিসেনার যা অফলাইনে সব লেবেল মসৃণভাবে পরিচালনা করবে
    function updateCountryLabels() {
        var zoom = map.getZoom();
        countryLabels.forEach(item => {
            var marker = item.marker;
            var config = item.config;

            if (zoom >= config.minZoom && zoom <= config.maxZoom) {
                if (!map.hasLayer(marker)) marker.addTo(map);
            } else {
                if (map.hasLayer(marker)) map.removeLayer(marker);
            }

            marker.setIcon(L.divIcon({
                className: "country-label",
                html: `<div style="font-size:${zoom > 7 ? 18 : zoom > 5 ? 12 : 10}px">
                    ${config.name}
                </div>`
            }));
        });
    }

    // ===== GEOJSON & CONFIG MASTER LOADING =====

    // ১. অফলাইন দেশের কনফিগারেশন সেটআপ করা হচ্ছে
    fetch('countries.json?v=' + new Date().getTime())
        .then(res => {
            if (!res.ok) throw new Error("countries.json লোড ব্যর্থ হয়েছে (Status: " + res.status + ")");
            return res.json();
        })
        .then(countryConfig => {
            countryConfig.forEach(c => {
                countryLookup[normalizeName(c.name)] = c;
            });

            // ২. আপনার আপলোড করা লোকাল world.json ফাইলটি লোড করা হচ্ছে
            return fetch('./world.json?v=' + new Date().getTime())
                .then(res => {
                    if (!res.ok) throw new Error("world.json (GeoJSON) লোড ব্যর্থ হয়েছে (Status: " + res.status + ")");
                    return res.json();
                })
                .then(geoData => {
                    geojsonLayer = L.geoJSON(geoData, {
                        // ম্যাপ সচল করতে ফিল্টারিং লক তুলে দেওয়া হলো
                        filter: function(feature) { 
                            return true; 
                        },
                        // Modern Age 3 স্টাইলের তীক্ষ্ণ বর্ডার ও আকর্ষণীয় সলিড কালার থিম
                        style: function(feature) {
                            var props = feature.properties || {};
                            var geoName = props.ADMIN || props.name || props.NAME || props.Country;
                            var config = findCountryConfig(geoName);
                            var defaultColor = "#1e293b"; 
                            if (config) {
                                defaultColor = getCountryColor(config.name);
                            } else if (geoName) {
                                defaultColor = getCountryColor(geoName);
                            }
                            return { 
                                color: "rgba(255, 255, 255, 0.25)", // মসৃণ হালকা বর্ডার লাইন
                                weight: map.getZoom() > 5.5 ? 2.0 : 1.0, 
                                opacity: 1.0, 
                                fillColor: defaultColor, 
                                fillOpacity: 1.0 // ১০০% অফলাইন সলিড পলিটিক্যাল কালার
                            };
                        },
                        onEachFeature: function(feature, layer) {
                            var props = feature.properties || {};
                            var geoName = props.ADMIN || props.name || props.NAME || props.Country;
                            var config = findCountryConfig(geoName);

                            // যদি কনফিগারেশন না মেলে, সাময়িকভাবে জেনারেটেড নাম ব্যবহার করবে
                            var displayName = config ? config.name : geoName;
                            if (!displayName) return;

                            if (layer.getBounds) {
                                var center = layer.getBounds().getCenter();

                                var marker = L.marker(center, {
                                    icon: L.divIcon({
                                        className: "country-label",
                                        html: `<div>${displayName}</div>`
                                    }),
                                    interactive: false
                                });

                                // ট্র্যাকিং অ্যারেতে লেবেল স্টোর করা (যদি কনফিগারেশন থাকে)
                                if (config) {
                                    countryLabels.push({ marker: marker, config: config });
                                } else {
                                    // ফলব্যাক ডিফল্ট লেবেল ট্র্যাকিং
                                    countryLabels.push({ 
                                        marker: marker, 
                                        config: { name: displayName, minZoom: 3.8, maxZoom: 9 } 
                                    });
                                }

                                layer.on({
                                    click: function(e) {
                                        L.DomEvent.stopPropagation(e);
                                        if (selectedLayer) geojsonLayer.resetStyle(selectedLayer);
                                        selectedLayer = e.target;
                                        
                                        // ক্লিক করার পর সিলেক্টেড দেশটিকে নিয়ন কালারে হাইলাইট করা
                                        selectedLayer.setStyle({ 
                                            color: "#38bdf8", // নিয়ন বর্ডার গ্লো
                                            weight: map.getZoom() > 5.5 ? 3.5 : 2.5, 
                                            opacity: 1.0, 
                                            fillColor: "#0284c7", // সিলেক্টেড ফিল গ্লো
                                            fillOpacity: 0.45 
                                        });
                                        
                                        currentActiveCountry = displayName;
                                        renderCountryHubs();
                                    }
                                });
                            }
                        }
                    }).addTo(map);

                    // লেবেল ও শহরের ডেটা রেন্ডার করা
                    updateCountryLabels();
                    loadGameCities();
                });
        })
        .catch(err => {
            console.error("Error running map engine:", err);
            // ডাটা লোড না হতে পারলে কারণসহ সরাসরি অ্যালার্ট দেখাবে
            alert("ম্যাপ ডাটা (JSON) লোড করতে ব্যর্থ হয়েছে!\n(সম্ভবত CORS সমস্যা অথবা ভুল ফাইল পাথ)\n\nপ্রকৃত কারণ: " + err.message);
        });

    // জুম ইভেন্ট হ্যান্ডলার
    map.on('zoomend', function() {
        var currentZoom = map.getZoom();
        if (geojsonLayer) {
            geojsonLayer.eachLayer(function(layer) {
                if (layer !== selectedLayer) {
                    layer.setStyle({ weight: currentZoom > 5.5 ? 2.0 : 1.0 });
                }
            });
        }
        if (currentActiveCountry) {
            renderCountryHubs();
        }
        updateCountryLabels();
    });

    // ফাঁকা জায়গায় ক্লিক করলে সিলেকশন বাতিল করা
    map.on('click', function() {
        if (selectedLayer) {
            geojsonLayer.resetStyle(selectedLayer);
            selectedLayer = null;
        }
        currentActiveCountry = null;
        hubsGroupLayer.clearLayers();
    });

} catch (error) {
    console.error("ম্যাপ ইঞ্জিনের ভেতরে মারাত্মক ভুল:", error);
    // জাভাস্ক্রিপ্ট সিনট্যাক্স বা কোনো ইন্টারনাল ভুল হলে তা দেখাবে
    alert("ম্যাপ স্ক্রিপ্ট লোড করার সময় একটি ত্রুটি ঘটেছে:\n\n" + error.stack);
}

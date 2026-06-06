try {
    // ============================================================================
    // MAP ENGINE 2: MAP RENDERING, FETCHING & EVENT HANDLERS (MOBILE-OPTIMIZED)
    // ============================================================================

    function getMarkerRadiusForZoom(zoom) {
        if (zoom <= 4.2) return 5;
        if (zoom <= 5.5) return 7;
        if (zoom <= 7.0) return 10;
        return 13; 
    }

    window.renderOceanLabels = function() {
        window.oceanLabelsList.forEach(ocean => {
            L.marker([ocean.lat, ocean.lng], {
                icon: L.divIcon({
                    className: "ocean-label",
                    html: `<div class="ocean-label-text" style="transform: translate(-50%, -50%); font-size: ${ocean.fontSize}px; white-space: nowrap;">
                        ${ocean.name}
                    </div>`,
                    iconSize: [0, 0]
                }),
                interactive: false
            }).addTo(window.map);
        });
    };

    // ডাইনামিক মাল্টি-ফাইল লোডার (এশিয়া, ইউরোপ, আফ্রিকা, ওশেনিয়া, উত্তর আমেরিকা এবং দক্ষিণ আমেরিকার ফাইল একসাথে লোড করার জন্য)
    window.loadGameCities = function() {
        const cityFiles = [
            'cities.json',               // এশিয়ার দেশগুলোর ডাটাবেজ
            'cities_europe.json',        // ইউরোপের দেশগুলোর ডাটাবেজ
            'cities_africa.json',        // আফ্রিকার দেশগুলোর ডাটাবেজ
            'cities_oceania.json',       // ওশেনিয়ার দেশগুলোর ডাটাবেজ
            'cities_north_america.json', // উত্তর আমেরিকার দেশগুলোর ডাটাবেজ
            'cities_south_america.json'  // দক্ষিণ আমেরিকার দেশগুলোর ডাটাবেজ (যুক্ত করা হলো)
        ];

        // সব ফাইল একসাথে ডাউনলোড করার জন্য প্রমিস তৈরি
        const fetchPromises = cityFiles.map(file => 
            fetch(file + '?v=' + new Date().getTime())
                .then(res => {
                    if (!res.ok) throw new Error(file + " লোড করা যায়নি (Status: " + res.status + ")");
                    return res.json();
                })
        );

        // সব ফাইল ডাউনলোড হওয়ার পর মেমোরিতে মার্জ বা একত্রিত করা হবে
        Promise.all(fetchPromises)
            .then(results => {
                window.locationsRegistry = {}; // রেজিস্ট্রি পরিষ্কার করা হলো

                results.forEach(data => {
                    let countriesArray = [];
                    
                    if (data.regions) {
                        for (let reg in data.regions) { 
                            countriesArray = countriesArray.concat(data.regions[reg].countries || []); 
                        }
                    } else if (data.countries) {
                        countriesArray = data.countries;
                    } else {
                        countriesArray = Array.isArray(data) ? data : Object.values(data);
                    }

                    countriesArray.forEach(c => { 
                        window.locationsRegistry[c.name] = c; 
                    });
                });

                console.log("Cities Database Sync Ready. Total Countries Loaded:", Object.keys(window.locationsRegistry).length);
            })
            .catch(err => {
                console.error("Waiting for cities data syncing...", err);
                alert("cities ফাইলগুলো ব্রাউজার লোড করতে পারেনি!\nকারণ: " + err.message);
            });
    };

    window.renderCountryHubs = function() {
        window.hubsGroupLayer.clearLayers(); 
        if (!window.currentActiveCountry) return;

        const countryData = window.locationsRegistry[window.currentActiveCountry];
        if (!countryData) return;

        let hubs = [];
        if (countryData.capital) hubs.push({ ...countryData.capital, role: 'capital' });
        if (countryData.economic) countryData.economic.forEach(h => hubs.push({ ...h, role: 'economic' }));
        if (countryData.military) countryData.military.forEach(h => hubs.push({ ...h, role: 'military' }));
        if (countryData.secret) countryData.secret.forEach(h => hubs.push({ ...h, role: 'secret' }));

        var currentRadius = getMarkerRadiusForZoom(window.map.getZoom());

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
            window.hubsGroupLayer.addLayer(hubMarker);
        });
    };

    window.updateCountryLabels = function() {
        var zoom = window.map.getZoom();
        window.countryLabels.forEach(item => {
            var marker = item.marker;
            var config = item.config;
            var importance = config.importance || 3;

            if (zoom <= 4.2) {
                if (importance >= 5) {
                    if (!window.map.hasLayer(marker)) marker.addTo(window.map);
                } else {
                    if (window.map.hasLayer(marker)) window.map.removeLayer(marker);
                }
            } else if (zoom <= 5.5) {
                if (importance >= 3) {
                    if (!window.map.hasLayer(marker)) marker.addTo(window.map);
                } else {
                    if (window.map.hasLayer(marker)) window.map.removeLayer(marker);
                }
            } else {
                if (!window.map.hasLayer(marker)) marker.addTo(window.map);
            }

            var labelText = window.getGameFriendlyName(config.name);
            var fontSize = window.getFontSizeForCountry(config, zoom);

            marker.setIcon(L.divIcon({
                className: "country-label",
                html: `<div style="transform: translate(-50%, -50%); font-size:${fontSize}px; white-space: nowrap;">
                    ${labelText}
                </div>`,
                iconSize: [0, 0]
            }));
        });
    };

    // ===== GEOJSON & CONFIG MASTER LOADING =====

    fetch('countries.json?v=' + new Date().getTime())
        .then(res => {
            if (!res.ok) throw new Error("countries.json লোড ব্যর্থ হয়েছে (Status: " + res.status + ")");
            return res.json();
        })
        .then(countryConfig => {
            countryConfig.forEach(c => {
                window.countryLookup[window.normalizeName(c.name)] = c;
            });

            return fetch('world.json?v=' + new Date().getTime())
                .then(res => {
                    if (!res.ok) throw new Error("world.json (GeoJSON) লোড ব্যর্থ হয়েছে (Status: " + res.status + ")");
                    return res.json();
                })
                .then(geoData => {
                    window.geojsonLayer = L.geoJSON(geoData, {
                        filter: function(feature) { return true; },
                        style: function(feature) {
                            var props = feature.properties || {};
                            var geoName = props.ADMIN || props.name || props.NAME || props.Country;
                            
                            if (geoName === "West Bank" || geoName === "Gaza" || geoName === "Gaza Strip" || geoName === "Palestine") {
                                geoName = "Palestine";
                            }

                            var config = window.findCountryConfig(geoName);
                            var defaultColor = "#1e293b"; 
                            if (config) {
                                defaultColor = window.getCountryColor(config.name);
                            } else if (geoName) {
                                defaultColor = window.getCountryColor(geoName);
                            }
                            return { 
                                color: "rgba(255, 255, 255, 0.25)", 
                                weight: window.map.getZoom() > 5.5 ? 1.5 : 0.8, 
                                opacity: 1.0, 
                                fillColor: defaultColor, 
                                fillOpacity: 0.45 
                            };
                        },
                        onEachFeature: function(feature, layer) {
                            var props = feature.properties || {};
                            var geoName = props.ADMIN || props.name || props.NAME || props.Country;
                            
                            if (geoName === "West Bank" || geoName === "Gaza" || geoName === "Gaza Strip" || geoName === "Palestine") {
                                geoName = "Palestine";
                            }

                            var config = window.findCountryConfig(geoName);
                            var displayName = config ? config.name : geoName;
                            if (!displayName) return;

                            if (layer.getBounds) {
                                var center;
                                var normName = window.normalizeName(displayName);
                                
                                if (window.visualCenters[normName]) {
                                    center = L.latLng(window.visualCenters[normName][0], window.visualCenters[normName][1]);
                                } else if (config && config.lat && (config.lng || config.lng === 0)) {
                                    center = L.latLng(config.lat, config.lng);
                                } else {
                                    center = layer.getBounds().getCenter();
                                }

                                var initialZoom = window.map.getZoom();
                                var initialFontSize = window.getFontSizeForCountry(config, initialZoom);
                                var initialLabel = window.getGameFriendlyName(displayName);

                                var marker = L.marker(center, {
                                    icon: L.divIcon({
                                        className: "country-label",
                                        html: `<div style="transform: translate(-50%, -50%); font-size:${initialFontSize}px; white-space: nowrap;">${initialLabel}</div>`,
                                        iconSize: [0, 0]
                                    }),
                                    interactive: false
                                });

                                if (config) {
                                    window.countryLabels.push({ marker: marker, config: config });
                                } else {
                                    window.countryLabels.push({ 
                                        marker: marker, 
                                        config: { name: displayName, code: props.ISO_A2 || props.iso_a2 || "", importance: 3, minZoom: 3.8, maxZoom: 9 } 
                                    });
                                }

                                layer.on({
                                    click: function(e) {
                                        L.DomEvent.stopPropagation(e);
                                        if (window.selectedLayer && window.geojsonLayer) {
                                            window.geojsonLayer.resetStyle(window.selectedLayer);
                                        }
                                        window.selectedLayer = e.target;
                                        
                                        var currentZoom = window.map.getZoom();
                                        var coastal = window.isCoastalCountry(displayName);

                                        window.selectedLayer.setStyle({ 
                                            color: "#00e5ff", 
                                            opacity: coastal ? 0.65 : 0.95, 
                                            weight: coastal ? (currentZoom > 5.5 ? 30 : 18) : (currentZoom > 5.5 ? 3.5 : 2.5), 
                                            fillColor: "#0284c7", 
                                            fillOpacity: 0.5 
                                        });
                                        
                                        window.currentActiveCountry = displayName;
                                        window.renderCountryHubs();
                                    }
                                });
                            }
                        }
                    }).addTo(window.map);

                    window.updateCountryLabels();
                    window.renderOceanLabels();
                    window.loadGameCities();
                });
        })
        .catch(err => {
            console.error("Error running map engine:", err);
            alert("ম্যাপ ডাটা (JSON) লোড করতে ব্যর্থ হয়েছে!\n(সম্ভবত CORS সমস্যা অথবা ভুল ফাইল পাথ)\n\nপ্রকৃত কারণ: " + err.message);
        });

    // জুম ইভেন্ট হ্যান্ডলার
    window.map.on('zoomend', function() {
        var currentZoom = window.map.getZoom();
        if (window.geojsonLayer) {
            window.geojsonLayer.eachLayer(function(layer) {
                if (layer !== window.selectedLayer) {
                    layer.setStyle({ weight: currentZoom > 5.5 ? 2.0 : 1.0 });
                } else {
                    var displayName = window.currentActiveCountry;
                    if (displayName) {
                        var coastal = window.isCoastalCountry(displayName);
                        layer.setStyle({
                            color: "#00e5ff",
                            opacity: coastal ? 0.65 : 0.95,
                            weight: coastal ? (currentZoom > 5.5 ? 30 : 18) : (currentZoom > 5.5 ? 3.5 : 2.5)
                        });
                    }
                }
            });
        }
        if (window.currentActiveCountry) {
            window.renderCountryHubs();
        }
        window.updateCountryLabels();
    });

    // ফাঁকা জায়গায় ক্লিক করলে সিলেকশন বাতিল করা
    window.map.on('click', function() {
        if (window.selectedLayer && window.geojsonLayer) {
            window.geojsonLayer.resetStyle(window.selectedLayer);
            window.selectedLayer = null;
        }
        window.currentActiveCountry = null;
        window.hubsGroupLayer.clearLayers();
    });

} catch (error) {
    console.error("ম্যাপ ইঞ্জিন ২ ফাইলে ভুল:", error);
    alert("ম্যাপ ইঞ্জিন ২ লোড হতে পারেনি! প্রকৃত এরর:\n\n" + error.stack);
        }

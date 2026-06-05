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
                    html: `<div style="transform: translate(-50%, -50%); font-family: 'Segoe UI', sans-serif; font-style: italic; font-weight: bold; color: rgba(147, 197, 253, 0.45); font-size: ${ocean.fontSize}px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); letter-spacing: 2px; white-space: nowrap;">
                        ${ocean.name}
                    </div>`,
                    iconSize: [0, 0]
                }),
                interactive: false
            }).addTo(window.map);
        });
    };

    window.loadGameCities = function() {
        fetch('cities.json?v=' + new Date().getTime())
            .then(res => {
                if (!res.ok) throw new Error("cities.json লোড ব্যর্থ হয়েছে (Status: " + res.status + ")");
                return res.json();
            })
            .then(data => {
                if (data.regions) {
                    window.locationsRegistry = {};
                    for (let reg in data.regions) { Object.assign(window.locationsRegistry, data.regions[reg].countries); }
                } else if (data.countries) {
                    window.locationsRegistry = {};
                    data.countries.forEach(c => { window.locationsRegistry[c.name] = c; });
                } else { window.locationsRegistry = data; }
                console.log("Cities Database Sync Ready.");
            })
            .catch(err => {
                console.error("Waiting for cities data syncing...", err);
                alert("cities.json ফাইলটি ব্রাউজার লোড করতে পারেনি!\nকারণ: " + err.message);
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

            // আপনার GitHub-এর world.json ফাইলটি CDN দিয়ে সরাসরি লোড করা হচ্ছে
            return fetch('https://cdn.jsdelivr.net/gh/Sabab-tech/world-map-strategy@def5b842d53d37e122202875f67cdc11ab3c7311/world.json')
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
                                weight: window.map.getZoom() > 5.5 ? 2.0 : 1.0, 
                                opacity: 1.0, 
                                fillColor: defaultColor, 
                                fillOpacity: 1.0 
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
                                        // ভুল এড়াতে window.geojsonLayer এর নাল চেক যুক্ত করা হলো
                                        if (window.selectedLayer && window.geojsonLayer) {
                                            window.geojsonLayer.resetStyle(window.selectedLayer);
                                        }
                                        window.selectedLayer = e.target;
                                        
                                        var currentZoom = window.map.getZoom();
                                        var coastal = window.isCoastalCountry(displayName);

                                        // স্ট্যান্ডার্ড হেক্স কোড এবং লিফলেটের নিজস্ব অপাসিটি ব্যবহার করে সমুদ্রসীমা ফিক্স করা হলো
                                        window.selectedLayer.setStyle({ 
                                            color: "#00e5ff", // উজ্জ্বল নিয়ন সায়ান গ্লো
                                            opacity: coastal ? 0.65 : 0.95, // সমুদ্রসীমা থাকলে গ্লো হালকা ও বড় হবে
                                            weight: coastal ? (currentZoom > 5.5 ? 30 : 18) : (currentZoom > 5.5 ? 3.5 : 2.5), // ১৮-৩০ পিক্সেল চওড়া জলসীমা বেল্ট
                                            fillColor: "#0284c7", 
                                            fillOpacity: 0.35 
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

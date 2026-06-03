// ==========================
// WORLD MAP ENGINE (STABLE)
// ==========================

// 1. Create map
const map = L.map('map').setView([20, 0], 2);

// 2. Base tile layer (stable + lightweight)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap'
}).addTo(map);

// 3. Style (optimized)
function style() {
  return {
    color: "#222",
    weight: 0.5,
    fillColor: "#4caf50",
    fillOpacity: 0.3
  };
}

// 4. Load countries
fetch("data/countries.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: style
    }).addTo(map);
  })
  .catch(err => {
    console.log("GeoJSON load error:", err);
  });

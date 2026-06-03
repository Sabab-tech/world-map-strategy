// ===============================
// WORLD MAP CORE ENGINE
// ===============================

// 1. Initialize map
const map = L.map('map', {
  center: [20, 0],
  zoom: 2,
  zoomControl: true
});

// 2. Base layer (simple, clean)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap'
}).addTo(map);

// 3. Country style
function countryStyle() {
  return {
    color: "black",
    weight: 1,
    fillColor: "#4caf50",
    fillOpacity: 0.4
  };
}

// 4. Highlight interaction
function onEachCountry(feature, layer) {
  if (feature.properties && feature.properties.ADMIN) {
    layer.bindPopup("Country: " + feature.properties.ADMIN);

    layer.on({
      mouseover: function (e) {
        e.target.setStyle({
          fillColor: "#ffcc00",
          fillOpacity: 0.6
        });
      },
      mouseout: function (e) {
        e.target.setStyle(countryStyle());
      }
    });
  }
}

// 5. Load GeoJSON (OFFLINE READY)
fetch("./data/countries.geojson")
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: countryStyle,
      onEachFeature: onEachCountry
    }).addTo(map);
  })
  .catch(err => {
    console.error("GeoJSON load failed:", err);
  });

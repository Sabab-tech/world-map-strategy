//
// ==============================
// WORLD MAP ENGINE (FINAL CORE)
// ==============================
//

const map = L.map('map', {
  center: [20, 0],
  zoom: 2,
  zoomControl: true
});

// ------------------------------
// Base Layer (internet required)
// ------------------------------
const baseLayer = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 18,
    attribution: '© OpenStreetMap'
  }
);

baseLayer.addTo(map);

// ------------------------------
// Country Style (optimized)
// ------------------------------
function countryStyle() {
  return {
    color: "#1f1f1f",
    weight: 0.6,
    fillColor: "#4caf50",
    fillOpacity: 0.35
  };
}

// ------------------------------
// Hover interaction
// ------------------------------
function onEachCountry(feature, layer) {
  if (!feature.properties) return;

  const name = feature.properties.ADMIN || "Unknown";

  layer.bindPopup(name);

  layer.on({
    mouseover: (e) => {
      e.target.setStyle({
        fillColor: "#ffcc00",
        fillOpacity: 0.6
      });
    },
    mouseout: (e) => {
      e.target.setStyle(countryStyle());
    },
    click: (e) => {
      map.fitBounds(e.target.getBounds());
    }
  });
}

// ------------------------------
// GeoJSON Loader (safe + fallback)
// ------------------------------
function loadCountries() {
  fetch("data/countries.geojson")
    .then(res => {
      if (!res.ok) {
        throw new Error("GeoJSON file not found");
      }
      return res.json();
    })
    .then(data => {
      L.geoJSON(data, {
        style: countryStyle,
        onEachFeature: onEachCountry
      }).addTo(map);
    })
    .catch(err => {
      console.log("GeoJSON Load Failed:", err);
      alert("Country data load হয়নি। ফাইল path চেক করো।");
    });
}

// ------------------------------
// Init
// ------------------------------
loadCountries();

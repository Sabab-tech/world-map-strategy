fetch("cities.json")
  .then(res => res.json())
  .then(data => {
    renderCountries(data.countries);
  });

function renderCountries(countries) {
  const container = document.getElementById("map");

  countries.forEach(country => {
    const div = document.createElement("div");
    div.className = "country";

    div.innerHTML = `
      <h2>${country.name}</h2>
      <p>🏛️ Capital: ${country.capital}</p>
      <p>🏙️ Cities: ${country.cities.join(", ")}</p>
      <p>💰 Economic: ${country.economic_hubs.join(", ")}</p>
      <p>🪖 Military: ${country.military_hubs.join(", ")}</p>
      <p>🔒 Secret: ${country.secret_zones.length}</p>
    `;

    container.appendChild(div);
  });
}

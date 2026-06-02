let gameData = null;

// Load cities.json
fetch("cities.json")
  .then(response => response.json())
  .then(data => {
    gameData = data;
    console.log("Cities Loaded:", gameData);
    renderCountries(gameData);
  });

// Render function
function renderCountries(data) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  data.countries.forEach(country => {
    const countryBox = document.createElement("div");
    countryBox.style.border = "1px solid black";
    countryBox.style.margin = "10px";
    countryBox.style.padding = "10px";

    countryBox.innerHTML = `
      <h2>${country.name}</h2>
      <p><b>Capital:</b> ${country.capital}</p>
      <p><b>Cities:</b> ${country.cities.join(", ")}</p>
      <p><b>Economic:</b> ${country.economic_hubs.join(", ")}</p>
      <p><b>Military:</b> ${country.military_hubs.join(", ")}</p>
    `;

    container.appendChild(countryBox);
  });
      }

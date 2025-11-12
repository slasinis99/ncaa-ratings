let currentData = [];
let sortDirection = { Rank: "asc", Team: "asc" };
let panZoomInstance = null;

console.log("ratings.js loaded at", new Date().toISOString());

// Load and display ratings from a JSON file
async function loadRatingsJson(filename) {
  try {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`Failed to load ${filename}`);
    const data = await response.json();
    populateRatingsTable(data);
  } catch (err) {
    console.error(err);
    alert("Could not load data. Check your file path or parameters.");
  }
}

// Populate the HTML table with given data
function populateRatingsTable(data) {
  currentData = data;

  // Clear and fill table rows
  const tbody = document.querySelector("#ratings-table tbody");
  tbody.innerHTML = "";

  const cardContainer = document.getElementById("card-view");
  cardContainer.innerHTML = "";

  for (const team of data) {
    // Table row
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${team.Rank}</td>
      <td>${team.Team}</td>
      <td class="hide-mobile">${team.Conference || ""}</td>
      <td>${team.Rating}</td>
    `;
    tbody.appendChild(row);

    // Mobile card creation
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div><span>Rank:</span>${team.Rank}</div>
      <div><span>Team:</span>${team.Team}</div>
      ${team.Conference ? `<div><span>Conference:</span>${team.Conference}</div>` : ""}
      <div><span>Rating:</span>${team.Rating}</div>
    `;
    cardContainer.appendChild(card);
  }
}

// Sort the table by a given column (Rank or Team)
function sortTable(column) {
  if (!currentData || currentData.length === 0) return;

  const isNumeric = typeof currentData[0][column] === "number";
  const direction = sortDirection[column] === "asc" ? 1 : -1;

  currentData.sort((a, b) => {
    if (isNumeric) {
      return (a[column] - b[column]) * direction;
    } else {
      return a[column].localeCompare(b[column]) * direction;
    }
  });

  sortDirection[column] = sortDirection[column] === "asc" ? "desc" : "asc";
  populateRatingsTable(currentData);

  // Header highlight
  const headers = document.querySelectorAll("thead th");
  headers.forEach(th => th.classList.remove("sorted"));
  const colIndex = { Rank: 0, Team: 1 }[column];
  headers[colIndex].classList.add("sorted");

  // Arrows
  const arrowRank = document.getElementById("arrow-rank");
  const arrowTeam = document.getElementById("arrow-team");

  arrowRank.textContent = "⇅";
  arrowTeam.textContent = "⇅";

  const arrowMap = {
    asc: "↑",
    desc: "↓"
  };

  if (column === "Rank") {
    arrowRank.textContent = arrowMap[sortDirection[column]];
  } else if (column === "Team") {
    arrowTeam.textContent = arrowMap[sortDirection[column]];
  }
}

function onRetrieve() {
  const year = document.getElementById("year").value;
  const method = document.getElementById("method").value;
  const weight = document.getElementById("weight").value;
  const conferenceInput = document.getElementById("conference").value.trim();
  const statusMsg = document.getElementById("status-msg");

  // if (statusMsg) statusMsg.textContent = "";

  // if (year === "2026" && method !== "elo") {
  //   if (statusMsg) {
  //     statusMsg.textContent = "Colley and Massey are not available for 2026.";
  //   } else {
  //     alert("Colley and Massey are not available for 2026.");
  //   }
  //   return; // <-- stop here, don't fetch
  // }

  // Save user preferences
  localStorage.setItem("rating_year", year);
  localStorage.setItem("rating_method", method);
  localStorage.setItem("rating_weight", weight);
  localStorage.setItem("rating_conference", conferenceInput);

  const confLabel = conferenceInput
    ? conferenceInput.toLowerCase().replace(/\s+/g, "_").replace(/-+/g, "_")
    : "all";

  const weightLabel = weight.toLowerCase();

  const filename = `json/${year}_${method}_${weightLabel}_${confLabel}.json`;
  console.log("Loading:", filename);
  loadRatingsJson(filename);
  loadBracket(year, method, weight);
}

function loadSelections() {
  const year = localStorage.getItem("rating_year");
  const method = localStorage.getItem("rating_method");
  const weight = localStorage.getItem("rating_weight");
  const conference = localStorage.getItem("rating_conference");

  if (year) document.getElementById("year").value = year;
  if (method) document.getElementById("method").value = method;
  if (weight) document.getElementById("weight").value = weight;
  if (conference) document.getElementById("conference").value = conference;

  // Auto-retrieve based on last used state
  if (year && method && weight) {
    onRetrieve();
  }

  if (method) {
    document.getElementById("method").value = method;
    onMethodChange(); // Ensure the field is enabled/disabled on load
  }
}

// Run when the script loads
loadRatingsJson("json/2025_elo_constant_all.json")
loadBracket("2025", 'elo', 'constant')

function onMethodChange() {
  const method = document.getElementById("method").value;
  const conferenceInput = document.getElementById("conference");

  if (method === "elo") {
    conferenceInput.value = "";
    conferenceInput.disabled = true;
    conferenceInput.title = "Elo ratings are not computed by conference.";
  } else {
    conferenceInput.disabled = false;
    conferenceInput.title = "";
  }
}

function downloadCSV() {
  if (!currentData || currentData.length === 0) {
    alert("No data to download!");
    return;
  }

  // Convert objects to CSV
  const headers = Object.keys(currentData[0]);
  const rows = currentData.map(obj =>
    headers.map(key => `"${(obj[key] ?? "").toString().replace(/"/g, '""')}"`).join(",")
  );

  const csvContent = [headers.join(","), ...rows].join("\n");

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  // Name the file based on selection
  const year = document.getElementById("year").value;
  const method = document.getElementById("method").value;
  const weight = document.getElementById("weight").value;
  const conf = document.getElementById("conference").value.trim().toLowerCase().replace(/\s+/g, "_") || "all";

  a.href = url;
  a.download = `${year}_${method}_${weight}_${conf}.csv`;
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadBracket(year, method, weight) {
  const svgPath = `output/${year}-${method}-${weight}.svg`;
  const container = document.getElementById('bracket-container');

  fetch(svgPath)
    .then(res => {
      if (!res.ok) throw new Error('not found');
      return res.text();
    })
    .then(svgText => {
      container.innerHTML = svgText;
      const svgEl = container.querySelector('svg');
      if (!svgEl) throw new Error('no-svg');

      if (panZoomInstance) panZoomInstance.destroy();
      panZoomInstance = svgPanZoom(svgEl, {
        zoomEnabled: true,
        controlIconsEnabled: false,
        fit: true,
        center: true,
        mouseWheelZoomEnabled: true,
        dblClickZoomEnabled: true,
        pinchZoomEnabled: true
      });
    })
    .catch(err => {
      console.warn('Bracket load failed, clearing display:', err);
      container.innerHTML = '';    // remove any prior bracket
      if (panZoomInstance) {
        panZoomInstance.destroy();
        panZoomInstance = null;
      }
    });
}

function lockMethodsForYear() {
  const yearSelect = document.getElementById('year');
  const methodSelect = document.getElementById('method');

  const selectedYear = yearSelect.value;

  // grab the option elements themselves
  const eloOpt = methodSelect.querySelector('option[value="elo"]');
  const colleyOpt = methodSelect.querySelector('option[value="colley"]');
  const masseyOpt = methodSelect.querySelector('option[value="massey"]');

  if (selectedYear === '2026') {
    // lock Colley and Massey
    colleyOpt.disabled = true;
    masseyOpt.disabled = true;

    // if user was on one of the now-disabled ones, bump to Elo
    if (methodSelect.value !== 'elo') {
      methodSelect.value = 'elo';
    }
  } else {
    // unlock them for earlier years
    colleyOpt.disabled = false;
    masseyOpt.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const yearSelect = document.getElementById('year');
  yearSelect.addEventListener('change', lockMethodsForYear);
  // make sure initial state is correct on page load
  lockMethodsForYear();
});
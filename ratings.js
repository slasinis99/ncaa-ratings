let currentData = [];
let sortDirection = { Rank: "asc", Team: "asc" };

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

    // Mobile card
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
loadSelections();

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
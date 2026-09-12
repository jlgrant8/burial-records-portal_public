// Frontend JavaScript for the map
// Handles the interactive map and communicates with the FastAPI backend

// =============================================
// CREATE THE MAP
// =============================================

// Create the map and set its initial location to Callander, Scotland
const cemeteryCentre = [56.235990, -4.191858];
const map = L.map('map').setView(cemeteryCentre, 17);


// =============================================
// ADD THE BASE STREET MAP
// =============================================

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 20
}).addTo(map);


// =============================================
// OVERLAY LAIR MAP IMAGE
// =============================================

// Two corners of lair map for orientation
const lairBounds = [
    [56.237039, -4.192807],  // Top-Left
    [56.234940, -4.190908]   // Bottom-Right
];

// Overlay lair map with some transparency
const lairOverlay = L.imageOverlay('static/images/lair_map_transparent.png', lairBounds, {
    opacity: 0.5,
    interactive: false
}).addTo(map);


// =============================================
// LAYER TOGGLE CONTROL
// =============================================

const baseMaps = {};
const overlayMaps = {
    "Lair Map": lairOverlay
};
L.control.layers(baseMaps, overlayMaps).addTo(map);

let marker = null; // Declare grave marker so all functions below see and update

function resetMapSection() {
    // Remove existing marker
    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }

    // Reset map view to default
    map.setView(cemeteryCentre, 17);

    // Clear grave results table
    document.getElementById("graveInfo").innerHTML = '';

    // Clear grave results title
    document.getElementById("graveTitle").innerHTML = '';

    // Clear grave table title
    document.getElementById("graveTableTitle").innerHTML = '';
}


// =============================================
// NAME SEARCH FUNCTIONS
// =============================================

// Fetch data for name search
async function searchGrave() {

    resetMapSection(); // Clear old map results

    const forename = document.getElementById("forenameBox").value.trim();
    const surname = document.getElementById("surnameBox").value.trim();

    const res = await fetch(
    `http://127.0.0.1:8000/search?forename=${encodeURIComponent(forename)}&surname=${encodeURIComponent(surname)}`
    );

    if (!res.ok) {
        const errorData = await res.json();
        document.getElementById("result").innerText = errorData.detail || "Something went wrong";
        return;
    }

    const data = await res.json();

    // Output a table of results from name search
    searchResults(data);
}

// Display results of search for forename, surname
function searchResults(data) {

    let html = `
    <table class="name-table">
        <tr>
            <th>Forename</th>
            <th>Surname</th>
            <th>Burial</th>
            <th>Grave</th>
        </tr>
    `;

    data.forEach(item => {
        html += `
            <tr onclick="showGrave('${item.OBJECTID}')">
                <td>${item.First_Name}</td>
                <td>${item.Surname}</td>
                <td>${item.Date_Buried}
                <br>${item.Age} ${item.Age_Unit}</td>
                <td>
                    ${item.Section ? `${item.Section}-` : ""}${item.Number != "None" ? item.Number : "Unknown"}
                </td>
            </tr>
        `;
    });

    html += "</table>";

    document.getElementById("result").innerHTML = html;
}


// =============================================
// GRAVE LOCATION/DETAILS FUNCTIONS
// =============================================

// Fetch grave data including latitude, longitude
async function showGrave(objectID) {
    const res = await fetch(
        `http://127.0.0.1:8000/grave/${objectID}`
    );

    const grave = await res.json();

    if (grave.lat !== null && grave.lon != null) {
        zoomToGrave(grave.lat, grave.lon, grave.section, grave.grave_number);
        graveTitle(grave.grave_number, grave.section, grave.lat, grave.lon);
    
    } else if (grave.grave_number == "None") {
        resetMapSection(); // Clear old map results

        document.getElementById("graveTitle").innerHTML = `
            <h2>Grave Number and Location Unknown</h2>
        `;

        document.getElementById("graveTableTitle").innerHTML = `
            No information available for the grave of 
            ${grave.people[0].First_Name} ${grave.people[0].Surname}
        `;

        return;

    } else {

        graveTitleEmpty(grave.grave_number, grave.subplot, grave.section)
    }

    populateTable(grave.people, grave.section, grave.grave_number);
}


// Zoom to grave location on map
function zoomToGrave(lat, lon, section, grave_number) {

    // Remove old marker
    if (marker) {
        map.removeLayer(marker);
    }

    // Add new marker
    marker = L.marker([lat, lon]).addTo(map)
        .bindPopup(`Grave: ${section && section !== "Main" ? `${section}-` : ""}${grave_number}`)
        .openPopup();

    // Zoom to grave
    map.setView([lat, lon], 19);
}

// Output table with grave data
function populateTable(people, section, grave_number) {
    
    document.getElementById("graveTableTitle").innerHTML = `
        All people buried in grave ${section}-${grave_number}:
    `;    
    
    let html = `
        <table class="grave-table">
            <tr>
                <th>Forename</th>
                <th>Surname</th>
                <th>Buried</th>
                <th>Age</th>
            </tr>
    `;

    people.forEach(person => {
        html += `
            <tr>
                <td>${person.First_Name}</td>
                <td>${person.Surname}</td>
                <td>${person.Date_Buried}</td>
                <td>${person.Age}</td>
            </tr>
        `;
    });

    html += "</table>";

    document.getElementById("graveInfo").innerHTML = html;
}

// Create title for grave
function graveTitle(grave_number, section, lat, lon) {
    let html = `
        <h2>Section: ${section} - Grave Number: ${grave_number}</h2>
        <h4><i>Latitude: ${lat} / Longitude: ${lon}</i></h4>
        `;
    
    document.getElementById("graveTitle").innerHTML = html;
}

// Create title for grave without location
function graveTitleEmpty(grave_number, subplot, section) {
    let html = `
        <h2>Section: ${section} - Grave Number: ${grave_number}${subplot ? subplot : ""}</h2>
        <h4><i>Grave location not known</i></h4>
        `;
    
    document.getElementById("graveTitle").innerHTML = html;
}
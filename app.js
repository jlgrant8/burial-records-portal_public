// Frontend JavaScript for the map
// Handles the interactive map and communicates with the FastAPI backend

// =============================================
// LOAD NAMES AND GPS
// =============================================

let NAMES = [];
let GRAVES = [];

fetch("./data/names.json")
    .then(response => response.json())
    .then(data => {
        NAMES = data;
    });

fetch("./data/graves.json")
    .then(response => response.json())
    .then(data => {
        GRAVES = data;
    });


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
// const lairOverlay = L.imageOverlay('images/lair_map_transparent.png', lairBounds, {
//     opacity: 0.5,
//     interactive: false
// }).addTo(map);                                           // lair map


// =============================================
// LAYER TOGGLE CONTROL
// =============================================

const baseMaps = {};
// const overlayMaps = {                                    // lair map
//     "Lair Map": lairOverlay
// };
// L.control.layers(baseMaps, overlayMaps).addTo(map);      // lair map
L.control.layers(baseMaps).addTo(map);

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

    const forename = document.getElementById("forenameBox").value.toLowerCase().trim();
    const surname = document.getElementById("surnameBox").value.toLowerCase().trim();

    if (!forename && !surname) {
        document.getElementById("result").innerText = "Please enter a name";
        return;
    }

    function nameMatches(recordName, searchTerm) {
        recordName = String(recordName).toLowerCase().trim();

        return searchTerm.includes(recordName) ||
               recordName.includes(searchTerm);
    }

    const matches = NAMES.filter(row =>
        nameMatches(row.First_Name, forename) &&
        nameMatches(row.Surname, surname)
    );

    if (matches.length === 0) {
        document.getElementById("result").innerText = "Name not found";
        return;
    }

    searchResults(matches);
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
    const match = NAMES.find(row => Number(row.OBJECTID) === Number(objectID));

    if (!match) {
        document.getElementById("result").innerText = "Record not found";
        return;
    }

    let graveNumber = match.Number;
    graveNumber = graveNumber ? String(graveNumber) : null;

    let section = graveNumber ? (match.Section || "Main") : null;

    // Find grave GPS data
    const key = `${section}-${graveNumber}`;
    const grave = GRAVES[key] || {};

    // Find people at the same grave
    let people;

    if (graveNumber) {
        people = NAMES.filter(person =>
            String(person.Number) === String(graveNumber) &&
            (
                person.Section === section ||
                (section === "Main" && !person.Section)
            )
        );
    } else {
        people = [match];
    }   
        

    if (grave.lat !== null && grave.lon != null) {
        zoomToGrave(grave.lat, grave.lon, grave.section, graveNumber);
        graveTitle(graveNumber, grave.section, grave.lat, grave.lon);
    
    } else if (graveNumber == "None") {
        resetMapSection(); // Clear old map results

        document.getElementById("graveTitle").innerHTML = `
            <h2>Grave Number and Location Unknown</h2>
        `;

        document.getElementById("graveTableTitle").innerHTML = `
            No information available for the grave of 
            ${people[0].First_Name} ${people[0].Surname}
        `;

        return;

    } else {

        graveTitleEmpty(graveNumber, grave.subplot, grave.section)
    }

    populateTable(people, grave.section, graveNumber);
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
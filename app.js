let map = L.map('map').setView([0, 0], 1);

let tiles = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    maxZoom: 8,
    minZoom: 1,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
}).addTo(map);
map.setMaxBounds(map.getBounds());
let coordsMarker = L.layerGroup().addTo(map);


//Runs every time mouse is clicked on the map
function onMapClick(click) {
    //Change input values to click coordinates
    const lat = click.latlng.lat.toFixed(5);
    const lng = click.latlng.lng.toFixed(5);
    document.getElementById("latitude").value = lat;
    document.getElementById("longitude").value = lng;
    //Validate click coordinates
    validateCoords("latitude");
    validateCoords("longitude");

    displayMarker(lat, lng);
    
}

map.on('click', onMapClick);


//Add event listener to the button which calculates results
const calculateButton = document.getElementById("submit-button");

calculateButton.addEventListener("click", function() {
    const date = document.getElementById("date").value;

    const coords = {
        lat: document.getElementById("latitude").value,
        lng: document.getElementById("longitude").value
    }

    //validateCoords("latitude");
    validateCoords("longitude")

    if (validateDate(date) && validateCoords("latitude") && validateCoords("longitude")) {
        displayResults(coords);
    }
});


function displayMarker(lat, lng) { //Draws marker on the map where the selected coordinates are
    coordsMarker.clearLayers();
    L.marker([lat, lng]).addTo(coordsMarker);
}



function displayResults(coords) {
    const results = getResults(coords);

    document.getElementById("sunrise").innerText = `Sunrise: ${results.sunrise}`;
    document.getElementById("sunset").innerText = `Sunset: ${results.sunset}`;
    document.getElementById("night").innerText = `Night length: ${results.night}`;
}



//Add event listener to the latitude input to check if coordinates are valid
const latitudeInput = document.getElementById("latitude");
latitudeInput.addEventListener("input", validateCoords.bind(null, "latitude"));

//Add event listener to the latitude input to check if coordinates are valid
const longitudeInput = document.getElementById("longitude");
longitudeInput.addEventListener("input", validateCoords.bind(null, "longitude"));

//Add event listener to the date input
const dateInput = document.getElementById("date");
dateInput.addEventListener("input", validateDate);

//Add todays date as default

dateInput.value = formatDefaultDate();

function formatDefaultDate() {
    const now = new Date();
    const year = now.getFullYear();
    let month = now.getMonth() + 1;
    const day = now.getDate();

    if (month < 10) { month = "0" + month; }
    if (day < 10) { "0" + day; }
    return `${year}-${month}-${day}`;
}


function addMarkerFromInput() {
    const lng = document.getElementById("longitude").value;
    const lat = document.getElementById("latitude").value;

    if (coordsAreNumbers(lat, lng))
        displayMarker(lat, lng);
}

function coordsAreNumbers(lat, lng) { //Avoid erroneous input to leaflet marker coordinates
    return !isNaN(parseInt(lng)) && !isNaN(parseInt(lat));
}


function validateCoords(attribute) { //attribute is either longitude or latitude
    const coord = document.getElementById(attribute).value; //Get longitude or latitude value from the input

    if (coordsAreNumbers(document.getElementById("latitude").value, document.getElementById("longitude").value))
        addMarkerFromInput(); //Move marker to selected coordinates
    
    //Initialise with longitude boundaries
    const range = {
        min: -180,
        max: 180
    }

    //If neccessary change to latitude boundaries
    if (attribute == "latitude") {
        range.min = -90;
        range.max = 90;
    }

    if (coord < range.max && coord > range.min && coord != ""){ //Check if latitude values are valid
        document.getElementById(attribute).className = "form-control"; //change to valid
        document.getElementById("invalid-" + attribute).textContent = ""; //delete error message
        return true;
    } else {
        document.getElementById(attribute).className = "form-control is-invalid"; //change style to invalid
        document.getElementById("invalid-" + attribute).textContent = `Please enter a valid ${attribute}`; //display error message
        return false;
    }
}


function validateDate(date) {
    if (date == "") {
        document.getElementById("date").className = "form-control is-invalid" //change style to invalid
        document.getElementById("invalid-date").textContent = "Please enter a valid date"; //display rror message
        return false
    } else {
        document.getElementById("date").className = "form-control"
        document.getElementById("invalid-date").textContent = ""; //delete error message
        return true
    }
}
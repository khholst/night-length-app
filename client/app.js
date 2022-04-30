
let map = L.map("map").setView([0, 0], 1);

let tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 8,
    minZoom: 1,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    //tileSize: 512,
    //zoomOffset: -1,
}).addTo(map);

let terminator = L.terminator().addTo(map); //Add night and day seperator to map
map.setMaxBounds(map.getBounds()); //Prevent dragging out of the map
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
    deleteResults();
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

    validateCoords("latitude");
    validateCoords("longitude");

    if (validateDate(date) && validateCoords("latitude") && validateCoords("longitude")) {
        displayResults(coords);
    }
});


//Draws a marker on the map where the selected coordinates are
function displayMarker(lat, lng) {
    coordsMarker.clearLayers();
    L.marker([lat, lng]).addTo(coordsMarker);
}


//Write results into the HTML document
async function displayResults(coords) {
    const results = await getResults(coords);

    //Write sunrise, sunset and night length in results
    if (results.state === "noSet") {
        document.getElementById("main-results").innerHTML = `<hr><div class=col><p>The sun does not set<br><strong>Night length:</strong> 00:00</p></div>`;
        document.getElementById("sub-results").innerHTML =   "<div class=col><strong>Civil twilight<br></strong>None</div><div class=col><strong>Nautical twilight<br></strong>None</div><div class=col><strong>Astronomical twilight<br></strong>None</div>";
        return;
    } else if (results.state === "noRise") {
        document.getElementById("main-results").innerHTML = `<div class=col><p>The sun does not rise<br><strong>Night length:</strong> ${results.night}</p></div>`
    } else {
        document.getElementById("main-results").innerHTML = `<hr><div class=col><p><strong>Night length:</strong> ${results.night}<br><strong>Sunrise: </strong>${results.riseAndSet.rise}<br><strong>Sunset:</strong> ${results.riseAndSet.set}</p></div>`
    }


    //Handle no special case results
    const darkPhases = {
        Civil       : results.civil,
        Nautical    : results.nautical,
        Astronomical: results.astronomical
    };

    //Construct inner HTML string from phase data
    let HTMLString = "";
    for (const [key, value] of Object.entries(darkPhases)) {
        HTMLString += `<div class=col>`
        if (typeof(value) === "object") {
            HTMLString += "<strong>" + key + " twilight</strong><br>" + value.sunrise + "<br>" + value.sunset; 
        } else {
            HTMLString += "<strong>" + key + " twilight</strong><br>" + value;
        }
        HTMLString += "</div>"
    }
    document.getElementById("sub-results").innerHTML = HTMLString;
}


//Remove all content from the results DOM elements
function deleteResults() {
    document.getElementById("main-results").innerHTML = "<hr><div class=col><strong>Night length: -</strong><br><strong>Sunrise: -</strong><br><strong>Sunset: -</strong></div>";
    document.getElementById("sub-results").innerHTML =   "<div class=col><strong>Civil twilight<br>-</strong></div><div class=col><strong>Nautical twilight<br>-</strong></div><div class=col><strong>Astronomical twilight<br>-</strong></div>";
}


//Add event listener to the latitude input to check if coordinates are valid
const latitudeInput = document.getElementById("latitude");
latitudeInput.addEventListener("input", validateCoords.bind(null, "latitude"));

//Add event listener to the latitude input to check if coordinates are valid
const longitudeInput = document.getElementById("longitude");
longitudeInput.addEventListener("input", validateCoords.bind(null, "longitude"));

//Add event listener to the date input
const dateInput = document.getElementById("date");
dateInput.addEventListener("input", () =>  {
    const dateIsValid = validateDate(dateInput);
    if (dateIsValid) redrawTerminator(); //Check if date is valid before trying to redraw the terminator
    deleteResults();
});
dateInput.value = formatDefaultDate(); //Add todays date as default


//TIMESLIDER
const timeSlider = document.getElementById("time-slider");
addDefaultTime();
//Add event listener to the range input
timeSlider.addEventListener("input", () => {
    redrawTerminator();
});


//Change the time of the terminator
function redrawTerminator() {
    let time = new Date(document.getElementById("date").value);
    const sliderValue = minutesToHourMinute(timeSlider.value);
    const timeParts = sliderValue.split(":");
    const hourValue = timeParts[0];
    const minuteValue = timeParts[1];
    time.setUTCHours(hourValue, minuteValue);
    terminator.setTime(time.toUTCString());
    
    hoursMinutes = formatHoursMins(time.getUTCHours(), time.getUTCMinutes());
    document.getElementById("chosen-time").innerHTML = `<strong>${hoursMinutes.hours}:${hoursMinutes.minutes} UTC</strong>`
}


//Add default time of now to the time slider when app is loaded
function addDefaultTime() {
    const now = new Date();
    const hoursMinutes = formatHoursMins(now.getUTCHours(), now.getUTCMinutes());
    const defaultVal = now.getUTCHours() * 60 + now.getUTCMinutes();
    timeSlider.value = defaultVal;
    document.getElementById("chosen-time").innerHTML = `<strong>${hoursMinutes.hours}:${hoursMinutes.minutes} UTC</strong>`
}


//Convert time in mm into hh:mm
function minutesToHourMinute(minutes) {
    let hours = Math.floor(minutes / 60);
    let leftMinutes = minutes % 60;
    const time = formatHoursMins(hours, leftMinutes);

    return `${time.hours}:${time.minutes}`;
}


//Convert m to mm and h to hh if necessary
function formatHoursMins(hours, minutes) {
    if (hours < 10) hours = "0" + hours;
    if (minutes < 10) minutes = "0" + minutes;
    return {hours: hours, minutes: minutes};
}


//Get now time in hhhh-mm-dd
function formatDefaultDate() {
    const now = new Date();
    const year = now.getFullYear();
    let month = now.getMonth() + 1;
    const day = now.getDate();

    if (month < 10) { month = "0" + month; }
    if (day < 10) { "0" + day; }
    return `${year}-${month}-${day}`;
}


//Display marker on the seleted coordinates
function addMarkerFromInput() {
    const lng = document.getElementById("longitude").value;
    const lat = document.getElementById("latitude").value;

    if (coordsAreNumbers(lat, lng))
        displayMarker(lat, lng);
}


//Check if coordinates are numbers to avoid erroneous input to leaflet marker coordinates
function coordsAreNumbers(lat, lng) {
    return !isNaN(parseInt(lng)) && !isNaN(parseInt(lat));
}


//Check if entered coordinates are correct
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

    if (coord <= range.max && coord >= range.min && coord != ""){ //Check if latitude/longitude values are valid
        document.getElementById(attribute).className = "form-control"; //change to valid
        document.getElementById("invalid-" + attribute).textContent = ""; //delete error message
        return true;
    } else {
        document.getElementById(attribute).className = "form-control is-invalid"; //change style to invalid
        document.getElementById("invalid-" + attribute).textContent = `Please enter a valid ${attribute}`; //display error message
        return false;
    }
}


//Check if date is not empty
function validateDate(dateInput) {
    if (dateInput.value == "") {
        dateInput.className = "form-control is-invalid" //change style to invalid
        document.getElementById("invalid-date").textContent = "Please enter a valid date"; //display rror message
        return false
    } else {
        dateInput.className = "form-control"
        document.getElementById("invalid-date").textContent = ""; //delete error message
        return true
    }
}
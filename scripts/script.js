var mymap;
//parametres par défaut de la carte
const X = 48.864716;
const Y = 2.349014;
const zoom = 12
const token = "pk.eyJ1Ijoic2FjaGFmcm9tZW50IiwiYSI6ImNqcDczaTlvcDBhcHEzcG14b3RlY3JjYjUifQ.lqDhfMfAZTdS6HztmANh2A";
const apiURL = "https://opendata.paris.fr/api/records/1.0/search/?dataset=sanisettesparis&lang=fr";

//parametres par défaut de l'api toilettes
const defAmount = 100;
const defDistance = 3000;
const defLang = "fr";
var markerGPS;
var toilets;
var toiletIcon = L.icon({
    iconUrl: '../imgs/markers/toiletmarkersmall.png',
    shadowUrl: '../imgs/markers/toiletshadowsmall.png',

    iconSize: [43, 56], // size of the icon
    shadowSize: [63, 69], // size of the shadow
    iconAnchor: [21, 54], // point of the icon which will correspond to marker's location
    shadowAnchor: [10, 58], // the same for the shadow
    popupAnchor: [0, -76] // point from which the popup should open relative to the iconAnchor
});

$(document).ready(function () {
    initMap(X, Y, zoom)
    assignOn();
    defaultValues();
    console.log("ready")
});

function initMap(xInit, yInit, zoom) {
    mymap = L.map('mapid').setView([xInit, yInit], zoom);
    L.tileLayer(`https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}`, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        minZoom: 12,
        id: 'mapbox.streets',
        accessToken: token
    }).addTo(mymap);
    mymap.setMaxBounds(mymap.getBounds());
    mymap.setZoom(zoom + 1);
    toilets = L.layerGroup().addTo(mymap);

    $("#mapid").droppable({
        drop: onDrop
    });
    console.log("initMap")
}

function loadArrondissements() {
    var selectArrond = $("#arrond");
    selectArrond.append("<option value=0 selected >Aucun</option>");
    selectArrond.append(`<option value=1>1er</option>`);
    for (var i = 2; i <= 20; ++i) {
        selectArrond.append(`<option value=${i}>${i}ème</option>`);
    }
}

function onDrop(event, ui) {
    var elMarker = ui.draggable.data("marker");
    console.log(elMarker.getLatLng());
    mymap.setView(elMarker.getLatLng(), 18);
}

function defaultValues() {
    $("#rows").val(defAmount);
    $("#dist").val(defDistance);
    $("#results").html("<p>Pas encore de résultat.<p>")
    $("#dist-value").text($("#dist").val() + " mètres")
    $("#switchOptions").prop("checked", false);
    $("#check-rows").prop("checked", true);
    $("#check-arrond").prop("checked", true);
    $("#check-dist").prop("checked", true);
    switchOptions();
    loadArrondissements();

}

function switchOptions() {
    state = !$("#switchOptions").prop("checked");
    var options = $("#options input, #options select");
    console.log(options);
    for (var i = 0; i < options.length; ++i) {
        if (!$('#' + options[i].id).data("superDisabled"))
            $('#' + options[i].id).prop("disabled", state);
        console.log(options[i].id);
    }
    console.log("options disabled: " + state)
}

function able() {
    var id = this.id.split("-")[1];
    $("#" + id).prop("disabled", !$("#check-" + id).prop("checked"));
    $("#" + id).data("superDisabled", !$("#check-" + id).prop("checked"));
}

function assignOn() {
    $('#addGPS').on('click', centerAtGPS);
    $('#removeGPS').on('click', removeGPS);
    $('#ResZoom').on('click', function () {
        mymap.setZoom(zoom);
    });
    $("#fetchToilets").on("click", getToilets);
    $("#dist").on('change', function () {
        $("#dist-value").text($("#dist").val() + " mètres")
    });
    $("#switchOptions").on("change", switchOptions);
    $("#check-rows").on("change", able);
    $("#check-arrond").on("change", able);
    $("#check-dist").on("change", able);
}

function centerAtGPS() {
    if (navigator.geolocation) {
        removeGPS();
        navigator.geolocation.getCurrentPosition(updateViewGPS);
    }
}

function removeGPS() {
    if (markerGPS != null) {
        mymap.removeLayer(markerGPS);
        markerGPS = null;
        mymap.setZoom(zoom)
    }
}

function updateViewGPS(position) {
    var lat = position.coords.latitude;
    var long = position.coords.longitude;
    markerGPS = L.marker([lat, long], {
        riseOnHover: true
    });
    markerGPS.bindPopup("<b>C'est vous ! <i class='fas fa-user-ninja'></i></b>");
    markerGPS.addTo(mymap).openPopup();
    mymap.setView([lat, long], 14);
    console.log(`Map centered at x:${lat} & y: ${long}`);
}

function getToilets() {
    var optEnabled = $("#switchOptions").prop("checked");
    var url = apiURL;

    if (optEnabled) {
        if ($("#arrond").val() != 0 && !$("#arrond").prop("disabled"))
            url += "&refine.arrondissement=" + $("#arrond").val();
        if ($("#rows").val() > 0 && !$("#rows").prop("disabled"))
            url += "&rows=" + $("#rows").val();
        else
            url += "&rows=1000"
        if (markerGPS == null) {
            var dist = !$("#dist").prop("disabled") ? $("#dist").val() : 100000;
            url += "&geofilter.distance=" + X + "%2C" + Y + "%2C" + dist;
        } else {
            var dist = !$("#dist").prop("disabled") ? $("#dist").val() : 100000;
            var lat = markerGPS._latlng.lat;
            var lng = markerGPS._latlng.lng;
            url += "&geofilter.distance=" + lat + "%2C" + lng + "%2C" + dist;
        }
        if ($("#always").prop("checked") && !$("#always").prop("disabled"))
            url += "&refine.horaires_ouverture=24+h+%2F+24";

    } else {
        url += "&rows=1000"
    }
    console.log(url);
    ajaxToilets(url);
}

function ajaxToilets(url) {
    $.ajax({
        type: 'GET',
        url: url,
        dataType: 'json',
        error: function (xhr, status, error) {
            alert("La recherche des toilettes à échouée. Veuillez réessayer ultérieurement : " + error);
        },
        success: displayToilets
    });
}

function displayToilets(data) {
    toilets.clearLayers();
    $("#nbResults").text(data.nhits);
    $("#results").text("");
    if (data.nhits == 0) {
        $("#results").text("Pas de toilettes trouvées");
    }
    console.log(data.records);
    for (var r of data.records) {
        var f = r.fields;
        var popup = `
        <b>Arrondissement : </b>${f.arrondissement}<br>
        <b>Rue : </b>${(f.numero_voie == undefined ? "": f.numero_voie +" ")+ f.nom_voie}<br>
        <b>Horaires d'ouverture : </b>${f.horaires_ouverture}<br>
        <b>Identifiant : </b>${f.identifiant.toString()}<br>
        `;
        $("#results").append(`
        <div class='card card-body shadow-sm draggable col-auto m-2' id='id_${f.objectid}'>  
        <h5>${(f.numero_voie == undefined ? "": f.numero_voie +" ")+ f.nom_voie}</h5>
        <b>Arrondissement : </b>${f.arrondissement}<br>
        <b>Horaires d'ouverture : </b>${f.horaires_ouverture}<br>
        <b>Identifiant : </b>${f.identifiant.toString()}<br>
        </div>`);

        var elMarker = L.marker(f.geom_x_y, {
            icon: toiletIcon
        }).bindPopup(popup).addTo(toilets);
        $(`#id_${f.objectid}`).data("marker", elMarker);
    }
    $(".draggable").draggable({
        revert: true,
        appendTo: 'body',
        containment: 'window',
        scroll: false,
        helper: 'clone'
    })
}
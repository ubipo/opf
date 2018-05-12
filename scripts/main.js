requirejs.config({
	baseUrl: 'scripts/opf',
    "paths": {
      "leaflet": "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/leaflet",
      "leaflet.markercluster": "https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.3.0/leaflet.markercluster",
      "leaflet.awesome-markers": "https://cdnjs.cloudflare.com/ajax/libs/Leaflet.awesome-markers/2.0.2/leaflet.awesome-markers.min"
    }
});

requirejs(["scripts/opf/main.js"]);
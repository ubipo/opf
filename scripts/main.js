requirejs.config({
  baseUrl: 'scripts',
  paths: {
    'leaflet': 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/leaflet',
    'leaflet.markercluster': 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.3.0/leaflet.markercluster',
    'leaflet.awesome-markers': 'https://cdnjs.cloudflare.com/ajax/libs/Leaflet.awesome-markers/2.0.2/leaflet.awesome-markers.min',
    'event-emitter': 'https://cdnjs.cloudflare.com/ajax/libs/EventEmitter/5.2.5/EventEmitter.min',
    'lodash': 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.10/lodash.min',
    'turf': 'turf-4.7.3-bbox-area.min'
  },
  shim: {
    'leaflet.markercluster': {
      deps: ['leaflet']
    },
    'leaflet.awesome-markers': {
      deps: ['leaflet']
    }
  },
  packages: [
    {
      name: 'opf',
      location: 'opf',
      main: 'main'
    }
  ]
});

requirejs(['opf']);

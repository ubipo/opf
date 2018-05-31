requirejs.config({
  baseUrl: 'scripts/opf',
  'paths': {
    'leaflet': '//cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/leaflet',
    'leaflet.markercluster': '//cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.3.0/leaflet.markercluster',
    'leaflet.awesome-markers': '//cdnjs.cloudflare.com/ajax/libs/Leaflet.awesome-markers/2.0.2/leaflet.awesome-markers.min'
  },
  shim: {
    'leaflet.markercluster': {
      deps: ['leaflet']
    },
    'leaflet.awesome-markers': {
      deps: ['leaflet']
    }
  }
});

requirejs(['scripts/opf/main.js']);

define(['leaflet', 'leaflet.markercluster', 'leaflet.awesome-markers'], function () {
  const L = require('leaflet');
  require('leaflet.markercluster');
  require('leaflet.awesome-markers');

  const markerIconsData = [
    {
      name: 'fallback',
      color: 'cadetblue'
    }, {
      name: 'formatted',
      color: 'blue'
    }, {
      name: 'checked',
      color: 'green'
    }, {
      name: 'unchecked',
      color: 'orange'
    }, {
      name: 'error',
      color: 'red'
    }
  ];
  const opfMarker = L.Marker.extend({
     options: {
        opfElem: {}
     }
  });

  class OpfUI {
    constructor() {
      this.map = undefined;
      this.markers = L.markerClusterGroup();
      this.markerPopup = L.popup();
      this.markerIcons = []; // Map markers, ordered from least to most important
    }

    static get L() {
      return L;
    }

    static get opfMarker() {
      return opfMarker;
    }

    initLeaflet() {
      map = L.map('map');
      var osmAttribution = '&copy; <a href="http://osm.org/copyright" target="_blank">OpenStreetMap</a> contributors';
      var tileOsmbeAttribution = 'Tiles courtesy of <a href="https://geo6.be/" target="_blank">GEO-6</a>';
      var fixTheMap = '<a href="https://www.openstreetmap.org/fixthemap" target="_blank">Found an error?</a>';
      var osm = L.tileLayer('https://tile.osm.be/osmbe/{z}/{x}/{y}.png', {
        attribution: `${osmAttribution} | ${fixTheMap} | ${tileOsmbeAttribution}`,
        maxZoom: 18
      }).addTo(map);

      // Create markers
      for (var i = 0; i < markerIconsData.length; i++) {
        markerIcons[i] = L.AwesomeMarkers.icon({
          icon: 'phone',
          prefix: 'fas fa',
          markerColor: markerIconsData[i].color
        });
      }

      var infoButton = L.Control.extend({
        options: {
          position: 'topleft'
        },
        onAdd: function(map) {
          var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control l-btn l-btn-icon-cont');
          container.addEventListener('dblclick', e => e.stopPropagation(), false)
          container.addEventListener('click', showInfoModal, false);
          var icon = L.DomUtil.create('i', 'l-btn-icon fas fa-info', container);
          return container;
        }
      });

      var refreshButton = L.Control.extend({
        options: {
          position: 'topright'
        },
        onAdd: function(map) {
          var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control l-btn l-btn-icon-cont l-btn-refresh');
          container.addEventListener('dblclick', e => e.stopPropagation(), false)
          container.addEventListener('click', e => console.log, false); // TODO Callback previously 'refresh'
          var icon = L.DomUtil.create('i', 'l-btn-icon fas fa-sync-alt', container);
          return container;
        }
      });

      var uploadControl = L.Control.extend({
        options: {
          position: 'topright'
        },
        onAdd: function(map) {
          var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control l-group');
          container.addEventListener('dblclick', e => e.stopPropagation(), false)
          container.addEventListener('click', showUploadModal, false)
          var countButton = L.DomUtil.create('div', 'l-btn-text-cont l-btn l-btn-count', container);
          var countIcon = L.DomUtil.create('span', '', countButton);
          var uploadButton = L.DomUtil.create('div', 'l-btn-text-cont l-btn l-btn-icon-cont', container);
          var uploadIcon = L.DomUtil.create('i', 'l-btn-icon fas fa-arrow-up', uploadButton);
          return container;
        }
      });

      map.addControl(new infoButton());
      map.addControl(new refreshButton());
      map.addControl(new uploadControl());

      map.fitBounds(defaultBBox);

      prevBounds = objectValuesToArray(map.getBounds());

      map.on('move', function(e) {
        window.clearTimeout(mapDeltaTimeout);
        mapDeltaTimeout = window.setTimeout(testMapDelta, 500);
      });

      map.on("zoomend", function(e) {
        testMinZoom();
      });

      map.addLayer(markers);

      // bBoxMap.addControl(drawControl);

      // bBoxMap.on('draw:created', function(event) {
      //   var layer = event.layer;
      //   drawnItems.eachLayer(function(layer) {
      //     drawnItems.removeLayer(layer);
      //   });
      //   drawnItems.addLayer(layer);

      //   updateBBoxInfo(layer._defaultShape());
      // });

      // // Object(s) edited - update popups
      // bBoxMap.on('draw:edited', function(event) {
      //   var layers = event.layers;
      //   layers.eachLayer(function(layer) {
      //     updateBBoxInfo(layer._defaultShape())
      //   });
      // });
    }
  }

  return OpfUI;
});

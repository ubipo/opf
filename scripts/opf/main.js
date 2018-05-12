define(['leaflet', 'leaflet.markercluster', 'leaflet.awesome-markers', 'utils', 'handlebars-templates'], function() {
  'use strict';
	var L = require('leaflet');
  require('leaflet.markercluster');
  require('leaflet.awesome-markers');

  require('utils');

  require('handlebars-templates');

  var opfVersion = 1.3; // Tool version
  var defaultBBox = [[50.88081821539843, 4.706557989120484], [50.87751134170449, 4.696494340896607]];
  var bBoxCoords;
  var formatted = false;
  var checkedAll = false;
  var showAdvancedOptions = false;
  var opfData = [];
  var map;
  var markers = L.markerClusterGroup();
  var prevBounds;
  var markerPopup = L.popup();
  var OpfMarker = L.Marker.extend({
     options: { 
        opfElem: {}
     }
  });
  var phoneMarkerError = L.AwesomeMarkers.icon({
    icon: 'phone',
    prefix: 'fas fa',
    markerColor: 'red'
  });
  var phoneMarkerUnchecked = L.AwesomeMarkers.icon({
    icon: 'phone',
    prefix: 'fas fa',
    markerColor: 'orange'
  });
  var phoneMarkerChecked = L.AwesomeMarkers.icon({
    icon: 'phone',
    prefix: 'fas fa',
    markerColor: 'green'
  });
  var phoneMarkerFormatted = L.AwesomeMarkers.icon({
    icon: 'phone',
    prefix: 'fas fa',
    markerColor: 'blue'
  });
  var phoneMarkerFallback = L.AwesomeMarkers.icon({
    icon: 'phone',
    prefix: 'fas fa',
    markerColor: 'cadetblue'
  });


  var refreshState = 'enabled'; // Either 'enabled', 'disabled' or 'busy'
  var minRefreshDelta = 3000;
  var refreshScheduled; // When true, refreshes data as soon as ready

  var mapDeltaTimeout; // Timeout to trigger auto refresh check
  var minMapDelta = 0.002; // Mininimum movement to trigger auto refresh (decimal degrees)
  var minZoomLevel = 15;

  var zoomDisableScheduled = false;

  NProgress.configure({ showSpinner: false });

  var regexPatterns = {
    all: ".",
    suspicious: "^\\+[0-9]{2,2}(\\s[0-9]{2,3}){1,10}$"
  }

  var constants = {
    start: "[out:json][timeout:30];\n(\n",
    elems: ["node", "way", "relation"],
    numberTags: ['phone', 'fax', 'contact:phone', 'contact:fax'],
    end: ");\nout meta center;"
  }

  var osmOAuth = {
    oauth_consumer_key: 'sLK9WrTb0049TtQQVXLXYHm90TKAuKiICiETZD56',
    oauth_secret: 'xPLF6J9260YzJEBMCnSKZzQx6YgUWW9GKrd9Cf2J',
    auto: true
  };

  function firstVisitCheck() {
    if (!JSON.parse(localStorage.getItem('dsaInfoModal'))) showInfoModal();
  }

  document.addEventListener('DOMContentLoaded', init, false);
  init();

  function init() {
    firstVisitCheck();

    MicroModal.init();

    initLeaflet();
    refresh();
    updateCountButton();
  }

  function initLeaflet() {
    map = L.map('map');
    var osmAttribution = '&copy; <a href="http://osm.org/copyright" target="_blank">OpenStreetMap</a> contributors';
    var tileOsmbeAttribution = 'Tiles courtesy of <a href="https://geo6.be/" target="_blank">GEO-6</a>';
    var fixTheMap = '<a href="https://www.openstreetmap.org/fixthemap" target="_blank">Found an error?</a>';
    var osm = L.tileLayer('https://tile.osm.be/osmbe/{z}/{x}/{y}.png', {
      attribution: `${osmAttribution} | ${fixTheMap} | ${tileOsmbeAttribution}`,
      maxZoom: 18
    }).addTo(map);

    // L.easyButton('fas fa-info', function(btn, map){
    //     welcomeOverlay();
    // }).addTo(map);

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
        container.addEventListener('click', refresh, false);
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

    // var drawnItems = new L.FeatureGroup();
    // drawnItems.addTo(bBoxMap);

    // var drawControl = new L.Control.Draw({
    //   edit: {
    //     featureGroup: drawnItems,
    //     remove: false
    //   },
    //   draw: {
    //     featureGroup: drawnItems,
    //     rectangle: {
    //       enable: true,
    //       showArea:true,
    //       metric: ['km', 'm']
    //     },
    //     polygon: false,
    //     marker: false,
    //     circle: false,
    //     polyline: false,
    //     circlemarker: false
    //   }
    // });

    // var bBox = L.rectangle(defaultBBox);
    // bBox.addTo(drawnItems);
    // updateBBoxInfo(bBox.getLatLngs()[0]);
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

  function testMapDelta() {
    if (testMinZoom()) {
      var newBounds = objectValuesToArray(map.getBounds());

      for (var i = 0; i < newBounds.length; i++) {
        if (Math.abs(newBounds[i] - prevBounds[i]) >= minMapDelta) {
          console.log('Bounds changed, auto refreshing...')
          prevBounds = newBounds;
          refresh();
          break;
        }
      }
    }
  }

  function testMinZoom() {
    if (map.getZoom() < minZoomLevel) {
      if (refreshState == 'enabled') {
        zoomDisableScheduled = false;
        setRefreshState('disabled');
      } else {
        zoomDisableScheduled = true;
      }
      return false;
    } else {
      if (refreshState == 'disabled') {
        setRefreshState('enabled');
      }
      return true;
    }
  }

  function showInfoModal(shown) {
    console.log('Showing info modal...');

    // Render HTML
    var html = Handlebars.templates['info']({
      dsaInfoModal: JSON.parse(localStorage.getItem('dsaInfoModal'))
    });
    qs('#modal-info-content-wrapper').innerHTML = html;

    // Add event listeners
    qs('#dsa-infoModal').addEventListener('change', e => localStorage.setItem('dsaInfoModal', JSON.stringify(e.target.checked)))

    MicroModal.show('modal-info');
  }

  function showUploadModal() {
    var tagsCount = 0;
    var elemCount = 0;
    for (let elem of opfData) {
      let elemChecked = false;
      for (let tag of elem.numberTags) {
        if (tag.checked) {
          tagsCount++;
          elemChecked = true;
        }
      }
      if (elemChecked) {elemCount++;}
    }

    // Render HTML
    var html = Handlebars.templates['upload']({
      count: {
        tags: tagsCount,
        elems: elemCount
      }
    });
    qs('#modal-upload-content-wrapper').innerHTML = html;

    // Add event listeners
    qs('#gen-osm-change').addEventListener('click', downloadOcs, false);

    MicroModal.show('modal-upload');
  }

  function refresh() {
    NProgress.start();
    if (refreshState == 'enabled') {
      setRefreshState('busy');
      refreshScheduled = false;
      console.debug('Starting refresh...');
      fetchOverpassData(recalculateQuery()).then((data) => {
        let elems = parseOverpassData(data);
        let newElems = addNewData(elems);
        updateMetadata(newElems).then(() => {
          newElems.forEach(formatElem);
          newElems.forEach(drawElement);

          console.debug('Refresh done!')
          NProgress.done();

          setRefreshState('timeout');
          console.debug('Overpass API stress timeout started...')
          window.setTimeout(enableRefreshTimeoutEnd, minRefreshDelta);
        })
      });
    } else {
      refreshScheduled = true;
    }
  }

  function enableRefreshTimeoutEnd() {
    console.debug('Overpass API stress timeout ended')
    setRefreshState('enabled');
    if (refreshScheduled) refresh();
  }

  function setRefreshState(state) {
    refreshState = state;
    if (zoomDisableScheduled && !testMinZoom()) return;

    var cont = qs('#map .l-btn-refresh'); // Refresh button container
    var contCl = cont.classList;
    var iconCl = qs('i', cont).classList;

    switch (refreshState) {
      case 'enabled':
        contCl.remove('disabled');
        iconCl.remove('fa-spin');
        iconCl.remove('fa-clock');
        iconCl.remove('far');
        iconCl.add('fas');
        iconCl.add('fa-sync-alt');
        break;

      case 'busy':
        contCl.add('disabled');
        iconCl.remove('fa-clock');
        iconCl.remove('far');
        iconCl.add('fa-spin');
        iconCl.add('fa-sync-alt');
        iconCl.add('fas');
        break;

      case 'timeout':
        contCl.add('disabled');
        iconCl.remove('fa-spin');
        iconCl.remove('fa-sync-alt');
        iconCl.remove('fas');
        iconCl.add('far');
        iconCl.add('fa-clock');
        break;

      case 'disabled':
        contCl.add('disabled');
        iconCl.remove('fa-clock');
        iconCl.remove('fa-spin');
        iconCl.remove('far');
        iconCl.add('fas');
        iconCl.add('fa-sync-alt');
        break;

      default:
        throw('Invalid refresh state');
    }
  }

  function drawElement(elem) {
    let coords;
    if (elem.osmElem.type == 'node') {
      coords = [elem.osmElem.lat, elem.osmElem.lon];
    } else {
      coords = objectValuesToArray(elem.osmElem.center);
    }

    let marker = new OpfMarker(coords, {
      opfElem: elem
    });
    setMarkerIcon(marker);
    marker.on('click', e => openPopup(e.target));
    markers.addLayer(marker);
  }

  function setMarkerIcon(marker) {
    var opfElem = marker.options.opfElem;
    var flag = mostImportantFormattingFlag(opfElem);

    var flagToIconMap = {
      4: phoneMarkerError,
      3: phoneMarkerUnchecked,
      2: phoneMarkerChecked,
      1: phoneMarkerFormatted,
      0: phoneMarkerFallback
    }

    let icon = flagToIconMap[flag];

    marker.setIcon(icon);
  }

  /**
   * Finds the UX-wise most important flag of an opf element
   * Order of importance:
   * unchecked format error (4) > changed and unchecked (3) > changed and checked (2) > formatted (1) > no formatting data (0)
   *
   * @Returns id of flag (0-4 inclusive)
   */
  function mostImportantFormattingFlag(opfElem) {
    var flag = 0; // Start with lowest flag and increase when necessary
    for (let tag of opfElem.numberTags) {
      // unchecked format error
      if (tag.formatError && !tag.checked) {
        flag = 4;
        break; // flag can not get higher than this, stop searching
      }
      // changed and unchecked
      else if (tag.formatted && tag.original != tag.formatted && !tag.checked) {
        void(flag < 3 && (flag = 3));
      }
      // changed and checked
      else if (tag.formatted && tag.original != tag.formatted && tag.checked) {
        void(flag < 2 && (flag = 2));
      }
      // formatted
      else if (tag.formatted) {
        void(flag < 1 && (flag = 1));
      }
      // no formatting data; flag = 0; no change
    }
    return flag
  }

  /**
   * Opens a popup using the opropriate data retrieved
   * from the supplied marker.
   *
   * @Returns void
   */
  function openPopup(marker) {
    var latLng = marker._latlng;
    var opfElem = marker.options.opfElem;
    var osmTypecapitalized = _.capitalize(opfElem.osmElem.type);
    var leafletId = marker._leaflet_id;

    updateChangedStates(opfElem);

    var html = Handlebars.templates['popup']({
      latLng: latLng, 
      leafletId: leafletId,
      osmTypecapitalized: osmTypecapitalized,
      opfElem: opfElem,
      osmElem: opfElem.osmElem,
    });

    markerPopup.setLatLng(latLng).setContent(html).openOn(map);

    // Register event handlers
    for (let tag of opfElem.numberTags) {
      document.getElementById(`popup-${leafletId}-cb-${tag.key}`)
      .addEventListener('click', e => popupCbToggled(e, tag, marker), false);
      document.getElementById(`popup-${leafletId}-formatted-${tag.key}`)
      .addEventListener('input', e => popupFormattedInput(e, tag, marker), false);
    }
  }

  function updateChangedStates(opfElem) {
    for (let tag of opfElem.numberTags) {
      tag.changed = (tag.formatted != tag.original);
      void(!tag.changed && (tag.checked = false));
    }
  }

  function popupCbToggled(e, tag, marker) {
    var checked = e.target.checked;
    tag['checked'] = checked;
    updateCountButton();
    setMarkerIcon(marker);
  }

  function popupFormattedInput(e, tag, marker) {
    tag.formatted = _.trim(e.target.textContent);

    // Get DOM element of checkbox
    var tableElem = parentBySelector(e.target, 'table');
    var cbElem = tableElem.querySelector('input[type="checkbox"]')

    // Calculate new state & actions
    tag.changed = (tag.formatted != tag.original);
    if (tag.changed) {
      cbElem.removeAttribute('disabled', 'disabled');
    } else {
      tag.checked = false
      cbElem.checked = false;

      cbElem.setAttribute('disabled', 'disabled');
    }

    setMarkerIcon(marker);
  }

  var updateBBoxInfo = function(latlngs) {
    bBoxCoords = [latlngs[0]['lat'], latlngs[0]['lng'], latlngs[2]['lat'], latlngs[2]['lng']]
    var height = Math.round(latlngs[0].distanceTo(latlngs[1]));
    var width = Math.round(latlngs[0].distanceTo(latlngs[3]));
    var area = Math.round(L.GeometryUtil.geodesicArea(latlngs));
    var bBoxCoordsElem = document.getElementById('b-box-coords');
    bBoxCoordsElem.innerHTML = 'Bounding box: <br>';
    var sides = ['Top', 'Left', 'Bottom', 'Right'];
    var prefix = '';
    for (var i = 0; i < sides.length; i++) {
      bBoxCoordsElem.innerHTML += prefix + sides[i] + ':&nbsp;' + _.round(bBoxCoords.slice(i,i+1), 5);
      prefix = '&emsp;'
    }
    document.getElementById('b-box-wha').innerHTML = `Width:&nbsp;${width}m&emsp;Height:&nbsp;${height}m&emsp;Area:&nbsp;${area}m&sup2;`;
  }

  function regexPicked(e) {
    var pattern = regexPatterns[e.target.value];
    if (pattern)
      document.getElementById('regex-pattern').value = pattern;
  }

  function regexChanged(e) {
    var pattern = document.getElementById('regex-pattern').value;
    var name = _.findKey(regexPatterns, pattern);
    name = name == undefined ? 'custom' : name;
    document.getElementById('regex-picker').value = name;
  }

  function recalculateQuery(e) {
    // var fax = document.getElementById('fax').checked;
    // var contactVariants = document.getElementById('contact-variants').checked;
    // var regex = document.getElementById('regex-pattern').value;
    var regex = "."
    var latlngs = map.get
    var bBoxCoords = objectValuesToArray(map.getBounds());
    
    var query = constants.start;

    // var keys = queryParts.keys.slice(0, 1);
    // if (fax)
    //   keys.push(queryParts.keys.slice(1, 2));
    // if (contactVariants)
    //   keys.push(queryParts.keys.slice(2, 4));

    var keys = constants.numberTags;

    for (var key of keys) {
      for (var elemType of constants.elems) {
        query = query.concat('  ',elemType,'["',key,'"~"',regex,'"](',bBoxCoords.toString(),');\n');
      }
    };

    query = query.concat(constants.end)

    // document.getElementById('query').innerHTML = query.replace(/ /g, '&nbsp').replace(/(?:\r\n|\r|\n)/g, '<br />');

    return query;
  }

  function parseOverpassData(data) {
    var parsedData = [];

    // Loop over all OSM elements in the overpass dataset
    for (let osmElem of data) {
      // Create a derived object to store extra data
      let opfElem = {
        osmElem: osmElem,
        numberTags: []
      }

      // Append each phone number tag for later formatting
      for (let tag of constants.numberTags) {
        if (osmElem.tags[tag]) {
          opfElem.numberTags.push({
            key: tag,
            original: osmElem.tags[tag]
          })
        }
      }

      parsedData.push(opfElem);
    }

    return parsedData;
  }

  /**
   * Adds new data to the opf store
   *
   * @returns New (non-duplicate) elements added
   */
  function addNewData(newData) {
    var newElems = []; // Registers non-duplicate elements
    for (let newElem of newData) {
      let dup = opfData.find(elem =>
        newElem.osmElem.type == elem.osmElem.type && newElem.osmElem.id == elem.osmElem.id
      );
      if (!dup) {
        newElems.push(newElem);
      } else {
        if (!_.isEqual(dup.osmElem, newElem.osmElem)) {
          updateElem(dup, newElem);
          dup['changed'] = true;
        }
      }
    }
    opfData = opfData.concat(newElems);
    return newElems;
  }

  /**
   * Updates an existing elem with new data
   * Just overwrites the element for now
   *
  */
  function updateElem(elem, newElem) {
    elem = newElem;
  }

  function updateCountButton() {
    var count = 0;
    for (let elem of opfData) {
      for (let tag of elem.numberTags) {
        if (tag.checked) count++;
      }
    }
    setCountButton(count);
  }

  function setCountButton(count) {
    var countElem = document.getElementsByClassName('l-btn-count')[0].getElementsByTagName('span')[0];
    countElem.innerHTML = count;
  }

  // var parseOverpassData = function(elements) {
  //   var tableBody = document.getElementById("opfData").getElementsByTagName('tbody')[0];

  //   opfData = [];
  //   var i = 0;

  //   for (var elem of elements) {
  //     opfData.push({
  //       index: i,
  //       mainKey: true,
  //       origElem: elem
  //     });
  //     appendToTableBody(tableBody, [
  //       i,
  //       elem.type.slice(0,1),
  //       elem.id
  //     ], ['main-elem'], [{name: 'index', 'value': i}]);
  //     queryParts.keys.forEach(function(key, j) {
  //       if (elem.tags[key]) {
  //         opfData.push({
  //           index: i,
  //           subIndex: j,
  //           mainKey: false,
  //           key: key,
  //           numOriginal: elem.tags[key]
  //         });
  //         appendToTableBody(tableBody, [
  //           '',
  //           '',
  //           '',
  //           key,
  //           elem.tags[key]
  //         ], ['sub-elem'], [{name: 'index', value: i}, {name: 'subIndex', value: j}]);
  //       }
  //     });
  //     i++;
  //   }
  //   NProgress.done()
  //   document.getElementById('overpass-fetch').removeAttribute('disabled');
  // }

  function fetchOverpassData(query) {
    return new Promise((resolve, reject) => {
      console.debug('Fetching overpass data...');

      var req = new XMLHttpRequest();
      req.open("POST", "https://overpass-api.de/api/interpreter");
      req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

      req.onload = function() {
        var json = JSON.parse(req.response);
        if (json.elements != undefined) {
          console.debug('Fetched overpass data');
          resolve(json.elements);
        } else {
          console.error('Overpass request failed: ' + req.status + ': ' + req.statusText);
          reject(req);
        }
      }

      req.onerror = function() {
        reject(req.response);
      }

      req.send('data='.concat(encodeURIComponent(query)));
    });
  }

  function formatElem(elem) {
    if (elem.countryCode) {
      var countryCode = elem.countryCode
    } else {
      throw('Element is missing a country code, use updateMetadata() first');
    }

    for (let tag of elem.numberTags) {
      let formatted = formatNumber(tag.original, countryCode);
      if (!formatted) {
        tag['formatError'] = true;
        tag['formatted'] = tag.original;
      } else {
        tag['formatted'] = formatted;
      }
    }

    return elem;

    // if (!elem.country)
    //   getCountry(elem);

    // if (formatted)
    //   deleteFormatData();
    // formatted = true;

    // var countryCode = document.getElementById('country-code').value;
    // var tableBody = document.getElementById('opfData').getElementsByTagName('tbody')[0];
    // for (var elem of opfData) {
    //   if (!elem.mainKey) {
    //     let numFormatted = libphonenumber.formatNumber({phone: cleanPrefix(elem.numOriginal), country: countryCode}, 'International');
    //     elem['numFormatted'] = numFormatted;
    //     elem['checked'] = false;
    //     var row = tableBody.querySelector('[index="'+elem.index+'"][subIndex="'+elem.subIndex+'"]');
    //     appendToTableRow(row, numFormatted, ['formatted'], [{name: 'contentEditable', value: 'true'}]);
    //     appendToTableRow(row, elem.checked, ['checked-state'], []);
    //   }
    // }
    // for (var cell of tableBody.querySelectorAll('.checked-state')) {
    //   cell.addEventListener('click', function(e) {
    //     toggleChecked(e.target);
    //   });
    // }

    // NProgress.done();
    // console.log('Formatted overpass data...');
    // document.getElementById('format-data').removeAttribute('disabled');
  }

  /**
   * Updates an element's metadata (or array of elements' metadata) using the nominatim API
   *
   * @returns the updated elem
   */
  function updateMetadata(elems) {
    if (elems instanceof Array) {
      let requests = elems.map(updateMetadataSingle);
      return Promise.all(requests);
    } else {
      elem = elems;
      return updateMetadataSingle(elem);
    }
  }

  function updateMetadataSingle(elem) {
    return new Promise((resolve, reject) => {
      var type = elem.osmElem.type.slice(0, 1).toUpperCase();
      var id = elem.osmElem.id;

      var req = new XMLHttpRequest();
      req.open("GET", `https://nominatim.openstreetmap.org/reverse?format=json&osm_type=${type}&osm_id=${id}`);

      req.onload = function() {
        var metadata = JSON.parse(req.response);
        var name = metadata.display_name;
        var code = metadata.address.country_code.toUpperCase();
        if (metadata.osm_id != undefined) {
          let name = metadata.display_name;
          let code = metadata.address.country_code.toUpperCase();
          elem['name'] = name;
          elem['countryCode'] = code;
          resolve(elem);
        } else {
          console.error('Overpass request failed: ' + req.status + ': ' + req.statusText);
          reject(req);
        }
      }

      req.onerror = function() {
        reject(req.response);
      }

      req.send();
    });
  }

  /**
   * Attempts to format the provided number
   *
   * @returns the formatted number if a valid number was provided, false otherwise
   */
  function formatNumber(number, country) {
    // Replace 2 leading zero's with '+' if present (international prefix)
    if (number.slice(0,2) == '00') 
      number = spliceSlice(number, 0, 2, '+');

    var parsed = libphonenumber.parseNumber(number, country);
    if (!_.isEmpty(parsed)) {
      return libphonenumber.formatNumber(parsed, 'International');
    } else {
      console.error(`Couldn\'t parse "${number}" for country "${country}" :(`);
      return false;
    }
  }

  var deleteData = function() {
    checkedAll = false;
    formatted = false;
    var tableBody = document.getElementById("opfData").getElementsByTagName('tbody')[0];
    while (tableBody.firstChild) {
      tableBody.removeChild(tableBody.firstChild);
    }
  }

  var deleteFormatData = function() {
    checkedAll = false;
    formatted = false;
    var elems = [].concat(Array.from(document.getElementsByClassName('formatted')), Array.from(document.getElementsByClassName('checked-state')));
    for (var elem of elems) {
      elem.parentNode.removeChild(elem);
    }
  }

  var cleanPrefix = function(number) {
    // Remove 1 leading zero if present (local number)
    if (number.slice(0,1) == '0' && number.slice(1,2) != '0') {
      number = spliceSlice(number, 0, 1);
    }
    // Replace 2 leading zero's with '+' if present (international prefix)
    else if (number.slice(0,2) == '00') 
      number = spliceSlice(number, 0, 2, '+');

    return(number)
  }

  function spliceSlice(str, index, count, add) {
    if (!add) add = '';
    return str.slice(0, index) + add + str.slice(index + count);
  }
  
  var toggleChecked = function(cell, manual, state) {
    var parent = cell.parentElement;
    var index = parent.getAttribute('index');
    var subIndex = parent.getAttribute('subIndex');
    var elem = opfData.find(function(searchElem) {
      return searchElem.index == index && searchElem.subIndex == subIndex;
    });

    if (!manual) state = !elem.checked;
    var checkedClassAction = state ? 'add' : 'remove';

    cell.classList[checkedClassAction]('checked');
    cell.innerHTML = state;
    elem.checked = state;
  }

  var toggleCheckedAll = function() {
    checkedAll = !checkedAll;
    var tableBody = document.getElementById("opfData").getElementsByTagName('tbody')[0];
    for (var cell of tableBody.querySelectorAll('.checked-state')) {
      toggleChecked(cell, true, checkedAll);
    }
  }

  function genOcs(changeset) {
    var ocs = document.implementation.createDocument(null, "ocs");
    ocs.documentElement.setAttribute('version', '0.6');
    ocs.documentElement.setAttribute('generator', `opf ${opfVersion}`);

    var modifyElem = ocs.createElement("modify");

    for (var opfElem of opfData) {
      let ocsElem = ocs.createElement(opfElem.osmElem.type);

      // Loop through number tags
      let hasModifiedKey = false;
      for (let tag of opfElem.numberTags) {
        // If modified and checked
        if (tag.formatted && tag.original != tag.formatted && tag.checked) {
          hasModifiedKey = true;
          let tagElem = ocs.createElement('tag');
          tagElem.setAttribute('k', tag.key);
          tagElem.setAttribute('v', tag.formatted);
          ocsElem.appendChild(tagElem);
        }
      }

      // Discard element if nothing changed
      if (!hasModifiedKey) continue;

      // Set static properties
      ocsElem.setAttribute('id', opfElem.osmElem.id);
      ocsElem.setAttribute('lat', opfElem.osmElem.lat);
      ocsElem.setAttribute('lon', opfElem.osmElem.lon);
      ocsElem.setAttribute('version', opfElem.osmElem.version);

      // Add tags if present
      let tags = opfElem.osmElem.tags;
      if (tags) {
        for (let tag in tags) {
          let key = tag, val = tags[tag];
          // Skip if a tag with this key already exists
          let existingTag = qs(`tag[k="${key}"]`, ocsElem);
          if (!existingTag) {
            if (tags.hasOwnProperty(tag)) {
              let tagElem = ocs.createElement('tag');
              tagElem.setAttribute('k', tag);
              tagElem.setAttribute('v', val);
              ocsElem.appendChild(tagElem);
            }
          }
        }
      }

      // Add nodes if present (way)
      let nodes = opfElem.osmElem.nodes;
      if (nodes) {
        for (let node of nodes) {
          let nodeElem = ocs.createElement('nd');
          nodeElem.setAttribute('ref', node);
          ocsElem.appendChild(nodeElem);
        }
      }

      // Add members if present (relation)
      let members = opfElem.osmElem.nodes;
      if (members) {
        for (let member of members) {
          let memberElem = ocs.createElement('member');
          memberElem.setAttribute('type', member.type);
          memberElem.setAttribute('ref', member.ref);
          memberElem.setAttribute('role', member.role);
          ocsElem.appendChild(memberElem);
        }
      }

      modifyElem.appendChild(ocsElem);
    }

    ocs.documentElement.appendChild(modifyElem);

    var serializer = new XMLSerializer();
    var ocsString = serializer.serializeToString(ocs);

    return ocsString;
  }

  function genChangeset(comment) {
    var changeset = document.implementation.createDocument(null, 'osm');
    var changesetElem = changeset.createElement("changeset");

    var createdTag = changeset.createElement("tag");
    createdTag.setAttribute('k', 'created_by');
    createdTag.setAttribute('v', 'OPF ' + opfVersion);

    var commentTag = changeset.createElement("tag");
    commentTag.setAttribute('k', 'comment');
    commentTag.setAttribute('v', comment);

    changesetElem.appendChild(createdTag);
    changesetElem.appendChild(commentTag);

    changeset.documentElement.appendChild(changesetElem);

    var serializer = new XMLSerializer();
    var changesetString = serializer.serializeToString(changeset);

    return changesetString;      
  }

  function downloadOcs() {
    var name = 'opf';
    var osmChangeString = genOcs();
    var a = document.createElement('a');
    a.href = 'data:application/xml;charset=utf-8,' + encodeURIComponent(osmChangeString);
    a.download = `${name}.ocs`;
    document.body.appendChild(a);
    a.click();
  }

  function uploadOcs() {
    var changesetString = genChangeset();
    console.log(changesetString);

    osmOAuth.xhr({
      method: 'PUT',
      path: '/api/0.6/changeset/create',
      content: changesetString
    }, function(err, data) {
      if (err) {
        console.error(err);
        return;
      } else {
        var changesetId = data;
        console.log(data);
        var osmChange = genOsmChange();

        osmOAuth.xhr({
          method: 'PUT',
          path: '/api/0.6/changeset/' + changesetId + '/upload',
          content: osmChange
        }, function(err, data, changesetId) {
          if (err) {
            console.error(err);
            return;
          } else {
            console.log(data);

            osmOAuth.xhr({
              method: 'PUT',
              path: '/api/0.6/changeset/' + changesetId + '/close'
            }, function(err, data) {
              if (err) {
                console.error(err);
                return;
              } else {
                console.log(data);
              }
            });   
          }
        });
      }
    });


 
  }

  function getUserInfo() {
    osmOAuth.xhr({
      method: 'GET',
      path: '/api/0.6/user/details'
    }, function(err, data) {
      var detailsXML = data;
      var userElem = detailsXML.getElementsByTagName('user')[0];

      var display_name = userElem.getAttribute('display_name');
      var id = userElem.getAttribute('id');

      document.getElementById('user-details').innerHTML = 'Logged in as ' + display_name + ' with user id ' + id;
    });
  }

  return {};

  }
);

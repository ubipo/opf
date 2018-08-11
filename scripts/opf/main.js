define(['./Utils', './handlebars-templates', './Opf', './OpfUI'], function(Utils, handlebarsTemplates, Opf, OpfUI) {
  // const Opf = require('./Opf');
  // const OpfUI = require('./OpfUI');
  // const Utils = require('./utils');
  // require('./handlebars-templates');

  const opfVersion = 1.3; // Tool version
  var defaultBBox = [[50.88081821539843, 4.706557989120484], [50.87751134170449, 4.696494340896607]];
  var bBoxCoords;
  var formatted = false;
  var checkedAll = false;
  var showAdvancedOptions = false;
  var opfData = [];
  var prevBounds;


  var phoneMarkerError, phoneMarkerUnchecked, phoneMarkerChecked, phoneMarkerFormatted, phoneMarkerFallback;

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

  var opf = new Opf();
  var ui = new OpfUI();

  function firstVisitCheck() {
    if (!JSON.parse(localStorage.getItem('dsaInfoModal'))) showInfoModal();
  }

  document.addEventListener('DOMContentLoaded', init, false);
  init();

  function init() {
    firstVisitCheck();

    MicroModal.init();

    initLeaflet();
    // refresh(); // TODO removed
    updateCountButton();
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

  function oldRefresh() {
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
    let icon = markerIcons[flag];

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

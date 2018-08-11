define(['lodash', 'event-emitter', './IllegalArgumentException', 'turf'], function (_, EventEmitter, IllegalArgumentException, turf) {
  const refreshStates = ['ready', 'refreshing', 'timeout', 'disabled'];
  const maxRefreshBboxSize = 9000000;

  console.log('opf loaded');

  /**
   * A class of osm phone formatter objects providing
   * the logic and data management backend to use in
   * conjunction with a gui.
   *
   * @emits logMessage callback args: msg, lvl
   * @emits refreshStateChange callback args: state
   * @emits bboxChange callback args: bbox
   */
  class Opf extends EventEmitter {
    constructor() {
      super(); // EventEmitter constructor

      this._refreshState = 'ready';
      // Bounds to perform refresh on
      this._bbox = [[4.6785, 50.8662], [4.7219, 50.8914]];
      this._refreshScheduled = false;
      this.elems = [];
    }

    get refreshStates() {
      return refreshStates;
    }

    get maxRefreshBboxSize() {
      return maxRefreshBboxSize;
    }

    /**
     * Logs the provided message.
     *
     * @param {string} msg message to log
     * @param {number} lvl severity level, high severity (1) to low (eg 4)
     * @emits logMessage callback args: msg, lvl
     * @throws IllegalArgumentException iff <lvl> is not a number nor higher than 1
     */
    logger(msg, lvl) {
      if (isNaN(lvl) || lvl < 1)
        throw new IllegalArgumentException('lvl', 'must be a number higher than 1');
      console.debug(msg);
      this.emitEvent('refreshStateChange', [msg, lvl]);
    }

    /**
     * Gets the refresh state.
     *
     * @returns {string} the current refreshState, one of this.refreshStates
     */
    get refreshState() {
      return this._refreshState;
    }

    /**
     * Sets the refresh state.
     *
     * @param {string} state
     * @emits refreshStateChange iff state changed, callback args: state
     * @throws IllegalArgumentException iff state is not one of this.refreshStates
     * @private
     */
    _setRefreshState(state) {
      // Can't use 'set _refreshState' (creates callstack overflow)
      if (!this.refreshStates.includes(state))
        throw new IllegalArgumentException('state', `must be one of: ${this.refreshStates}`);
      if (this._refreshState !== state) {
        this._refreshState = state;
        this.emitEvent('refreshStateChange', [state]);
      }
    }

    /**
     * Returns the refresh bbox.
     *
     * @returns the current bbox [[lat1, lng1], [lat2, lng2]]
     */
    get bbox() {
      return _.cloneDeep(this._bbox);
    }

    /**
     * Sets the refresh bbox, and disables refresh if too big (> maxRefreshBboxSize m^2).
     *
     * @param {number]]} bbox
     * @emits bboxChange iff bbox changed, callback args: bbox
     * @throws IllegalArgumentException iff <bbox> is not valid ([[lng, lat]*2])
     */
    set bbox(bbox) {
      this.checkAndFixBboxArray(bbox); // Throws illegal argument exception

      var size = turf.area(this.geoJSONFromBbox(bbox));
      console.log(size);
      if (size >= this.maxRefreshBboxSize) {
        this._setRefreshState('disabled');
      } else if (size < this.maxRefreshBboxSize && this.refreshState === 'disabled') {
        this._setRefreshState('ready')
      }

      this._bbox = bbox;
      this.emitEvent('bboxChange', [bbox]);
    }

    /**
     * Check and fixes <bbox> to fit: [[lngNE, latNE], [lngSW, latSW]]
     * NE and SW are swapped automatically.
     *
     * @param {number]]} bbox array to fix, gets mutated
     * @throws IllegalArgumentException iff <bbox> is not valid
     */
    checkAndFixBboxArray(bbox) {
      // Check if array
      if (!(bbox instanceof Array && bbox.length === 2))
        throw new IllegalArgumentException('bbox', 'not an array');

      // Check validity
      let ok = true;
      for (let point of bbox) {
        if (!(point instanceof Array && point.length === 2 &&
            !isNaN(point[0]) && !isNaN(point[1])))
          ok = false;
      }
      if (!ok)
        throw new IllegalArgumentException('bbox', 'inconsistent');

      // Swap south / north if necessary
      if (bbox[0][0] < bbox[1][0]) {
        let coord0 = bbox[0][0];
        bbox[0][0] = bbox[1][0];
        bbox[1][0] = coord0;
      }
      if (bbox[0][1] < bbox[1][1]) {
        let coord0 = bbox[0][1];
        bbox[0][1] = bbox[1][1];
        bbox[1][1] = coord0;
      }
    }

    /**
     * Serializes a geoJSON object from a bbox array.
     *
     * @returns {geoJSON} geoJSON polygon
     */
    geoJSONFromBbox(bbox) {
      // Serialize geojson
      return {
        type: "Polygon",
        coordinates: [[
            [bbox[1][0], bbox[0][1]], [bbox[0][0], bbox[0][1]],
            [bbox[0][0], bbox[1][1]], [bbox[1][0], bbox[1][1]],
            [bbox[1][0], bbox[0][1]]
          ]]
       }
    }

    refresh() {
      // Check if refresh is possible, otherwise schedule it
      if (refreshState === 'ready') {
        console.debug('Starting refresh...');
        this._setRefreshState('refreshing');
        this._refreshScheduled = false;
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
        this._refreshScheduled = true;
      }
    }

    enableRefreshTimeoutEnd() {
      console.debug('Overpass API stress timeout ended')
      setRefreshState('enabled');
      if (refreshScheduled) refresh();
    }

    fetchOverpassData(query) {
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

    formatElem(elem) {
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
    updateMetadata(elems) {
      if (elems instanceof Array) {
        let requests = elems.map(updateMetadataSingle);
        return Promise.all(requests);
      } else {
        elem = elems;
        return updateMetadataSingle(elem);
      }
    }

    updateMetadataSingle(elem) {
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
    formatNumber(number, country) {
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

    deleteData() {
      checkedAll = false;
      formatted = false;
      var tableBody = document.getElementById("opfData").getElementsByTagName('tbody')[0];
      while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
      }
    }

    deleteFormatData() {
      checkedAll = false;
      formatted = false;
      var elems = [].concat(Array.from(document.getElementsByClassName('formatted')), Array.from(document.getElementsByClassName('checked-state')));
      for (var elem of elems) {
        elem.parentNode.removeChild(elem);
      }
    }

    cleanPrefix(number) {
      // Remove 1 leading zero if present (local number)
      if (number.slice(0,1) == '0' && number.slice(1,2) != '0') {
        number = spliceSlice(number, 0, 1);
      }
      // Replace 2 leading zero's with '+' if present (international prefix)
      else if (number.slice(0,2) == '00')
        number = spliceSlice(number, 0, 2, '+');

      return(number)
    }

    spliceSlice(str, index, count, add) {
      if (!add) add = '';
      return str.slice(0, index) + add + str.slice(index + count);
    }
  }
  console.log(new Opf());
  return Opf;
});

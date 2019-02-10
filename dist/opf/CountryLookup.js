import destination from '@turf/destination';
import { getCoord } from '@turf/invariant';
/**
 * A class of CountryLookup objects that
 * try to look up the country of an osm
 * object as efficiently as possible.
 */
var CountryLookup = /** @class */ (function () {
    function CountryLookup() {
        this.cachedGeoms = [];
        this.cachedCities = [];
        this.cachedPostcodes = [];
    }
    CountryLookup.prototype.lookup = function (object) {
        var city, postcode = null;
        var _loop_1 = function (tag) {
            if (tag.key === "addr:country") {
                return { value: tag.val };
            }
            else if (tag.key === "addr:city") {
                var cachedCity = this_1.cachedCities.find(function (city) { return city.name === tag.val; });
                if (cachedCity !== undefined) {
                    return { value: cachedCity.country };
                }
            }
            else if (tag.key === "addr:postcode") {
                var cachedPostcode = this_1.cachedPostcodes.find(function (postcode) { return postcode.name === tag.val; });
                if (cachedPostcode !== undefined) {
                    return { value: cachedPostcode.country };
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = object.tags; _i < _a.length; _i++) {
            var tag = _a[_i];
            var state_1 = _loop_1(tag);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        return "";
    };
    CountryLookup.prototype.naminatimReverseLookup = function (osmType, id) {
        var nominatimOsmType = osmType.slice(0, 1).toUpperCase();
        var req = new XMLHttpRequest();
        var query = "osm_type=" + nominatimOsmType + "&osm_id=" + id;
        req.open("GET", "https://nominatim.openstreetmap.org/reverse?email=ubipo.skippy@gmail.com&format=jsonv2&" + query);
        return new Promise(function (resolve, reject) {
            req.addEventListener("load", function (e) {
                resolve(CountryLookup.countryFromNominatimRes(req.responseText));
            });
            req.send();
        });
    };
    CountryLookup.buildPostcodeOverpassQuery = function (postcode, lat, lon) {
        var query = document.implementation.createDocument(null, "osm-script", null);
        var eRoot = query.getElementsByTagName("osm-script")[0];
        eRoot.setAttribute("output", "json");
        eRoot.setAttribute("timeout", "25");
        var eUnion = query.createElement("union");
        eUnion.setAttribute("into", "_");
        var eQuery = query.createElement("query");
        eQuery.setAttribute("type", "relation");
        var center = [lon, lat];
        var bbox = [];
        var eBbox = query.createElement("bbox-query");
        for (var i = 0; i < 4; i++) {
            console.log(this.cardinalDirectionBearings[i]);
            var point = getCoord(destination(center, this.reverseLookupBboxSize / 2, this.cardinalDirectionBearings[i]));
            console.log(point);
            var val = point[i % 2];
            console.log(val);
            eBbox.setAttribute(this.cardinalDirections[i], val.toString());
        }
        eQuery.append(eBbox);
        var eTypeKv = query.createElement("has-kv");
        eTypeKv.setAttribute("k", "type");
        eTypeKv.setAttribute("v", "boundary");
        eQuery.appendChild(eTypeKv);
        var eBoundaryKv = query.createElement("has-kv");
        eBoundaryKv.setAttribute("k", "boundary");
        eBoundaryKv.setAttribute("v", "postal_code");
        eQuery.appendChild(eBoundaryKv);
        var ePostalCodeKv = query.createElement("has-kv");
        ePostalCodeKv.setAttribute("k", "postal_code");
        ePostalCodeKv.setAttribute("v", postcode);
        eQuery.appendChild(ePostalCodeKv);
        eUnion.appendChild(eQuery);
        eRoot.appendChild(eUnion);
        var ePrintMain = query.createElement("print");
        ePrintMain.setAttribute("from", "_");
        ePrintMain.setAttribute("geometry", "center");
        ePrintMain.setAttribute("ids", "yes");
        ePrintMain.setAttribute("mode", "body");
        ePrintMain.setAttribute("order", "quadtile");
        eRoot.appendChild(ePrintMain);
        // realation members
        var eRecurse = query.createElement("recurse");
        eRecurse.setAttribute("from", "_");
        eRecurse.setAttribute("into", "_");
        eRecurse.setAttribute("type", "down");
        eRoot.appendChild(eRecurse);
        // member coords
        var ePrintRecursed = query.createElement("print");
        ePrintRecursed.setAttribute("from", "_");
        ePrintRecursed.setAttribute("geometry", "center");
        ePrintRecursed.setAttribute("ids", "yes");
        ePrintRecursed.setAttribute("mode", "skeleton");
        ePrintRecursed.setAttribute("order", "quadtile");
        eRoot.appendChild(ePrintRecursed);
        return eRoot.outerHTML;
    };
    // static getPostcodeGeom(postcode: string): GeoJSON {
    // }
    CountryLookup.countryFromNominatimRes = function (res) {
        console.log(JSON.parse(res));
        return "BE";
    };
    CountryLookup.nominatimLookup = function (name, lat, lon, lookupType) {
        /**
         4.7013115882873535,
                  50.88064560036615
                ],
                [
                  4.703199863433838,
                  50.88064560036615
                ],
                [
                  4.703199863433838,
                  50.88145790082436
                ],
                [
                  4.7013115882873535,
                  50.88145790082436
         */
        var _this = this;
        var req = new XMLHttpRequest();
        req.open("GET", "https://nominatim.openstreetmap.org/search?email=ubipo.skippy@gmail.com&format=jsonv2&" + lookupType + "=" + name);
        return new Promise(function (resolve, reject) {
            req.addEventListener("load", function (e) {
                resolve(_this.countryFromNominatimRes(req.responseText));
            });
            req.send();
        });
    };
    CountryLookup.reverseLookupBboxSize = 20; // km (side)
    CountryLookup.cardinalDirections = ['w', 's', 'e', 'n'];
    CountryLookup.cardinalDirectionBearings = [-90, 180, 90, 0];
    return CountryLookup;
}());
export default CountryLookup;
//# sourceMappingURL=CountryLookup.js.map
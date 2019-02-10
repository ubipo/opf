import { deserializeOverpassObject } from "./OverpassObject";
import { osmTypeStrings } from "./types";
var Overpass = /** @class */ (function () {
    function Overpass() {
    }
    Overpass.parseAndDeserializeRes = function (res) {
        var parsed = JSON.parse(res);
        var serialized = parsed.elements;
        var deserialized = serialized.map(deserializeOverpassObject);
        return deserialized;
    };
    Overpass.isValidBbox = function (bbox) {
        return bbox.length == 4;
    };
    Overpass.normalizeBbox = function (bbox) {
        if (bbox[0] > bbox[2]) {
            var w = bbox[0];
            bbox[0] = bbox[2];
            bbox[2] = w;
        }
        if (bbox[1] > bbox[3]) {
            var s = bbox[1];
            bbox[1] = bbox[3];
            bbox[3] = s;
        }
    };
    Overpass.buildQuery = function (bbox, keys) {
        if (!this.isValidBbox(bbox))
            throw new Error("ff");
        this.normalizeBbox(bbox);
        var query = document.implementation.createDocument(null, "osm-script", null);
        var eRoot = query.getElementsByTagName("osm-script")[0];
        eRoot.setAttribute("output", "json");
        eRoot.setAttribute("timeout", "25");
        var eUnion = query.createElement("union");
        eUnion.setAttribute("into", "_");
        var eBbox = query.createElement("bbox-query");
        for (var i = 0; i < 4; i++) {
            eBbox.setAttribute(this.cardinalDirections[i], bbox[i].toString());
        }
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            for (var type in osmTypeStrings) {
                var eQuery = query.createElement("query");
                eQuery.setAttribute("type", type);
                var eHasKv = query.createElement("has-kv");
                eHasKv.setAttribute("k", key);
                eQuery.appendChild(eHasKv);
                eQuery.appendChild(eBbox.cloneNode());
                eUnion.appendChild(eQuery);
            }
        }
        eRoot.appendChild(eUnion);
        var ePrint = query.createElement("print");
        ePrint.setAttribute("from", "_");
        ePrint.setAttribute("geometry", "center");
        ePrint.setAttribute("ids", "yes");
        ePrint.setAttribute("mode", "meta");
        ePrint.setAttribute("order", "id");
        eRoot.appendChild(ePrint);
        return eRoot.outerHTML;
    };
    Overpass.download = function (bbox, keys) {
        var query = this.buildQuery(bbox, keys);
        var req = new XMLHttpRequest();
        req.open("POST", "https://overpass-api.de/api/interpreter");
        req.setRequestHeader("Content-type", "application/xml");
        return new Promise(function (resolve, reject) {
            req.addEventListener("load", function (e) {
                resolve(Overpass.parseAndDeserializeRes(req.responseText));
            });
            req.send(query);
        });
    };
    Overpass.cardinalDirections = ['w', 's', 'e', 'n'];
    return Overpass;
}());
export default Overpass;
//# sourceMappingURL=Overpass.js.map
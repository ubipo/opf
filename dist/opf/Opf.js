var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import AreaToDownloadTooLargeException from './exceptions/AreaToDownloadTooLargeException';
import { fromOverpassObject } from './OpfObject';
import Overpass from './overpass/Overpass';
import { EventEmitter } from 'events';
import difference from '@turf/difference';
import union from '@turf/union';
import bbox from '@turf/bbox';
import bboxPolygon from '@turf/bbox-polygon';
import area from '@turf/area';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import { isSameOsmObject } from './overpass/OverpassObject';
import { getStatusCode } from './opf-url-checker';
var Opf = /** @class */ (function (_super) {
    __extends(Opf, _super);
    function Opf() {
        var _this = _super.call(this) || this;
        _this.opfObjects = [];
        _this.areaDownloaded = null;
        _this.queuedDownload = null;
        _this.downloading = false;
        return _this;
    }
    Opf.prototype.isDownloading = function () {
        return this.downloading;
    };
    Opf.prototype.phoneTest = function () {
        var phoneUtil = PhoneNumberUtil.getInstance();
        var number = phoneUtil.parseAndKeepRawInput('479 38-13-89 ', 'BE');
        console.log(number.getCountryCode());
        console.log(phoneUtil.isValidNumber(number));
        console.log(phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL));
    };
    Opf.prototype.process = function (toProcess) {
        for (var _i = 0, toProcess_1 = toProcess; _i < toProcess_1.length; _i++) {
            var object = toProcess_1[_i];
            for (var _a = 0, _b = object.tags; _a < _b.length; _a++) {
                var tag = _b[_a];
                if (tag.key === "phone" || tag.key === "contact:phone") {
                    var phoneUtil = PhoneNumberUtil.getInstance();
                    var number = phoneUtil.parseAndKeepRawInput(tag.val, 'BE');
                    console.log(tag.key + " = " + tag.val);
                    object.phoneNumbers.push({
                        key: tag.key,
                        origial: tag.val,
                        formatted: phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL),
                        corrected: "",
                        checked: false
                    });
                }
                if (tag.key === "website" || tag.key === "contact:website") {
                    console.log(tag.val);
                    getStatusCode(tag.val).then(function (e) { return console.log; });
                }
            }
        }
    };
    /**
     *
     * @param newObjects
     *
     * @emits opfObjectsAdded
     */
    Opf.prototype.addOpfObjects = function (newObjects) {
        var _a;
        var objectsToAdd = [];
        var _loop_1 = function (newObject) {
            var existingObject = this_1.opfObjects.find(function (testObject) { return isSameOsmObject(testObject, newObject); });
            if (existingObject === undefined) {
                objectsToAdd.push(newObject);
            }
            else {
                if (existingObject.version === newObject.version) {
                    // This happens when a way / realtion is partially outside the bbox
                    console.log(existingObject);
                }
                else {
                    // TODO: conflict
                    console.error("todo: conflict");
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, newObjects_1 = newObjects; _i < newObjects_1.length; _i++) {
            var newObject = newObjects_1[_i];
            _loop_1(newObject);
        }
        this.process(objectsToAdd);
        this.emit("objectsAdded", objectsToAdd);
        (_a = this.opfObjects).push.apply(_a, objectsToAdd);
    };
    Opf.prototype.OpfObjects = function () {
        return this.opfObjects;
    };
    /**
     * Private, use download() as a public
     * alternative.
     *
     * @param toDownload
     *
     * @emits downloadStarted
     * @emits downloadFinished
     * @emits opfObjectsAdded
     */
    Opf.prototype.uncheckedDownload = function (toDownload) {
        var _this = this;
        this.downloading = true;
        var toDownloadBboxPolygon = bboxPolygon(toDownload);
        if (this.areaDownloaded === null) {
            this.areaDownloaded = toDownloadBboxPolygon;
        }
        else {
            this.areaDownloaded = union(this.areaDownloaded, toDownloadBboxPolygon);
        }
        Overpass.download(toDownload, ["phone", "contact:phone", "website", "contact:website"]).then(function (overpassObjects) {
            _this.downloading = false;
            _this.emit("downloadFinished", toDownload.slice());
            if (_this.queuedDownload !== null) {
                _this.uncheckedDownload(_this.queuedDownload);
                _this.queuedDownload = null;
            }
            _this.addOpfObjects(overpassObjects.map(fromOverpassObject));
        });
        this.emit("downloadStarted", toDownload.slice());
    };
    Opf.prototype.QueuedDownload = function () {
        return this.queuedDownload == null ? null : this.queuedDownload.slice();
    };
    /**
     *
     * @param toDownload
     *
     * @emits downloadQueued
     */
    Opf.prototype.queueDownload = function (toDownload) {
        this.queuedDownload = toDownload;
        this.emit("downloadQueued", this.QueuedDownload());
    };
    /**
     *
     * @param toDownload
     *
     * @emits downloadQueued
     * @emits downloadStarted
     * @emits downloadFinished
     * @emits opfObjectsAdded
     */
    Opf.prototype.download = function (toDownload) {
        if (this.areaDownloaded !== null)
            toDownload = difference(toDownload, this.areaDownloaded);
        if (toDownload !== null) {
            var toDownloadBbox = bbox(toDownload);
            var toDownloadBboxPolygon = bboxPolygon(toDownloadBbox);
            if (area(toDownloadBboxPolygon) > Opf.maxAreaDownload * Math.pow(10, 3 * 2))
                throw new AreaToDownloadTooLargeException("Area to download must be smaller or equal to " + Opf.maxAreaDownload + " sqr km");
            if (this.isDownloading()) {
                this.queueDownload(toDownloadBbox);
            }
            else {
                this.uncheckedDownload(toDownloadBbox);
            }
        }
    };
    Opf.maxAreaDownload = 1;
    return Opf;
}(EventEmitter));
export default Opf;
//# sourceMappingURL=Opf.js.map
import { cloneDeep } from 'lodash';
export function fromOverpassObject(overpassObject) {
    var opfObject = cloneDeep(overpassObject);
    opfObject.phoneNumbers = [];
    return opfObject;
}
//# sourceMappingURL=OpfObject.js.map
import { osmTypeStrings } from "./types";
export function deserializeOverpassObject(s) {
    var tags = [];
    for (var key in s["tags"]) {
        var val = s["tags"][key];
        tags.push({
            key: key,
            val: val
        });
    }
    var lat = null;
    var lon = null;
    var nodes = null;
    var members = null;
    if (s["type"] === osmTypeStrings.node) {
        lat = s["lat"];
        lon = s["lon"];
    }
    else if (s["type"] === osmTypeStrings.way) {
        lat = s["center"]["lat"];
        lon = s["center"]["lon"];
        nodes = s["nodes"];
    }
    else if (s["type"] === osmTypeStrings.relation) {
        lat = s["center"]["lat"];
        lon = s["center"]["lon"];
        members = [];
        for (var _i = 0, _a = s["members"]; _i < _a.length; _i++) {
            var oMember = _a[_i];
            var member = {
                type: oMember["type"],
                id: oMember["ref"],
                role: oMember["role"]
            };
            members.push(member);
        }
    }
    return {
        type: s["type"],
        id: s["id"],
        version: s["version"],
        uId: s["uid"],
        uName: s["user"],
        tags: tags,
        lat: lat,
        lon: lon,
        nodes: nodes,
        members: members
    };
}
export function isSameOsmObject(a, b) {
    return (a.type == b.type
        && a.id == b.id);
}
// export default class OverpassObject {
//   private type: OsmType;
//   private id: number;
//   private version: number;
//   private uid: number;
//   private uName: string;
//   private tags: Array<Tag>;
//   private lat: number | null;
//   private lon: number | null;
//   private nodes: Array<number> | null;
//   private members: Array<OsmRelationMember> | null;
//   constructor(type: OsmType, id: number, version: number, uid: number, uName: string, tags: Array<Tag>, lat: number | null, lon: number | null, nodes: Array<number> | null, members: Array<OsmRelationMember> | null) {
//     this.type = type;
//     this.id = id;
//     this.version = version;
//     this.lat = lat;
//     this.lon = lon;
//     this.uid = uid;
//     this.uName = uName;
//     this.tags = tags;
//     this.nodes = nodes;
//     this.members = members;
//   }
//   Type(): OsmType {
//     return this.type;
//   }
//   Id(): number {
//     return this.id;
//   }
//   Version(): number {
//     return this.version;
//   }
//   Lat(): number | null {
//     return this.lat;
//   }
//   Lon(): number | null {
//     return this.lon;
//   }
//   Uid(): number {
//     return this.uid;
//   }
//   UName(): string {
//     return this.uName;
//   }
//   Tags(): Array<Tag> {
//     return this.tags;
//   }
//   Nodes(): Array<number> | null {
//     return this.nodes;
//   }
//   Members(): Array<OsmRelationMember> | null {
//     return this.members;
//   }
// }
//# sourceMappingURL=OverpassObject.js.map
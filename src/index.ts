import {Overpass} from "./opf/index";
import {cloneDeep} from 'lodash';
import Opf from './opf/Opf';
import CountryLookup from "./opf/CountryLookup";

let opf = new Opf;

let first = true;
opf.on("objectsAdded", e => {
  console.log("opfObjectsAdded");
  console.log(e);
});

opf.on("downloadQueued", e => {
  console.log("downloadQueued");
  console.log(e);
});

opf.on("downloadStarted", e => {
  console.log("downloadStarted");
  console.log(e);
});

opf.on("downloadFinished", e => {
  console.log("downloadFinished");
  console.log(e);
});

let a = new CountryLookup;
// a.naminatimReverseLookup("way", 251737725).then(e => {
//   console.log(e);
// });

console.log(CountryLookup.buildPostcodeOverpassQuery("3191", 50.981426, 4.522047));

// (window as any).run = () => {
//   opf.download({
//     "type": "Feature",
//     "properties": {},
//     "geometry": {
//       "type": "Polygon",
//       "coordinates": [
//         [
//           [
//             4.70039963722229,
//             50.874200848247476
//           ],
//           [
//             4.6998149156570435,
//             50.8744310333137
//           ],
//           [
//             4.699455499649048,
//             50.87376417051253
//           ],
//           [
//             4.700635671615601,
//             50.87374047470442
//           ],
//           [
//             4.70039963722229,
//             50.874200848247476
//           ]
//         ]
//       ]
//     }
//   });
// }



// opf.download({
//   "type": "Feature",
//   "properties": {},
//   "geometry": {
//     "type": "Polygon",
//     "coordinates": [
//       [
//         [
//           4.703945517539978,
//           50.87683775319703
//         ],
//         [
//           4.704825282096863,
//           50.87750457201916
//         ],
//         [
//           4.703811407089233,
//           50.87805291334286
//         ],
//         [
//           4.702330827713013,
//           50.87734886898564
//         ],
//         [
//           4.703945517539978,
//           50.87683775319703
//         ]
//       ]
//     ]
//   }
// });

// opf.download({
//   "type": "Feature",
//   "properties": {},
//   "geometry": {
//     "type": "Polygon",
//     "coordinates": [
//       [
//         [
//           4.708542823791504,
//           50.8750471112798
//         ],
//         [
//           4.7060322761535645,
//           50.87504034123649
//         ],
//         [
//           4.705849885940552,
//           50.874045134175674
//         ],
//         [
//           4.708950519561768,
//           50.87378786630855
//         ],
//         [
//           4.708542823791504,
//           50.8750471112798
//         ]
//       ]
//     ]
//   }
// });

// // opf.download();

// opf.phoneTest();

// Overpass.download([4.71510887146, 50.872364952934, 4.6929860115051, 50.869434407865], ["phone", "contact:phone"]).then(data => console.log(data));
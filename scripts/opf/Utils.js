
// === jQuery-like stuff ===
function qs(query, start = document) {
  return start.querySelector(query);
}

function parentBySelector(el, selector, stopSelector) {
  var retval = null;
  while (el) {
    if (el.matches(selector)) {
      retval = el;
      break
    } else if (stopSelector && el.matches(stopSelector)) {
      break
    }
    el = el.parentElement;
  }
  return retval;
}

// === stuff Lodash doesn't include ===
function objectValuesToArray(ob) {
  var toReturn = [];
  
  for (var i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    
    if ((typeof ob[i]) == 'object' && ob[i] !== null) {
      var flatObject = objectValuesToArray(ob[i]);
      for (var x in flatObject) {
        if (flatObject.hasOwnProperty(x))
          toReturn.push(flatObject[x]);
      }
    } else {
      toReturn.push(ob[i]);
    }
  }

  return toReturn;
};

// === Table DOM stuff ===
function appendToTableBody(tableBody, data, customClasses, customAttrib) {
  var tr = document.createElement("tr");
  for (var customClass of customClasses) {
    tr.classList.add(customClass);
  }
  for (var customAttrib of customAttrib) {
    tr.setAttribute(customAttrib.name, customAttrib.value); 
  }
  for (var k in data) {
    var td = document.createElement("td");
    var v = document.createTextNode(data[k]);
    td.appendChild(v);
    tr.appendChild(td);
  }
  tableBody.appendChild(tr);
}



function appendToTableRow(tableRow, data, customClasses, customAttrib) {
  var td = document.createElement("td");
  for (var customClass of customClasses) {
    td.classList.add(customClass);
  }
  for (var customAttrib of customAttrib) {
    td.setAttribute(customAttrib.name, customAttrib.value); 
  }
  var v = document.createTextNode(data);
  td.appendChild(v);
  tableRow.appendChild(td);
}



(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['info'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "checked=\"checked\"";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div>\n  <div>\n    <h1 id=\"modal-info-title\" class=\"tagline\">OPF - OSM Phone Formatter</h1>\n    <p>\n      Easily fix the formatting of phone and fax numbers on OpenStreetMap<br>\n      Beta - version <span id=\"version\">"
    + container.escapeExpression(((helper = (helper = helpers.version || (depth0 != null ? depth0.version : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"version","hash":{},"data":data}) : helper)))
    + "</span>\n    </p>\n\n    <p>When you refresh the map (using the topright rotating arrows button), markers appear. These markers indicate an OSM element with one or more number tags like \"phone=\" or \"contact:fax=\".</p>\n    <p>A <span style=\"color: #37A7D9\">blue</span> marker means that all telephone and fax numbers of that OSM element should be formatted correctly.</p>\n    <p>An <span style=\"color: #F59630\">orange</span> one means OPF found a number that wasn't formatted correctly, click it to check out what changed.</p>\n    <p>A <span style=\"color: #72AF26\">green</span> one means you comfirmed that all numbers of that marker are correct, this marker will be included in the final upload.</p>\n    <p>A <span style=\"color: #D53E2A\">red</span> marker should normally not appear on the map, it means OPF had trouble parsing a number.</p>\n    <p>When you are ready formatting numbers in an area, click the upload (arrow up) button in the topright.</p>\n    <br>\n    <p>If you want you can still use the <a href=\"/old.html\">old version of OPF</a></p>\n    <p>Report problems or contribute to this tool on <a href=\"https://github.com/ubipo/opf\" target=\"_blank\">github</a></p>\n  </div>\n  <footer class=\"modal-footer\">\n    <p>\n      <input id=\"dsa-infoModal\" type=\"checkbox\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.dsaInfoModal : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n      <label for=\"dsa-infoModal\">Don't show again</label>\n    </p>\n    <button class=\"styled-btn\" data-micromodal-close aria-label=\"Close this dialog window\">Start</button>\n  </footer>\n</div>";
},"useData":true});
templates['popup'] = template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression, alias5=container.lambda;

  return "    <h3 class=\"\">"
    + alias4(((helper = (helper = helpers.key || (depth0 != null ? depth0.key : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"key","hash":{},"data":data}) : helper)))
    + "</h3>\n    <table style=\"width:100%\">\n      <tr>\n        <th>Original:</td>\n        <td>"
    + alias4(((helper = (helper = helpers.original || (depth0 != null ? depth0.original : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"original","hash":{},"data":data}) : helper)))
    + "</td>\n        <td rowspan=\"3\">\n          <input id=\"popup-"
    + alias4(alias5((depths[1] != null ? depths[1].leafletId : depths[1]), depth0))
    + "-cb-"
    + alias4(((helper = (helper = helpers.key || (depth0 != null ? depth0.key : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"key","hash":{},"data":data}) : helper)))
    + "\" class=\"gillam-cb-input\" type=\"checkbox\"\n          "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.checked : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n          "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.changed : depth0),{"name":"unless","hash":{},"fn":container.program(4, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "/>\n          <label for=\"popup-"
    + alias4(alias5((depths[1] != null ? depths[1].leafletId : depths[1]), depth0))
    + "-cb-"
    + alias4(((helper = (helper = helpers.key || (depth0 != null ? depth0.key : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"key","hash":{},"data":data}) : helper)))
    + "\" class=\"gillam-cb\"></label> \n        </td>\n      </tr>\n      <tr>\n        <th>Formatted:</td>\n        <td><div class=\"popup-formatted\" id=\"popup-"
    + alias4(alias5((depths[1] != null ? depths[1].leafletId : depths[1]), depth0))
    + "-formatted-"
    + alias4(((helper = (helper = helpers.key || (depth0 != null ? depth0.key : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"key","hash":{},"data":data}) : helper)))
    + "\" contenteditable=\"true\">"
    + alias4(((helper = (helper = helpers.formatted || (depth0 != null ? depth0.formatted : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"formatted","hash":{},"data":data}) : helper)))
    + "</div></td>\n      </tr>\n    </table>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "checked=\"checked\"";
},"4":function(container,depth0,helpers,partials,data) {
    return "disabled=\"disabled\"";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.escapeExpression, alias3=container.lambda;

  return "<div class=\"l-popup\">\n  <h2>"
    + alias2(((helper = (helper = helpers.osmTypecapitalized || (depth0 != null ? depth0.osmTypecapitalized : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"osmTypecapitalized","hash":{},"data":data}) : helper)))
    + " "
    + alias2(alias3(((stack1 = (depth0 != null ? depth0.osmElem : depth0)) != null ? stack1.id : stack1), depth0))
    + "</h2>\n  <p>\n    "
    + alias2(alias3(((stack1 = (depth0 != null ? depth0.opfElem : depth0)) != null ? stack1.name : stack1), depth0))
    + "\n  </p>\n"
    + ((stack1 = helpers.each.call(alias1,((stack1 = (depth0 != null ? depth0.opfElem : depth0)) != null ? stack1.numberTags : stack1),{"name":"each","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>";
},"useData":true,"useDepths":true});
templates['upload'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "<div>\n  <h1 id=\"modal-info-title\">Upload data</h1>\n  <p>You corrected <b>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.count : depth0)) != null ? stack1.tags : stack1), depth0))
    + "</b> tags, spread over <b>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.count : depth0)) != null ? stack1.elems : stack1), depth0))
    + "</b> OSM elements.</p>\n  <p>\n    <button id=\"gen-osm-change\" class=\"styled-btn\">Download OsmChange file</button>\n    <a id=\"osm-change-dl\"></a>\n  </p>\n  <p>\n    <span>\n      Automatic uploads do not work yet.\n      You can use <a href=\"https://wiki.openstreetmap.org/wiki/Upload.py\">upload.py</a> in the meantime.\n    </span>\n  </p>\n</div>";
},"useData":true});
})();
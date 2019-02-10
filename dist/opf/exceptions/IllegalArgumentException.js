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
var IllegalArgumentException = /** @class */ (function (_super) {
    __extends(IllegalArgumentException, _super);
    function IllegalArgumentException(argument, value, condition) {
        var _this = this;
        var msg = "<" + argument + "> " + condition + " | actual: " + value.toString();
        _this = _super.call(this, msg) || this;
        _this.argument = argument;
        _this.value = value;
        _this.condition = condition;
        _this.msg = msg;
        _this.name = 'IllegalArgumentException';
        return _this;
    }
    return IllegalArgumentException;
}(Error));
export default IllegalArgumentException;
//# sourceMappingURL=IllegalArgumentException.js.map
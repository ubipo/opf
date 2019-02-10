import IllegalArgumentException from "../exceptions/IllegalArgumentException";
export function Check(argument, value, checker) {
    var err = checker(value);
    if (err !== null)
        throw new IllegalArgumentException(argument, value, err);
}
//# sourceMappingURL=Check.js.map
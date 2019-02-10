import IllegalArgumentException from "../exceptions/IllegalArgumentException";

export function Check<T>(argument: string, value: T, checker: (value: T) => string|null) {
  let err = checker(value);
  if (err !== null)
    throw new IllegalArgumentException(argument, value, err);
}
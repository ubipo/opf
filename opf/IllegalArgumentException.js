define(function () {
  class IllegalArgumentException extends Error {
    constructor(argument, message) {
      super(`Illegal ${argument}: ${message}`);
      this.argument = argument;
    }
  }

  return IllegalArgumentException;
});

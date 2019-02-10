export default class IllegalArgumentException extends Error {
  argument: string;
  value: any;
  condition: string;
  msg: string;

  constructor(argument: string, value: any, condition: string) {
    let msg = `<${argument}> ${condition} | actual: ${value.toString()}`;
    super(msg);

    this.argument = argument;
    this.value = value;
    this.condition = condition;
    this.msg = msg;

    this.name = 'IllegalArgumentException';
  }
}
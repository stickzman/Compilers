class Token {
  public next: Token;

  constructor(public name: string, public value?) {}

  public toString(): string {
    if (this.value === undefined) {
      return this.name;
    } else {
      return this.name, this.value;
    }
  }
}

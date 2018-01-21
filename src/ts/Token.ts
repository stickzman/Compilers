class Token {
  public next: Token;

  constructor(public name: string, public value?) {}

  public toString(): string {
    return this.name;
  }
}

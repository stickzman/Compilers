function tokenizeInput() {
  let sourceElem = <HTMLInputElement>document.getElementById("source");
  let source = sourceElem.value;

  //Begin generating tokens from source code
  getTokens(source);
}

function getTokens(source: string): Token[] {
  if (source.length === 0) return [];
  let token: Token;
  let otherTokens: Token[];
  switch (source.charAt(0)) {
    case '{':
      token = new Token("LBRACE");
      //Get the rest of the tokens recursively
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case '}':
      token = new Token("RBRACE");
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case '(':
      token = new Token("LPAREN");
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case ')':
      token = new Token("RPAREN");
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case '$':
      token = new Token("EOP");
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case '/':
      if (source.charAt(1) === '*') {
        //Skip to end of comment
        let endOfCmt = false;
        let i = 1;
        while (!endOfCmt) {
          i++;
          if (i >= source.length) return []; //Reached end of file
          if (source.charAt(i) === '*' && source.charAt(i+1) === '/') {
            //Found end of comment
            endOfCmt = true;
            i += 2;
          }
        }
        return getTokens(source.substring(i));
      }
    default:
      return getTokens(source.substring(1));
  }
}

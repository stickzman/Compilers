function tokenizeInput() {
  let sourceElem = <HTMLInputElement>document.getElementById("source");
  let source = sourceElem.value;

  Log.level = LogPri.VERBOSE;
  Log.clear();

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
      Log.print("LEXER: '{'	-->	[LBRACE]");
      //Get the rest of the tokens recursively
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case '}':
      token = new Token("RBRACE");
      Log.print("LEXER: '}'	-->	[RBRACE]");
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case '(':
      token = new Token("LPAREN");
      Log.print("LEXER: '('	-->	[LPAREN]");
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case ')':
      token = new Token("RPAREN");
      Log.print("LEXER: ')'	-->	[RPAREN]");
      otherTokens = getTokens(source.substring(1));
      return [token].concat(otherTokens);
    case '$':
      token = new Token("EOP");
      Log.print("LEXER: '$'	-->	[EOP]");
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
    case ' ':
      //Skip whitespace
      return getTokens(source.substring(1));
    case '\t':
      //Skip whitespace
      return getTokens(source.substring(1));
    case '\n':
      //Skip whitespace
      return getTokens(source.substring(1));
    default:
      Log.print("LEXER: ERROR: Unidentified token '"
                  + source.charAt(0) + "' encountered");
      return getTokens(source.substring(1));
  }
}

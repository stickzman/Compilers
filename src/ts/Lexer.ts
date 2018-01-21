function tokenizeInput() {
  let sourceElem = <HTMLInputElement>document.getElementById("source");
  let source = sourceElem.value;

  Log.clear();

  //Begin generating tokens from source code
  let firstTokenPointer = getTokens(source);
}

function getTokens(source: string, last: Token = new Token("")): Token {
  if (source.length <= 0) {
    if (last.name !== "EOP") {
      Log.print("LEXER: WARNING: Missing EOP character '$'", LogPri.WARNING);
      let token = new Token("EOP");
      Log.print("LEXER: '$'	-->	[EOP]");
      last.next = token;
      return token;
    }
    return;
  }
  let token: Token;
  let otherTokens: Token[];
  switch (source.charAt(0)) {
    case '{':
      token = new Token("LBRACE");
      last.next = token;
      Log.print("LEXER: '{'	-->	[LBRACE]");
      //Get the rest of the tokens recursively
      getTokens(source.substring(1), token);
      return token;
    case '}':
      token = new Token("RBRACE");
      last.next = token;
      Log.print("LEXER: '}'	-->	[RBRACE]");
      getTokens(source.substring(1), token);
      return token;
    case '(':
      token = new Token("LPAREN");
      last.next = token;
      Log.print("LEXER: '('	-->	[LPAREN]");
      getTokens(source.substring(1), token);
      return token;
    case ')':
      token = new Token("RPAREN");
      last.next = token;
      Log.print("LEXER: ')'	-->	[RPAREN]");
      getTokens(source.substring(1), token);
      return token;
    case '$':
      token = new Token("EOP");
      last.next = token;
      Log.print("LEXER: '$'	-->	[EOP]");
      getTokens(source.substring(1), token);
      return token;
    case '"':
      token = new Token("QUOTE");
      last.next = token;
      Log.print("LEXER: '\"'	-->	[QUOTE]");
      getTokens(source.substring(1), token);
      return token;
    case '+':
      token = new Token("INTOP");
      last.next = token;
      Log.print("LEXER: '+'	-->	[INTOP]");
      getTokens(source.substring(1), token);
      return token;
    case '=':
      //Lookahead to determine token
      if (source.charAt(1) === '=') {
        token = new Token("EQUAL");
        last.next = token;
        Log.print("LEXER: '=='	-->	[EQUAL]");
        getTokens(source.substring(2), token);
        return token;
      } else {
        token = new Token("ASSIGN");
        last.next = token;
        Log.print("LEXER: '='	-->	[ASSIGN]");
        getTokens(source.substring(1), token);
        return token;
      }
    case '!':
      //Lookahead to determine token
      if (source.charAt(1) === '=') {
        token = new Token("NOTEQUAL");
        last.next = token;
        Log.print("LEXER: '!='	-->	[NOTEQUAL]");
        getTokens(source.substring(1), token);
        return token;
      } else {
        Log.print("LEXER: ERROR: Unidentified token '"
                    + source.charAt(0) + "' encountered");
        return getTokens(source.substring(1), last);
      }
    case '/':
      if (source.charAt(1) === '*') {
        //Skip to end of comment
        let endOfCmt = false;
        let i = 1;
        while (!endOfCmt) {
          i++;
          if (i >= source.length) {
            Log.print("LEXER: WARNING: Unclosed comment block", LogPri.WARNING);
            return getTokens(source.substring(i), last);
          } //Reached end of file
          if (source.charAt(i) === '*' && source.charAt(i+1) === '/') {
            //Found end of comment
            endOfCmt = true;
            i += 2;
          }
        }
        return getTokens(source.substring(i), last);
      }
    case ' ':
      //Skip whitespace
      return getTokens(source.substring(1), last);
    case '\t':
      //Skip whitespace
      return getTokens(source.substring(1), last);
    case '\n':
      //Skip whitespace
      return getTokens(source.substring(1), last);
    default:
      Log.print("LEXER: ERROR: Unidentified token '"
                  + source.charAt(0) + "' encountered");
      return getTokens(source.substring(1), last);
  }
}

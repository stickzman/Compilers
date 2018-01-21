function tokenizeInput() {
  let sourceElem = <HTMLInputElement>document.getElementById("source");
  let source = sourceElem.value;

  Log.clear();

  //Begin generating tokens from source code
  let first = getTokens(source);
}

function getTokens(source: string, last?: Token): Token {
  if (source.length <= 0) {
    if (last === undefined || last.name === "EOP") return;
    Log.print("LEXER: WARNING: Missing EOP character '$'", LogPri.WARNING);
    return createToken("$", "EOP", last);
  }
  let token: Token;
  let otherTokens: Token[];
  switch (source.charAt(0)) {
    case '{':
      token = createToken("{", "LBRACE", last);
      //Get the rest of the tokens recursively
      getTokens(source.substring(1), token);
      break;
    case '}':
      token = createToken("}", "RBRACE", last);
      getTokens(source.substring(1), token);
      break;
    case '(':
      token = createToken("(", "LPAREN", last);
      getTokens(source.substring(1), token);
      break;
    case ')':
      token = createToken(")", "RPAREN", last);
      getTokens(source.substring(1), token);
      break;
    case '$':
      token = createToken("$", "EOP", last);
      getTokens(source.substring(1), token);
      break;
    case '"':
      token = createToken("\"", "QUOTE", last);
      getTokens(source.substring(1), token);
      break;
    case '+':
      token = createToken("+", "INTOP", last);
      getTokens(source.substring(1), token);
      break;
    case '=':
      //Lookahead to determine token
      if (source.charAt(1) === '=') {
      token = createToken("==", "EQUAL", last);
      getTokens(source.substring(2), token);
      break;
      } else {
        token = createToken("=", "ASSIGN", last);
        getTokens(source.substring(1), token);
        break;
      }
    case '!':
      //Lookahead to determine token
      if (source.charAt(1) === '=') {
        token = createToken("!=", "NOTEQUAL", last);
        getTokens(source.substring(2), token);
        break;
      } else {
        Log.print("LEXER: ERROR: Unidentified token '"
                    + source.charAt(0) + "' encountered", LogPri.ERROR);
        getTokens(source.substring(1), last);
        break;
      }
    case '/':
      if (source.charAt(1) === '*') {
        //Skip to end of comment
        let endOfCmt = false;
        let i = 1;
        while (!endOfCmt) {
          i++;
          if (i >= source.length) {
            //Reached end of file
            Log.print("LEXER: WARNING: Unclosed comment block", LogPri.WARNING);
            getTokens(source.substring(i), last);
            break;
          }
          if (source.substr(i, 2) === "*/") {
            //Found end of comment
            endOfCmt = true;
            i += 2;
          }
        }
        getTokens(source.substring(i), last);
        break;
      }
    case ' ':
      //Skip whitespace
      getTokens(source.substring(1), last);
      break;
    case '\t':
      //Skip whitespace
      getTokens(source.substring(1), last);
      break;
    case '\n':
      //Skip whitespace
      getTokens(source.substring(1), last);
      break;
    default:
      Log.print("LEXER: ERROR: Unidentified token '"
                  + source.charAt(0) + "' encountered", LogPri.ERROR);
      getTokens(source.substring(1), last);
      break;
  }
  return token;
}

function createToken(chars: string, name: string, last?:Token) {
  let token = new Token(name);
  if (last !== undefined) last.next = token;
  Log.print(`LEXER: '${chars}'	-->	[${name}]`);
  return token;
}

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
  let lowerAlphaRE = /^[a-z]/;
  let digitRE = /^[0-9]/;

  //Look for all multi-character tokens
  if (source.substr(0, 5) === "print") {
    token = createToken("print", "PRINT", last);
    getTokens(source.substring(5), token);
  } else if (source.substr(0, 5) === "while") {
    token = createToken("while", "WHILE", last);
    getTokens(source.substring(5), token);
  } else if (source.substr(0, 2) === "if") {
    token = createToken("if", "IF", last);
    getTokens(source.substring(2), token);
  } else if (source.substr(0, 3) === "int") {
    token = createToken("int", "INT", last);
    getTokens(source.substring(3), token);
  } else if (source.substr(0, 6) === "string") {
    token = createToken("string", "STRING", last);
    getTokens(source.substring(6), token);
  } else if (source.substr(0, 7) === "boolean") {
    token = createToken("boolean", "BOOLEAN", last);
    getTokens(source.substring(7), token);
  } else if (source.substr(0, 5) === "false") {
    token = createToken("false", "FALSE", last);
    getTokens(source.substring(5), token);
  } else if (source.substr(0, 4) === "true") {
    token = createToken("true", "TRUE", last);
    getTokens(source.substring(4), token);
  } else if (source.substr(0, 2) === "==") {
    token = createToken("==", "EQUAL", last);
    getTokens(source.substring(2), token);
  } else if (source.substr(0, 2) === "!=") {
    token = createToken("!=", "NOTEQUAL", last);
    getTokens(source.substring(2), token);
  } else if (source.substr(0, 2) === "/*") {
    //Skip to end of comment
    let i = 1;
    while (i < source.length) {
      i++;
      if (i >= source.length) {
        //Reached end of file
        Log.print("LEXER: WARNING: Unclosed comment block", LogPri.WARNING);
        getTokens(source.substring(i), last);
        break;
      }
      if (source.substr(i, 2) === "*/") {
        //Found end of comment
        i += 2;
        break;
      }
    }
    getTokens(source.substring(i), last);
    return;
  } else if (lowerAlphaRE.test(source)) {
    //The first character is a lowercase letter
    token = createToken(source.charAt(0), "ID", last, source.charAt(0));
    getTokens(source.substring(1), token);
  } else if (digitRE.test(source)) {
    //The first character is a digit
    let num = Number(source.charAt(0));
    token = createToken(source.charAt(0), "DIGIT", last, num);
    getTokens(source.substring(1), token);
  }

  if (token !== undefined) return token;


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
      let i = 0;
      do {
        i++;
        if (i >= source.length) {
          Log.print("LEXER: WARNING: Unclosed String literal", LogPri.WARNING);
          let str = source.substr(0, i) + "\"";
          token = createToken(str, "STRLIT", last, str);
          break;
        }
        if (source.charAt(i) === "\"") {
          let str = source.substr(0, i+1);
          token = createToken(str, "STRLIT", last, str);
          break;
        }
        if (source.charAt(i) !== ' ' && !lowerAlphaRE.test(source.charAt(i))) {
          Log.print("LEXER: ERROR: Unexpected token '" + source.substr(0, i + 1) + "' encountered.", LogPri.ERROR);
          return;
        }
      } while (i < source.length)
      getTokens(source.substring(i+1), token);
      break;
    case '+':
      token = createToken("+", "INTOP", last);
      getTokens(source.substring(1), token);
      break;
    case '=':
      token = createToken("=", "ASSIGN", last);
      getTokens(source.substring(1), token);
      break;
    case ' ':
      //Skip whitespace
      getTokens(source.substring(1), last);
      break;
    case '\s':
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
      break;
  }

  return token;
}

function createToken(chars: string, name: string, last?: Token, value?) {
  let token: Token;
  if (value === undefined) {
    token = new Token(name);
  } else {
    token = new Token(name, value);
  }
  if (last !== undefined) last.next = token;
  Log.print(`LEXER: '${chars}' --> [${name}]`);
  return token;
}

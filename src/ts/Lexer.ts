function tokenizeInput() {
  //Get source code
  let source = (<HTMLInputElement>document.getElementById("source")).value;

  Log.clear();
  let lineNum: number = 1;
  let charNum: number = 1;
  let numWarns: number = 0;
  let numErrors: number = 0;

  //Begin generating tokens from source code
  let first = getTokens(source);

  Log.print("");
  Log.print(`Lexer completed with ${numWarns} warnings and ${numErrors} errors.`);


  function getTokens(source: string, last?: Token): Token {
    if (source.length <= 0) {
      if (last === undefined || last.name === "EOP") {
        return;
      }
      numWarns++;
      Log.print("LEXER: WARNING: Missing EOP character '$' on line " + lineNum
        + ". Adding [EOP]...", LogPri.WARNING);
      return createToken("$", "EOP", last);
    }

    let token: Token;

    //Look for all multi-character tokens using RegExp
    if (/^print/.test(source)) {
      token = createToken("print", "PRINT", last);
      getTokens(source.substring(5), token);
    } else if (/^while/.test(source)) {
      token = createToken("while", "WHILE", last);
      getTokens(source.substring(5), token);
    } else if (/^if/.test(source)) {
      token = createToken("if", "IF", last);
      getTokens(source.substring(2), token);
    } else if (/^int/.test(source)) {
      token = createToken("int", "INT", last);
      getTokens(source.substring(3), token);
    } else if (/^string/.test(source)) {
      token = createToken("string", "STRING", last);
      getTokens(source.substring(6), token);
    } else if (/^boolean/.test(source)) {
      token = createToken("boolean", "BOOLEAN", last);
      getTokens(source.substring(7), token);
    } else if (/^false/.test(source)) {
      token = createToken("false", "FALSE", last);
      getTokens(source.substring(5), token);
    } else if (/^true/.test(source)) {
      token = createToken("true", "TRUE", last);
      getTokens(source.substring(4), token);
    } else if (/^==/.test(source)) {
      token = createToken("==", "EQUAL", last);
      getTokens(source.substring(2), token);
    } else if (/^!=/.test(source)) {
      token = createToken("!=", "NOTEQUAL", last);
      getTokens(source.substring(2), token);
    } else if (/^\/\*/.test(source)) {
      //Skip to end of comment
      let index = source.indexOf("*/");
      if (index === -1) {
        //Reached end of file

        //Add number of lines in comment to total lineNum
        lineNum += source.split('\n').length-1;

        numWarns++;
        Log.print("LEXER: WARNING: Unclosed comment block on line " + lineNum,
          LogPri.WARNING);
        return getTokens(source.substring(source.length), last);
      } else {
        //Add number of lines in comment to total lineNum
        lineNum += source.substr(0, index+2).split('\n').length-1;
        return getTokens(source.substring(index+2));
      }
    } else if (/^\*\//.test(source)) {
      Log.print("LEXER: ERROR: Unmatched '*/' encountered on line " + lineNum
        + ". Did you mean '/*'?", LogPri.ERROR);
      getTokens(source.substring(2), last);
    } else if (/^[a-z]/.test(source)) {
      //The first character is a lowercase letter
      token = createToken(source.charAt(0), "ID", last, source.charAt(0));
      getTokens(source.substring(1), token);
    } else if (/^[0-9]/.test(source)) {
      //The first character is a digit
      let num = Number(source.charAt(0));
      token = createToken(source.charAt(0), "DIGIT", last, num);
      getTokens(source.substring(1), token);
    }

    if (token !== undefined) {
      return token;
    }

    switch (source.charAt(0)) {
      case '{':
        token = createToken("{", "LBRACE", last);
        //Get the rest of the tokens recursively
        getTokens(source.substring(1), token);
        return token;
      case '}':
        token = createToken("}", "RBRACE", last);
        getTokens(source.substring(1), token);
        return token;
      case '(':
        token = createToken("(", "LPAREN", last);
        getTokens(source.substring(1), token);
        return token;
      case ')':
        token = createToken(")", "RPAREN", last);
        getTokens(source.substring(1), token);
        return token;
      case '$':
        token = createToken("$", "EOP", last);
        getTokens(source.substring(1), token);
        return token;
      case '"':
        //Find entire string literal
        let str;
        let index = source.indexOf("\"", 1);
        if (index === -1) {
          numWarns++;
          Log.print("LEXER: WARNING: Unclosed String literal on line " + lineNum
            + ". Adding closing quote...", LogPri.WARNING);
          str = source.substr(0) + "\"";
          index = source.length-1;
        } else {
          str = source.substr(0, index+1);
        }
        if (/^[a-z" ]*$/.test(str)) {
          //The string literal contains only valid characters
          token = createToken(str, "STRLIT", last, str);
          getTokens(source.substring(index+1), token);
        } else {
          //The string contains invalid charaters
          numErrors++;
          Log.print("LEXER: ERROR: String literal '" + str +
            "' on line " + lineNum + " contains invalid characters. " +
            "Strings can contain lowercase letters and spaces.", LogPri.ERROR);
          return getTokens(source.substring(index+1), token);
        }
        return token;
      case '+':
        token = createToken("+", "INTOP", last);
        getTokens(source.substring(1), token);
        return token;
      case '=':
        token = createToken("=", "ASSIGN", last);
        getTokens(source.substring(1), token);
        return token;
      case ' ':
        //Skip whitespace
        return getTokens(source.substring(1), last);
      case '\s':
        //Skip whitespace
        return getTokens(source.substring(1), last);
      case '\t':
        //Skip whitespace
        return getTokens(source.substring(1), last);
      case '\n':
        lineNum++;
        charNum = 1;
        //Skip whitespace
        return getTokens(source.substring(1), last);
      case '\r':
        lineNum++;
        charNum = 1;
        //Skip whitespace
        return getTokens(source.substring(1), last);
      default:
        numErrors++;
        Log.print("LEXER: ERROR: Unidentified token '" + source.charAt(0) +
          "' encountered on line " + lineNum, LogPri.ERROR);
        return getTokens(source.substring(1), last);
    }
  }

  function createToken(chars: string, name: string, last?: Token, value?) {
    let token: Token;
    if (value === undefined) {
      token = new Token(name);
    } else {
      token = new Token(name, value);
    }
    if (last !== undefined) {
      last.next = token;
    }
    Log.print(`LEXER: '${chars}' --> [${name}] at line:${lineNum} col:${charNum}`);
    charNum += chars.length;
    return token;
  }

}

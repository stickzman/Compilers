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

  if (!Log.isClear()) {
    Log.print("");
  }
  Log.print(`Lexer completed with ${numWarns} warnings and ${numErrors} errors.`);


  function getTokens(source: string, last?: Token): Token {
    if (source.length <= 0) {
      if (last === undefined || last.name === "EOP") {
        return null;
      }
      numWarns++;
      Log.LexMsg("Missing EOP character '$'", lineNum, charNum,
        LogPri.WARNING, "Adding [EOP]...");
      return createToken("$", "EOP", last);
    }

    let token: Token;

    //Look for all multi-character tokens using RegExp
    if (/^print/.test(source)) {
      token = createToken("print", "PRINT", last);
      charNum += 5;
      getTokens(source.substring(5), token);
    } else if (/^while/.test(source)) {
      token = createToken("while", "WHILE", last);
      charNum += 5;
      getTokens(source.substring(5), token);
    } else if (/^if/.test(source)) {
      token = createToken("if", "IF", last);
      charNum += 2;
      getTokens(source.substring(2), token);
    } else if (/^int/.test(source)) {
      token = createToken("int", "INT", last);
      charNum += 3;
      getTokens(source.substring(3), token);
    } else if (/^string/.test(source)) {
      token = createToken("string", "STRING", last);
      charNum += 6;
      getTokens(source.substring(6), token);
    } else if (/^boolean/.test(source)) {
      token = createToken("boolean", "BOOLEAN", last);
      charNum += 7;
      getTokens(source.substring(7), token);
    } else if (/^false/.test(source)) {
      token = createToken("false", "FALSE", last);
      charNum += 5;
      getTokens(source.substring(5), token);
    } else if (/^true/.test(source)) {
      token = createToken("true", "TRUE", last);
      charNum += 4;
      getTokens(source.substring(4), token);
    } else if (/^==/.test(source)) {
      token = createToken("==", "EQUAL", last);
      charNum += 2;
      getTokens(source.substring(2), token);
    } else if (/^!=/.test(source)) {
      token = createToken("!=", "NOTEQUAL", last);
      charNum += 2;
      getTokens(source.substring(2), token);
    } else if (/^\/\*/.test(source)) {
      //Skip to end of comment
      let closeIndex = source.indexOf("*/");
      let cmt: string;
      if (closeIndex === -1) {
        //Reached end of file
        numWarns++;
        Log.LexMsg("Unclosed comment block", lineNum, charNum, LogPri.WARNING);
        cmt = source;
      } else {
        cmt = source.substr(0, closeIndex+2);
      }
      let numLines = cmt.split('\n').length-1; //Number of lines in the comment
      //Add number of lines in comment to total lineNum
      lineNum += numLines;
      let newLineIndex = cmt.lastIndexOf('\n');
      if (newLineIndex !== -1) {
        //Set charNum to the number of characters on the last line (including "*/")
        charNum = cmt.length - newLineIndex;
      } else {
        //If the comment is one line, add it to charNum
        charNum += cmt.length;
      }
      if (closeIndex === -1) {
        token = getTokens(source.substring(source.length), last);
      } else {
        token = getTokens(source.substring(cmt.length), last);
      }
    } else if (/^\*\//.test(source)) {
      Log.LexMsg("Unmatched '*/' encountered", lineNum, charNum,
        LogPri.ERROR, "Did you mean '/*'?");
      charNum += 2;
      token = getTokens(source.substring(2), last);
    } else if (/^[a-z]/.test(source)) {
      //The first character is a lowercase letter
      token = createToken(source.charAt(0), "ID", last, source.charAt(0));
      charNum += 1;
      getTokens(source.substring(1), token);
    } else if (/^[0-9]/.test(source)) {
      //The first character is a digit
      let num = Number(source.charAt(0));
      token = createToken(source.charAt(0), "DIGIT", last, num);
      charNum += 1;
      getTokens(source.substring(1), token);
    }

    if (token !== undefined) {
      return token;
    }

    switch (source.charAt(0)) {
      case '{':
        token = createToken("{", "LBRACE", last);
        //Get the rest of the tokens recursively
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case '}':
        token = createToken("}", "RBRACE", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case '(':
        token = createToken("(", "LPAREN", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case ')':
        token = createToken(")", "RPAREN", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case '$':
        token = createToken("$", "EOP", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case '"':
        //Find entire string literal
        let str;
        let index = source.indexOf("\"", 1);
        if (index === -1) {
          numWarns++;
          Log.LexMsg("Unclosed String literal", lineNum, charNum, LogPri.WARNING,
            "Adding closing quote...");
          str = source.substr(0) + "\"";
          index = source.length-1;
        } else {
          str = source.substr(0, index+1);
        }
        if (/^[a-z" ]*$/.test(str)) {
          //The string literal contains only valid characters
          token = createToken(str, "STRLIT", last, str);
          charNum += str.length;
          getTokens(source.substring(index+1), token);
          return token;
        } else {
          //The string contains invalid charaters
          numErrors++;
          Log.LexMsg("String literal '" + str + "' contains invalid characters",
            lineNum, charNum, LogPri.ERROR,
            "Strings can contain lowercase letters and spaces.");
          charNum += str.length;
          return getTokens(source.substring(index+1), token);
        }
      case '+':
        token = createToken("+", "INTOP", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case '=':
        token = createToken("=", "ASSIGN", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case ' ':
        //Skip whitespace
        charNum += 1;
        return getTokens(source.substring(1), last);
      case '\s':
        //Skip whitespace
        charNum += 1;
        return getTokens(source.substring(1), last);
      case '\t':
        //Skip whitespace
        charNum += 1;
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
        Log.LexMsg("Unidentified token '" + source.charAt(0) + "'",
          lineNum, charNum, LogPri.ERROR);
        return getTokens(source.substring(1), last);
    }
  }

  function createToken(chars: string, name: string, last: Token, value?) {
    let token: Token;
    token = new Token(name, lineNum, charNum, value);
    if (last !== undefined) {
      last.next = token;
      token.prev = last;
    }
    Log.LexMsg(`'${chars}' --> [${name}]`, lineNum, charNum, LogPri.VERBOSE);
    return token;
  }

}

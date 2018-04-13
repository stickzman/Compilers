/// <reference path="Helper.ts"/>
function lex(source: string, lineNum: number, charNum: number, pgrmNum: number): [Token, number, number] {
  const COL_BEGIN = 0;

  let numWarns: number = 0;
  let numErrors: number = 0;

  //Begin generating tokens from source code
  let first = getTokens(source);

  Log.breakLine();
  Log.print(`Lexed Program ${pgrmNum} with ${numWarns} warnings and ${numErrors} errors.`);

  if (numErrors === 0) {
    return [first, lineNum, charNum]; //Return the completed linked list
  } else {
    return [null, lineNum, charNum]; //Return nothing if any errors occurred
  }


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
      token = createToken("false", "BOOLVAL", last);
      charNum += 5;
      getTokens(source.substring(5), token);
    } else if (/^true/.test(source)) {
      token = createToken("true", "BOOLVAL", last);
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
      let numLines = countLines(cmt); //Number of lines in the comment
      //Add number of lines in comment to total lineNum
      lineNum += numLines;
      //Get the index of the last new line character
      let newLineIndex = lastIndexOfNewLine(cmt);
      if (newLineIndex === -1) {
        //If the comment is one line, add it to charNum
        charNum += cmt.length;
      } else {
        //Set charNum to the number of characters on the last line
        charNum = cmt.length - newLineIndex;
      }
      token = getTokens(source.substring(cmt.length), last);
    } else if (/^\*\//.test(source)) {
      Log.LexMsg("Unmatched '*/' encountered", lineNum, charNum,
        LogPri.ERROR, "Did you mean '/*'?");
      return null;
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
      case '~':
        token = createToken("~", "LEN", last);
        //Get the rest of the tokens recursively
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case ',':
        token = createToken(",", "COMMA", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case '[':
        token = createToken("[", "LBRACK", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case ']':
        token = createToken("]", "RBRACK", last);
        charNum += 1;
        getTokens(source.substring(1), token);
        return token;
      case '{':
        token = createToken("{", "LBRACE", last);
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
        token = createToken('"', "QUOTE", last);
        charNum++;
        //Find list of characters inside string
        let charList;
        let endInd = source.indexOf('"', 1);
        if (endInd === -1) {
          numWarns++;
          Log.LexMsg("Unclosed String literal", lineNum, charNum, LogPri.WARNING);
          charList = source.substr(1);
        } else {
          charList = source.substring(1, endInd);
        }
        //Count line breaks in any comments
        let numLines = countLines(charList);
        //Adjust colNumber according to possible comment new numLines
        let numCols = charList.length;
        if (numLines > 0) {
          numCols -= lastIndexOfNewLine(charList) + 1;
        }
        let totalLen = charList.length; //Length of charList b4 removing comments
        //Remove all comments from the character list
        charList = charList.replace(/\/\*(.|\n|\r)[^\*\/]*\*\//g, "");
        charList = charList.replace(/\/\*\*\//g, "") //Remove remaining "empty" comments
        let charTok: Token;
        if (/^[a-z ]*$/.test(charList)) {
          //If character list contains only valid tokens
          //wrap entire list in single token.
          charTok = createToken(charList, "CHARLIST", token, charList);
          lineNum += numLines;
          charNum += numCols;
        } else {
          numErrors++;
          Log.LexMsg("Character list '" + charList + "' contains invalid characters",
            lineNum, charNum, LogPri.ERROR,
            "It can only contain lowercase letters and spaces.");
          return token;
        }
        if (endInd === -1) {
          getTokens(source.substring(totalLen+1), token);
        } else {
          let endQuote = createToken('"', "QUOTE", charTok);
          charNum++;
          getTokens(source.substring(totalLen+2), endQuote);
        }
        return token;
      case '+':
        token = createToken("+", "ADD", last);
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
        charNum = COL_BEGIN;
        //Skip whitespace
        return getTokens(source.substring(1), last);
      case '\r':
        lineNum++;
        charNum = COL_BEGIN;
        //Skip whitespace
        return getTokens(source.substring(1), last);
      default:
        numErrors++;
        Log.LexMsg("Undefined character '" + source.charAt(0) + "'",
          lineNum, charNum, LogPri.ERROR);
        return null;
    }
  }

  function createToken(chars: string, name: string, last: Token, value?) {
    let token: Token;
    token = new Token(name, chars, lineNum, charNum, value);
    if (last !== undefined) {
      last.next = token;
    }
    Log.LexMsg(`[${chars}] --> ${name}`, lineNum, charNum, LogPri.VERBOSE);
    return token;
  }

}

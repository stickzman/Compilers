function parse(token: Token, pgrmNum: number): TNode {
  let numWarns: number = 0;

  //Initial parsing of Program
  try {
    Log.ParseMsg("parse()");
    let root = new TNode("Program");
    parseBlock(root);
    match(["$"], root);

    //Display Concrete Syntax Tree
    Log.breakLine();
    Log.print("CST for Program " + pgrmNum + ":\n" + root.toString(), LogPri.VERBOSE);

    Log.breakLine();
    Log.print(`Parsed Program ${pgrmNum} with ${numWarns} warnings and 0 errors.`);
    //Return completed Concrete Syntax Tree
    return root;
  } catch (e) {
    if (e.name === "Parse_Error") {
      Log.print(e, LogPri.ERROR);
      Log.print("");
      Log.print(`Parsed Program ${pgrmNum} with ${numWarns} warnings and 1 errors.`);
      return null;
    } else {
      //If the error is not created by my parser, continue to throw it
      throw e;
    }
  }

  function parseBlock(parent: TNode) {
    Log.ParseMsg("parseBlock()");
    let node = branchNode("Block", parent);
    match(["{"], node);
    parseStatementList(node);
    match(["}"], node);
  }

  function parseStatementList(parent: TNode) {
    Log.ParseMsg("parseStatementList()");
    let node = branchNode("StatementList", parent);
    let possibleTerminals = ["PRINT", "ID", "INT", "STRING", "BOOLEAN", "WHILE",
                             "IF", "LBRACE"];
    if (possibleTerminals.indexOf(token.name) === -1) {
      if (token.symbol !== "}") {
        //StatementList does not contain valid statement and is not empty
        throw error(`Error found at line: ${token.line} col: ${token.col}. ` +
                    `Cannot start a Statement with '${token.symbol}'.`);
      }
    } else {
      //Lookahead found a valid token
      parseStatement(node);
      parseStatementList(node);
    }
  }

  function parseStatement(parent: TNode) {
    Log.ParseMsg("parseStatement()");
    let node = branchNode("Statement", parent);
    switch(token.name) {
      case "PRINT":
        parsePrintStatement(node);
        return;
      case "ID":
        parseAssignStatement(node);
        return;
      case "INT":
        parseVarDecl(node);
        return;
      case "STRING":
        parseVarDecl(node);
        return;
      case "BOOLEAN":
        parseVarDecl(node);
        return;
      case "WHILE":
        parseWhileStatement(node);
        return;
      case "IF":
        parseIfStatement(node);
        return;
      case "LBRACE":
        parseBlock(node);
        return;
      default:
        throw error(`Unexpected token '${token.symbol}' found at line: ${token.line} col: ${token.col}`);
    }
  }

  function parsePrintStatement(parent: TNode) {
    Log.ParseMsg("parsePrintStatement()");
    let node = branchNode("PrintStatement", parent);
    match(["print","("], node);
    parseExpr(node);
    match([")"], node);
  }

  function parseAssignStatement(parent: TNode) {
    Log.ParseMsg("parseAssignStatement()");
    let node = branchNode("AssignStatement", parent);
    let idNode = branchNode("ID", node);
    match(["ID"], idNode, false);
    match(["="], node);
    parseExpr(node);
  }

  function parseVarDecl(parent: TNode) {
    Log.ParseMsg("parseVarDecl()");
    let node = branchNode("VarDecl", parent);
    let type = token;
    let typeNode = parseType(node);
    if (token.name === "LBRACK") {
      let arrTypeNode = branchNode("isArray", typeNode);
      match(["[","]"], arrTypeNode);
    }
    let name = token;
    let idNode = branchNode("ID", node);
    match(["ID"], idNode, false);
    if (token.symbol === "=") {
      throw error(`Error found at line: ${token.line} col: ${token.col}. ` +
                  `Variable declaration and assignment cannot be in the same statement`);
    }
  }

  function parseType(parent: TNode): TNode {
    Log.ParseMsg("parseType()");
    let node = branchNode("Type", parent);
    switch (token.name) {
      case "INT":
        match(["int"], node);
        break;
      case "STRING":
        match(["string"], node);
        break;
      case "BOOLEAN":
        match(["boolean"], node);
        break;
      default:
        throw error(`Expected TYPE token, found ${token.name} at line: ${token.line} col: ${token.col}`);
    }
    return node;
  }

  function parseWhileStatement(parent: TNode) {
    Log.ParseMsg("parseWhileStatement()");
    let node = branchNode("WhileStatement", parent);
    match(["while"], node);
    parseBooleanExpr(node);
    parseBlock(node);
  }

  function parseIfStatement(parent: TNode) {
    Log.ParseMsg("parseIfStatement()");
    let node = branchNode("IfStatement", parent);
    match(["if"], node);
    parseBooleanExpr(node);
    parseBlock(node);
  }

  function parseExpr(parent: TNode) {
    Log.ParseMsg("parseExpr()");
    let node = branchNode("Expr", parent);
    switch (token.name) {
      case "DIGIT":
        parseIntExpr(node);
        return;
      case "QUOTE":
        parseStringExpr(node);
        return;
      case "LPAREN":
        parseBooleanExpr(node);
        return;
      case "BOOLVAL":
        parseBooleanExpr(node);
        return;
      case "LBRACK":
        parseArrayExpr(node);
        return;
      case "ID":
        if (token.next.name === "ADD") {
          throw error(`Variable '${token.symbol}' found at line: ${token.line} ` +
                      `col: ${token.col}. Variable identifiers can only be used ` +
                      `as the last element inside of an addition expression`);
        }
        let idNode = branchNode("ID", node);
        match(["ID"], idNode, false);
        return;
      default:
        throw error(`Expected Expr, found '${token.symbol}' at line: ${token.line} col: ${token.col}`);
    }
  }

  function parseArrayExpr(parent: TNode) {
    Log.ParseMsg("parseArrayExpr()");
    let node = branchNode("ArrayExpr", parent);
    match(["["], node);
    if (token.name === "LEN") {
      let lenNode = branchNode("Length", node);
      match(["LEN","DIGIT"], lenNode, false);
      match(["]"], node);
      return;
    }
    parseElemList(node);
    match(["]"], node);
  }

  function parseElemList(parent: TNode) {
    Log.ParseMsg("parseElemList()");
    let elemList = branchNode("ElemList", parent);
    if (token.symbol === "]") {
      return;
    }
    constrElemList();

    function constrElemList() {
      parseExpr(elemList);
      if (token.symbol === "]") {
        return;
      } else {
        match([","], elemList);
        constrElemList();
      }
    }
  }

  function parseStringExpr(parent: TNode) {
    Log.ParseMsg("parseStringExpr()");
    let node = branchNode("StringExpr", parent);
    match(["QUOTE", "CHARLIST", "QUOTE"], node, false);
    if (token.name === "ADD") {
      throw error(`Error on line: ${token.line} col: ${token.col}. String ` +
                  `concatenation is not supported. Addition symbol '+' can ` +
                  `only be used with single digits/variables`);
    }
  }

  function parseBooleanExpr(parent: TNode) {
    Log.ParseMsg("parseBooleanExpr()");
    let node = branchNode("BooleanExpr", parent);
    switch (token.symbol) {
      case "(":
        match(["("], node);
        parseExpr(node);
        parseBoolOp(node);
        parseExpr(node);
        match([")"], node);
        return;
      case "true":
        match(["true"], node);
        return;
      case "false":
        match(["false"], node);
        return;
      default:
        throw error(`Expected BooleanExpr, found '${token.symbol}' at line: ${token.line} col: ${token.col}`);
    }
  }

  function parseBoolOp(parent: TNode) {
    Log.ParseMsg("parseBoolOp()");
    let node = branchNode("BoolOp", parent);
    if (token.symbol === "==") {
      match(["=="], node);
    } else if (token.symbol === "!=") {
      match(["!="], node);
    } else {
      throw error(`Expected BoolOperation, found '${token.symbol}' at line: ${token.line} col: ${token.col}`);
    }
  }

  function parseIntExpr(parent: TNode) {
    Log.ParseMsg("parseIntExpr()");
    let node = branchNode("IntExpr", parent);
    match(["DIGIT"], node, false);
    if (token.symbol === "+") {
      match(["+"], node);
      parseExpr(node);
    }
  }

  function nextToken() {
    token = token.next;
  }

  //Create custom Error object
  function error(msg: string) {
    let e = new Error(msg);
    e.name = "Parse_Error";
    return e;
  }

  //Matches list of tokens by characters formatted as an array of strings.
  //Prints error if match not found.
  function match(tList: string[], parent: TNode, isSymbol: boolean = true) {
    let tokenSym;
    for (let char of tList) {
      tokenSym = (isSymbol) ? token.symbol : token.name;
      if (char === tokenSym) {
        parent.addChild(new TNode(token.symbol, token));
        nextToken();
      } else {
        throw error(`Expected '${char}' found '${tokenSym}'` +
          ` at line: ${token.line} col: ${token.col}.`);
      }
    }
  }
}

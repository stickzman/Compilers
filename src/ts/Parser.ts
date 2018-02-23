function parse(token: Token) {

  let numWarns = 0;
  let pgrmNum = 0;
  let CSTs = [];

  while (token !== undefined) {
    pgrmNum++;
    Log.breakLine();
    Log.print("Parsing Program " + pgrmNum + "...");
    //Initial parsing of Program
    try {
      Log.ParseMsg("parse()");
      let root = new TNode("Program");
      parseBlock(root);
      match(["$"], root);

      //Display results
      Log.breakLine();
      Log.print("CST for Program " + pgrmNum + ":", LogPri.VERBOSE);
      Log.print(root.toString(), LogPri.VERBOSE);

      //Add CST to end of array
      CSTs = CSTs.concat(root);
    } catch (e) {
      if (e.name === "Parse_Error") {
        Log.print(e, LogPri.ERROR);
        Log.print("");
        Log.print(`Parser completed with ${numWarns} warnings and 1 errors.`)
        return null;
      } else {
        //If the error is not created by my parser, continue to throw it
        throw e;
      }
    }
  }
  Log.print(`Parser completed with ${numWarns} warnings and 0 errors.`);
  //Return all completed Concrete Syntax Trees
  return CSTs;

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
    if (possibleTerminals.indexOf(token.name) !== -1) {
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
        throw error(`Unexpected token '${token.symbol}' found at line:${token.line} col:${token.col}`);
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
    match(["ID"], node, false);
    match(["="], node);
    parseExpr(node);
  }

  function parseVarDecl(parent: TNode) {
    Log.ParseMsg("parseVarDecl()");
    let node = branchNode("VarDecl", parent);
    parseType(node);
    match(["ID"], node, false);
  }

  function parseType(parent: TNode) {
    Log.ParseMsg("parseType()");
    let node = branchNode("Type", parent);
    switch (token.name) {
      case "INT":
        match(["int"], node);
        return;
      case "STRING":
        match(["string"], node);
        return;
      case "BOOLEAN":
        match(["boolean"], node);
        return;
      default:
        throw error(`Expected TYPE token, found ${token.name} at line:${token.line} col:${token.col}`);
    }
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
      case "TRUE":
        parseBooleanExpr(node);
        return;
      case "FALSE":
        parseBooleanExpr(node);
        return;
      case "ID":
        match(["ID"], node, false);
        return;
      default:
        throw error(`Unexpected token '${token.symbol}' found at line:${token.line} col:${token.col}`);
    }
  }

  function parseStringExpr(parent: TNode) {
    Log.ParseMsg("parseStringExpr()");
    let node = branchNode("StringExpr", parent);
    match(["QUOTE", "CHARLIST", "QUOTE"], node, false);
  }

  function parseBooleanExpr(parent: TNode) {
    Log.ParseMsg("parseBooleanExpr()");
    let node = branchNode("BooleanExpr", parent);
    switch (token.name) {
      case "LPAREN":
        match(["("], node);
        parseExpr(node);
        parseBoolOp(node);
        parseExpr(node);
        match([")"], node);
        return;
      case "TRUE":
        match(["true"], node);
        return;
      case "FALSE":
        match(["false"], node);
        return;
      default:
        throw error(`Unexpected token '${token.symbol}' found at line:${token.line} col:${token.col}`);
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
      throw error(`Expected BoolOperation, found ${token.name} at line:${token.line} col:${token.col}`);
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


  function branchNode(name: string, parent: TNode) {
    let node = new TNode(name);
    parent.addChild(node);
    return node;
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

  //Matches list of tokens by characters
  //formatted as an array of strings.
  //Prints error if match not found.
  function match(tList: string[], parent: TNode, symbol: boolean = true) {
    let tokenSym;
    for (let char of tList) {
      tokenSym = (symbol) ? token.symbol : token.name;
      if (char === tokenSym) {
        parent.addChild(new TNode(token.symbol));
        nextToken();
      } else {
        throw error(`Expected '${char}' found '${tokenSym}'` +
          ` at line: ${token.line} col: ${token.col}.`);
      }
    }
  }
}
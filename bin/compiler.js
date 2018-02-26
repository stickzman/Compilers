function compile() {
    //Get source code
    let source = document.getElementById("source").value;
    Log.clear();
    let tokenLinkedList = lex(source);
    if (tokenLinkedList === null) {
        return;
    }
    let results = parse(tokenLinkedList);
    if (results === null) {
        return;
    }
    let CSTs = results[0];
    let symbolTables = results[1];
}
//All test cases names and source code to be displayed in console panel
let tests = {
    "Alan Test Case": "/*  Provided By \n  - Alan G Labouseur\n*/\n{}$\t\n{{{{{{}}}}}}$\t\n{{{{{{}}}}}}}$\t\n{int\t@}$",
    "Simple Test 1": "/* Simple Program - No Operations */\n{}$",
    "Simple Test 2": "/* Print Operation */\n{\n\tprint(\"the cake is a lie\")\n}$",
    "Simple Test 3": "{\n    int a \n    boolean b \n    {\n        string c\n        a = 5 \n        b = true \n        c = \"inta\"\n        print(c)\n    }\n    string c\n    c = \" \"\n    print(c)\n    print(b) \n    print(\" \")\n    print(a)\n}$",
    "Long Test Case": "/* Long Test Case */\n{\n\t/* Int Declaration */\n\tint a\n\tint b\n\n\ta = 0\n\tb = 0\n\n\t/* While Loop */\n\twhile (a != 3) {\n    \tprint(a)\n    \twhile (b != 3) {\n        \t\tprint(b)\n        \t\tb = 1 + b\n        \t\tif (b == 2) {\n\t\t\t        /* Print Statement */\n            \t\tprint(\"there is no spoon\"/* This will do nothing */)\n        \t\t}\n    \t}\n\n    \tb = 0\n    \ta = 1 + a\n\t}\n}$",
    "Long Test Case - ONE LINE": "/*LongTestCase*/{/*IntDeclaration*/intaintba=0b=0/*WhileLoop*/while(a!=3){print(a)while(b!=3){print(b)b=1+bif(b==2){/*PrintStatement*/print(\"there is no spoon\"/*Thiswilldonothing*/)}}b=0a=1+a}}$",
    "Invalid String": "/* This will fail because strings\n - can't contain numbers */\n{\n\tprint(\"12\")\n}$",
    "New Line in String": "/* Invalid Break Line in String */\n{\"two\nlines\"}$",
    "Comment \\n in String": "/* Valid because break line wrapped in comment*/\n{\"two/*\n*/lines\"}$",
    "Multiple Comments in String": "/* All comments removed from string*/\n{\"one/*1234*/ /*test*/lin/**/e/**/\"}$",
    "Missing $": "/*Missing \'$\' from end of program*/\n/*Lexer throws warning and fixes*/\n\n{print(\"test\")}",
    "Keywords and Special Chars, No Whitespace": "{}print()whileif\"\"intstringbooleanabc123==!=falsetrue+/**/=$"
};
/// <reference path="tests.ts"/>
//Level of priority for a log message
var LogPri;
(function (LogPri) {
    LogPri[LogPri["VERBOSE"] = 0] = "VERBOSE";
    LogPri[LogPri["INFO"] = 1] = "INFO";
    LogPri[LogPri["WARNING"] = 2] = "WARNING";
    LogPri[LogPri["ERROR"] = 3] = "ERROR";
})(LogPri || (LogPri = {}));
;
function countLines(str) {
    return str.split(/[\n\r]/).length - 1;
}
function lastIndexOfNewLine(str) {
    return Math.max(str.lastIndexOf('\n'), str.lastIndexOf('\r'));
}
function init() {
    //Initialize the Log
    Log.init();
    //Initialize the Program Select
    let progSel = document.getElementById("progSel");
    let names = Object.getOwnPropertyNames(tests);
    let opt;
    for (let i = 0; i < names.length; i++) {
        opt = document.createElement("option");
        opt.text = names[i];
        opt.value = names[i];
        progSel.add(opt);
    }
    //Add event listeners to whole page
    document.addEventListener("keydown", function (e) {
        //F2 compiles Program
        if (e.keyCode === 113) {
            e.preventDefault();
            compile();
        }
    });
    //Add event listeners to Console element
    let consoleElem = document.getElementById("source");
    consoleElem.addEventListener("keydown", function (e) {
        if ([33, 34, 37, 38, 39, 40].indexOf(e.keyCode) === -1) {
            //Reset selected program when edits are made
            progSel.selectedIndex = 0;
        }
        if (e.keyCode === 9) {
            //Allow tabs in Console
            e.preventDefault();
            let elem = this;
            let start = elem.selectionStart;
            let end = elem.selectionEnd;
            elem.value = elem.value.substring(0, start) + "\t" + elem.value.substring(end);
            elem.selectionStart = start + 1;
            elem.selectionEnd = start + 1;
        }
    });
}
function loadProgram(name) {
    if (name === "Select One") {
        return;
    }
    let source = document.getElementById("source");
    source.value = tests[name];
}
/// <reference path="Helper.ts"/>
function lex(source) {
    const COL_BEGIN = 0;
    let pgrmNum = 1;
    let lineNum = 1;
    let charNum = COL_BEGIN;
    let numWarns = 0;
    let numErrors = 0;
    //Begin generating tokens from source code
    Log.print("Lexing Program 1...");
    let first = getTokens(source);
    Log.breakLine();
    Log.print(`Lexed ${pgrmNum} programs with ${numWarns} warnings and ${numErrors} errors.`);
    if (numErrors === 0) {
        return first; //Return the completed linked list
    }
    else {
        return null; //Return nothing if any errors occurred
    }
    function getTokens(source, last) {
        if (source.length <= 0) {
            if (last === undefined || last.name === "EOP") {
                return null;
            }
            numWarns++;
            Log.LexMsg("Missing EOP character '$'", lineNum, charNum, LogPri.WARNING, "Adding [EOP]...");
            return createToken("$", "EOP", last);
        }
        let token;
        //Look for all multi-character tokens using RegExp
        if (/^print/.test(source)) {
            token = createToken("print", "PRINT", last);
            charNum += 5;
            getTokens(source.substring(5), token);
        }
        else if (/^while/.test(source)) {
            token = createToken("while", "WHILE", last);
            charNum += 5;
            getTokens(source.substring(5), token);
        }
        else if (/^if/.test(source)) {
            token = createToken("if", "IF", last);
            charNum += 2;
            getTokens(source.substring(2), token);
        }
        else if (/^int/.test(source)) {
            token = createToken("int", "INT", last);
            charNum += 3;
            getTokens(source.substring(3), token);
        }
        else if (/^string/.test(source)) {
            token = createToken("string", "STRING", last);
            charNum += 6;
            getTokens(source.substring(6), token);
        }
        else if (/^boolean/.test(source)) {
            token = createToken("boolean", "BOOLEAN", last);
            charNum += 7;
            getTokens(source.substring(7), token);
        }
        else if (/^false/.test(source)) {
            token = createToken("false", "FALSE", last);
            charNum += 5;
            getTokens(source.substring(5), token);
        }
        else if (/^true/.test(source)) {
            token = createToken("true", "TRUE", last);
            charNum += 4;
            getTokens(source.substring(4), token);
        }
        else if (/^==/.test(source)) {
            token = createToken("==", "EQUAL", last);
            charNum += 2;
            getTokens(source.substring(2), token);
        }
        else if (/^!=/.test(source)) {
            token = createToken("!=", "NOTEQUAL", last);
            charNum += 2;
            getTokens(source.substring(2), token);
        }
        else if (/^\/\*/.test(source)) {
            //Skip to end of comment
            let closeIndex = source.indexOf("*/");
            let cmt;
            if (closeIndex === -1) {
                //Reached end of file
                numWarns++;
                Log.LexMsg("Unclosed comment block", lineNum, charNum, LogPri.WARNING);
                cmt = source;
            }
            else {
                cmt = source.substr(0, closeIndex + 2);
            }
            let numLines = countLines(cmt); //Number of lines in the comment
            //Add number of lines in comment to total lineNum
            lineNum += numLines;
            //Get the index of the last new line character
            let newLineIndex = lastIndexOfNewLine(cmt);
            if (newLineIndex === -1) {
                //If the comment is one line, add it to charNum
                charNum += cmt.length;
            }
            else {
                //Set charNum to the number of characters on the last line
                charNum = cmt.length - newLineIndex;
            }
            token = getTokens(source.substring(cmt.length), last);
        }
        else if (/^\*\//.test(source)) {
            Log.LexMsg("Unmatched '*/' encountered", lineNum, charNum, LogPri.ERROR, "Did you mean '/*'?");
            return null;
        }
        else if (/^[a-z]/.test(source)) {
            //The first character is a lowercase letter
            token = createToken(source.charAt(0), "ID", last, source.charAt(0));
            charNum += 1;
            getTokens(source.substring(1), token);
        }
        else if (/^[0-9]/.test(source)) {
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
                if (source.substring(1).replace(/\s/g, "").length > 0) {
                    //If there is more non-whitespace in the source, increment pgrmNum
                    pgrmNum++;
                    Log.breakLine();
                    Log.print("Lexing Program " + pgrmNum + "...");
                }
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
                }
                else {
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
                charList = charList.replace(/\/\*\*\//g, ""); //Remove remaining "empty" comments
                let charTok;
                if (/^[a-z ]*$/.test(charList)) {
                    //If character list contains only valid tokens
                    //wrap entire list in single token.
                    charTok = createToken(charList, "CHARLIST", token, charList);
                    lineNum += numLines;
                    charNum += numCols;
                }
                else {
                    numErrors++;
                    Log.LexMsg("Character list '" + charList + "' contains invalid characters", lineNum, charNum, LogPri.ERROR, "It can only contain lowercase letters and spaces.");
                    return token;
                }
                if (endInd === -1) {
                    getTokens(source.substring(totalLen + 1), token);
                }
                else {
                    let endQuote = createToken('"', "QUOTE", charTok);
                    charNum++;
                    getTokens(source.substring(totalLen + 2), endQuote);
                }
                return token;
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
                Log.LexMsg("Unidentified character '" + source.charAt(0) + "'", lineNum, charNum, LogPri.ERROR);
                return null;
        }
    }
    function createToken(chars, name, last, value) {
        let token;
        token = new Token(name, chars, lineNum, charNum, value);
        if (last !== undefined) {
            last.next = token;
        }
        Log.LexMsg(`[${chars}] --> ${name}`, lineNum, charNum, LogPri.VERBOSE);
        return token;
    }
}
/// <reference path="Helper.ts"/>
class Log {
    static init() {
        Log.logElem = document.getElementById("log");
        let prioityElem = document.getElementById("prioritySelect");
        let opt;
        for (let item in LogPri) {
            //Add all options in enum to dropdown
            if (isNaN(Number(item))) {
                opt = document.createElement("option");
                opt.text = item;
                opt.value = item;
                prioityElem.add(opt);
            }
        }
        //Set dropdown to default level
        prioityElem.selected = Log.level.toString();
    }
    static print(msg, priority = LogPri.INFO) {
        if (priority >= Log.level) {
            Log.logElem.value += " " + msg + "\n";
            //Scroll Log to bottom bottom when updating
            Log.logElem.scrollTop = Log.logElem.scrollHeight;
        }
    }
    static clear() {
        Log.logElem.value = "";
    }
    static updateLevel(level) {
        switch (level) {
            case "VERBOSE":
                Log.level = LogPri.VERBOSE;
                break;
            case "INFO":
                Log.level = LogPri.INFO;
                break;
            case "WARNING":
                Log.level = LogPri.WARNING;
                break;
            case "ERROR":
                Log.level = LogPri.ERROR;
                break;
        }
    }
    static LexMsg(msg, line, col, priority = LogPri.INFO, hint) {
        let str = "LEXER: ";
        switch (priority) {
            case LogPri.ERROR:
                str += "ERROR: ";
                break;
            case LogPri.WARNING:
                str += "WARNING: ";
                break;
        }
        str += msg + ` at line: ${line} col: ${col}.`;
        if (hint !== undefined) {
            str += " " + hint;
        }
        Log.print(str, priority);
    }
    static ParseMsg(msg, priority = LogPri.VERBOSE) {
        let str = "PARSER: ";
        switch (priority) {
            case LogPri.ERROR:
                str += "ERROR: ";
                break;
            case LogPri.WARNING:
                str += "WARNING: ";
                break;
        }
        str += msg;
        Log.print(str, priority);
    }
    static isClear() {
        return Log.logElem.value.replace(/ /g, "") == "";
    }
    static isLastLineClear() {
        let testStr = Log.logElem.value.replace(/ /g, "");
        let i = testStr.lastIndexOf("\n");
        if (i > 0) {
            return testStr[i - 1] === "\n";
        }
        else {
            return Log.isClear();
        }
    }
    static breakLine() {
        if (!Log.isLastLineClear())
            Log.print("", LogPri.ERROR);
    }
}
Log.level = LogPri.VERBOSE;
function parse(token) {
    let numWarns = 0;
    let pgrmNum = 0;
    let CSTs = [];
    let symbolTables = [];
    let symTable;
    while (token !== undefined) {
        symTable = new SymbolTable();
        symbolTables.push(symTable);
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
            Log.print("CST for Program " + pgrmNum + ":\n" + root.toString(), LogPri.VERBOSE);
            //Add CST to end of array
            CSTs = CSTs.concat(root);
            //Print Symbol Table
            //TODO: Implement this better (scope?)
            if (symTable.length() > 0) {
                Log.breakLine();
                Log.print("Symbol Table:\n" + symTable.toString(), LogPri.VERBOSE);
            }
        }
        catch (e) {
            if (e.name === "Parse_Error") {
                Log.print(e, LogPri.ERROR);
                Log.print("");
                Log.print(`Parsed ${pgrmNum} programs with ${numWarns} warnings and 1 errors.`);
                return null;
            }
            else {
                //If the error is not created by my parser, continue to throw it
                throw e;
            }
        }
    }
    Log.breakLine();
    Log.print(`Parsed ${pgrmNum} programs with ${numWarns} warnings and 1 errors.`);
    //Return all completed Concrete Syntax Trees
    return [CSTs, symbolTables];
    function parseBlock(parent) {
        Log.ParseMsg("parseBlock()");
        let node = branchNode("Block", parent);
        match(["{"], node);
        parseStatementList(node);
        match(["}"], node);
    }
    function parseStatementList(parent) {
        Log.ParseMsg("parseStatementList()");
        let node = branchNode("StatementList", parent);
        let possibleTerminals = ["PRINT", "ID", "INT", "STRING", "BOOLEAN", "WHILE",
            "IF", "LBRACE"];
        if (possibleTerminals.indexOf(token.name) !== -1) {
            parseStatement(node);
            parseStatementList(node);
        }
    }
    function parseStatement(parent) {
        Log.ParseMsg("parseStatement()");
        let node = branchNode("Statement", parent);
        switch (token.name) {
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
    function parsePrintStatement(parent) {
        Log.ParseMsg("parsePrintStatement()");
        let node = branchNode("PrintStatement", parent);
        match(["print", "("], node);
        parseExpr(node);
        match([")"], node);
    }
    function parseAssignStatement(parent) {
        Log.ParseMsg("parseAssignStatement()");
        let node = branchNode("AssignStatement", parent);
        match(["ID"], node, false);
        match(["="], node);
        parseExpr(node);
    }
    function parseVarDecl(parent) {
        Log.ParseMsg("parseVarDecl()");
        let node = branchNode("VarDecl", parent);
        let type = token;
        parseType(node);
        let name = token;
        symTable.insert(name, type);
        match(["ID"], node, false);
    }
    function parseType(parent) {
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
    function parseWhileStatement(parent) {
        Log.ParseMsg("parseWhileStatement()");
        let node = branchNode("WhileStatement", parent);
        match(["while"], node);
        parseBooleanExpr(node);
        parseBlock(node);
    }
    function parseIfStatement(parent) {
        Log.ParseMsg("parseIfStatement()");
        let node = branchNode("IfStatement", parent);
        match(["if"], node);
        parseBooleanExpr(node);
        parseBlock(node);
    }
    function parseExpr(parent) {
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
    function parseStringExpr(parent) {
        Log.ParseMsg("parseStringExpr()");
        let node = branchNode("StringExpr", parent);
        match(["QUOTE", "CHARLIST", "QUOTE"], node, false);
    }
    function parseBooleanExpr(parent) {
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
    function parseBoolOp(parent) {
        Log.ParseMsg("parseBoolOp()");
        let node = branchNode("BoolOp", parent);
        if (token.symbol === "==") {
            match(["=="], node);
        }
        else if (token.symbol === "!=") {
            match(["!="], node);
        }
        else {
            throw error(`Expected BoolOperation, found ${token.name} at line:${token.line} col:${token.col}`);
        }
    }
    function parseIntExpr(parent) {
        Log.ParseMsg("parseIntExpr()");
        let node = branchNode("IntExpr", parent);
        match(["DIGIT"], node, false);
        if (token.symbol === "+") {
            match(["+"], node);
            parseExpr(node);
        }
    }
    function branchNode(name, parent) {
        let node = new TNode(name);
        parent.addChild(node);
        return node;
    }
    function nextToken() {
        token = token.next;
    }
    //Create custom Error object
    function error(msg) {
        let e = new Error(msg);
        e.name = "Parse_Error";
        return e;
    }
    //Matches list of tokens by characters
    //formatted as an array of strings.
    //Prints error if match not found.
    function match(tList, parent, symbol = true) {
        let tokenSym;
        for (let char of tList) {
            tokenSym = (symbol) ? token.symbol : token.name;
            if (char === tokenSym) {
                parent.addChild(new TNode(token.symbol, token));
                nextToken();
            }
            else {
                throw error(`Expected '${char}' found '${tokenSym}'` +
                    ` at line: ${token.line} col: ${token.col}.`);
            }
        }
    }
}
class SymbolTable {
    constructor() {
        this.table = {};
    }
    insert(nameTok, typeTok) {
        this.table[nameTok.value] = { name: nameTok, type: typeTok };
    }
    lookup(name) {
        return this.table[name];
    }
    toString() {
        let str = "";
        let keys = Object.keys(this.table);
        let name = "";
        let type = "";
        for (let i = 0; i < keys.length; i++) {
            name = this.lookup(keys[i]).name.value;
            type = this.lookup(keys[i]).type;
            str += `[name: ${name}, type: ${type}]\n`;
        }
        return str;
    }
    length() {
        return Object.keys(this.table).length;
    }
}
class Token {
    constructor(name, symbol, line, col, value) {
        this.name = name;
        this.symbol = symbol;
        this.line = line;
        this.col = col;
        this.value = value;
    }
    toString() {
        if (this.value === undefined) {
            return this.name;
        }
        else {
            return this.name + ", " + this.value;
        }
    }
}
class TNode {
    constructor(name, token) {
        this.name = name;
        this.token = token;
        this.children = [];
        this.parent = null;
    }
    addChild(node) {
        this.children.push(node);
        node.parent = this;
    }
    isRoot() {
        return this.parent === null;
    }
    hasChildren() {
        return this.children.length > 0;
    }
    getLeafNodes() {
        let leaves = [];
        for (let i = 0; i < this.children.length; i++) {
            if (!this.children[i].hasChildren()) {
                leaves.push(this.children[i]);
            }
        }
        return leaves;
    }
    toString() {
        let str = "";
        if (!this.isRoot) {
            str += "**\n";
        }
        function expand(node, depth) {
            for (let i = 0; i < depth; i++) {
                str += "-";
            }
            if (node.hasChildren()) {
                str += "<" + node.name + ">\n";
                for (let i = 0; i < node.children.length; i++) {
                    expand(node.children[i], depth + 1);
                }
            }
            else {
                str += "[" + node.name + "]\n";
            }
            return;
        }
        expand(this, 0);
        return str;
    }
}
//# sourceMappingURL=compiler.js.map
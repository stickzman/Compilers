function compile() {
    //Get source code
    let source = document.getElementById("source").value;
    Log.clear();
    let tokenLinkedList = lex(source);
    if (tokenLinkedList === null) {
        return;
    }
    let CST = parse(tokenLinkedList);
    if (CST === null) {
        return;
    }
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
    //Allow tabs in Console
    let consoleElem = document.getElementById("source");
    consoleElem.addEventListener("keydown", function (e) {
        if (e.keyCode == 9) {
            e.preventDefault();
            let elem = this;
            elem.value += "\t";
        }
    });
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
}
function loadProgram(name) {
    let source = document.getElementById("source");
    source.value = tests[name];
}
/// <reference path="Helper.ts"/>
function lex(source) {
    const COL_BEGIN = 0;
    let lineNum = 1;
    let charNum = COL_BEGIN;
    let numWarns = 0;
    let numErrors = 0;
    //Begin generating tokens from source code
    let first = getTokens(source);
    if (!Log.isClear()) {
        Log.print("");
    }
    Log.print(`Lexer completed with ${numWarns} warnings and ${numErrors} errors.`);
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
        return Log.logElem.value == "";
    }
}
Log.level = LogPri.VERBOSE;
function parse(token) {
    let numWarns = 0;
    Log.print("");
    Log.ParseMsg("parse()");
    //Initial parsing of Program
    try {
        let root = new TNode("Program");
        parseBlock(root);
        match(["$"], root);
        //Display results
        Log.print("");
        Log.print(`Parser completed with ${numWarns} warnings and 0 errors.`);
        Log.print("");
        Log.print("CST for Program:");
        Log.print(root.toString());
        //Return CST
        return root;
    }
    catch (e) {
        if (e.name === "Parse_Error") {
            Log.print(e);
            Log.print("");
            Log.print(`Parser completed with ${numWarns} warnings and 1 errors.`);
            return null;
        }
        else {
            //If the error is not created by my parser, continue to throw it
            throw e;
        }
    }
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
        if (token.name === "PRINT" || token.name === "ID" || token.name === "TYPE" ||
            token.name === "WHILE" || token.name === "IF" || token.symbol === "{") {
            parseStatement(node);
            parseStatementList(node);
        }
    }
    function parseStatement(parent) {
        Log.ParseMsg("parseStatement()");
        let node = branchNode("Statement", parent);
        switch (token.name) {
            case "PRINT":
                break;
            case "ID":
                break;
            case "TYPE":
                break;
            case "WHILE":
                break;
            case "IF":
                break;
            case "LBRACE":
                break;
            default:
                throw error(`Unexpected token '${token.symbol}' found at line:${token.line} col:${token.col}`);
        }
        nextToken();
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
                parent.addChild(new TNode(token.symbol));
                nextToken();
            }
            else {
                throw error(`Expected '${char}' found '${tokenSym}'` +
                    ` at line: ${token.line} col: ${token.col}.`);
            }
        }
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
            return this.name, this.value;
        }
    }
}
class TNode {
    constructor(name) {
        this.name = name;
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
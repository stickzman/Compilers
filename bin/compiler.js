function genCode(AST, sTree, memManager, pgrmNum) {
    //Array of machine instructions in hexadecimal code
    let byteCode = [];
    //Add an empty placeholder root for sTree (workaround for parseBlock)
    let tempRoot = new SymbolTable();
    tempRoot.addChild(sTree);
    resetSymTableInd(tempRoot);
    try {
        parseBlock(AST, tempRoot);
        Log.breakLine();
        Log.print(`Program ${pgrmNum} compiled successfully with 0 errors.`, LogPri.INFO);
        //Allow this program static memory to be overwrriten by future programs
        memManager.releaseAllStaticMem();
        return byteCode;
    }
    catch (e) {
        if (e.name === "Compilation_Error" || e.name === "Pgrm_Overflow") {
            Log.GenMsg(e, LogPri.ERROR);
            //Allow this program static memory to be overwrriten by future programs
            memManager.releaseAllStaticMem();
            return [];
        }
        else {
            throw e;
        }
    }
    function resetSymTableInd(sTable) {
        sTable.resetSiblingIndex();
        for (let child of sTable.children) {
            resetSymTableInd(child);
        }
    }
    function parseBlock(node, sTable) {
        if (!node.isRoot()) {
            Log.GenMsg("Descending Scope...");
        }
        sTable = sTable.nextChild();
        for (let child of node.children) {
            switch (child.name) {
                case "BLOCK":
                    parseBlock(child, sTable);
                    break;
                case "VAR_DECL":
                    parseDecl(child, sTable);
                    break;
                case "ASSIGN":
                    parseAssign(child, sTable);
                    break;
                case "PRINT":
                    parsePrint(child, sTable);
                    break;
                case "IF":
                    parseIfStatement(child, sTable);
                    break;
                default:
            }
        }
        Log.GenMsg("Ascending Scope...");
    }
    function parseDecl(node, sTable) {
        let addr = memManager.allocateStatic(false);
        Log.GenMsg(`Declaring ${node.children[0].name} '${node.children[1].name}'`
            + `at location [${addr}]`);
        sTable.setLocation(node.children[1].name, addr);
    }
    function parseAssign(node, sTable) {
        Log.GenMsg(`Assigning value to variable '${node.children[0].name}'`);
        let varName = node.children[0].name;
        let varAddr = sTable.getLocation(varName);
        let assignNode = node.children[1];
        if (assignNode.name === "ADD") {
            //Perform addition, store result in varAddr
            let resAdd = parseAdd(assignNode, sTable);
            byteCode.push("AD", resAdd[0], resAdd[1], "8D", varAddr[0], varAddr[1]);
            memManager.allowOverwrite(resAdd);
            return;
        }
        if (assignNode.name === "CHARLIST") {
            //Load charlist into heap, store pointer in varAddr
            let pointer = parseCharList(assignNode);
            byteCode.push("A9", pointer, "8D", varAddr[0], varAddr[1]);
            return;
        }
        if (assignNode.name === "BOOL_EXPR") {
            //Evalulate the boolean expression, store result in addr
            let addr = evalStoreBool(assignNode, sTable);
            //Load bool result into Acc from memory, store in varAddr
            byteCode.push("AD", addr[0], addr[1], "8D", varAddr[0], varAddr[1]);
            memManager.allowOverwrite(addr);
            return;
        }
        if (/^[a-z]$/.test(assignNode.name)) {
            //Assigning to a variable. Look up variable value and store in varAddr
            let valAddr = sTable.getLocation(assignNode.name);
            byteCode.push("AD", valAddr[0], valAddr[1], "8D", varAddr[0], varAddr[1]);
            return;
        }
        if (/[0-9]/.test(assignNode.name)) {
            //Store single digit in varAddr
            byteCode.push("A9", "0" + assignNode.name, "8D", varAddr[0], varAddr[1]);
            return;
        }
        if (assignNode.name === "true") {
            //Save 01 for 'true' in varAddr
            byteCode.push("A9", "01", "8D", varAddr[0], varAddr[1]);
            return;
        }
        //Save 00 for 'false' in varAddr
        byteCode.push("A9", "00", "8D", varAddr[0], varAddr[1]);
    }
    function parseIfStatement(node, sTable) {
        Log.GenMsg("Parsing If Statement...");
        let condNode = node.children[0];
        let block = node.children[1];
        if (condNode.name === "false") {
            //Simply return because the block will never be run
            return;
        }
        else if (condNode.name === "BOOL_EXPR") {
            //Evaluate the boolExpr, so the Z flag contains the answer
            let isEqualOp = evalBoolExpr(condNode, sTable);
            if (isEqualOp) {
                //If not equal, branch to end of block
                var jp = memManager.newJumpPoint();
                byteCode.push("D0", jp);
                var preBlockLen = byteCode.length;
            }
            else {
                //If the operator is !=, BNE to beginning of If Block
                byteCode.push("D0", "07");
                var jp = memManager.newJumpPoint();
                //Add unconditional branch to end of If Block
                addUnconditionalBranch(jp);
                var preBlockLen = byteCode.length;
            }
        }
        parseBlock(block, sTable);
        if (condNode.name === "BOOL_EXPR") {
            memManager.setJumpPoint(jp, byteCode.length - preBlockLen);
        }
    }
    //evalulate BoolVal, Z flag will be set in byteCode after running
    function evalBoolVal(val) {
        Log.GenMsg(`Evaluating single boolVal '${val}'...`);
        if (val === "true") {
            //Store "00" in X and compare with defualt "00" in memory
            byteCode.push("A2", "00", "EC", "FV", "XX");
        }
        if (val === "false") {
            //Store "01" in X and compare with defualt "00" in memory
            byteCode.push("A2", "01", "EC", "FV", "XX");
        }
    }
    //evalulate Bool_Expr, Z flag will be set in byteCode after running
    //Nested Bool_Expr not currently supported
    function evalBoolExpr(node, sTable) {
        Log.GenMsg("Evaulating Bool_Expr...");
        let expr1 = node.children[0];
        let boolOp = node.children[1];
        let expr2 = node.children[2];
        let addr = null;
        let addr2 = null;
        if (expr1.name === "BOOL_EXPR") {
            addr = evalStoreBool(expr1, sTable);
            if (expr2.name === "BOOL_EXPR") {
                addr2 = evalStoreBool(expr2, sTable);
            }
        }
        else if (expr2.name === "BOOL_EXPR") {
            addr = evalStoreBool(expr2, sTable);
        }
        else if (expr1.name === "CHARLIST" || expr2.name === "CHARLIST") {
            throw error("String comparison not currently supported.");
        }
        //Check that there are no string variables in expression
        if (/^[a-z]$/.test(expr1.name)) {
            let type = sTable.getType(expr1.name);
            if (type === "STRING") {
                throw error("String comparison not currently supported.");
            }
        }
        if (/^[a-z]$/.test(expr2.name)) {
            let type = sTable.getType(expr2.name);
            if (type === "STRING") {
                throw error("String comparison not currently supported.");
            }
        }
        //Continue with expression evaluation
        if (addr === null) {
            //No nested boolExpr, carry on as usual
            if (/^[0-9]$/.test(expr1.name) || expr1.name === "true") {
                loadX(expr1, sTable);
                addr = getSetMem(expr2, sTable);
            }
            else {
                addr = getSetMem(expr1, sTable);
                loadX(expr2, sTable);
            }
        }
        else {
            if (addr2 === null) {
                loadX(expr2, sTable);
            }
            else {
                //Load result of second BoolExpr into X from memory
                byteCode.push("AE", addr2[0], addr2[1]);
            }
            //Allow result of sub-boolean expressions to be overwrriten
            memManager.allowOverwrite(addr);
            memManager.allowOverwrite(addr2);
        }
        //Compare X and memory location, setting Z with answer
        byteCode.push("EC", addr[0], addr[1]);
        //Return if the boolOperation was "equals" (otherwise "not equals")
        return boolOp.name === "==";
    }
    //Evaluate the boolean expression, then store the result in memory
    //and return the address
    function evalStoreBool(node, sTable) {
        let val1;
        let val2;
        if (evalBoolExpr(node, sTable)) {
            val1 = "01";
            val2 = "00";
        }
        else {
            val1 = "00";
            val2 = "01";
        }
        Log.GenMsg("Storing boolean expression result...");
        let addr = memManager.allocateStatic();
        //If not equal, jump to writing val2 into memory, otherwise right val1
        byteCode.push("D0", "0C", "A9", val1, "8D", addr[0], addr[1]);
        //Add unconditional branch to skip writing val2 into memory
        addUnconditionalBranch("05");
        //Write val2 into memory
        byteCode.push("A9", val2, "8D", addr[0], addr[1]);
        return addr;
    }
    function addUnconditionalBranch(jumpAmt) {
        //Set X to "01", compare with "false" value (00) in memory, compare, then BNE
        byteCode.push("A2", "01", "EC", "FV", "XX", "D0", jumpAmt);
    }
    //Load the X register with the digit/boolean value in expr1 Node
    function loadX(node, sTable) {
        if (/^[0-9]$/.test(node.name)) {
            //Load single digit into X
            byteCode.push("A2", "0" + node.name);
        }
        else if (node.name === "ADD") {
            let addr = parseAdd(node, sTable);
            //Load result into X
            byteCode.push("AE", addr[0], addr[1]);
            memManager.allowOverwrite(addr);
        }
        else if (node.name === "true") {
            //Load true (01) into X
            byteCode.push("A2", "01");
        }
        else if (node.name === "false") {
            //Load false (00) into X
            byteCode.push("A2", "00");
        }
        else if (/^[a-z]$/.test(node.name)) {
            //Load value of variable into X
            let addr = sTable.getLocation(node.name);
            byteCode.push("AE", addr[0], addr[1]);
        }
    }
    //Store value in memory if not already there, then return location address
    function getSetMem(node, sTable) {
        if (/^[0-9]$/.test(node.name)) {
            //Load single digit into Acc, then store
            let addr = memManager.allocateStatic();
            byteCode.push("A9", "0" + node.name, "8D", addr[0], addr[1]);
            return addr;
        }
        else if (node.name === "ADD") {
            //Calculate addition, return the location of result
            return parseAdd(node, sTable);
        }
        else if (node.name === "true") {
            //Load true (01) into Acc, then store
            let addr = memManager.allocateStatic();
            byteCode.push("A9", "01", "8D", addr[0], addr[1]);
            return addr;
        }
        else if (node.name === "false") {
            //Location of default "00" (false)
            return ["FV", "XX"];
        }
        else if (/^[a-z]$/.test(node.name)) {
            //Return location of variable value
            return sTable.getLocation(node.name);
        }
    }
    function parseCharList(node) {
        let str = node.children[0].name;
        Log.GenMsg(`Allocating memory in Heap for string "${str}"...`);
        let hexData = "";
        //Convert string into series of hexCodes
        for (let i = 0; i < str.length; i++) {
            hexData += str.charCodeAt(i).toString(16) + " ";
        }
        //Add NULL string terminator
        hexData += "00";
        //Allocate heap space and return placeholder addr
        return memManager.allocateHeap(hexData);
    }
    function parsePrint(node, sTable) {
        Log.GenMsg("Parsing Print Statement...");
        let child = node.children[0];
        if (child.hasChildren()) {
            //Evalulate Expr
            if (child.name === "ADD") {
                let addr = parseAdd(child, sTable);
                //Load Y register with result of ADD stored in addr
                //Set X to 01, call SYS to print
                byteCode.push("AC", addr[0], addr[1], "A2", "01", "FF");
                memManager.allowOverwrite(addr);
            }
            else if (child.name === "CHARLIST") {
                //Print CharList
                let addr = parseCharList(child);
                //Load addr into Y register, set X to 02 and call SYS to print
                byteCode.push("A0", addr, "A2", "02", "FF");
            }
            else if (child.name === "BOOL_EXPR") {
                //Evaulate BoolExpr, store result
                let addr = evalStoreBool(child, sTable);
                //Print result
                byteCode.push("AC", addr[0], addr[1], "A2", "01", "FF");
                //Release memory
                memManager.allowOverwrite(addr);
            }
        }
        else {
            switch (child.token.name) {
                case "DIGIT":
                    //Load digit into Y register, set X to 01 and call SYS to print
                    byteCode.push("A0", `0${child.name}`, "A2", "01", "FF");
                    break;
                case "ID":
                    //Print variable value
                    let addr = sTable.getLocation(child.name);
                    switch (sTable.getType(child.name)) {
                        case "STRING":
                            //Load addr into Y register, set X to 02 and call SYS to print
                            byteCode.push("AC", addr[0], addr[1], "A2", "02", "FF");
                            break;
                        case "INT":
                            //Load digit into Y register, set X to 01 and call SYS to print
                            byteCode.push("AC", addr[0], addr[1], "A2", "01", "FF");
                            break;
                        case "BOOLEAN":
                            //Load bool into Y register, set X to 01 and call SYS to print
                            byteCode.push("AC", addr[0], addr[1], "A2", "01", "FF");
                            break;
                    }
                    break;
                case "BOOLVAL":
                    //Print true/false
                    if (child.token.symbol === "true") {
                        byteCode.push("A0", "01", "A2", "01", "FF");
                    }
                    else {
                        byteCode.push("A0", "00", "A2", "01", "FF");
                    }
                    break;
                default:
            }
        }
    }
    function parseAdd(node, sTable) {
        Log.GenMsg("Parsing Add subtree...");
        let results = optimizeAdd(0, node);
        if (results[0] > 255) {
            throw error("Integer Overflow: result of calculation exceeds maximum " +
                "storage for integer (1 byte)");
        }
        if (/^[a-z]$/.test(results[1])) {
            //The last element is an ID
            let varLoc = sTable.getLocation(results[1]);
            let resLoc = memManager.allocateStatic();
            //Load accumulated num into Acc, then add value stored in the variable
            byteCode.push("A9", results[0].toString(16).padStart(2, "0"), "6D", varLoc[0], varLoc[1]);
            //Store the result in memory, return the location
            byteCode.push("8D", resLoc[0], resLoc[1]);
            return resLoc;
        }
        else {
            //The last element is a digit wrapped in a string
            let num = results[0] + parseInt(results[1]);
            if (num > 255) {
                throw error("Integer Overflow: result of calculation exceeds maximum " +
                    "storage for integer (1 byte)");
            }
            let addr = memManager.allocateStatic();
            //Load the result into Acc, store in memory, return the location
            byteCode.push("A9", num.toString(16).padStart(2, "0"), "8D", addr[0], addr[1]);
            return addr;
        }
        //Recursive helper func traverses ADD subtrees, returns rightmost child and
        //the summation of all other children
        function optimizeAdd(acc, addNode) {
            let num = parseInt(addNode.children[0].name);
            if (addNode.children[1].name === "ADD") {
                return optimizeAdd(acc + num, addNode.children[1]);
            }
            else {
                return [acc + num, addNode.children[1].name];
            }
        }
    }
    function error(msg) {
        let e = new Error(msg);
        e.name = "Compilation_Error";
        return e;
    }
}
function compile() {
    //Get source code
    let source = document.getElementById("source").value;
    let hexDiv = document.getElementById("hexDiv");
    hexDiv.style.display = "none";
    let hexDisplay = document.getElementById("hexCode");
    hexDisplay.value = "";
    Log.clear();
    //Split source code of programs
    let pgrms = source.split("$");
    for (let i = 0; i < pgrms.length; i++) {
        if (i == pgrms.length - 1) {
            if (/^\s*$/.test(pgrms[i])) {
                //If the last program is whitespace, delete it
                pgrms.pop();
            }
        }
        else if (/.*\/\*((?!\*\/).)*$/.test(pgrms[i]) && /^(.(?!\/\*))*\*\//.test(pgrms[i + 1])) {
            //If the last and next programs end and begin with unclosed comment blocks,
            //the '$' was inside a comment and the programs should be put back together
            pgrms[i] += "$"; //Add the missing '$'
            pgrms[i] = pgrms[i].concat(pgrms[i + 1]);
            pgrms.splice(i + 1, 1);
        }
        else {
            //Add '$' back at the end of the program
            pgrms[i] += "$";
        }
    }
    let lineCount = 1;
    let colCount = 0;
    let memTable = new MemoryManager();
    let byteCode = [];
    for (let i = 0; i < pgrms.length; i++) {
        Log.pgrmSeparater();
        Log.print("Lexing Program " + (i + 1) + "...");
        let lexRes = lex(pgrms[i], lineCount, colCount, i + 1);
        let tokenLinkedList = lexRes[0];
        lineCount = lexRes[1];
        colCount = lexRes[2];
        if (tokenLinkedList === null) {
            continue;
        }
        Log.breakLine();
        Log.print("Parsing Program " + (i + 1) + "...");
        let CST = parse(tokenLinkedList, i + 1);
        if (CST === null) {
            continue;
        }
        Log.breakLine();
        Log.print("Analyzing Program " + (i + 1) + "...");
        let semRes = analyze(tokenLinkedList, i + 1);
        if (semRes === null) {
            continue;
        }
        Log.breakLine();
        Log.print("Generating code for Program " + (i + 1) + "...");
        let codeArr = genCode(semRes[0], semRes[1], memTable, i + 1);
        byteCode = byteCode.concat(codeArr);
    }
    if (byteCode.length === 0) {
        return;
    }
    //Perform backpatching and display machine code
    byteCode.push("00");
    memTable.correct(byteCode.length);
    Log.breakLine(LogPri.VERBOSE);
    Log.dottedLine(LogPri.VERBOSE);
    let code = memTable.backpatch(byteCode);
    hexDisplay.value = code.padEnd(512, " 00").toUpperCase();
    hexDiv.style.display = "block";
}
//All test cases names and source code to be displayed in console panel
let tests = {
    "Alan Test Case": "/*  Provided By \n  - Alan G Labouseur\n*/\n{}$\t\n{{{{{{}}}}}}$\t\n{{{{{{}}}}}}}$\t\n{int\t@}$",
    "Simple Test 1": "/* Simple Program - No Operations */\n{}$",
    "Simple Test 2": "/* Print Operation */\n{\n\tprint(\"the cake is a lie\")\n}$",
    "Simple Test 3": "{\n    int a\n    boolean b\n    {\n        string c\n        a = 5\n        b = true\n        c = \"inta\"\n        print(c)\n    }\n    string c\n    c = \" \"\n    print(c)\n    print(b)\n    print(\" \")\n    print(a)\n}$",
    "Long Test Case": "/* Long Test Case */\n{\n\t/* Int Declaration */\n\tint a\n\tint b\n\n\ta = 0\n\tb = 0\n\n\t/* While Loop */\n\twhile (a != 3) {\n    \tprint(a)\n    \twhile (b != 3) {\n        \t\tprint(b)\n        \t\tb = 1 + b\n        \t\tif (b == 2) {\n\t\t\t        /* Print Statement */\n            \t\tprint(\"there is no spoon\"/* This will do nothing */)\n        \t\t}\n    \t}\n\n    \tb = 0\n    \ta = 1 + a\n\t}\n}$",
    "Long Test Case - ONE LINE": "/*LongTestCase*/{/*IntDeclaration*/intaintba=0b=0/*WhileLoop*/while(a!=3){print(a)while(b!=3){print(b)b=1+bif(b==2){/*PrintStatement*/print(\"there is no spoon\"/*Thiswilldonothing*/)}}b=0a=1+a}}$",
    "Invalid String": "/* This will fail because strings\n - can't contain numbers */\n{\n\tprint(\"12\")\n}$",
    "New Line in String": "/* Invalid Break Line in String */\n{\"two\nlines\"}$",
    "Comment \\n in String": "/* Valid because break line wrapped in comment*/\n{\"two/*\n*/lines\"}$",
    "Multiple Comments in String": "/* All comments removed from string*/\n{\"one/*1234*/ /*test*/lin/**/e/**/\"}$",
    "Missing $": "/*Missing \'$\' from end of program*/\n/*Lexer throws warning and fixes*/\n\n{print(\"test\")}",
    "Keywords and Special Chars, No Whitespace": "{}print()whileif\"\"intstringbooleanabc123==!=falsetrue+/**/=$",
    "Undeclared Variable": "/*Variable used before declaration.  Results in error.*/\n{\n\ta = \"asdf\"\n\tprint (a)\n}$",
    "Re-declared Variable": "/*Variable re-declared on line 6.  Results in error.*/\n{\n\tstring a\n\ta = \"asdf\"\n\tprint (a)\n\tstring a\n\ta = \"test\"\n}$",
    "Type Mismatch": "/*Attempts to assign integer value to string variable.\nResults in type mismatch error.*/\n{\n\tstring a\n\tint b\n\tb = 9\n\ta = b\n}$",
    "Unused Variables": "/*Variables are declared and unused or initialized and unused.\nBoth result in different warnings.*/\n{\n\tstring a\n\tint b\n\tb = 9\n}$",
    "Unintialized Variables": "/*Uninitialized variables being used within the program.\nResults in warnings.*/\n{\n\tint a\n\tint b\n\tprint(a)\n\tb = 3 + b\n}$"
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
//Polyfill for padStart String function
if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0; //truncate if number or convert non-number to 0;
        padString = String((typeof padString !== 'undefined' ? padString : ' '));
        if (this.length > targetLength) {
            return String(this);
        }
        else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}
/// <reference path="Helper.ts"/>
function lex(source, lineNum, charNum, pgrmNum) {
    const COL_BEGIN = 0;
    let numWarns = 0;
    let numErrors = 0;
    //Begin generating tokens from source code
    let first = getTokens(source);
    Log.breakLine();
    Log.print(`Lexed Program ${pgrmNum} with ${numWarns} warnings and ${numErrors} errors.`);
    if (numErrors === 0) {
        return [first, lineNum, charNum]; //Return the completed linked list
    }
    else {
        return [null, lineNum, charNum]; //Return nothing if any errors occurred
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
            token = createToken("false", "BOOLVAL", last);
            charNum += 5;
            getTokens(source.substring(5), token);
        }
        else if (/^true/.test(source)) {
            token = createToken("true", "BOOLVAL", last);
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
                Log.LexMsg("Undefined character '" + source.charAt(0) + "'", lineNum, charNum, LogPri.ERROR);
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
    static SemMsg(msg, priority = LogPri.VERBOSE) {
        let str = "";
        if (priority == LogPri.WARNING) {
            str += "SEMANTIC_WARNING: ";
        }
        else {
            str += "ANALYZER: ";
        }
        str += msg;
        Log.print(str, priority);
    }
    static GenMsg(msg, priority = LogPri.VERBOSE) {
        let str = "CODE_GEN: ";
        str += msg;
        Log.print(str, priority);
    }
    static isClear() {
        return Log.logElem.value.replace(/[ \n]/g, "") == "";
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
    static breakLine(pri = LogPri.ERROR) {
        if (!Log.isLastLineClear())
            Log.print("", pri);
    }
    static dottedLine(pri) {
        Log.print("-------------------------------------", pri);
    }
    static pgrmSeparater() {
        if (!Log.isClear()) {
            Log.print("***********************", LogPri.ERROR);
        }
    }
}
Log.level = LogPri.VERBOSE;
/// <reference path="Helper.ts"/>
class MemoryManager {
    constructor() {
        this.heap = {};
        this.dirtyMemory = [];
        this.staticTable = {};
        this.jumpTable = {};
        this.jumpTableLen = 0;
        this.staticLength = 0;
        this.heapLength = 0;
        //Initialize a static memory address that will hold a 00
        //Used as a "false" value for unconditional branching
        this.staticTable["FV XX"] = "";
    }
    //Allocate new static memory. Return name of placeholder addr
    allocateStatic(allowDirty = true) {
        if (allowDirty && this.dirtyMemory.length > 0) {
            let addr = this.dirtyMemory.shift();
            return addr.split(" ");
        }
        //Create placeholder address
        let addr = "S" + this.staticLength.toString().padStart(3, "0");
        this.staticLength++;
        addr = addr.substr(0, 2) + " " + addr.substr(2);
        this.staticTable[addr] = "";
        return addr.split(" ");
    }
    //Allocate new heap memory. Return name of placeholder addr
    allocateHeap(hexData) {
        let addr = "H" + this.heapLength++; //Create placeholder address
        this.heap[addr] = { data: hexData, loc: "" };
        return addr;
    }
    newJumpPoint() {
        let jp = "J" + this.jumpTableLen++; //Create placeholder address
        this.jumpTable[jp] = "";
        return jp;
    }
    setJumpPoint(jumpPoint, jumpAmt) {
        if (this.jumpTable[jumpPoint] === undefined) {
            this.jumpTableLen++;
        }
        this.jumpTable[jumpPoint] = jumpAmt.toString(16).padStart(2, "0").toUpperCase();
    }
    allowOverwrite(addr) {
        if (addr !== null && addr.length === 2) {
            let loc = addr.join(" ");
            if (this.dirtyMemory.indexOf(loc) === -1) {
                this.dirtyMemory.push(loc);
            }
        }
    }
    releaseAllStaticMem() {
        //Set the entire contents of static memory to be marked for re-use
        let keys = Object.keys(this.staticTable);
        this.dirtyMemory = this.dirtyMemory.concat(keys);
    }
    //Assuming beta and offsets are base 10
    //Will convert to base 16/memory addresses in function
    correct(alpha) {
        let keys = Object.keys(this.staticTable);
        let beta = alpha + keys.length;
        if (beta > 256) {
            throw this.error();
        }
        //Convert memory locations of static table
        let hex;
        for (let i = 0; i < keys.length; i++) {
            hex = (alpha + i).toString(16).padStart(4, "0").toUpperCase();
            //Swap the order of bytes to reflect the addressing scheme in 6502a
            this.staticTable[keys[i]] = hex.substr(2) + " " + hex.substr(0, 2);
        }
        //Convert memory locations of heap
        keys = Object.keys(this.heap);
        let offset = 0;
        for (let key of keys) {
            this.heap[key].loc = (beta + offset).toString(16).padStart(2, "0").toUpperCase();
            offset += this.heap[key].data.split(" ").length;
        }
        if (beta + offset > 256) {
            throw this.error();
        }
    }
    backpatch(byteArr) {
        //Pad byteArr with zeros for static locations
        let staticKeys = Object.keys(this.staticTable);
        for (let key of staticKeys) {
            byteArr.push("00");
        }
        //Add heap data to end of byteArr
        let heapKeys = Object.keys(this.heap);
        for (let key of heapKeys) {
            byteArr = byteArr.concat(this.heap[key].data.split(" "));
        }
        let code = byteArr.join(" ");
        //Backpatch static locations
        let regExp;
        for (let key of staticKeys) {
            Log.print(`Backpatching '${key}' to '${this.staticTable[key]}'...`, LogPri.VERBOSE);
            regExp = new RegExp(key, 'g');
            code = code.replace(regExp, this.staticTable[key]);
        }
        //Backpatch static locations
        for (let key of heapKeys) {
            Log.print(`Backpatching '${key}' to '${this.heap[key].loc}'...`, LogPri.VERBOSE);
            regExp = new RegExp(key, 'g');
            code = code.replace(regExp, this.heap[key].loc);
        }
        //Backpatch Jump Points
        let jumpKeys = Object.keys(this.jumpTable);
        for (let key of jumpKeys) {
            Log.print(`Backpatching '${key}' to '${this.jumpTable[key]}'...`, LogPri.VERBOSE);
            regExp = new RegExp(key, 'g');
            code = code.replace(regExp, this.jumpTable[key]);
        }
        return code;
    }
    error() {
        let e = new Error("Program exceeds 256 bytes!");
        e.name = "Pgrm_Overflow";
        return e;
    }
}
function parse(token, pgrmNum) {
    let numWarns = 0;
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
    }
    catch (e) {
        if (e.name === "Parse_Error") {
            Log.print(e, LogPri.ERROR);
            Log.print("");
            Log.print(`Parsed Program ${pgrmNum} with ${numWarns} warnings and 1 errors.`);
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
        let possibleTerminals = ["PRINT", "ID", "INT", "STRING", "BOOLEAN", "WHILE",
            "IF", "LBRACE"];
        if (possibleTerminals.indexOf(token.name) === -1) {
            if (token.symbol !== "}") {
                //StatementList does not contain valid statement and is not empty
                throw error(`Error found at line: ${token.line} col: ${token.col}. ` +
                    `Cannot start a Statement with '${token.symbol}'.`);
            }
        }
        else {
            //Lookahead found a valid token
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
                throw error(`Unexpected token '${token.symbol}' found at line: ${token.line} col: ${token.col}`);
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
        let idNode = branchNode("ID", node);
        match(["ID"], idNode, false);
        match(["="], node);
        parseExpr(node);
    }
    function parseVarDecl(parent) {
        Log.ParseMsg("parseVarDecl()");
        let node = branchNode("VarDecl", parent);
        let type = token;
        parseType(node);
        let name = token;
        let idNode = branchNode("ID", node);
        match(["ID"], idNode, false);
        if (token.symbol === "=") {
            throw error(`Error found at line: ${token.line} col: ${token.col}. ` +
                `Variable declaration and assignment cannot be in the same statement`);
        }
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
                throw error(`Expected TYPE token, found ${token.name} at line: ${token.line} col: ${token.col}`);
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
            case "BOOLVAL":
                parseBooleanExpr(node);
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
    function parseStringExpr(parent) {
        Log.ParseMsg("parseStringExpr()");
        let node = branchNode("StringExpr", parent);
        match(["QUOTE", "CHARLIST", "QUOTE"], node, false);
        if (token.name === "ADD") {
            throw error(`Error on line: ${token.line} col: ${token.col}. String ` +
                `concatenation is not supported. Addition symbol '+' can ` +
                `only be used with single digits/variables`);
        }
    }
    function parseBooleanExpr(parent) {
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
            throw error(`Expected BoolOperation, found '${token.symbol}' at line: ${token.line} col: ${token.col}`);
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
    function nextToken() {
        token = token.next;
    }
    //Create custom Error object
    function error(msg) {
        let e = new Error(msg);
        e.name = "Parse_Error";
        return e;
    }
    //Matches list of tokens by characters formatted as an array of strings.
    //Prints error if match not found.
    function match(tList, parent, isSymbol = true) {
        let tokenSym;
        for (let char of tList) {
            tokenSym = (isSymbol) ? token.symbol : token.name;
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
function analyze(token, pgrmNum) {
    let numWarns = 0;
    //Initial parsing of Program
    try {
        let root = new TNode("Program");
        let sRoot = new SymbolTable(); //Placholder root SymbolTable
        analyzeBlock(root, sRoot);
        //Remove the intial placeholder root nodes
        root = root.children[0];
        root.parent = null;
        sRoot = sRoot.children[0];
        sRoot.parent = null;
        Log.breakLine();
        Log.SemMsg("Checking for unused variables...");
        checkUnusedVars(sRoot);
        Log.breakLine();
        Log.SemMsg("Type checking bool expressions...");
        checkBoolExprs(root, sRoot);
        Log.breakLine();
        Log.print("AST for Program " + pgrmNum + ":", LogPri.VERBOSE);
        Log.print(root.toString(), LogPri.VERBOSE);
        if (!sRoot.isEmpty()) {
            Log.breakLine();
            Log.print(`Program ${pgrmNum} Symbol Table`, LogPri.VERBOSE);
            Log.dottedLine(LogPri.VERBOSE);
            Log.print(sRoot.toString(), LogPri.VERBOSE);
        }
        Log.breakLine();
        Log.print(`Analyzed Program ${pgrmNum} ` +
            `with ${numWarns} warnings and 0 errors`);
        return [root, sRoot];
    }
    catch (e) {
        if (e.name === "Semantic_Error") {
            Log.print(e, LogPri.ERROR);
            Log.print("");
            Log.print(`Analyzed Program ${pgrmNum} with ${numWarns} warnings and 1 errors.`);
            return null;
        }
        else {
            //If the error is not created by my analyzer, continue to throw it
            throw e;
        }
    }
    function checkUnusedVars(sNode) {
        let keys = Object.keys(sNode.table);
        for (let key of keys) {
            let entry = sNode.table[key];
            if (!entry.used) {
                numWarns++;
                if (entry.initialized) {
                    Log.SemMsg(`Variable '${entry.nameTok.symbol}' on ` +
                        `line: ${entry.nameTok.line} was initialized but never used`, LogPri.WARNING);
                }
                else {
                    Log.SemMsg(`Variable '${entry.nameTok.symbol}' was ` +
                        `declared on line: ${entry.nameTok.line} but never used`, LogPri.WARNING);
                }
            }
        }
        let children = sNode.children;
        for (let node of children) {
            checkUnusedVars(node);
        }
    }
    function checkBoolExprs(node, sTable) {
        for (let child of node.children) {
            if (child.name === "BOOL_EXPR") {
                let expr1 = child.children[0];
                let expr2 = child.children[2];
                if (getBoolType(expr1, sTable) === getBoolType(expr2, sTable)) {
                    //Types match
                    continue;
                }
                //Types do not match
                let tok = child.children[1].token;
                throw boolTypeError(tok);
            }
            else if (child.name === "BLOCK") {
                checkBoolExprs(child, sTable.nextChild());
            }
            else if (child.hasChildren) {
                checkBoolExprs(child, sTable);
            }
        }
        return;
    }
    function getBoolType(node, sTable) {
        switch (node.name) {
            case "true":
                return "BOOLEAN";
            case "false":
                return "BOOLEAN";
            case "BOOL_EXPR":
                return "BOOLEAN";
            case "ADD":
                return "INT";
            case "CHARLIST":
                return "STRING";
        }
        if (/^[a-z]$/.test(node.name)) {
            //It's an ID
            return sTable.getType(node.name);
        }
        //It's a single digit`
        return "INT";
    }
    function analyzeBlock(parent, scope) {
        Log.SemMsg("Adding new Block to AST...");
        let node = branchNode("BLOCK", parent);
        Log.SemMsg("Creating new scope in SymbolTable...");
        let sTable = new SymbolTable(scope);
        discard(["{"]);
        analyzeStatements(node, sTable);
        discard(["}"]);
    }
    function analyzeStatements(parent, scope) {
        Log.SemMsg("Analyzing Statement...");
        switch (token.name) {
            case "PRINT":
                analyzePrint(parent, scope);
                break;
            case "ID":
                analyzeAssign(parent, scope);
                break;
            case "INT":
                analyzeVarDecl(parent, scope);
                break;
            case "STRING":
                analyzeVarDecl(parent, scope);
                break;
            case "BOOLEAN":
                analyzeVarDecl(parent, scope);
                break;
            case "WHILE":
                analyzeWhileStatement(parent, scope);
                break;
            case "IF":
                analyzeIfStatement(parent, scope);
                break;
            case "LBRACE":
                analyzeBlock(parent, scope);
                break;
            case "RBRACE":
                //Empty StatementList
                return;
            default:
                //This should never be run
                throw error(`Invalid token ${token.name} found at ${token.line}:${token.col}`);
        }
        //Look at the next statement in (possibly empty) list
        analyzeStatements(parent, scope);
    }
    function analyzePrint(parent, scope) {
        Log.SemMsg("Adding Print Statement to AST...");
        let node = branchNode("PRINT", parent);
        discard(["print", "("]);
        analyzeExpr(node, scope);
        discard([")"]);
    }
    function analyzeExpr(parent, scope) {
        switch (token.name) {
            case "DIGIT":
                analyzeAddExpr(parent, scope);
                break;
            case "QUOTE":
                Log.SemMsg("Adding CharList to AST...");
                discard(['"']);
                let node = branchNode("CHARLIST", parent);
                node.addChild(new TNode(token.symbol, token)); //CHARLIST
                token = token.next;
                discard(['"']);
                break;
            case "LPAREN":
                analyzeBoolExpr(parent, scope);
                break;
            case "BOOLVAL":
                analyzeBoolExpr(parent, scope);
                break;
            case "ID":
                Log.SemMsg(`Scope-checking variable '${token.symbol}'...`);
                //SymbolTable lookup
                let symEntry = getSymEntry(token, scope);
                if (!symEntry.initialized) {
                    numWarns++;
                    Log.breakLine();
                    Log.SemMsg(`Utilizing unintialized variable ` +
                        `'${token.symbol}' at line: ${token.line} col: ${token.col}`, LogPri.WARNING);
                    Log.breakLine();
                }
                symEntry.used = true;
                parent.addChild(new TNode(token.symbol, token));
                token = token.next;
                break;
            default:
                //This should never be called.
                throw error(`Cannot start Expression with [${token.name}] ` +
                    `at ${token.line}:${token.col}`);
        }
    }
    function analyzeAddExpr(parent, scope) {
        if (token.next.symbol === "+") {
            Log.SemMsg("Adding Addition Expr to AST...");
            //ADD Operation
            let node = new TNode(token.next.name, token.next);
            parent.addChild(node);
            //1st DIGIT
            node.addChild(new TNode(token.symbol, token));
            //2nd DIGIT/rest of EXPR
            token = token.next.next;
            if (token.name === "ID") {
                //Type-Check
                let symEntry = getSymEntry(token, scope);
                Log.SemMsg(`Type-checking ${symEntry.typeTok.name} '${symEntry.nameTok.symobl}...'`);
                let type = symEntry.typeTok.name;
                if (type !== "INT") {
                    throw error(`Type Mismatch: Attempted to add [${type}] ` +
                        `to [DIGIT] at line: ${token.line} col: ${token.col}`);
                }
            }
            else if (token.name !== "DIGIT") {
                //Not a DIGIT or a integer variable
                throw error(`Type Mismatch: Attempted to add [${token.name}] ` +
                    `to [DIGIT] at line: ${token.line} col: ${token.col}`);
            }
            analyzeExpr(node, scope);
        }
        else {
            Log.SemMsg("Adding Digit to AST...");
            //Just a DIGIT
            parent.addChild(new TNode(token.symbol, token));
            token = token.next;
        }
    }
    function analyzeBoolExpr(parent, scope) {
        if (token.symbol === "(") {
            Log.SemMsg("Adding BoolExpr to AST...");
            //BooleanExpr
            let node = branchNode("BOOL_EXPR", parent);
            discard(["("]);
            analyzeExpr(node, scope);
            node.addChild(new TNode(token.symbol, token)); //BoolOp (== or !=)
            token = token.next;
            analyzeExpr(node, scope);
            discard([")"]);
        }
        else {
            Log.SemMsg("Adding BoolVal to AST...");
            //BoolVal
            parent.addChild(new TNode(token.symbol, token));
            token = token.next;
        }
    }
    function analyzeAssign(parent, scope) {
        Log.SemMsg("Adding Variable Assignment to AST...");
        //SymbolTable lookup
        Log.SemMsg(`Scope-checking variable '${token.symbol}'...`);
        let symEntry = getSymEntry(token, scope);
        //Type-checking
        let type = symEntry.typeTok.name;
        Log.SemMsg(`Type-checking ${type} '${token.symbol}' assignment...`);
        let value = token.next.next;
        switch (value.name) {
            case "DIGIT":
                //IntExpr
                if (type !== "INT") {
                    throw typeError(symEntry, value, "INT");
                }
                break;
            case "QUOTE":
                //StringExpr
                if (type !== "STRING") {
                    throw typeError(symEntry, value.next, "STRING");
                }
                break;
            case "BOOLVAL":
                //BooleanExpr
                if (type !== "BOOLEAN") {
                    throw typeError(symEntry, value, "BOOLEAN");
                }
                break;
            case "LPAREN":
                //BooleanExpr
                if (type !== "BOOLEAN") {
                    throw typeError(symEntry, value, "BOOLEAN", false);
                }
                break;
            case "ID":
                let valEntry = getSymEntry(value, scope);
                if (valEntry.typeTok.name !== type) {
                    throw typeError(symEntry, value, valEntry.typeTok.name);
                }
                break;
        }
        let node = branchNode("ASSIGN", parent);
        //ID
        node.addChild(new TNode(token.symbol, token));
        token = token.next;
        discard(["="]);
        //VALUE
        analyzeExpr(node, scope);
        //Initialize variable
        symEntry.initialized = true;
    }
    function analyzeVarDecl(parent, scope) {
        Log.SemMsg("Adding Variable Declaration to AST...");
        let node = branchNode("VAR_DECL", parent);
        //TYPE
        node.addChild(new TNode(token.symbol, token));
        let type = token;
        token = token.next;
        //ID
        node.addChild(new TNode(token.symbol, token));
        let name = token;
        token = token.next;
        Log.SemMsg(`Scope-checking variable '${name.symbol}'...`);
        if (scope.table[name.symbol] !== undefined) {
            throw error(`Attempted to redeclare variable '${name.symbol}' at ` +
                `line: ${name.line} col: ${name.col}`);
        }
        Log.SemMsg(`Adding ${type.name} '${name.symbol}' to SymbolTable...`);
        scope.insert(name, type);
    }
    function analyzeWhileStatement(parent, scope) {
        Log.SemMsg("Adding While Loop to AST...");
        let node = branchNode("WHILE", parent);
        discard(["while"]);
        analyzeBoolExpr(node, scope);
        //Block to be run
        analyzeBlock(node, scope);
    }
    function analyzeIfStatement(parent, scope) {
        Log.SemMsg("Adding If Statement to AST...");
        let node = branchNode("IF", parent);
        discard(["if"]);
        //Conditional
        analyzeBoolExpr(node, scope);
        //Block to be run if conditional TRUE
        analyzeBlock(node, scope);
    }
    function getSymEntry(tok, scope) {
        let symEntry = scope.lookup(tok.symbol);
        if (symEntry === undefined) {
            //Cannot find ID in this/higher scope, therefore it is undeclared.
            throw error(`Undeclared variable '${tok.symbol}' ` +
                `found at line: ${tok.line} col: ${tok.col}`);
        }
        return symEntry;
    }
    //Create custom Error object
    function error(msg) {
        let e = new Error(msg);
        e.name = "Semantic_Error";
        return e;
    }
    function boolTypeError(tok) {
        return error(`Type Mismatch in boolean expression at line:${tok.line} col:${tok.col}`);
    }
    function typeError(assignEntry, valToken, valType, displayVal = true) {
        let msg = `Type Mismatch: attempted to assign [${valType}`;
        msg += (displayVal) ? `, ${valToken.symbol}] ` : "] ";
        msg += `to [${assignEntry.typeTok.name}, ${assignEntry.nameTok.symbol}] ` +
            `at line: ${assignEntry.nameTok.line} col: ${assignEntry.nameTok.col}`;
        return error(msg);
    }
    function discard(tList) {
        for (let char of tList) {
            if (token.symbol === char) {
                //Discard the current token and move to the next
                token = token.next;
            }
            else {
                //This should not be called.
                throw error(`Expected '${char}' found '${token.symbol}'` +
                    ` at line: ${token.line} col: ${token.col}.`);
            }
        }
    }
}
class BaseNode {
    constructor(name) {
        this.name = name;
        this.children = [];
        this.parent = null;
        this.siblingIndex = -1;
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
    nextChild() {
        if (this.hasChildren()) {
            this.siblingIndex++;
            if (this.siblingIndex < this.children.length) {
                return this.children[this.siblingIndex];
            }
            else {
                this.siblingIndex = -1;
            }
        }
        return null;
    }
    getSiblings() {
        return this.parent.children;
    }
    resetSiblingIndex() {
        this.siblingIndex = -1;
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
function branchNode(name, parent) {
    let node = new BaseNode(name);
    parent.addChild(node);
    return node;
}
//Token Tree
class TNode extends BaseNode {
    constructor(name, token) {
        super(name);
        this.token = token;
    }
}
/// <reference path="Tree.ts"/>
class SymbolTable extends BaseNode {
    constructor(parent) {
        super(null);
        this.table = {};
        if (parent !== undefined) {
            parent.addChild(this);
        }
    }
    insert(nameTok, typeTok) {
        this.table[nameTok.symbol] = { nameTok: nameTok, typeTok: typeTok,
            initialized: false, used: false };
    }
    setLocation(varName, loc) {
        this.lookup(varName).memLoc = loc;
    }
    getLocation(varName) {
        return this.lookup(varName).memLoc;
    }
    getType(varName) {
        let entry = this.lookup(varName);
        if (entry === undefined) {
            return null;
        }
        return entry.typeTok.name;
    }
    lookup(name) {
        let node = this;
        let entry;
        //Search in this scope first, then search up the tree
        while (node !== null) {
            entry = node.table[name];
            if (entry === undefined) {
                node = node.parent;
            }
            else {
                return entry;
            }
        }
        return undefined;
    }
    toString() {
        let str = "";
        let depth = 0;
        //Print this Symbol Table if its the root
        let keys = Object.keys(this.table);
        let entry;
        for (let i = 0; i < keys.length; i++) {
            entry = this.table[keys[i]];
            str += `[Name: ${entry.nameTok.symbol}, Type: ${entry.typeTok.name},` +
                ` Scope: ${depth}, Line: ${entry.nameTok.line}]\n`;
        }
        function printChildren(node, depth) {
            //Print the SymbolTable's children in order
            depth++;
            let children = node.children;
            for (let i = 0; i < children.length; i++) {
                let keys = Object.keys(children[i].table);
                let entry;
                for (let j = 0; j < keys.length; j++) {
                    entry = children[i].table[keys[j]];
                    str += `[Name: ${entry.nameTok.symbol}, Type: ${entry.typeTok.name}, Scope: `;
                    str += (children.length > 1) ? depth + "-" + i : depth;
                    str += `, Line: ${entry.nameTok.line}]\n`;
                }
            }
            //Print each child's children in order
            for (let i = 0; i < children.length; i++) {
                printChildren(children[i], depth);
            }
        }
        printChildren(this, depth);
        return str;
    }
    length() {
        return Object.keys(this.table).length;
    }
    isEmpty() {
        if (this.length() > 0) {
            return false;
        }
        if (!this.hasChildren()) {
            return true;
        }
        for (let sTable of this.children) {
            if (!sTable.isEmpty()) {
                return false;
            }
        }
        return true;
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
//# sourceMappingURL=compiler.js.map
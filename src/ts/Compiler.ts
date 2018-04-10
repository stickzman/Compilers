function updateDisplay() {
  let hexDiv = document.getElementById("hexDiv");
  let loadDiv = document.getElementById("loading");
  loadDiv.style.display = "block";
  hexDiv.style.display = "none";
  let hexDisplay = <HTMLInputElement>document.getElementById("hexCode");
  hexDisplay.value = "";

  //Call compile with a timeout to allow the display changes to take affect
  setTimeout(compile, 30);
}

function compile() {
  //Get source code
  let source = (<HTMLInputElement>document.getElementById("source")).value;
  let hexDiv = document.getElementById("hexDiv");
  let loadDiv = document.getElementById("loading");
  let hexDisplay = <HTMLInputElement>document.getElementById("hexCode");
  /*
  loadDiv.style.display = "block";
  hexDiv.style.display = "none";
  hexDisplay.value = "";
  */

  Log.clear();

  //Split source code of programs
  let pgrms = source.split("$");
  for (let i = 0; i < pgrms.length; i++) {
    if (i == pgrms.length-1) {
      if (/^\s*$/.test(pgrms[i])) {
        //If the last program is whitespace, delete it
        pgrms.pop();
      }
    } else if (/.*\/\*((?!\*\/).)*$/.test(pgrms[i]) && /^(.(?!\/\*))*\*\//.test(pgrms[i+1])) {
      //If the last and next programs end and begin with unclosed comment blocks,
      //the '$' was inside a comment and the programs should be put back together
      pgrms[i] += "$"; //Add the missing '$'
      pgrms[i] = pgrms[i].concat(pgrms[i+1]);
      pgrms.splice(i+1, 1);
    } else {
      //Add '$' back at the end of the program
      pgrms[i] += "$";
    }
  }

  let lineCount = 1;
  let colCount = 0;
  let memTable: MemoryManager = new MemoryManager();
  let byteCode: string[] = [];
  for (let i = 0; i < pgrms.length; i++) {
    Log.pgrmSeparater();
    Log.print("Lexing Program " + (i+1) + "...");
    let lexRes = lex(pgrms[i], lineCount, colCount, i+1);
    let tokenLinkedList = lexRes[0];
    lineCount = lexRes[1];
    colCount = lexRes[2];
    if (tokenLinkedList === null) {continue;}
    Log.breakLine();
    Log.print("Parsing Program " + (i+1) + "...");
    let CST = parse(tokenLinkedList, i+1);
    if (CST === null) {continue;}
    Log.breakLine();
    Log.print("Analyzing Program " + (i+1) + "...");
    let semRes = analyze(tokenLinkedList, i+1);
    if (semRes === null) {continue;}
    Log.breakLine();
    Log.print("Generating code for Program " + (i+1) + "...");
    let codeArr = genCode(semRes[0], semRes[1], memTable, i+1);
    byteCode = byteCode.concat(codeArr);
  }
  if (byteCode.length === 0) {
    loadDiv.style.display = "none";
    return;
  }
  //Perform backpatching and display machine code
  byteCode.push("00");
  try {
    memTable.correct(byteCode.length);
    Log.breakLine(LogPri.VERBOSE);
    Log.dottedLine(LogPri.VERBOSE);
    let code = memTable.backpatch(byteCode);
    hexDisplay.value = code.padEnd(512, " 00").toUpperCase();
    hexDiv.style.display = "block";
  } catch (e) {
    if (e.name === "Pgrm_Overflow") {
      Log.print("ERROR: " + e.message, LogPri.ERROR);
      loadDiv.style.display = "none";
    } else {
      throw e;
    }
  }
  loadDiv.style.display = "none";
}

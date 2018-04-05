function compile() {
  //Get source code
  let source = (<HTMLInputElement>document.getElementById("source")).value;
  let hexDiv = document.getElementById("hexDiv");
  hexDiv.style.display = "none";
  let hexDisplay = <HTMLInputElement>document.getElementById("hexCode");
  hexDisplay.value = "";

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
  let memTable: MemoryTable = new MemoryTable();
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
    Log.print("Compiling Program " + (i+1) + "...");
    let codeArr = genCode(semRes[0], semRes[1], memTable);
    byteCode = byteCode.concat(codeArr);
  }
  if (byteCode.length === 0) {return;}
  //Perform backpatching and display machine code
  byteCode.push("00");
  memTable.correct(byteCode.length);
  let code = memTable.backpatch(byteCode);
  hexDisplay.value = code.padEnd(512, " 00");
  hexDiv.style.display = "block";
}

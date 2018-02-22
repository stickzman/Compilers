/// <reference path="tests.ts"/>

//Level of priority for a log message
enum LogPri {VERBOSE, INFO, WARNING, ERROR};

function countLines(str: string): number {
  return str.split(/[\n\r]/).length-1;
}

function lastIndexOfNewLine(str): number {
  return Math.max(str.lastIndexOf('\n'), str.lastIndexOf('\r'));
}

function init() {
  //Initialize the Log
  Log.init();
  //Initialize the Program Select
  let progSel = <HTMLSelectElement>document.getElementById("progSel");
  let names = Object.getOwnPropertyNames(tests);
  let opt;
  for (let i = 0; i < names.length; i++) {
    opt = document.createElement("option");
    opt.text = names[i];
    opt.value = names[i];
    progSel.add(opt);
  }

  let consoleElem = document.getElementById("source");
  consoleElem.addEventListener("keydown", function (e) {
    //Reset selected program when edits are made
    if ([33, 34, 37, 38, 39, 40].indexOf(e.keyCode) === -1) {
      progSel.selectedIndex = 0;
    }
    //Allow tabs in Console
    if (e.keyCode == 9) {
      e.preventDefault();
      let elem = <HTMLInputElement>this;
      elem.value += "\t";
    }
  });

}

function loadProgram(name: string) {
  if (name === "Select One") {return;}
  let source = <HTMLInputElement>document.getElementById("source");
  source.value = tests[name];
}

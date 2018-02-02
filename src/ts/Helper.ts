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
  Log.init();
  let progSel = <HTMLSelectElement>document.getElementById("progSel");
  let names = Object.getOwnPropertyNames(tests);
  let opt;
  for (let i = 0; i < names.length; i++) {
    opt = document.createElement("option");
    opt.text = names[i];
    opt.value = names[i];
    progSel.add(opt);
  }
}

function loadProgram(name: string) {
  let source = <HTMLInputElement>document.getElementById("source");
  source.value = tests[name];
}

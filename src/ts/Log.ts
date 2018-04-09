/// <reference path="Helper.ts"/>
class Log {
  private static level: LogPri = LogPri.VERBOSE;
  public static logElem: HTMLInputElement;

  public static init() {
    Log.logElem = <HTMLInputElement>document.getElementById("log");
    let prioityElem = <HTMLSelectElement>document.getElementById("prioritySelect");
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

  public static print(msg: string, priority: LogPri = LogPri.INFO) {
    if (priority >= Log.level) {
      Log.logElem.value += " " + msg + "\n";
      //Scroll Log to bottom bottom when updating
      Log.logElem.scrollTop = Log.logElem.scrollHeight;
    }
  }

  public static clear() {
    Log.logElem.value = "";
  }

  public static updateLevel(level: string) {
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

  public static LexMsg(msg: string, line: number, col: number,
      priority: LogPri = LogPri.INFO, hint?: string) {
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

  public static ParseMsg(msg: string, priority: LogPri = LogPri.VERBOSE) {
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

  public static SemMsg(msg: string, priority: LogPri = LogPri.VERBOSE) {
    let str = "";
    if (priority == LogPri.WARNING) {
      str += "SEMANTIC_WARNING: ";
    } else {
      str += "ANALYZER: ";
    }
    str += msg;
    Log.print(str, priority);
  }

  public static GenMsg(msg: string, priority: LogPri = LogPri.VERBOSE) {
    let str = "CODE_GEN: ";
    str += msg;
    Log.print(str, priority);
  }

  public static isClear(): boolean {
    return Log.logElem.value.replace(/[ \n]/g, "") == "";
  }

  public static isLastLineClear(): boolean {
    let testStr = Log.logElem.value.replace(/ /g, "");
    let i = testStr.lastIndexOf("\n");
    if (i > 0) {
      return testStr[i-1] === "\n";
    } else {
      return Log.isClear();
    }
  }

  public static breakLine(pri: LogPri = LogPri.ERROR) {
    if (!Log.isLastLineClear()) Log.print("", pri);
  }

  public static dottedLine(pri: LogPri) {
    Log.print("-------------------------------------", pri);
  }

  public static pgrmSeparater() {
    if (!Log.isClear()) {
      Log.print("***********************", LogPri.ERROR);
    }
  }

}

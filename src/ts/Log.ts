/// <reference path="Helper.ts"/>
class Log {
  public static level: LogPri = LogPri.WARNING;
  public static logElem: HTMLInputElement;

  public static init() {
    Log.logElem = <HTMLInputElement>document.getElementById("log");
  }

  public static print(msg: string, priority: LogPri = LogPri.VERBOSE) {
    if (priority >= Log.level) {
      Log.logElem.value = Log.logElem.value + msg + "\n";
    }
  }

  private static display(msg: string) {
    Log.logElem.value = Log.logElem.value + msg + "\n";
  }

  public static clear() {
    Log.logElem.value = "";
  }

}

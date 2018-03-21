class BaseNode {
  public children: TNode[] = [];
  public parent: TNode = null;

  constructor(public name: string) {  }

  public addChild(node: TNode) {
    this.children.push(node);
    node.parent = this;
  }

  public isRoot(): boolean {
    return this.parent === null;
  }

  public hasChildren() {
    return this.children.length > 0;
  }

  public getSiblings() {
    return this.parent.children;
  }

  public getLeafNodes() {
    let leaves = [];
    for (let i = 0; i < this.children.length; i++) {
      if (!this.children[i].hasChildren()) {
        leaves.push(this.children[i])
      }
    }
    return leaves;
  }

  public toString() {
    let str = "";
    if (!this.isRoot) {
      str += "**\n";
    }

    function expand(node: TNode, depth: number) {
      for (let i = 0; i < depth; i++) {
        str += "-";
      }
      if (node.hasChildren()) {
        str += "<" + node.name + ">\n";
        for (let i = 0; i < node.children.length; i++) {
          expand(node.children[i], depth+1);
        }
      } else {
        str += "[" + node.name + "]\n";
      }
      return;
    }

    expand(this, 0);

    return str;
  }
}

function branchNode(name: string, parent: TNode) {
  let node = new TNode(name);
  parent.addChild(node);
  return node;
}

//Token Tree
class TNode extends BaseNode {
  constructor(name: string, public token?: Token) {
    super(name);
  }
}

//Symbol Tree
class SNode extends BaseNode {
  public sTable: SymbolTable;

  constructor() {
    super(null);
    this.sTable = new SymbolTable();
  }

  public insert(nameTok: Token, typeTok: Token) {
    this.sTable.insert(nameTok, typeTok);
  }

  public lookup(name: string) {
    return this.sTable.lookup(name);
  }

  public length() {
    return this.sTable.length;
  }
}

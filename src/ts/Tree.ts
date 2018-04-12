class BaseNode {
  public children: BaseNode[] = [];
  public parent: BaseNode = null;
  protected siblingIndex = -1;

  constructor(public name: string) {  }

  public addChild(node: BaseNode) {
    this.children.push(node);
    node.parent = this;
  }

  public isRoot(): boolean {
    return this.parent === null;
  }

  public hasChildren() {
    return this.children.length > 0;
  }

  public nextChild() {
    if (this.hasChildren()) {
      this.siblingIndex++;
      if (this.siblingIndex < this.children.length) {
        return this.children[this.siblingIndex];
      } else {
        this.siblingIndex = -1;
      }
    }
    return null;
  }

  public getSiblings() {
    return this.parent.children;
  }

  public resetSiblingIndex() {
    this.siblingIndex = -1;
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

    function expand(node: BaseNode, depth: number) {
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

function branchNode(name: string, parent: BaseNode) {
  let node = new BaseNode(name);
  parent.addChild(node);
  return node;
}

//Token Tree
class TNode extends BaseNode {
  constructor(name: string, public token?: Token) {
    super(name);
  }
}

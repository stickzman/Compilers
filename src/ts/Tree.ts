class TNode {
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

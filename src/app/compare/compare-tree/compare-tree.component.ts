import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { Report } from '../../shared/interfaces/report';
import { HelperService } from '../../shared/services/helper.service';
import { jqxTreeComponent } from 'jqwidgets-ng/jqxtree';

@Component({
  selector: 'app-compare-tree',
  templateUrl: './compare-tree.component.html',
  styleUrls: ['./compare-tree.component.css'],
})
export class CompareTreeComponent {
  constructor(private helperService: HelperService) {}
  @Output() compareEvent = new EventEmitter<any>();
  @ViewChild('leftTreeReference') leftTreeReference!: jqxTreeComponent;
  @ViewChild('rightTreeReference') rightTreeReference!: jqxTreeComponent;
  syncTrees: boolean = true;
  leftReport: any;
  rightReport: any;

  nodeSelected(data: any, left: boolean) {
    if (this.syncTrees) {
      if (left) {
        this.leftReport = data.owner.selectedItem;
        let path = this.getFullPath(this.leftReport, [this.leftReport.value.name]);
        this.rightReport = this.matchFullPath(this.rightTreeReference.getItems()[0], path);
        if (this.rightReport) {
          this.unfoldTree(this.rightTreeReference, this.rightReport, this.rightReport.parentId);
          this.rightTreeReference.selectItem(this.rightReport);
        }
      } else {
        this.rightReport = data.owner.selectedItem;
        let path = this.getFullPath(this.rightReport, [this.rightReport.value.name]);
        this.leftReport = this.matchFullPath(this.leftTreeReference.getItems()[0], path);
        if (this.leftReport) {
          this.unfoldTree(this.leftTreeReference, this.leftReport, this.leftReport.parentId);
          this.leftTreeReference.selectItem(this.leftReport);
        }
      }
    } else {
      left ? (this.leftReport = data.owner.selectedItem) : (this.rightReport = data.owner.selectedItem);
    }

    this.compareEvent.emit({ leftReport: this.leftReport, rightReport: this.rightReport });
  }

  getParent(checkpoint: any, parentId: string): any {
    let items = checkpoint.treeInstance.items;
    return items.find((item: any) => item.id == parentId);
  }

  unfoldTree(treeReference: any, checkpoint: any, parentId: string) {
    while (parentId.toString() !== '0') {
      treeReference.expandItem(checkpoint);
      parentId = checkpoint.parentId;
      checkpoint = this.getParent(checkpoint, checkpoint.parentId);
    }
  }

  getFullPath(checkpoint: any, pathSoFar: string[]): string[] {
    let parent = this.getParent(checkpoint, checkpoint.parentId);
    if (parent) {
      pathSoFar.push(parent.value.name);
      return this.getFullPath(parent, pathSoFar);
    }

    return pathSoFar;
  }

  matchFullPath(checkpoint: any, path: string[]): any {
    if (path.length === 0) return checkpoint;

    let toBeSelected = null;
    let firstPart = path.shift();
    checkpoint.treeInstance.items.every((item: any) => {
      if (item.value.name === firstPart) {
        let result = this.checkIfSameParents(item, item.parentId, path);
        if (result) {
          toBeSelected = item;
          return false; //Breaking since we found him;
        }
      }
      return true;
    });

    return toBeSelected;
  }

  checkIfSameParents(checkpoint: string, parentId: string, path: string[]): boolean {
    if (path.length === 0) return true;
    let parent = this.getParent(checkpoint, parentId);
    if (parent && parent.value.name == path[0]) {
      path.shift();
      return this.checkIfSameParents(parent, parent.parentId, path);
    }
    return false;
  }

  createTrees(leftReport: Report, rightReport: Report) {
    const leftTree = this.helperService.convertReportToJqxTree(leftReport);
    const rightTree = this.helperService.convertReportToJqxTree(rightReport);
    const both = this.iterateToMakeLabelsRed(leftTree, rightTree);

    this.leftTreeReference.createComponent({ height: '100%', source: [both.left] });
    this.rightTreeReference.createComponent({ height: '100%', source: [both.right] });

    this.selectFirstItem();
  }

  selectFirstItem() {
    this.leftReport = this.leftTreeReference.getItems()[0];
    this.rightReport = this.rightTreeReference.getItems()[0];
    this.leftTreeReference.selectItem(this.leftReport);
    this.rightTreeReference.selectItem(this.rightReport);
    this.compareEvent.emit({
      leftReport: this.leftReport,
      rightReport: this.rightReport,
    });
  }

  makeLabelsRed(left: any, right: any) {
    this.redLabel(left);
    this.redLabel(right);
  }

  redLabel(item: any) {
    item.label = "<span style='color: red;'>" + item.label + '</span>';
  }

  iterateToMakeLabelsRed(leftItem: any, rightItem: any) {
    let result = this.checkIfLabelsDifferent(leftItem, rightItem);
    const shortestTreeLength = Math.min(leftItem.items.length, rightItem.items.length);
    this.makeRestOfTreesRed(shortestTreeLength, rightItem.items, leftItem.items);

    for (let i = 0; i < shortestTreeLength; i++) {
      let both = this.iterateToMakeLabelsRed(leftItem.items[i], rightItem.items[i]);
      leftItem.items[i] = both.left;
      rightItem.items[i] = both.right;
    }

    return result;
  }

  makeRestOfTreesRed(startPoint: number, leftItems: any[], rightItems: any[]) {
    let items = leftItems;
    if (rightItems.length > leftItems.length) items = rightItems;
    for (let i = startPoint; i < items.length; i++) {
      this.redLabel(items[i]);
    }
  }

  checkIfLabelsDifferent(left: any, right: any): { left: any; right: any } {
    if (left.level > -1) {
      if (left.value.message !== right.value.message) this.makeLabelsRed(left, right);
    } else {
      if (left.value.xml !== right.value.xml) this.makeLabelsRed(left, right);
    }

    return { left: left, right: right };
  }
}

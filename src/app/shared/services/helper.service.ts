import { Injectable } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { Report } from '../interfaces/report';
import { CookieService } from 'ngx-cookie-service';
declare var require: any;
const { Buffer } = require('buffer');

@Injectable({
  providedIn: 'root',
})
export class HelperService {
  THROWABLE_ENCODER = 'printStackTrace()';
  constructor(private cookieService: CookieService) {}

  getImage(type: number, encoding: string, even: boolean): string {
    let img = 'assets/tree-icons/';
    switch (type) {
      case 1:
        img += 'startpoint';
        break;
      case 2:
        img += 'endpoint';
        break;
      case 3:
        img += 'abortpoint';
        break;
      case 4:
        img += 'inputpoint';
        break;
      case 5:
        img += 'outputpoint';
        break;
      case 6:
        img += 'infopoint';
        break;
      case 7:
        img += 'threadStartpoint-error'; // Doesn't exist?
        break;
      case 8:
        img += 'threadStartpoint';
        break;
      case 9:
        img += 'threadEndpoint';
        break;
      default:
        return '';
    }

    if (encoding === this.THROWABLE_ENCODER) {
      img += '-error';
    }

    if (even) {
      return img + '-even.gif';
    }
    return img + '-odd.gif';
  }

  isNumber(value: any) {
    return !Number.isNaN(Number.parseInt(value));
  }

  sortData(sort: Sort, data: any[]): any {
    if (!sort.active || sort.direction === '') {
      return;
    }
    data.sort((a, b) => {
      const isAsc: boolean = sort.direction === 'asc';
      const headersA = Object.entries(a);
      const headersB = Object.entries(b);
      for (const [i, element] of headersA.entries()) {
        if (Number(sort.active) === i) {
          return this.isNumber(element[1])
            ? this.compare(Number(element[1]), Number(headersB[i][1]), isAsc)
            : this.compare(String(element[1]), String(headersB[i][1]), isAsc);
        }
      }
      return 0;
    });
  }

  compare(a: number | string, b: number | string, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  download(queryString: string, storage: string, exportBinary: boolean, exportXML: boolean) {
    window.open(
      'api/report/download/' + storage + '/' + exportBinary + '/' + exportXML + '?' + queryString.slice(0, -1)
    );
  }

  convertMessage(report: any): string {
    let message: string = report.message === null ? '' : report.message;
    if (report.encoding == 'Base64') {
      report.showConverted = true;
      message = this.convert(message, 'base64', 'utf8');
    }

    return message;
  }

  convert(message: string, from: string, to: string) {
    return Buffer.from(message, from).toString(to);
  }

  changeEncoding(report: any, button: any): string {
    let message: string;
    if (button.target.innerHTML.includes('Base64')) {
      message = report.message;
      this.setButtonHtml(report, button, 'UTF-8', false);
    } else {
      message = this.convert(report.message, 'base64', 'utf8');
      this.setButtonHtml(report, button, 'Base64', true);
    }

    return message;
  }

  setButtonHtml(report: any, button: any, type: string, showConverted: boolean) {
    report.showConverted = showConverted;
    button.target.title = 'Convert to ' + type;
    button.target.innerHTML = type;
  }

  convertReportToJqxTree(report: Report) {
    let index: number = 0;
    let parentMap: any[] = [];

    let showingId = this.getCheckpointOrStorageId(report, true);
    let rootNode = this.createNode(report, showingId, '', index++, -1);
    this.createChildNodes(rootNode, index, parentMap);
    return rootNode;
  }

  createNode(report: Report, showingId: string, icon: string, index: number, level: number) {
    return {
      label: showingId + report.name,
      icon: icon,
      value: report,
      expanded: true,
      id: Math.random(),
      index: index,
      items: [],
      level: level,
    };
  }

  getCheckpointOrStorageId(checkpoint: any, root: boolean): string {
    if (root && this.cookieService.get('showReportStorageIds')) {
      return this.cookieService.get('showReportStorageIds') === 'true' ? '[' + checkpoint.storageId + '] ' : '';
    } else if (this.cookieService.get('showCheckpointIds')) {
      return this.cookieService.get('showCheckpointIds') === 'true' ? checkpoint.index + '. ' : '';
    } else {
      return '';
    }
  }

  createChildNodes(rootNode: any, index: number, parentMap: any[]) {
    let previousNode = rootNode;
    for (let checkpoint of rootNode.value.checkpoints) {
      const img: string = this.getImage(checkpoint.type, checkpoint.encoding, checkpoint.level % 2 == 0);
      let showingId = this.getCheckpointOrStorageId(checkpoint, false);
      const currentNode: any = this.createNode(checkpoint, showingId, img, index++, checkpoint.level);
      this.createHierarchy(previousNode, currentNode, parentMap);
      previousNode = currentNode;
    }
  }

  createHierarchy(previousNode: any, node: any, parentMap: any[]): void {
    // If the level is higher, then the previous node was its parent
    if (node.level > previousNode.level) {
      this.addChild(previousNode, node, parentMap);

      // If the level is lower, then the previous node is a (grand)child of this node's sibling
    } else if (node.level < previousNode.level) {
      this.findParent(node, previousNode, parentMap);

      // Else the level is equal, meaning the previous node is its sibling
    } else {
      const newParent: any = parentMap.find((x) => x.id == previousNode.id).parent;
      this.addChild(newParent, node, parentMap);
    }
  }

  findParent(currentNode: any, potentialParent: any, parentMap: any[]): any {
    // If the level difference is only 1, then the potential parent is the actual parent
    if (currentNode.level - 1 == potentialParent.level) {
      this.addChild(potentialParent, currentNode, parentMap);
      return currentNode;
    }

    const newPotentialParent: any = parentMap.find((node) => node.id == potentialParent.id).parent;
    return this.findParent(currentNode, newPotentialParent, parentMap);
  }

  addChild(parent: any, node: any, parentMap: any[]): void {
    parentMap.push({ id: node.id, parent: parent });
    parent.items.push(node);
  }
}

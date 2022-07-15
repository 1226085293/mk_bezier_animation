import { _decorator, Component, Node } from 'cc';
import * as cc from 'cc';
import { RollingLottery2 } from './RollingLottery';
const { ccclass, property } = _decorator;

@ccclass('main')
export class main extends Component {
    /* ------------------------------- segmentation ------------------------------- */
    start() {
        let comp = this.node.getComponentInChildren(RollingLottery2);
        comp.jump(-180);
    }
    /* ------------------------------- segmentation ------------------------------- */
    eventItemUpdate(node_: cc.Node, indexN_: number): void {
        node_.getComponentInChildren(cc.Label).string = indexN_ + '';
    }
}

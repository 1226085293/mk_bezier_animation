import { _decorator, Component, Node } from 'cc';
import * as cc from 'cc';
import { RollingLottery } from './RollingLottery';
const { ccclass, property } = _decorator;

@ccclass('main')
export class main extends Component {
    /* ------------------------------- segmentation ------------------------------- */
    start() {
        let comp = this.node.getComponentInChildren(RollingLottery);
        // comp.loop(1500);
        // let indexN = 0;
        // this.node.on(
        //     cc.Node.EventType.TOUCH_END,
        //     () => {
        //         comp.scroll(0, {});
        //     },
        //     this
        // );
        comp.scroll(10, {});

        // comp.reset();
        // comp.loop(-1500);
        // setTimeout(() => {
        //     comp.scroll(-10, {
        //         tweenIndexN: 3,
        //         endCBF: () => {
        //             // comp.scroll(25, {
        //             //     tweenIndexN: 3
        //             // });
        //         }
        //     });
        // }, 3000);
    }
    /* ------------------------------- segmentation ------------------------------- */
    eventItemUpdate(node_: cc.Node, indexN_: number): void {
        node_.getComponentInChildren(cc.Label).string = indexN_ + '';
    }

    eventCenterNode(indexN_: number): void {
        cc.log('当前下标', indexN_);
    }

    eventScrollEnd(): void {
        cc.log('滚动结束');
    }
}

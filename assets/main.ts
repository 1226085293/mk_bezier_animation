import { _decorator, Component, Node } from 'cc';
import * as cc from 'cc';
import { RollingLottery } from './RollingLottery';
import { RotatingLottery } from './RotatingLottery';
const { ccclass, property } = _decorator;

@ccclass('main')
export class main extends Component {
    /** 横向滚动 */
    @property({ displayName: '横向滚动', type: RollingLottery })
    horizontalScroll: RollingLottery = null;

    /** 竖向滚动 */
    @property({ displayName: '竖向滚动', type: RollingLottery })
    verticalScroll: RollingLottery = null;

    /** 旋转转盘 */
    @property({ displayName: '旋转转盘', type: RotatingLottery })
    rotateTurntable: RotatingLottery = null;

    /** 旋转指针 */
    @property({ displayName: '旋转指针', type: RotatingLottery })
    rotateArrow: RotatingLottery = null;
    /* ------------------------------- segmentation ------------------------------- */
    start() {
        let scrollF = async () => {
            let targetIndexN = Math.floor(Math.random() * 100 - 50);
            // cc.log('滚动目标', targetIndexN);
            let task = new Promise<void>((resolveF) => {
                this.horizontalScroll.scroll(targetIndexN, {
                    endCBF: resolveF
                });
            });
            let task2 = new Promise<void>((resolveF) => {
                this.verticalScroll.scroll(targetIndexN, {
                    endCBF: resolveF
                });
            });
            await Promise.all([task, task2]);
            setTimeout(() => {
                scrollF();
            }, 1000);
        };
        scrollF();

        // let rotateF = async () => {
        //     let targetIndexN = Math.floor(Math.random() * 12);
        //     cc.log('旋转目标', targetIndexN);
        //     let task = new Promise<void>((resolveF) => {
        //         this.rotateTurntable.scroll(targetIndexN, {
        //             endCBF: resolveF
        //         });
        //     });
        //     let task2 = new Promise<void>((resolveF) => {
        //         this.rotateArrow.scroll(targetIndexN, {
        //             endCBF: resolveF
        //         });
        //     });
        //     await Promise.all([task, task2]);
        //     setTimeout(() => {
        //         rotateF();
        //     }, 1000);
        // };
        // rotateF();
    }
    /* ------------------------------- segmentation ------------------------------- */
    eventItemUpdate(node_: cc.Node, indexN_: number): void {
        node_.getComponentInChildren(cc.Label).string = indexN_ + '';
    }

    eventCenterNode(indexN_: number): void {
        // cc.log('当前下标', indexN_);
    }

    eventScrollEnd(): void {
        // cc.log('滚动结束');
    }
}

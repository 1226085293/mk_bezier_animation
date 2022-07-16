import { _decorator, Component, Node } from 'cc';
import * as cc from 'cc';
import { BezierCurveAnimation } from './BezierCurveAnimation';
const { ccclass, property, requireComponent } = _decorator;

/** 旋转抽奖方向 */
export enum RotatingLotteryDirection {
    顺时针,
    逆时针
}

/** 旋转抽奖 */
@ccclass('RotatingLottery')
@requireComponent(BezierCurveAnimation)
export class RotatingLottery extends Component {
    /* --------------- 属性 --------------- */
    /** 旋转方向 */
    @property({ displayName: '旋转方向', type: cc.Enum(RotatingLotteryDirection) })
    dire: RotatingLotteryDirection = null;

    /** 旋转指针 */
    @property({ displayName: '旋转指针' })
    rotateArrowB = false;

    /** 旋转对象 */
    @property({ displayName: '旋转对象', type: cc.Node })
    rotateNode: cc.Node = null;

    /** 内容容器 */
    @property({ displayName: '内容容器', type: cc.Node })
    contentNode: cc.Node = null;

    /** 当前下标变更事件 */
    @property({ displayName: '当前下标变更事件', tooltip: '(下标_indexN, 跳过状态_jumpB)', type: cc.EventHandler })
    indexChangeEvent = new cc.EventHandler();

    /** 旋转结束事件 */
    @property({ displayName: '旋转结束事件', type: cc.EventHandler })
    rotateEndEvent = new cc.EventHandler();
    /* --------------- private --------------- */
    /** 滚动状态 */
    private _scrollB = false;
    /** 循环滚动状态 */
    private _loopScrollB = false;
    /** 循环缓动 */
    private _loopTween: cc.Tween<any>;
    /** 当前滚动配置 */
    private _scrollConfig: RotatingLotteryScrollConfig;
    /** 跳过状态 */
    private _jumpB = false;
    /** 目标角度 */
    private _targetAngleN: number;
    /** 上次曲线 Y */
    private _lastCurveYN = 0;
    /** 内容角度区间 */
    private _contentAngleNs: number[] = [];
    /** 特殊角度下标 */
    private _specialAngleIndexN: number;
    /** 当前下标 */
    private _currIndexN = 0;
    /* --------------- public --------------- */
    /** 曲线组件 */
    curveComp: BezierCurveAnimation;
    /** 当前中心下标 */
    get currIndexN() {
        return this._currIndexN;
    }
    set currIndexN(valueN_) {
        this._setCurrIndexN(valueN_);
    }
    /* ------------------------------- get/set ------------------------------- */
    private _setCurrIndexN(valueN_: number) {
        if (valueN_ === this._currIndexN) {
            return;
        }
        this._currIndexN = valueN_;
        this.indexChangeEvent.emit([this._currIndexN, this._jumpB]);
        // logger.log('当前选中', this._currIndexN);
    }
    /* ------------------------------- 生命周期 ------------------------------- */
    onLoad() {
        this._initData();
        this._initEvent();
    }
    /* ------------------------------- 功能 ------------------------------- */
    /** 初始化数据 */
    private _initData(): void {
        this.curveComp = this.getComponent(BezierCurveAnimation);

        // 设置更新事件
        let updateEvent = new cc.EventHandler();
        updateEvent.component = cc.js.getClassName(this);
        updateEvent.handler = '_eventUpdate';
        updateEvent.target = this.node;
        this.curveComp.updateEventAS.push(updateEvent);

        // 设置结束事件
        let endEvent = new cc.EventHandler();
        endEvent.component = cc.js.getClassName(this);
        endEvent.handler = '_eventEnd';
        endEvent.target = this.node;
        this.curveComp.endEventAS.push(endEvent);

        this._updateAngleRange();
    }

    /** 初始化事件 */
    private _initEvent(): void {
        this.node.on(cc.Node.EventType.CHILD_ADDED, this._nodeChildAdded, this);
        this.node.on(cc.Node.EventType.CHILD_REMOVED, this._nodeChildRemoved, this);
    }

    /** 重置 */
    private _reset() {
        this._updateAngleRange();
    }

    /** 更新角度区间 */
    private _updateAngleRange(): void {
        let leftNode: cc.Node;
        let rightNode: cc.Node;
        this.contentNode.children.forEach((v, kN) => {
            // 获取左右节点
            leftNode = this.contentNode.children[kN + 1 === this.contentNode.children.length ? 0 : kN + 1];
            rightNode = this.contentNode.children[kN - 1 < 0 ? this.contentNode.children.length - 1 : kN - 1];

            // 获取当前节点最大角度
            if (leftNode.angle < v.angle) {
                this._contentAngleNs[kN] =
                    v.angle + Math.min((360 + leftNode.angle - v.angle) * 0.5, (v.angle - rightNode.angle) * 0.5);
            } else if (v.angle > rightNode.angle) {
                this._contentAngleNs[kN] =
                    v.angle + Math.min((leftNode.angle - v.angle) * 0.5, (v.angle - rightNode.angle) * 0.5);
            } else {
                this._specialAngleIndexN = kN;
                this._contentAngleNs[kN] =
                    v.angle + Math.min((leftNode.angle - v.angle) * 0.5, (v.angle + (360 - rightNode.angle)) * 0.5);
            }
        });
    }

    /** 获取当前下标 */
    private _getCurrIndex(): number {
        let angleN = this.rotateNode.angle % 360;
        if (angleN < 0) {
            angleN += 360;
        }

        let resultN: number;
        for (let kN = 0, lenN = this._contentAngleNs.length; kN < lenN; ++kN) {
            if (angleN < this._contentAngleNs[kN]) {
                resultN = kN;
                break;
            }
        }
        if (resultN === undefined) {
            resultN = this._specialAngleIndexN;
        }
        if (!this.rotateArrowB) {
            resultN = this._contentAngleNs.length - 1 - resultN;
        }
        return resultN;
    }

    /**
     * 更新运动角度
     * @param indexN_ 目标下标
     */
    private _updateMoveAngle(indexN_: number): void {
        /** 目标节点角度 */
        let targetNodeAngleN = this.contentNode.children[indexN_].angle;
        /** 旋转节点角度 */
        let rotateNodeAngleN = (this.rotateNode.angle %= 360);

        // 计算最终角度
        if (this.dire === RotatingLotteryDirection.顺时针) {
            // 旋转指针
            if (this.rotateArrowB) {
                this._targetAngleN = -(360 - targetNodeAngleN) - rotateNodeAngleN;
                if (this._targetAngleN > rotateNodeAngleN) {
                    this._targetAngleN -= 360;
                }
            }
            // 旋转转盘
            else {
                this._targetAngleN = -targetNodeAngleN - rotateNodeAngleN;
                if (this._targetAngleN > rotateNodeAngleN) {
                    this._targetAngleN -= 360;
                }
            }
            this._targetAngleN %= 360;

            // 添加圈数
            if (!this._jumpB && this._scrollConfig) {
                this._targetAngleN -= this._scrollConfig.turnN * 360;
                this._targetAngleN += this._scrollConfig.offsetAngleN;
            }
        } else {
            // 旋转指针
            if (this.rotateArrowB) {
                this._targetAngleN = targetNodeAngleN - rotateNodeAngleN;
                if (this._targetAngleN < rotateNodeAngleN) {
                    this._targetAngleN += 360;
                }
            }
            // 旋转转盘
            else {
                this._targetAngleN = 360 - targetNodeAngleN - rotateNodeAngleN;
                if (this._targetAngleN < rotateNodeAngleN) {
                    this._targetAngleN += 360;
                }
            }
            this._targetAngleN %= 360;

            // 添加圈数
            if (!this._jumpB && this._scrollConfig) {
                this._targetAngleN += this._scrollConfig.turnN * 360;
                this._targetAngleN += this._scrollConfig.offsetAngleN;
            }
        }
    }

    /** 停止循环 */
    private _stopLoop(): void {
        this._loopTween.stop();
        this._loopTween = null;
        this._loopScrollB = false;
    }

    /**
     * 循环滚动
     * @param speedN_ 速度/秒
     * @param timeSN_ 时间（秒），不填则一直滚动
     */
    loop(speedN_: number, timeSN_?: number): void {
        if (this._scrollB) {
            return;
        }
        this._scrollB = true;
        this._loopScrollB = true;
        let angleN: number;
        this._loopTween = cc
            .tween({ valueN: 0, lastValueN: 0 })
            .repeatForever(
                cc.tween().by(
                    1,
                    {
                        valueN: 1
                    },
                    {
                        onUpdate: (target?: any, ratioN?: number) => {
                            if (!this.isValid) {
                                return;
                            }
                            angleN = (target.valueN - target.lastValueN) * speedN_;
                            if (this.rotateArrowB) {
                                if (this.dire === RotatingLotteryDirection.顺时针) {
                                    angleN = -angleN;
                                }
                            } else {
                                angleN = -angleN;
                                if (this.dire === RotatingLotteryDirection.逆时针) {
                                    angleN = -angleN;
                                }
                            }
                            this.rotateNode.angle += angleN;
                            target.lastValueN = target.valueN;
                            this.currIndexN = this._getCurrIndex();
                        }
                    }
                )
            )
            .start();
        if (timeSN_ !== undefined) {
            this.scheduleOnce(() => {
                this._stopLoop();
            }, timeSN_);
        }
    }

    /**
     * 跳转到指定下标
     * @param indexN_ 目标下标
     * @returns
     */
    jump(indexN_: number): void {
        if (this._scrollB && !this._loopScrollB) {
            return;
        }
        this._scrollB = true;
        this._jumpB = true;

        // 停止循环滚动
        if (this._loopScrollB) {
            this._stopLoop();
        }

        // 更新角度
        this._updateMoveAngle(indexN_);

        // 直接跳转
        this.rotateNode.angle += this._targetAngleN;
        this.currIndexN = this._getCurrIndex();
        this._scrollB = false;
        this._jumpB = false;
    }

    /**
     * 滚动到指定下标
     * @param indexN_ 目标下标
     * @param scrollConfig_ 滚动配置
     * @returns
     */
    scroll(indexN_: number, scrollConfig_?: RotatingLotteryScrollConfig): void {
        if (this._scrollB && !this._loopScrollB) {
            return;
        }
        this._scrollB = true;
        this._scrollConfig = new RotatingLotteryScrollConfig(scrollConfig_);

        // 停止循环滚动
        if (this._loopScrollB) {
            this._stopLoop();
        }

        // 更新角度
        this._lastCurveYN = 0;
        this._updateMoveAngle(indexN_);

        // 开始缓动
        this.curveComp.startTween(this._scrollConfig.tweenIndexNS);
    }
    /* ------------------------------- 自定义事件 ------------------------------- */
    private _eventUpdate(yN_: number, indexN_: number): void {
        this.rotateNode.angle += this._targetAngleN * (yN_ - this._lastCurveYN);
        this._lastCurveYN = yN_;
        this.currIndexN = this._getCurrIndex();
        // cc.log('缓动更新', yN_, indexN_, y2N_, yN_ - this._lastCurveYN);
    }

    private _eventEnd(): void {
        this._scrollB = false;
        this.rotateEndEvent.emit([]);
        this._scrollConfig.endCBF?.();
        // cc.log('缓动结束');
    }
    /* ------------------------------- 节点事件 ------------------------------- */
    private _nodeChildAdded(): void {
        this._reset();
    }
    private _nodeChildRemoved(): void {
        this._reset();
    }
}

/** 滚动配置 */
class RotatingLotteryScrollConfig {
    constructor(init_?: RotatingLotteryScrollConfig) {
        Object.assign(this, init_);
    }
    /** 缓动队列 */
    tweenIndexNS?: number[];
    /** 圈数 */
    turnN? = 1;
    /** 偏移角度 */
    offsetAngleN? = 0;
    /** 结束回调 */
    endCBF?: () => void;
}

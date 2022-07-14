import { _decorator, Component, Node } from 'cc';
import * as cc from 'cc';
import { BezierCurveAnimation } from './BezierCurveAnimation';
import { EDITOR } from 'cc/env';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

/** 旋转抽奖方向 */
export enum RollingLotteryDirection {
    /** 竖 */
    VERTICAL,
    /** 横 */
    HORIZONTAL
}

/** 循环滚动抽奖 */
@ccclass('RollingLottery')
@requireComponent(BezierCurveAnimation)
@requireComponent(cc.Layout)
export class RollingLottery extends Component {
    /* --------------- 属性 --------------- */
    /** 滚动方向 */
    @property({ displayName: '滚动方向', type: cc.Enum(RollingLotteryDirection) })
    dire = RollingLotteryDirection.VERTICAL;

    /** 子节点刷新事件 */
    @property({ displayName: '子节点刷新事件', tooltip: '(子节点_node, 下标_indexN)', type: cc.EventHandler })
    itemUpdateEvent = new cc.EventHandler();
    /* --------------- private --------------- */
    /** 曲线组件 */
    private _curveComp: BezierCurveAnimation;
    /** transform 组件 */
    private _uiTransform: cc.UITransform;
    /** 周长 */
    private _perimeterV3 = cc.v3();
    /** 总距离 */
    private _totalDistV3: cc.Vec3;
    /** 当前下标 */
    private _currIndexN = 0;
    /** 子节点大小 */
    private _ItemSize: cc.Size;
    /** 滚动状态 */
    private _scrollB = false;
    /** 循环状态 */
    private _loopScrollB = false;
    /** 循环缓动 */
    private _loopTween: cc.Tween<any>;
    /** 自己矩形 */
    private _selfRect = cc.rect();
    /** 上次曲线 Y */
    private _lastCurveYN = 0;
    /** 当前目标 */
    private _currTargetN: number;
    /** 当前缓动下标 */
    private _currTweenN = 0;
    /* --------------- 临时变量 --------------- */
    private _tempM4 = cc.mat4();
    private _temp2M4 = cc.mat4();
    /* ------------------------------- 生命周期 ------------------------------- */
    onLoad() {
        this._initData();
        this._initView();
        this._initEvent();
    }
    /* ------------------------------- 功能 ------------------------------- */
    /** 获取在世界坐标系下的节点包围盒(不包含自身激活的子节点范围) */
    private _getBoundingBoxToWorld(node_: cc.Node): cc.Rect {
        let uiTransform = node_.getComponent(cc.UITransform);
        cc.Mat4.fromRTS(this._tempM4, node_.getRotation(), node_.getPosition(), node_.getScale());
        const width = uiTransform.contentSize.width;
        const height = uiTransform.contentSize.height;
        const rect = cc.rect(-uiTransform.anchorPoint.x * width, -uiTransform.anchorPoint.y * height, width, height);

        node_.parent.getWorldMatrix(this._temp2M4);
        cc.Mat4.multiply(this._temp2M4, this._temp2M4, this._tempM4);
        rect.transformMat4(this._temp2M4);
        return rect;
    }

    /**
     * 滚动子节点
     * @param distV3_ 距离
     */
    private _scrollChild(distV3_: cc.Vec3): void {
        /** 当前节点矩形 */
        let currNodeRect: cc.Rect;
        /** 更新节点坐标 */
        let updatePosB = false;
        /** 当前节点 UITransform */
        let currTransform: cc.UITransform;
        /** 头节点 */
        let headNode = this.node.children[0];
        /** 尾节点 */
        let tailNode = this.node.children[this.node.children.length - 1];
        /** 头节点矩形 */
        let headNodeRect: cc.Rect;
        /** 尾节点矩形 */
        let tailNodeRect: cc.Rect;

        // 左右滚动
        if (this.dire === RollingLotteryDirection.HORIZONTAL) {
        }
        // 上下滚动
        else {
            // 从上往下滚动
            if (distV3_.y < 0) {
                this.node.children.forEach((v, kN) => {
                    currTransform = v.getComponent(cc.UITransform);
                    updatePosB = false;
                    currNodeRect = this._getBoundingBoxToWorld(v);

                    // 移动坐标
                    currNodeRect.y += distV3_.y;

                    // 相交则更新节点坐标
                    if (currNodeRect.intersects(this._selfRect)) {
                        updatePosB = true;
                    }
                    // 若不相交则超出范围
                    else {
                        // 若节点在上方则跳过更新
                        if (currNodeRect.yMin > this._selfRect.yMax) {
                            updatePosB = true;
                        } else {
                            // setTimeout 防止获取节点坐标错误、防止 setSiblingIndex 后遍历错误
                            setTimeout(() => {
                                // 切换位置到头节点上方
                                headNodeRect = this._getBoundingBoxToWorld(headNode);
                                v.worldPosition = cc.v3(
                                    v.worldPosition.x,
                                    headNodeRect.yMax + currNodeRect.height * currTransform.anchorY
                                );

                                // 更新 item
                                let indexN = Number(headNode.name) - 1;
                                v.name = indexN + '';
                                this.itemUpdateEvent.emit([v, indexN]);

                                // 更新 item 下标
                                headNode = v;
                                v.setSiblingIndex(0);
                            }, 0);
                        }
                    }

                    // 更新节点坐标
                    if (updatePosB) {
                        v.worldPosition = cc.v3(
                            v.worldPosition.x,
                            currNodeRect.y + currNodeRect.height * currTransform.anchorY
                        );
                    }
                });
            }
            // 从下往上滚动
            else {
                this.node.children.forEach((v, kN) => {
                    currTransform = v.getComponent(cc.UITransform);
                    updatePosB = false;
                    currNodeRect = this._getBoundingBoxToWorld(v);

                    // 移动坐标
                    currNodeRect.y += distV3_.y;

                    // 相交则更新节点坐标
                    if (currNodeRect.intersects(this._selfRect)) {
                        updatePosB = true;
                    }
                    // 若不相交则超出范围
                    else {
                        // 若节点在下方则跳过更新
                        if (this._selfRect.yMin > currNodeRect.yMax) {
                            updatePosB = true;
                        } else {
                            // setTimeout 防止获取节点坐标错误、防止 setSiblingIndex 后遍历错误
                            setTimeout(() => {
                                // 切换位置到尾节点下方
                                tailNodeRect = this._getBoundingBoxToWorld(tailNode);
                                v.worldPosition = cc.v3(
                                    v.worldPosition.x,
                                    tailNodeRect.yMin - currNodeRect.height * (1 - currTransform.anchorY)
                                );

                                // 更新 item
                                let indexN = Number(tailNode.name) + 1;
                                v.name = indexN + '';
                                this.itemUpdateEvent.emit([v, indexN]);

                                // 更新 item 下标
                                tailNode = v;
                                v.setSiblingIndex(this.node.children.length - 1);
                            }, 0);
                        }
                    }

                    // 更新节点坐标
                    if (updatePosB) {
                        v.worldPosition = cc.v3(
                            v.worldPosition.x,
                            currNodeRect.y + currNodeRect.height * currTransform.anchorY
                        );
                    }
                });
            }
        }
    }

    /** 更新运动距离 */
    private _updateMoveDist(indexN_: number): void {
        /** 当前节点 */
        let currNode = this.node.getChildByName(this._currIndexN + '');
        /** 间隔格子 */
        let intervalN = indexN_ - this._currIndexN;
        /** 格子距离 */
        let boxDistN = this.dire === RollingLotteryDirection.HORIZONTAL ? this._ItemSize.width : this._ItemSize.height;
        /** 当前格子距父节点(0, 0)的偏移坐标 */
        let offsetDistV3 = this.node.worldPosition.clone().subtract(currNode.worldPosition);
        // 设置总距离
        if (this.dire === RollingLotteryDirection.HORIZONTAL) {
            this._totalDistV3 = cc.v3(intervalN * boxDistN + offsetDistV3.x);
        } else {
            this._totalDistV3 = cc.v3(0, intervalN * boxDistN + offsetDistV3.y);
        }
    }

    /** 更新数据 */
    private _updateData(): void {
        // 单圈长度
        this._perimeterV3.set(cc.Vec3.ZERO);
        let size: cc.Size;
        this.node.children.forEach((v1) => {
            size = v1.getComponent(cc.UITransform).contentSize;
            this._perimeterV3.add3f(size.x, size.y, 0);
        });
    }

    /** 初始化数据 */
    private _initData(): void {
        this._curveComp = this.node.getComponent(BezierCurveAnimation);
        this._uiTransform = this.node.getComponent(cc.UITransform);
        this._ItemSize = this.node.children[0].getComponent(cc.UITransform).contentSize.clone();

        // 自己矩形
        this._selfRect = this._getBoundingBoxToWorld(this.node);

        // 设置更新事件
        this._curveComp.updateEvent.component = cc.js.getClassName(this);
        this._curveComp.updateEvent.handler = 'updateEvent';
        this._curveComp.updateEvent.target = this.node;

        // 设置结束事件
        this._curveComp.endEvent.component = cc.js.getClassName(this);
        this._curveComp.endEvent.handler = 'endEvent';
        this._curveComp.endEvent.target = this.node;

        this._updateData();
    }

    /** 初始化视图 */
    private _initView(): void {
        // 重置子节点
        this.node.children.forEach((v, kN) => {
            v.name = kN + this._currIndexN + '';
            this.itemUpdateEvent.emit([v, kN + this._currIndexN]);
        });

        this.jump(this._currIndexN);
    }

    /** 初始化事件 */
    private _initEvent(): void {
        this.node.on(cc.Node.EventType.SIBLING_ORDER_CHANGED, this._nodeSiblingOrderChanged, this);
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
        let distV3 = cc.v3();
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
                            if (this.dire === RollingLotteryDirection.HORIZONTAL) {
                                distV3.x = (target.valueN - target.lastValueN) * speedN_;
                            } else {
                                distV3.y = (target.valueN - target.lastValueN) * speedN_;
                            }
                            this._scrollChild(distV3);
                            target.lastValueN = target.valueN;
                        }
                    }
                )
            )
            .start();
        if (timeSN_ !== undefined) {
            this.scheduleOnce(() => {
                this._loopTween.stop();
                this._loopTween = null;
                this._loopScrollB = false;
            }, timeSN_);
        }
    }

    /** 跳转到指定下标 */
    jump(indexN_: number): void {
        if (this._scrollB) {
            return;
        }
        this._scrollB = true;

        // 更新移动距离
        this._updateMoveDist(indexN_);
        // 开始滚动
        this._scrollChild(this._totalDistV3);
        // 更新状态
        this._currIndexN = indexN_;
        this._scrollB = false;
    }

    /** 滚动到指定下标 */
    scroll(indexN_: number): void {
        if (this._scrollB && !this._loopScrollB) {
            return;
        }
        this._scrollB = true;

        // 停止循环滚动
        if (this._loopScrollB) {
            this._loopTween.stop();
            this._loopTween = null;
            this._loopScrollB = false;
        }

        this._currTargetN = indexN_;
        this._lastCurveYN = 0;
        // 更新移动距离
        this._updateMoveDist(indexN_);
        // 开始滚动
        this._currTweenN = 0;
        this._curveComp.startTween(this._currTweenN);
    }
    /* ------------------------------- 自定义事件 ------------------------------- */
    updateEvent(yN_: number, indexN_: number, y2N_: number): void {
        if (this.dire === RollingLotteryDirection.HORIZONTAL) {
        } else {
            this._scrollChild(cc.v3(0, (yN_ - this._lastCurveYN) * this._totalDistV3.y));
        }
        this._lastCurveYN = yN_;
        if (yN_ === undefined) {
            debugger;
        }
        // cc.log('缓动更新', yN_, indexN_, y2N_, yN_ - this._lastCurveYN);
    }

    endEvent(): void {
        this._scrollB = false;
        // 继续缓动
        this._currTweenN++;
        if (this._currTweenN < this._curveComp.tweenUnitAs.length) {
            this._curveComp.startTween(this._currTweenN);
        }
    }
    /* ------------------------------- 节点事件 ------------------------------- */
    private _nodeSiblingOrderChanged(): void {
        this._updateData();
    }
}

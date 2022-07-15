import { _decorator, Component } from 'cc';
import * as cc from 'cc';
import { BezierCurveAnimation } from './BezierCurveAnimation';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

/** 旋转抽奖方向 */
export enum RollingLottery2Direction {
    /** 竖 */
    VERTICAL,
    /** 横 */
    HORIZONTAL
}

/** 循环滚动抽奖 */
@ccclass('RollingLottery2')
@requireComponent(BezierCurveAnimation)
@requireComponent(cc.Layout)
export class RollingLottery2 extends Component {
    /* --------------- 属性 --------------- */
    /** 滚动方向 */
    @property({ displayName: '滚动方向', type: cc.Enum(RollingLottery2Direction) })
    dire = RollingLottery2Direction.VERTICAL;

    /** 子节点刷新事件 */
    @property({ displayName: '子节点刷新事件', tooltip: '(子节点_node, 下标_indexN)', type: cc.EventHandler })
    itemUpdateEvent = new cc.EventHandler();

    /** 中心节点变更事件 */
    @property({ displayName: '中心节点变更事件', tooltip: '(下标_indexN, 跳过状态_jumpB)', type: cc.EventHandler })
    centerNodeEvent = new cc.EventHandler();

    /** 滚动结束事件 */
    @property({ displayName: '滚动结束事件', type: cc.EventHandler })
    scrollEndEvent = new cc.EventHandler();
    /* --------------- private --------------- */
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
    /** 循环滚动状态 */
    private _loopScrollB = false;
    /** 循环缓动 */
    private _loopTween: cc.Tween<any>;
    /** 自己矩形 */
    private _selfRect = cc.rect();
    /** 上次曲线 Y */
    private _lastCurveYN = 0;
    /** 当前缓动下标 */
    private _currTweenIndexN = 0;
    /** 当前滚动配置 */
    private _scrollConfig: RollingLottery2ScrollConfig;
    /** 父节点中心点矩形 */
    private _parentCenterRect: cc.Rect;
    /** 跳过状态 */
    private _jumpB = false;
    /** uiTransform 表 */
    private _uiTransformTab: { [k: string]: cc.UITransform };
    /* --------------- 临时变量 --------------- */
    private _tempM4 = cc.mat4();
    private _temp2M4 = cc.mat4();
    /** 滚动子节点临时变量 */
    private _temp = new (class {
        /** 当前节点矩形 */
        currNodeRect = cc.rect();
        /** 更新节点坐标 */
        updatePosB: boolean;
        /** 当前节点 UITransform */
        currTransform: cc.UITransform;
        /** 当前下标 */
        currIndexN: number;
        /** 超出周长倍数 */
        outOfRangeMultipleN: number;
    })();
    private _temp3Rect = cc.rect();
    /* --------------- public --------------- */
    /** 曲线组件 */
    curveComp: BezierCurveAnimation;
    /** 末尾节点 */
    get tailNode() {
        return this.node.children[0];
    }
    /** 当前中心下标 */
    get currIndexN() {
        return this._currIndexN;
    }
    set currIndexN(valueN_) {
        this.setCurrIndexN(valueN_);
    }
    /* ------------------------------- get/set ------------------------------- */
    setCurrIndexN(valueN_: number) {
        this._currIndexN = valueN_;
        this.centerNodeEvent.emit([this._currIndexN, this._jumpB]);
        // logger.log('当前选中', this._currIndexN);
    }
    /* ------------------------------- 生命周期 ------------------------------- */
    onLoad() {
        this._initData();
        this._initView();
        this._initEvent();
    }
    /* ------------------------------- 功能 ------------------------------- */
    /** 获取在世界坐标系下的节点包围盒(不包含自身激活的子节点范围) */
    private _getBoundingBoxToWorld(node_: cc.Node, outRect_ = cc.rect()): cc.Rect {
        let uiTransform = this._uiTransformTab[node_.uuid];
        cc.Mat4.fromRTS(this._tempM4, node_.getRotation(), node_.getPosition(), node_.getScale());
        const width = uiTransform.contentSize.width;
        const height = uiTransform.contentSize.height;
        outRect_.set(-uiTransform.anchorPoint.x * width, -uiTransform.anchorPoint.y * height, width, height);

        node_.parent.getWorldMatrix(this._temp2M4);
        cc.Mat4.multiply(this._temp2M4, this._temp2M4, this._tempM4);
        outRect_.transformMat4(this._temp2M4);
        return outRect_;
    }

    /** 更新节点下标 */
    private _updateNodeIndex(node_: cc.Node, indexN_: number): void {
        node_.name = String(indexN_);
        this.itemUpdateEvent.emit([node_, indexN_]);
    }

    /** 上到下移动子节点 */
    private _moveNodeTopToBottom(distN_: number): void {
        this.node.children.forEach((v, kN) => {
            this._temp.currTransform = this._uiTransformTab[v.uuid];
            this._temp.updatePosB = false;
            this._getBoundingBoxToWorld(v, this._temp.currNodeRect);

            // 移动坐标
            this._temp.currNodeRect.y += distN_;

            // 相交则更新节点坐标
            if (this._temp.currNodeRect.intersects(this._selfRect)) {
                this._temp.updatePosB = true;
            }
            // 若不相交则超出范围
            else {
                // 若节点在上方则跳过更新
                if (this._temp.currNodeRect.yMin > this._selfRect.yMax) {
                    this._temp.updatePosB = true;
                } else {
                    // (超出范围 / 周长) + 超出视图区域的 1
                    this._temp.outOfRangeMultipleN =
                        Math.floor((this._selfRect.yMin - this._temp.currNodeRect.yMax) / this._perimeterV3.y) + 1;

                    // 更新坐标
                    this._temp.currNodeRect.y += this._temp.outOfRangeMultipleN * this._perimeterV3.y;
                    v.worldPosition = cc.v3(
                        v.worldPosition.x,
                        this._temp.currNodeRect.y + this._ItemSize.height * this._temp.currTransform.anchorY
                    );

                    // 更新 item 下标
                    this._updateNodeIndex(
                        v,
                        Number(v.name) - this._temp.outOfRangeMultipleN * this.node.children.length
                    );
                }
            }

            // 更新节点坐标
            if (this._temp.updatePosB) {
                v.worldPosition = cc.v3(
                    v.worldPosition.x,
                    this._temp.currNodeRect.y + this._temp.currNodeRect.height * this._temp.currTransform.anchorY
                );
            }

            // 更新当前下标
            this._temp.currIndexN = Number(v.name);

            if (
                this._temp.currIndexN < this._currIndexN &&
                cc.Rect.intersection(this._temp3Rect, this._temp.currNodeRect, this._parentCenterRect).height >=
                    this._parentCenterRect.height * 0.5
            ) {
                this.currIndexN = this._temp.currIndexN;
            }
        });
    }

    /** 下到上移动子节点 */
    private _moveNodeBottomToTop(distN_: number): void {
        this.node.children.forEach((v, kN) => {
            this._temp.currTransform = this._uiTransformTab[v.uuid];
            this._temp.updatePosB = false;
            this._getBoundingBoxToWorld(v, this._temp.currNodeRect);

            // 移动坐标
            this._temp.currNodeRect.y += distN_;

            // 相交则更新节点坐标
            if (this._temp.currNodeRect.intersects(this._selfRect)) {
                this._temp.updatePosB = true;
            }
            // 若不相交则超出范围
            else {
                // 若节点在下方则跳过更新
                if (this._selfRect.yMin > this._temp.currNodeRect.yMax) {
                    this._temp.updatePosB = true;
                } else {
                    // (超出范围 / 周长) + 超出视图区域的 1
                    this._temp.outOfRangeMultipleN =
                        Math.floor((this._temp.currNodeRect.yMin - this._selfRect.yMax) / this._perimeterV3.y) + 1;

                    // 更新坐标
                    this._temp.currNodeRect.y -= this._temp.outOfRangeMultipleN * this._perimeterV3.y;
                    v.worldPosition = cc.v3(
                        v.worldPosition.x,
                        this._temp.currNodeRect.y + this._ItemSize.height * this._temp.currTransform.anchorY
                    );

                    // 更新 item 下标
                    this._updateNodeIndex(
                        v,
                        Number(v.name) + this._temp.outOfRangeMultipleN * this.node.children.length
                    );
                }
            }

            // 更新节点坐标
            if (this._temp.updatePosB) {
                v.worldPosition = cc.v3(
                    v.worldPosition.x,
                    this._temp.currNodeRect.y + this._temp.currNodeRect.height * this._temp.currTransform.anchorY
                );
            }

            // 更新当前下标
            this._temp.currIndexN = Number(v.name);
            if (
                this._temp.currIndexN > this._currIndexN &&
                cc.Rect.intersection(this._temp3Rect, this._temp.currNodeRect, this._parentCenterRect).height >=
                    this._parentCenterRect.height * 0.5
            ) {
                this.currIndexN = this._temp.currIndexN;
            }
        });
    }

    /**
     * 滚动子节点
     * @param distV3_ 距离
     */
    private _scrollChild(distV3_: cc.Vec3): void {
        // 左右滚动
        if (this.dire === RollingLottery2Direction.HORIZONTAL) {
            cc.error('未实现');
            // ...
        }
        // 上下滚动
        else {
            // 从上往下滚动
            if (distV3_.y < 0) {
                this._moveNodeTopToBottom(distV3_.y);
            }
            // 从下往上滚动
            else if (distV3_.y > 0) {
                this._moveNodeBottomToTop(distV3_.y);
            }
        }
    }

    /** 更新运动距离 */
    private _updateMoveDist(indexN_: number): void {
        /** 当前节点 */
        let currNode = this.node.getChildByName(String(this._currIndexN));
        /** 间隔格子 */
        let intervalN = indexN_ - this._currIndexN;
        /** 格子距离 */
        let boxDistN = this.dire === RollingLottery2Direction.HORIZONTAL ? this._ItemSize.width : this._ItemSize.height;
        /** 当前格子距父节点(0, 0)的偏移坐标 */
        let offsetDistV3 = this.node.worldPosition.clone().subtract(currNode.worldPosition);
        // 设置总距离
        if (this.dire === RollingLottery2Direction.HORIZONTAL) {
            this._totalDistV3 = cc.v3(intervalN * boxDistN + offsetDistV3.x);
        } else {
            this._totalDistV3 = cc.v3(0, intervalN * boxDistN + offsetDistV3.y);
        }
    }

    /** 初始化数据 */
    private _initData(): void {
        this.curveComp = this.node.getComponent(BezierCurveAnimation);

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

        this._updateData();
    }

    /** 更新数据 */
    private _updateData(): void {
        this._ItemSize = this.node.children[0].getComponent(cc.UITransform).contentSize.clone();

        // item 大小矩形，中心点在节点 (0, 0) 位置
        this._parentCenterRect = cc.rect(
            this.node.worldPosition.x - this._ItemSize.width * 0.5,
            this.node.worldPosition.y - this._ItemSize.height * 0.5,
            this._ItemSize.width,
            this._ItemSize.height
        );

        // 重置数据
        this._uiTransformTab = Object.create(null);
        this._uiTransformTab[this.node.uuid] = this.node.getComponent(cc.UITransform);
        this._selfRect = this._getBoundingBoxToWorld(this.node);
        this._perimeterV3.set(cc.Vec3.ZERO);

        // 更新 _uiTransformTab, _perimeterV3
        let itemSize: cc.Size;
        this.node.children.forEach((v1) => {
            this._uiTransformTab[v1.uuid] = v1.getComponent(cc.UITransform);
            itemSize = this._uiTransformTab[v1.uuid].contentSize;
            this._perimeterV3.add3f(itemSize.x, itemSize.y, 0);
        });
    }

    /** 初始化视图 */
    private _initView(): void {
        this.node.getComponent(cc.Layout).enabled = false;

        // 初始化子节点及选中
        if (this.node.children.length) {
            // 重置子节点
            this.node.children.forEach((v, kN) => {
                v.name = String(kN + this._currIndexN);
                this.itemUpdateEvent.emit([v, kN + this._currIndexN]);
            });

            this.jump(this._currIndexN);
        }
    }

    /** 初始化事件 */
    private _initEvent(): void {
        this.node.on(cc.Node.EventType.CHILD_ADDED, this._nodeChildAdded, this);
        this.node.on(cc.Node.EventType.CHILD_REMOVED, this._nodeChildRemoved, this);
    }

    /** 重置 */
    reset(): void {
        this._updateData();
        this._initView();
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
                            if (!this.isValid) {
                                return;
                            }
                            if (this.dire === RollingLottery2Direction.HORIZONTAL) {
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
        if (this._scrollB && !this._loopScrollB) {
            return;
        }
        this._scrollB = true;
        this._jumpB = true;

        // 停止循环滚动
        if (this._loopScrollB) {
            this._loopTween.stop();
            this._loopTween = null;
            this._loopScrollB = false;
        }

        // 更新移动距离
        this._updateMoveDist(indexN_);
        // 开始滚动
        this._scrollChild(this._totalDistV3);
        // 更新状态
        this.currIndexN = indexN_;
        this._scrollB = false;
        this._jumpB = false;
    }

    /** 滚动到指定下标 */
    scroll(indexN_: number, scrollConfig_?: RollingLottery2ScrollConfig): void {
        if (this._scrollB && !this._loopScrollB) {
            return;
        }
        this._scrollB = true;
        this._scrollConfig = new RollingLottery2ScrollConfig(scrollConfig_);

        // 停止循环滚动
        if (this._loopScrollB) {
            this._loopTween.stop();
            this._loopTween = null;
            this._loopScrollB = false;
        }

        this._lastCurveYN = 0;
        // 更新移动距离
        this._updateMoveDist(indexN_);
        // 开始滚动
        this._currTweenIndexN = this._scrollConfig.tweenIndexN;
        this.curveComp.startTween(this._currTweenIndexN);
    }
    /* ------------------------------- 自定义事件 ------------------------------- */
    private _eventUpdate(yN_: number, indexN_: number, y2N_: number): void {
        if (this.dire === RollingLottery2Direction.HORIZONTAL) {
            cc.error('未实现');
            // ...
        } else {
            this._scrollChild(cc.v3(0, (yN_ - this._lastCurveYN) * this._totalDistV3.y));
        }
        this._lastCurveYN = yN_;
        // cc.log('缓动更新', yN_, indexN_, y2N_, yN_ - this._lastCurveYN);
    }

    private _eventEnd(): void {
        this._scrollB = false;

        // 继续缓动
        if (this._scrollConfig.nextPlayB && ++this._currTweenIndexN < this.curveComp.tweenUnitAS.length) {
            this.curveComp.startTween(this._currTweenIndexN);
        } else {
            this.scrollEndEvent.emit([]);
            this._scrollConfig.endCBF?.();
        }
    }
    /* ------------------------------- 节点事件 ------------------------------- */
    private _nodeChildAdded(): void {
        this.reset();
    }
    private _nodeChildRemoved(): void {
        this.reset();
    }
}

/** 滚动配置 */
class RollingLottery2ScrollConfig {
    constructor(init_?: RollingLottery2ScrollConfig) {
        Object.assign(this, init_);
    }
    /** 指定缓动单元下标 */
    tweenIndexN? = 0;
    /** 继续下个缓动单元播放 */
    nextPlayB? = false;
    /** 结束回调 */
    endCBF?: () => void;
}

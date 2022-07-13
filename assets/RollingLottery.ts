import { _decorator, Component, Node } from 'cc';
import * as cc from 'cc';
import { BezierCurveAnimation } from './BezierCurveAnimation';
const { ccclass, property, requireComponent } = _decorator;

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
    private _perimeterN: number;
    /** 当前距离 */
    private _currDistN = 0;
    /** 总距离 */
    private _totalDistN: number;
    /** 当前下标 */
    private _currIndexN: number;
    /** 子节点大小 */
    private _ItemSize: cc.Size;
    /** 运动状态 */
    private _scrollB = false;
    /** 自己矩形 */
    private _selfRect = cc.rect();
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
    /**
     * 获取格子移动后距离
     * @param currIndexN_ 当前格子下标
     * @param targetIndexN_ 目标格子下标
     * @returns
     */
    private _getItemMovePos(currIndexN_: number, targetIndexN_: number): void {
        /** 当前节点 */
        let currNode = this.node.getChildByName(currIndexN_ + '');
        /** 节点矩形 */
        let currRect = this._getBoundingBoxToWorld(currNode);
        /** 移动距离 */
        let moveDistV3 = cc.v3(this._ItemSize.x, this._ItemSize.y).multiplyScalar(targetIndexN_ - currIndexN_);
        /** 移动距离 */
        let moveDistN: number;
        if (this.dire === RollingLotteryDirection.HORIZONTAL) {
            moveDistV3.y = 0;
            moveDistN = moveDistV3.x;
        } else {
            moveDistV3.x = 0;
            moveDistN = moveDistV3.y;
        }
        currRect.x += moveDistV3.x;
        currRect.y += moveDistV3.y;

        /** 终点坐标 */
        let endPosV3 = this.node
            .getChildByName(currIndexN_ + '')
            .worldPosition.clone()
            .add(moveDistV3);
        /** 圈数 */
        let circleN = Math.floor(moveDistN / this._perimeterN);
        // /** 额外移动距离 */
        // let extraMoveDistN = moveDistN - circleN * this._perimeterN;
    }

    /** 获取在世界坐标系下的节点包围盒(不包含自身激活的子节点范围) */
    private _getBoundingBoxToWorld(node_: cc.Node): cc.Rect {
        node_.getWorldMatrix(this._temp2M4);
        cc.Mat4.fromRTS(this._tempM4, this.node.getRotation(), this.node.getPosition(), this.node.getScale());
        let width = this._uiTransform.contentSize.width;
        let height = this._uiTransform.contentSize.height;
        let rect = new cc.Rect(
            -this._uiTransform.anchorPoint.x * width,
            -this._uiTransform.anchorPoint.y * height,
            width,
            height
        );
        cc.Mat4.multiply(this._temp2M4, this._temp2M4, this._tempM4);
        rect.transformMat4(this._temp2M4);
        return rect;
    }

    /** 检测参数节点是否与当前节点碰撞 */
    private _checkCollision(node_: cc.Node): boolean {
        let rect = this._getBoundingBoxToWorld(this.node);
        let rect2 = this._getBoundingBoxToWorld(node_);
        // 增加保险范围
        rect.width += rect.width * 0.5;
        rect.height += rect.height * 0.5;
        rect.x -= rect.width * 0.25;
        rect.y -= rect.height * 0.25;
        return rect.intersects(rect2);
    }

    /** 更新运动距离 */
    private _updateMoveDist(indexN_: number): void {
        /** 间隔格子 */
        let intervalN = indexN_ - this._currIndexN;
        /** 格子距离 */
        let boxDistN = this.dire === RollingLotteryDirection.HORIZONTAL ? this._ItemSize.width : this._ItemSize.height;
        /** 超出当前格子距离 */
        let overDistN = this._currDistN - boxDistN * this._currIndexN;
        // 设置总距离
        this._totalDistN = intervalN * boxDistN - overDistN;
    }

    /** 更新数据 */
    private _updateData(): void {
        // 单圈长度
        this._perimeterN = 0;
        this.node.children.forEach((v1) => {
            this._perimeterN += v1.getComponent(cc.UITransform).height;
        });
        // 重置距离
        this._currDistN = 0;
    }

    /** 初始化数据 */
    private _initData(): void {
        this._curveComp = this.node.getComponent(BezierCurveAnimation);
        this._uiTransform = this.node.getComponent(cc.UITransform);
        this._ItemSize = this.node.children[0].getComponent(cc.UITransform).contentSize.clone();

        // 设置更新事件
        this._curveComp.updateEvent.component = cc.js.getClassName(this);
        this._curveComp.updateEvent.handler = 'updateEvent';

        // 设置结束事件
        this._curveComp.endEvent.component = cc.js.getClassName(this);
        this._curveComp.endEvent.handler = 'updateEvent';

        // 更新当前距离
        {
            let distV3 = this.node.worldPosition.clone().subtract(this.node.children[0].worldPosition);
            this._currDistN = this.dire === RollingLotteryDirection.HORIZONTAL ? distV3.x : distV3.y;
        }

        // 自己矩形
        this._selfRect = this._getBoundingBoxToWorld(this.node);

        this._updateData();
    }

    /** 初始化视图 */
    private _initView(): void {
        this.scroll(0);
    }

    /** 初始化事件 */
    private _initEvent(): void {
        this.node.on(cc.Node.EventType.SIBLING_ORDER_CHANGED, this._nodeSiblingOrderChanged, this);
    }

    /**
     * 循环滚动
     * @param speedN_ 速度
     * @param timeSN_ 时间（秒），不填则一直滚动
     */
    loop(speedN_: number, timeSN_?: number): void {}

    /** 滚动到指定下标 */
    scroll(indexN_: number, timeSN_?: number): void {
        this._scrollB = true;
        this._updateMoveDist(indexN_);

        /** 移动距离 */
        let moveDistN = this._totalDistN - this._currDistN;

        // 直接跳转
        if (!timeSN_) {
            /** 圈数 */
            let circleN = Math.floor(moveDistN / this._perimeterN);
            /** 额外移动距离 */
            let extraMoveDistN = moveDistN - circleN * this._perimeterN;
        }
    }
    /* ------------------------------- 自定义事件 ------------------------------- */
    tweenSwitchEvent(indexN_: number): void {
        // cc.log('缓动切换', indexN_);
    }
    updateEvent(yN_: number): void {
        // cc.log('缓动更新', yN_);
    }
    endEvent(): void {
        // cc.log('缓动结束');
    }

    /** 子节点更新 */
    childUpdate(node_: cc.Node, indexN_: number): void {
        node_.getComponentInChildren(cc.Label).string = indexN_ + '';
    }
    /* ------------------------------- 节点事件 ------------------------------- */
    private _nodeSiblingOrderChanged(): void {
        this._updateData();
    }
}

import { _decorator, Component, Node } from 'cc';
import * as cc from 'cc';
import { EDITOR } from 'cc/env';
import BezierCurve from './BezierCurve';
const { ccclass, property } = _decorator;

/** 缓动枚举 */
let easingEnum = {};
{
    let tempN = 0;
    for (let kS in cc.easing) {
        easingEnum[kS] = tempN;
        easingEnum[tempN] = kS;
        tempN++;
    }
}

/** 缓动单元 */
@ccclass('BezierCurveAnimationTweenUnit')
class BezierCurveAnimationTweenUnit {
    /* --------------- 属性 --------------- */
    /** 自定义缓动曲线 */
    @property({ displayName: '自定义缓动曲线' })
    customCurveB = false;

    /** 缓动曲线 */
    @property({
        displayName: '缓动曲线',
        type: cc.Enum(easingEnum),
        visible: function (this: BezierCurveAnimationTweenUnit) {
            return !this.customCurveB;
        }
    })
    easing = 0;

    /** 缓动控制点 */
    @property({
        displayName: '控制点',
        type: [cc.Vec3],
        visible: function (this: BezierCurveAnimationTweenUnit) {
            return this.customCurveB;
        }
    })
    controlPointV3S: cc.Vec3[] = [];

    /** 时间（秒） */
    @property({ displayName: '时间（秒）' })
    timeSN = 0;
}

/** 贝塞尔曲线通用动画组件 */
@ccclass('BezierCurveAnimation')
export class BezierCurveAnimation extends Component {
    /* --------------- 属性 --------------- */
    /** 缓动单元 */
    @property({ displayName: '缓动单元', type: [BezierCurveAnimationTweenUnit] })
    tweenUnitAs: BezierCurveAnimationTweenUnit[] = [];

    /** 缓动切换事件 */
    @property({ displayName: '缓动切换事件', tooltip: '(当前缓动下标_indexN)', type: cc.EventHandler })
    tweenSwitchEvent = new cc.EventHandler();

    /** 更新事件 */
    @property({
        displayName: '更新事件',
        tooltip: '(总曲线Y_yN, 当前缓动下标_indexN, 当前缓动曲线Y_yN)',
        type: cc.EventHandler
    })
    updateEvent = new cc.EventHandler();

    /** 结束事件 */
    @property({ displayName: '结束事件', type: cc.EventHandler })
    endEvent = new cc.EventHandler();
    /* --------------- private --------------- */
    /* ------------------------------- segmentation ------------------------------- */
    /**
     * 开始缓动
     * @param startIndexN_ 缓动开始下标
     * @param endIndexN_ 缓动结束下标
     * @returns
     */
    startTween(startIndexN_?: number, endIndexN_ = (startIndexN_ ?? 0) + 1): cc.Tween<any> {
        let tweenUnitAs = this.tweenUnitAs;
        if (startIndexN_ !== undefined) {
            tweenUnitAs = tweenUnitAs.slice(startIndexN_, endIndexN_);
        }
        /** 总时间（秒） */
        let totalTimeSN = tweenUnitAs.reduce((preValue, currValue) => preValue + currValue.timeSN, 0);
        /** 时间占比 */
        let timeRatioNs: number[] = [];
        {
            let currN = 0;
            tweenUnitAs.forEach((v, kN) => {
                let ratioN = v.timeSN / totalTimeSN;
                currN += ratioN;
                timeRatioNs.push(currN);
            });
        }
        /** 曲线函数 */
        let curveFS = tweenUnitAs.map((v) => {
            if (v.customCurveB) {
                let curve = new BezierCurve(v.controlPointV3S);
                return (kN: number) => {
                    return curve.point(kN).y;
                };
            } else {
                return cc.easing[easingEnum[v.easing]].bind(cc.easing) as (kN: number) => number;
            }
        });
        /** 上次缓动下标 */
        let lastTweenIndexN = 0;
        /** 缓动对象 */
        let tweenTarget = { valueN: 0 };
        /** 缓动 */
        let tween = cc
            .tween(tweenTarget)
            .to(
                totalTimeSN,
                {
                    valueN: 1
                },
                {
                    onUpdate: (target: typeof tweenTarget, ratioN: number) => {
                        /** 当前缓动下标 */
                        let tweenIndexN = timeRatioNs.findIndex((vN) => ratioN <= vN);
                        if (tweenIndexN === -1) {
                            return;
                        }
                        /** 上个时间占比 */
                        let lastTimeRatioN = tweenIndexN ? timeRatioNs[tweenIndexN - 1] : 0;
                        /** 当前时间范围 */
                        let timeRangeN = timeRatioNs[tweenIndexN] - lastTimeRatioN;
                        /** 曲线位置 */
                        let posN = (ratioN - lastTimeRatioN) / timeRangeN;
                        /** 曲线位置 */
                        let yN = curveFS[tweenIndexN](posN);
                        let y2N = yN * timeRangeN + lastTimeRatioN;
                        // 缓动切换事件触发
                        if (lastTweenIndexN !== tweenIndexN) {
                            this.tweenSwitchEvent?.emit([lastTweenIndexN]);
                        }
                        // 更新事件触发
                        this.updateEvent?.emit([y2N, tweenIndexN, yN]);
                        // 更新缓动下标
                        lastTweenIndexN = tweenIndexN;
                    }
                }
            )
            .call(() => {
                // 结束事件触发
                this.endEvent?.emit([]);
            })
            .start();
        return tween;
    }
}

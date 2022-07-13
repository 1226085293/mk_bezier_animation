import * as cc from 'cc';

/** 贝塞尔曲线 */
class BezierCurve {
    constructor(pointAs_?: cc.Vec3[]) {
        this.pointV3S = pointAs_;
        this._resetData();
    }
    /* --------------- private --------------- */
    private _distanceNS: number[] = [];
    private _funcFSS: Function[][] = [];
    /** 控制点 */
    private _pointV3S!: cc.Vec3[];
    /* --------------- public --------------- */
    /** 控制点 */
    get pointV3S() {
        return this._pointV3S;
    }
    set pointV3S(valueV3S) {
        this._pointV3S = valueV3S;
        this._resetData();
    }
    /* ------------------------------- 功能函数 ------------------------------- */
    /** 重置数据 */
    private _resetData(): void {
        if (this._pointV3S.length < 2) {
            return;
        }
        /** 首尾相等 */
        let equalsB = this._pointV3S[0].strictEquals(this._pointV3S[this._pointV3S.length - 1]);
        /** 总距离 */
        let sumDistanceN = 0;
        /** 临时变量 */
        let tempV3: cc.Vec3;
        let temp2V3: cc.Vec3;
        let temp3V3: cc.Vec3;
        let temp4V3: cc.Vec3;
        for (let kN = 0, lenN = this._pointV3S.length - 1; kN < lenN; kN++) {
            if (kN === 0) {
                tempV3 = equalsB ? this._pointV3S[this._pointV3S.length - 2] : this._pointV3S[0];
            } else {
                tempV3 = this._pointV3S[kN - 1];
            }
            temp2V3 = this._pointV3S[kN];
            temp3V3 = this._pointV3S[kN + 1];

            if (kN + 1 === this._pointV3S.length - 1) {
                temp4V3 = equalsB ? this._pointV3S[1] : this._pointV3S[this._pointV3S.length - 1];
            } else {
                temp4V3 = this._pointV3S[kN + 2];
            }

            this._funcFSS[kN] = [];
            [this._funcFSS[kN][0], this._funcFSS[kN][1]] = this._curve(tempV3, temp2V3, temp3V3, temp4V3);

            sumDistanceN += this._gaussLegendre(this._funcFSS[kN][1] as any, 0, 1);
            this._distanceNS[kN] = sumDistanceN;
        }
    }

    /**
     * 递归阶乘
     * @param valueN_
     * @returns
     */
    private _factorial(valueN_: number): number {
        let resultN = 1;
        for (let kN = 2; kN <= valueN_; ++kN) {
            resultN *= kN;
        }
        return resultN;
    }

    /**
     * 高斯—勒让德积分公式可以用较少节点数得到高精度的计算结果
     * @param valueF_ 曲线长度变化率,用于匀速曲线运动
     * @param valueN_ 左区间
     * @param value2N_ 右区间
     * @returns
     */
    private _gaussLegendre(valueF_: (vN: number) => number, valueN_: number, value2N_: number): number {
        // 3次系数
        let gauFactor = {
            0.7745966692: 0.555555556,
            0: 0.8888888889
        };
        // 5次系数
        // let GauFactor = {0.9061798459:0.2369268851,0.5384693101:0.4786286705,0:0.5688888889}
        // 积分
        let gauSumN = 0;
        let keyN: number;
        for (let key in gauFactor) {
            if (Object.prototype.hasOwnProperty.call(gauFactor, key)) {
                keyN = Number(key);
                let v = gauFactor[key];
                let t = ((value2N_ - valueN_) * keyN + valueN_ + value2N_) / 2;
                let der = valueF_(t);
                gauSumN = gauSumN + der * v;
                if (keyN > 0) {
                    t = ((value2N_ - valueN_) * -key + valueN_ + value2N_) / 2;
                    der = valueF_(t);
                    gauSumN = gauSumN + der * v;
                }
            }
        }
        return (gauSumN * (value2N_ - valueN_)) / 2;
    }

    private _curve(pointV3_: cc.Vec3, point2V3_: cc.Vec3, point3V3_: cc.Vec3, point4V3_: cc.Vec3) {
        // 基本样条线插值算法
        // 弹性
        let sN = 0.5;
        // 计算三次样条线函数系数
        let bV3 = pointV3_
            .clone()
            .multiplyScalar(-sN)
            .add(point2V3_.clone().multiplyScalar(2 - sN))
            .add(point3V3_.clone().multiplyScalar(sN - 2))
            .add(point4V3_.clone().multiplyScalar(sN));
        let b2V3 = pointV3_
            .clone()
            .multiplyScalar(2 * sN)
            .add(point2V3_.clone().multiplyScalar(sN - 3))
            .add(point3V3_.clone().multiplyScalar(3 - 2 * sN))
            .add(point4V3_.clone().multiplyScalar(-sN));
        let b3V3 = pointV3_.clone().multiplyScalar(-sN).add(point3V3_.clone().multiplyScalar(sN));
        let b4V3 = point2V3_;

        // 函数曲线
        function fx(xN: number) {
            return bV3
                .clone()
                .multiplyScalar(Math.pow(xN, 3))
                .add(b2V3.clone().multiplyScalar(Math.pow(xN, 2)))
                .add(b3V3.clone().multiplyScalar(xN))
                .add(b4V3.clone());
        }
        // 曲线长度变化率,用于匀速曲线运动
        function ds(xN: number) {
            let derV3 = bV3
                .clone()
                .multiplyScalar(3 * Math.pow(xN, 2))
                .add(b2V3.clone().multiplyScalar(2 * xN))
                .add(b3V3.clone());
            return Math.sqrt(Math.pow(derV3.x, 2) + Math.pow(derV3.y, 2) + Math.pow(derV3.z, 2));
        }
        return [fx, ds];
    }

    /**
     * 获取曲线上某点的位置
     * @param posN_ min: 0, max: 1
     */
    point(posN_: number): cc.Vec3 | null {
        let posN = posN_;
        if (this._pointV3S.length < 2) {
            return null;
        }

        if (posN < 0 || posN > 1) {
            posN = posN < 0 ? 0 : 1;
        }

        // 首个和最后点直接返回
        if (posN === 0) {
            return this._pointV3S[0];
        } else if (posN === 1) {
            return this._pointV3S[this._pointV3S.length - 1];
        }

        let resultV3 = cc.v3();
        let indexN = this._pointV3S.length - 1;
        this._pointV3S.forEach((v, kS) => {
            if (!kS) {
                resultV3.x += v.x * Math.pow(1 - posN, indexN - kS) * Math.pow(posN, kS);
                resultV3.y += v.y * Math.pow(1 - posN, indexN - kS) * Math.pow(posN, kS);
                resultV3.z += v.z * Math.pow(1 - posN, indexN - kS) * Math.pow(posN, kS);
            } else {
                resultV3.x +=
                    (this._factorial(indexN) / this._factorial(kS) / this._factorial(indexN - kS)) *
                    v.x *
                    Math.pow(1 - posN, indexN - kS) *
                    Math.pow(posN, kS);
                resultV3.y +=
                    (this._factorial(indexN) / this._factorial(kS) / this._factorial(indexN - kS)) *
                    v.y *
                    Math.pow(1 - posN, indexN - kS) *
                    Math.pow(posN, kS);
                resultV3.z +=
                    (this._factorial(indexN) / this._factorial(kS) / this._factorial(indexN - kS)) *
                    v.z *
                    Math.pow(1 - posN, indexN - kS) *
                    Math.pow(posN, kS);
            }
        });
        return resultV3;
    }

    /** 匀速点 */
    uniformPoint(posN_: number): cc.Vec3 | null {
        let posN = posN_;
        if (this._pointV3S.length < 2) {
            return null;
        }

        if (posN < 0 || posN > 1) {
            posN = posN < 0 ? 0 : 1;
        }

        // 首个和最后点直接返回
        if (posN === 0) {
            return this._pointV3S[0];
        } else if (posN === 1) {
            return this._pointV3S[this._pointV3S.length - 1];
        }

        // 平均距离
        let averDistN = posN * this._distanceNS[this._pointV3S.length - 2];
        let indexN = 0;
        let beyondN = 0;
        let percentN = 0;
        for (let kN = 0; kN < this._pointV3S.length - 1; kN++) {
            if (averDistN < this._distanceNS[kN]) {
                let preDis = kN === 0 ? 0 : this._distanceNS[kN - 1];
                indexN = kN;
                beyondN = averDistN - preDis;
                percentN = beyondN / (this._distanceNS[kN] - preDis);
                break;
            }
        }
        // 牛顿切线法求根
        let aN = percentN;
        let bN: number;
        // 最多迭代6次
        for (let i = 0; i < 6; i++) {
            let actualLen = this._gaussLegendre(this._funcFSS[indexN][1] as any, 0, aN);
            bN = aN - (actualLen - beyondN) / this._funcFSS[indexN][1](aN);
            if (Math.abs(aN - bN) < 0.0001) {
                break;
            }
            aN = bN;
        }
        percentN = bN;
        return this._funcFSS[indexN][0](percentN);
    }
}

export default BezierCurve;

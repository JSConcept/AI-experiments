import { parseOrigin, Point } from "../Utils.ts";

//
export class Matrix3x3 {
    m: number[];

    //
    constructor(m?: number[]) {
        this.m = m || [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    //
    multiply(other: Matrix3x3): Matrix3x3 {
        const a = this.m;
        const b = other.m;
        const result = [
            a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
            a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
            a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

            a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
            a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
            a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

            a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
            a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
            a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
        ];
        return new Matrix3x3(result);
    }

    //
    applyToPoint(point: Point): Point {
        const x = point.x, y = point.y;
        const m = this.m;
        const newX = m[0] * x + m[1] * y + m[2];
        const newY = m[3] * x + m[4] * y + m[5];
        const w = m[6] * x + m[7] * y + m[8];

        if (w !== 1 && w !== 0) {
            return new DOMPoint(newX, newY, 0, w);
        } else {
            return new DOMPoint(newX, newY, 0, 1);
        }
    }

    //
    inverse(): Matrix3x3 {
        const m = this.m;
        const det =
            m[0] * (m[4] * m[8] - m[5] * m[7]) -
            m[1] * (m[3] * m[8] - m[5] * m[6]) +
            m[2] * (m[3] * m[7] - m[4] * m[6]);

        if (det === 0) {
            throw new Error('Матрица не обратима');
        }

        const invDet = 1 / det;
        const result = [
            (m[4] * m[8] - m[5] * m[7]) * invDet,
            (m[2] * m[7] - m[1] * m[8]) * invDet,
            (m[1] * m[5] - m[2] * m[4]) * invDet,

            (m[5] * m[6] - m[3] * m[8]) * invDet,
            (m[0] * m[8] - m[2] * m[6]) * invDet,
            (m[2] * m[3] - m[0] * m[5]) * invDet,

            (m[3] * m[7] - m[4] * m[6]) * invDet,
            (m[1] * m[6] - m[0] * m[7]) * invDet,
            (m[0] * m[4] - m[1] * m[3]) * invDet,
        ];
        return new Matrix3x3(result);
    }

    //
    scale(sx: number, sy: number): Matrix3x3 {
        const scaleMatrix = new Matrix3x3([
            sx, 0,  0,
            0,  sy, 0,
            0,  0,  1
        ]);
        return this.multiply(scaleMatrix);
    }

    //
    translate(tx: number, ty: number): Matrix3x3 {
        const translateMatrix = new Matrix3x3([
            1, 0, tx,
            0, 1, ty,
            0, 0, 1
        ]);
        return this.multiply(translateMatrix);
    }
}

//
export function parseTransformWithOrigin(transform: string, transformOrigin: string, element: Element): Matrix3x3 {
    const transformMatrix     = parseTransform(transform);
    const origin              = parseOrigin(transformOrigin, element);
    const originMatrix        = new Matrix3x3([ 1, 0, -origin.x,  0, 1, -origin.y,  0, 0, 1 ]);
    const inverseOriginMatrix = new Matrix3x3([ 1, 0,  origin.x,  0, 1,  origin.y,  0, 0, 1 ]);
    return inverseOriginMatrix.multiply(transformMatrix).multiply(originMatrix);
}

//
export function parseTransform(transform: string): Matrix3x3 {
    const matrixRegex = /matrix\(([^)]+)\)/;
    const matrix3dRegex = /matrix3d\(([^)]+)\)/;

    //
    let m: number[];
    if (matrixRegex.test(transform)) {
        const matches = transform.match(matrixRegex);
        if (matches) {
            const values = matches[1].split(',').map(parseFloat);
            m = [
                values[0], values[2], values[4],
                values[1], values[3], values[5],
                0, 0, 1
            ];
            return new Matrix3x3(m);
        }
    } else if (matrix3dRegex.test(transform)) {
        const matches = transform.match(matrix3dRegex);
        if (matches) {
            const values = matches[1].split(',').map(parseFloat);
            m = [
                values[0], values[4], values[12],
                values[1], values[5], values[13],
                values[2], values[6], values[14]
            ];
            return new Matrix3x3(m);
        }
    }

    //
    return new Matrix3x3([
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ]);
}

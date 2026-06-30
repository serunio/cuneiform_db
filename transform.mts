const db = require('./src/db')
const {strokes} = require('./compressor.mts')
import type {Stroke, Pair} from './compressor.mjs'
type SimpleStroke = {first:Pair, middle:Pair, last:Pair}
type Sign = {phonetic:string, N:number, NE:number, E:number, SE:number, S:number, SW:number, W:number, NW:number, H:number, crosses:number}

const diagonals = new Set(["NE", "NW", "SE", "SW"])

async function main() {
    const result = await db.query(`
            SELECT
                s.user_id,
                s.id,
                s.data,
                s.timestamp,
                c.unicode,
                c.phonetic,
                u.name,
                u.email
            FROM submissions s
            JOIN cunei c ON s.cunei_id = c.id
            JOIN users u ON s.user_id = u.id
            WHERE u.blacklist = false
            ORDER BY s.timestamp DESC
        `);
    const rows = result.rows
    const sign:Sign = {phonetic:"", N:0, NE:0, E:0, SE:0, S:0, SW:0, W:0, NW:0, H:0, crosses:0}
    const processedSigns = rows.map(r => ({...sign, id: Number(r.id), ...getFeatures(strokes.fromBuffer(r.data))}))
    
    const values: any[] = [];
    const placeholders: string[] = [];

    processedSigns.forEach((sign, i) => {
        const p = i * 11;

        placeholders.push(
            `($${p+1}, $${p+2}, $${p+3}, $${p+4}, $${p+5}, $${p+6}, $${p+7}, $${p+8}, $${p+9}, $${p+10}, $${p+11})`
        );
        
        values.push(
            sign.id,
            sign.N,
            sign.NE,
            sign.E,
            sign.SE,
            sign.S,
            sign.SW,
            sign.W,
            sign.NW,
            sign.H,
            sign.crosses
        );
    });

    

    await db.query(`
        INSERT INTO processed_submissions (
            submission_id,
            n, ne, e, se, s, sw, w, nw,
            h, crosses
        )
        VALUES ${placeholders.join(",")}
    `, values);
    
}

main()

function getFeatures(data:Stroke[]) {
    const simpleStrokes = data.map((s:Stroke) => simplify(s))
    return {...getTypes(simpleStrokes), crosses: crossCount(simpleStrokes)}
}

function crossCount(strokes:SimpleStroke[]):number {
    let count = 0;
    for (let i = 0; i < strokes.length; i++) {
        const stroke1 = strokes[i]!
        for (let j = i+1; j < strokes.length; j++) {
            const stroke2 = strokes[j]!
            if (
                crossCheck(stroke1.first, stroke1.middle, stroke2.first, stroke2.middle) ||
                crossCheck(stroke1.first, stroke1.middle, stroke2.middle, stroke2.last) ||
                crossCheck(stroke1.middle, stroke1.last, stroke2.first, stroke2.middle) ||
                crossCheck(stroke1.middle, stroke1.last, stroke2.middle, stroke2.last)
                )
                count++
        }
    }
    return count
}

function dot(a:Pair, b:Pair, c:Pair) {
    const x1 = c.x - a.x
    const y1 = c.y - a.y
    const x2 = b.x - a.x
    const y2 = b.y - a.y
    return x1*y2 - x2*y1
}

function crossCheck(a:Pair, b:Pair, c:Pair, d:Pair):boolean {
    const v1 = dot(c, d, a)
    const v2 = dot(c, d, b)
    const v3 = dot(a, b, c)
    const v4 = dot(a, b, d)

    return v1*v2 < 0 && v3*v4 < 0 ? true : false
}

function simplify(stroke:Stroke):SimpleStroke {

    return {
        first: stroke[0]!, 
        middle: stroke[Math.floor(stroke.length/2)]!, 
        last: stroke[stroke.length - 1]!
    }
}

function getTypes(sign:SimpleStroke[]) {
    return sign.map((s:SimpleStroke) => getType(s)).reduce((acc:Record<string, number>, item:string) => {
            acc[item] = (acc[item] ?? 0) + 1
            return acc
        }, {} as Record<string, number>)
}

function getType(stroke:SimpleStroke):string {

    const s = stroke

    const dx1 = s.middle.x - s.first.x
    const dx2 = s.last.x - s.middle.x
    
    const dy1 = s.middle.y - s.first.y
    const dy2 = s.last.y - s.middle.y

    const orientation1 = getOrientation(dx1, dy1)
    const orientation2 = getOrientation(dx2, dy2)

    if (orientation1 === orientation2)
        return orientation1
    else if (diagonals.has(orientation1)) {
        if (diagonals.has(orientation2))
            return "H"
        else
            return orientation2
    } 
    return orientation1
    
}   

function getOrientation(dx:number, dy:number):string {

    const rad = Math.atan2(-dy, dx)
    let angle = rad * 180 / Math.PI
    angle = angle >= 0 ? angle : 360 + angle

    if (angle <= 15 || angle > 345) {
        return "E"
    } else if (angle <= 345 && angle > 285) {
        return "SE"
    } else if (angle <= 285 && angle > 255) {
        return "S"
    } else if (angle <= 255 && angle > 195) {
        return "SW"
    } else if (angle <= 195 && angle > 165) {
        return "W"
    } else if (angle <= 165 && angle > 105) {
        return "NW"
    } else if (angle <= 105 && angle > 75) {
        return "N"
    } else if (angle <= 75 && angle > 15) {
        return "NE"
    }
    return ""
}

export {getFeatures}
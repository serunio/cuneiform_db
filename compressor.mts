import {BitStream} from 'bit-buffer'
import { log } from 'node:console'

type Pair = {x:number, y:number}
type Stroke = Pair[]
type ColumnStroke = {x: number[], y: number[]}

function getStrokes(raw:string):Stroke[] {
    const strokesRaw = raw.split('M').slice(1)
    const out = strokesRaw.map(stroke => stroke.split('L').map(strPair => {
        const strings = strPair.split(' ')
        return {x: Number(strings[0]), y: Number(strings[1])}
    }))
    return out
}

function buildCsv(strokes:Stroke[]):string {
    const strokesString = strokes.map(stroke => stroke.map(pair => pair.x + ' ' + pair.y).join('L')).join('M')
    return 'M'+ strokesString
}

function deltaEncode(strokes:Stroke[]):Stroke[] {
    const val =  strokes.map(s =>
      s.map(
        (p, i, s):Pair => (
          {x: p.x - (s[i-1]?.x ?? 0), y: p.y - (s[i-1]?.y ?? 0)}
        )))
    // console.log(JSON.stringify(val))
    return val
}

function deltaDecode(strokes:Stroke[]):Stroke[] {
    const copy = structuredClone(strokes)
    for (const stroke of copy) {
        for ( let i = 1; i < stroke.length; i++) {
            stroke[i].x += stroke[i-1].x
            stroke[i].y += stroke[i-1].y
        }
    }
    return copy
}

function zigzagEncode(strokes:Stroke[]):Stroke[] {
    const zigzag:(z:number) => number = n => (n << 1) ^ (n >> 31)
    return strokes.map(s => s.map((p, i) => {
        if (i === 0) {
            return {x: p.x, y: p.y}
        }
        return {x: zigzag(p.x), y: zigzag(p.y)}
    }))
}

function zigzagDecode(strokes:Stroke[]):Stroke[] {
    const unzigzag:(z:number) => number = z => (z >>> 1) ^ -(z & 1)
    return strokes.map(s => s.map((p, i) => {
        if (i === 0) {
            return {x: p.x, y: p.y}
        }
        return {x: unzigzag(p.x), y: unzigzag(p.y)}
    }))
}

function makeBuffer(strokes:Stroke[]):Buffer {
    const starts = []
    const lengths = []
    let data:Array<number> = []
    const count = strokes.length
    for (const s of strokes) {
        starts.push(s[0].x)
        starts.push(s[0].y)
        lengths.push(s.length - 1)
        data = data.concat(s.slice(1).map(p => [p.x, p.y]).flat())
    }
    const bitNum = (arr:Array<number>) => Math.max(Math.ceil(Math.log2(Math.max(...arr))+1), 1)  ;
    const countBits = 7;
    const startsBits = bitNum(starts)
    const lengthsBits = bitNum(lengths)
    const dataBits = bitNum(data)

    const startsSize = starts.length * startsBits / 8
    const lengthsSize = lengths.length * lengthsBits/8
    const dataSize = data.length * dataBits/8
    const size = Math.ceil(startsSize + lengthsSize + dataSize + (countBits + 10) / 8)
    console.log(`size: ${size}`)
    const stream = new BitStream(new ArrayBuffer(size))
    
    stream.writeBits(startsBits, 4)
    // console.log(`writing startBits=${startsBits} on 4 bits`)
    stream.writeBits(lengthsBits, 3)
    // console.log(`writing lengthsBits=${lengthsBits} on 3 bits`)
    stream.writeBits(dataBits, 3)
    // console.log(`writing dataBits=${dataBits} on 3 bits`)

    stream.writeBits(count, countBits)
    // console.log(`writing count=${count} on ${countBits} bits`)

    for (const n of starts) {
        // console.log(`writing start=${n} on ${startsBits} bits`)
        stream.writeBits(n, startsBits)
    }
    for (const n of lengths) {
        // console.log(`writing length=${n} on ${lengthsBits} bits`)
        stream.writeBits(n, lengthsBits)
    }
    for (const n of data) {
        // console.log(`writing data=${n} on ${dataBits} bits`)
        stream.writeBits(n, dataBits)
    }


    return stream.buffer
}

function rebuildStrokes(buffer:Buffer):Stroke[] {
    try {
        const stream = new BitStream(buffer)

        const countBits = 7;
        const startsBits = stream.readBits(4)
        // console.log(`read startsBits=${startsBits} on 4 bits`)
        const lengthsBits = stream.readBits(3)
        // console.log(`read lengthsBits=${lengthsBits} on 3 bits`)
        const dataBits = stream.readBits(3)
        // console.log(`read dataBits=${dataBits} on 3 bits`)

        const outCount:number = stream.readBits(countBits)
        // console.log(`read outCount=${outCount} on ${countBits} bits`)
        const outStarts:Pair[] = []
        const outLengths:number[] = []
        let outData:Stroke[] = []

        for (let i = 0; i < outCount; i++) {
            const x = stream.readBits(startsBits)
            // console.log(`read start=${x} on ${startsBits} bits`)
            const y = stream.readBits(startsBits)
            // console.log(`read start=${y} on ${startsBits} bits`)
            outStarts.push({x, y})
        }
        for (let i = 0; i < outCount; i++) {
            const length = stream.readBits(lengthsBits)
            outLengths.push(length)
            // console.log(`read length=${length} on ${lengthsBits} bits`)
        }
        for (let i = 0; i < outCount; i++) {
            outData.push([outStarts[i]])
            for (let j = 0; j < outLengths[i]; j++) {
                const x = stream.readBits(dataBits)
                // console.log(`read data=${x} on ${dataBits} bits`)
                const y = stream.readBits(dataBits)
                // console.log(`read data=${y} on ${dataBits} bits`)
                outData[i].push({x, y})
            }
        }
        return outData
    } catch(e) {
        return [[{x: 0, y: 0}]]
    }

}

function compress(raw:string):Buffer {
    return makeBuffer(zigzagEncode(deltaEncode(getStrokes(raw))))
}

function compressTest(raw:string) {
    const step1_strokes = getStrokes(raw)
    const step1_check = buildCsv(step1_strokes)
    console.log(`\nstep1 (strokes) passed: ${step1_check === raw}`)

    const step2_delta = deltaEncode(step1_strokes)
    const step2_check = deltaDecode(step2_delta)
    console.log(`step2 (delta) passed: ${JSON.stringify(step2_check) === JSON.stringify(step1_strokes)}`)

    const step3_zigzag = zigzagEncode(step2_delta)
    const step3_check = zigzagDecode(step3_zigzag)
    console.log(`step3 (zigzag) passed: ${JSON.stringify(step3_check) === JSON.stringify(step2_delta)}`)

    const step4_buffer = makeBuffer(step3_zigzag)
    const step4_check = rebuildStrokes(step4_buffer)
    const passed = JSON.stringify(step4_check) === JSON.stringify(step3_zigzag)
    if(!passed){
        console.log(raw)
    }
    console.log(`step4 (buffer) passed: ${JSON.stringify(step4_check) === JSON.stringify(step3_zigzag)}`)
}

function decompress(buffer:Buffer):string {
    return buildCsv(deltaDecode(zigzagDecode(rebuildStrokes(buffer))))
}

function decompressToStrokes(buffer:Buffer):Stroke[] {
    return deltaDecode(zigzagDecode(rebuildStrokes(buffer)))
}

const strokes = {fromCsv: getStrokes, fromBuffer: decompressToStrokes}

export {compress, decompress, strokes}
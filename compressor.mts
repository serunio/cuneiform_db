import {BitStream} from 'bit-buffer'

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
    return strokes.map(s =>
      s.map(
        (p, i, s):Pair => (
          {x: p.x - (s[i-1]?.x ?? 0), y: p.y - (s[i-1]?.y ?? 0)}
        )).filter(p => p.x !== 0 || p.y !== 0))
}

function deltaDecode(strokes:Stroke[]):Stroke[] {
    for (const stroke of strokes) {
        for ( let i = 1; i < stroke.length; i++) {
            stroke[i].x += stroke[i-1].x
            stroke[i].y += stroke[i-1].y
        }
    }
    return strokes
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
    let data = []
    const count = strokes.length
    for (const s of strokes) {
        starts.push(s[0].x)
        starts.push(s[0].y)
        lengths.push(s.length - 1)
        data = data.concat(s.slice(1).map(p => [p.x, p.y]).flat())
    }

    const bitNum = (arr:Array<number>) =>  Math.ceil(Math.log2(Math.max(...arr)));
    const countBits = 7;
    const startsBits = bitNum(starts)
    const lengthsBits = bitNum(lengths)
    const dataBits = bitNum(data)

    const startsSize = starts.length * startsBits / 8
    const lengthsSize = lengths.length * lengthsBits/8
    const dataSize = data.length * dataBits/8
    const size = startsSize + lengthsSize + dataSize + (countBits + startsBits + lengthsBits + dataBits) / 8
    const stream = new BitStream(new ArrayBuffer(Math.ceil(size)))
    stream.writeBits(startsBits, 4)
    stream.writeBits(lengthsBits, 3)
    stream.writeBits(dataBits, 3)
    stream.writeBits(count, countBits)
    for (const n of starts) {
        stream.writeBits(n, startsBits)
    }
    for (const n of lengths) {
        stream.writeBits(n, lengthsBits)
    }
    for (const n of data) {
        stream.writeBits(n, dataBits)
    }

    return stream.buffer
}

function rebuildStrokes(buffer:Buffer):Stroke[] {

    const stream = new BitStream(buffer)

    const countBits = 7;
    const startsBits = stream.readBits( 4)
    const lengthsBits = stream.readBits(3)
    const dataBits = stream.readBits(3)

    const outCount:number = stream.readBits(countBits)
    const outStarts:Pair[] = []
    const outLengths:number[] = []
    let outData:Stroke[] = []

    for (let i = 0; i < outCount; i++) {
        const x = stream.readBits(startsBits)
        const y = stream.readBits(startsBits)
        outStarts.push({x, y})
    }
    for (let i = 0; i < outCount; i++) {
        outLengths.push(stream.readBits(lengthsBits))
    }
    for (let i = 0; i < outCount; i++) {
        outData.push([outStarts[i]])
        for (let j = 0; j < outLengths[i]; j++) {
            const x = stream.readBits(dataBits)
            const y = stream.readBits(dataBits)
            outData[i].push({x, y})
        }
    }
    return outData
}

function compress(raw:string):Buffer {
    return makeBuffer(zigzagEncode(deltaEncode(getStrokes(raw))))
}

function decompress(buffer:Buffer):string {
    return buildCsv(deltaDecode(zigzagDecode(rebuildStrokes(buffer))))
}

function decompressToStrokes(buffer:Buffer):Stroke[] {
    return deltaDecode(zigzagDecode(rebuildStrokes(buffer)))
}

const strokes = {fromCsv: getStrokes, fromBuffer: decompressToStrokes}

export {compress, decompress, strokes}





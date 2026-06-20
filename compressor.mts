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
    console.log(`max starts: ${Math.max(...starts)}`)
    const bitNum = (arr:Array<number>) => Math.max(Math.ceil(Math.log2(Math.max(...arr))), 1)  ;
    const countBits = 7;
    const startsBits = bitNum(starts)
    const lengthsBits = bitNum(lengths)
    const dataBits = bitNum(data)

    const startsSize = starts.length * startsBits / 8
    // console.log(`\nIlość startów do zapisania: ${starts.length}\nBity na start: ${startsBits}\nPotrzebne bity: ${starts.length*startsBits}\nPoliczone bajty: ${startsSize}`)
    const lengthsSize = lengths.length * lengthsBits/8
    // console.log(`\nIlość długości do zapisania: ${lengths.length}\nBity na długość: ${lengthsBits}\nPotrzebne bity: ${lengths.length*lengthsBits}\nPoliczone bajty: ${lengthsSize}`)
    const dataSize = data.length * dataBits/8
    // console.log(`\nIlość danych do zapisania: ${data.length}\nBity na daną: ${dataBits}\nPotrzebne bity: ${data.length*dataBits}\nPoliczone bajty: ${dataSize}`)
    const size = Math.ceil(startsSize + lengthsSize + dataSize + (countBits + 10) / 8)
    // console.log(`\nPoliczony`)
    console.log(`size: ${size}`)
    const stream = new BitStream(new ArrayBuffer(size))
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
    try {
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
    } catch(e) {
        return [[{x: 0, y: 0}]]
    }

}

function compress(raw:string):Buffer {
    compressTest(raw)
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





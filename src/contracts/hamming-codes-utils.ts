export function isPowerOfTwo(num: number) {
    //bitwise AND of a power of two and 1 less than itself will be 0;
    // i.e.
    //   b1000
    // & b0111
    // --------
    //   b0000 = 0

    let bitwiseComparison = num & (num - 1);
    return (num != 0) && bitwiseComparison == 0;
}


export function convertToBitArray(bitString: string): number[] {
    let bitArray = [];
    for (let i = 0; i < bitString.length; i++) {
        bitArray.push(parseInt(bitString[i]));
    }
    return bitArray;
}


export function convertBitArrayToDecimal(bitArray: number[]) {
    let decNum = 0;
    bitArray.reverse().forEach((bit, index) => {
        decNum += Math.pow(2, index) * bit;        
    });
    return decNum;
}

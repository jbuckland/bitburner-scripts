/*
HammingCodes: Encoded Binary to Integer
You are given the following encoded binary String:
'000110000010010000000011010000'
Treat it as a Hammingcode with 1 'possible' error on an random Index.
Find the 'possible' wrong bit, fix it and extract the decimal value, which is hidden inside the string.

Note: The length of the binary string is dynamic, but it's encoding/decoding is following Hammings 'rule'
Note 2: Index 0 is an 'overall' parity bit. Watch the Hammingcode-video from 3Blue1Brown for more information
Note 3: There's a ~55% chance for an altered Bit. So... MAYBE there is an altered Bit 😉
Extranote for automation: return the decimal value as a string
 */


let bitArray = convertToBitArray(`010100000101000`)
console.log(`Original bit arrays:`, bitArray)
let errorLoc = getErrorLocation(bitArray);
console.log(`Error Location:`, errorLoc);

correctErrorAtLocation(bitArray, errorLoc)
console.log(`Corrected bit array:`, bitArray)


//errorLoc = getErrorLocation(bitArray);
//console.log(`Corrected error location:`, errorLoc);

let dataStream = getDataBitStream(bitArray);
console.log(`Data stream:`, dataStream)
let answer = convertBitArrayToDecimal(dataStream)


console.log(`Answer in decimal: `, answer);


function convertBitArrayToDecimal(bitArray) {
    let decNum = 0;
    bitArray.forEach(bit => {
        decNum = decNum << 1;
        decNum = decNum + bit;
    })
    return decNum
}

function convertToBitArray(bitString) {
    let bitArray = [];
    for (let i = 0; i < bitString.length; i++) {
        bitArray.push(parseInt(bitString[i]));
    }
    return bitArray
}


function getErrorLocation(bitArray) {
    let ones = [];

    bitArray.forEach((bit, index) => {
        if (bit) {
            ones.push(index)
        }
    })
    //console.log(`Bit array:`, bitArray)
    //console.log(`Ones array:`, ones)
    let errorLoc = ones.reduce((previousValue, currentValue) => previousValue ^ currentValue);
    return errorLoc;
}


function correctErrorAtLocation(bitArray, errorLoc) {
    if (errorLoc > 0) {
        bitArray[errorLoc] = (bitArray[errorLoc] === 0) ? 1 : 0;
    }
}


function getDataBitStream(bitArray) {
    return bitArray.filter((value, index) => {
        return !isPowerOfTwo(index)
    })

}

function isPowerOfTwo(num) {
    //bitwise AND of a power of two and 1 less than itself will be 0;
    // i.e.
    //   b1000
    // & b0111
    // --------
    //   b0000 = 0

    let bitwiseComparison = num & (num - 1);
    return (num != 0) && bitwiseComparison == 0;
}

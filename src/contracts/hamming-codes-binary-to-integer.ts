import {convertBitArrayToDecimal, convertToBitArray, isPowerOfTwo} from '/contracts/hamming-codes-utils';
import {IContractSolution} from '/contracts/types';
import {CodingContractType} from '/lib/consts';

export class HammingCodesBinaryToInteger implements IContractSolution {

    /**HammingCodes: Encoded Binary to Integer

     You are given the following encoded binary String:
     '000110000010010000000011010000'
     Treat it as a Hammingcode with 1 'possible' error on an random Index.
     Find the 'possible' wrong bit, fix it and extract the decimal value, which is hidden inside the string.

     Note: The length of the binary string is dynamic, but it's encoding/decoding is following Hammings 'rule'
     Note 2: Index 0 is an 'overall' parity bit. Watch the Hammingcode-video from 3Blue1Brown for more information
     Note 3: There's a ~55% chance for an altered Bit. So... MAYBE there is an altered Bit 😉
     Extranote for automation: return the decimal value as a string

     */

    public type: CodingContractType = CodingContractType.unknown;


    public solve(input: string): string[] | number {
        let answerNumber: number;

        let bitArray = convertToBitArray(input);

        let errorLoc = this.getErrorLocation(bitArray);

        this.correctErrorAtLocation(bitArray, errorLoc);

        let dataStream = this.getDataBitStream(bitArray);
        answerNumber = convertBitArrayToDecimal(dataStream);

        return [answerNumber.toString()];
    }

    private getErrorLocation(bitArray: number[]) {
        let ones: number[] = [];

        bitArray.forEach((bit, index) => {
            if (bit) {
                ones.push(index);
            }
        });
        //console.log(`Bit array:`, bitArray)
        //console.log(`Ones array:`, ones)
        let errorLoc = ones.reduce((previousValue, currentValue) => previousValue ^ currentValue);
        return errorLoc;
    }

    private correctErrorAtLocation(bitArray: number[], errorLoc: number) {
        if (errorLoc > 0) {
            bitArray[errorLoc] = (bitArray[errorLoc] === 0) ? 1 : 0;
        }
    }


    private getDataBitStream(bitArray: number[]) {
        return bitArray.filter((value, index) => {
            let isPow = isPowerOfTwo(index);
            return index !== 0 && !isPow;
        });

    }


}

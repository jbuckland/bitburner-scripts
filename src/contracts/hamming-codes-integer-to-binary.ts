import {convertToBitArray, isPowerOfTwo} from '/contracts/hamming-codes-utils';
import {IContractSolver} from '/contracts/types';
import {CodingContractType} from '/lib/consts';
import {NS} from '/NetscriptDefinitions';

export class HammingCodesIntegerToBinary implements IContractSolver {
    public debug: boolean = false;

    /**HammingCodes: Integer to encoded Binary

     You are given the following decimal Value:
     775994361687972
     Convert it into a binary string and encode it as a 'Hamming-Code'. eg:
     Value 8 will result into binary '1000', which will be encoded with the pattern 'pppdpddd', where p is a paritybit and d a databit,
     or '10101'


     Value 21, (b10101) will result into pppdpdddpd '1001101011'.
     Theirs

     pppd
     pddd
     pdXX
     XXXX

     1001
     1010
     11XX
     XXXX

     Mine
     ppp1
     p010
     p1XX
     XXXX

     0001
     0010
     01XX
     XXXX

     NOTE: You need an parity Bit on Index 0 as an 'overall'-paritybit.
     NOTE 2: You should watch the HammingCode-video from 3Blue1Brown, which explains the 'rule' of encoding, including the first Index parity-bit mentioned on the first note.

     Now the only one rule for this encoding:
     It's not allowed to add additional leading '0's to the binary value
     That means, the binary value has to be encoded as it is

     */

    public type: CodingContractType = CodingContractType.hammingCodesIntToBin;

    constructor(private ns: NS) {
    }

    public solve(decValue: number): string[] | number {
        let answerArray: string[] = [];


        let bitString = decValue.toString(2);
        let bitArray: number[] = convertToBitArray(bitString);

        let encodedBitArray: (number | string)[] = ['p', 'p']; //p for parity
        let i = 0;
        while (i < bitArray.length) {
            if (isPowerOfTwo(encodedBitArray.length)) {
                encodedBitArray.push('p');
            } else {
                encodedBitArray.push(bitArray[i]);
                i++;
            }
        }

        this.debugPrint(`encodedBitArray`, encodedBitArray.join(''));

        //now that we have our parity placeholders perfectly placed,
        //go through the string again and set the parity bits

        //we skip 0 for now, because we'll set that last
        for (let i = 1; i < encodedBitArray.length; i++) {
            if (encodedBitArray[i] === 'p') {
                let onesCount = this.getOnesCount(i, encodedBitArray);
                encodedBitArray[i] = onesCount % 2;
            }
        }

        let totalOnesCount = encodedBitArray.filter(bit => bit === 1).length;
        this.debugPrint(`totalOnesCount: ${totalOnesCount}`);
        encodedBitArray[0] = totalOnesCount % 2;

        this.debugPrint('encodedBitArray: ', encodedBitArray);
        let encodedBitString = encodedBitArray.join('');
        this.debugPrint('encodedBitString: ', encodedBitString);



        return [encodedBitString];

    }


    private getOnesCount(parityBitIndex: number, bitArray: any[]) {
        let onesCount = 0;

        for (let i = 0; i < bitArray.length; i++) {

            if ((i & parityBitIndex) === parityBitIndex) {
                let bit = bitArray[i];
                if (bit === 1) {
                    onesCount++;
                }
            }
        }


        return onesCount;

    }

    private debugPrint(msg: string, ...data: any) {
        if (this.debug) {
            this.ns.print(`${this.constructor.name}: ${msg}`, data);
        }
    }

}

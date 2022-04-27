import {BaseSolver} from '/contracts/template-solver';
import {CodingContractType} from '/lib/consts';

export class GenerateIpAddresses extends BaseSolver {
    private readonly OCTET_COUNT = 4;
    public type = CodingContractType.generateIpAddresses;

    public solve(input: any): string[] | number {


        let validIpArrays = this.recurse([], input);

        let validIpAddresses = validIpArrays.map(octetArray => octetArray.join('.'));

        console.log(`valid ips: [${validIpAddresses.join(', ')}]`);


        return validIpAddresses;
    }

    private recurse(octetArray: any[], rest: string): number[][] {
        console.log(`recurse()`, octetArray, rest);

        let validIpAddress: number[][] = [];

        if (octetArray.length === this.OCTET_COUNT) {
            if (rest.length === 0) {
                //validate
                let valid = true;
                for (const octString of octetArray) {
                    valid = valid && this.numStringIsValid(octString);
                }
                validIpAddress = [octetArray];
            } else {
                //`We should not have 4 octets and still have remaining 'rest'
                //don't add anything to the valid ips
            }
        } else if (octetArray.length < this.OCTET_COUNT) {

            //grab up to the next three numbers and add them to the octetArray

            for (let i = 0; i < 3 && i < rest.length; i++) {
                let nextNum = rest.substring(0, i + 1);
                if (this.numStringIsValid(nextNum)) {
                    let ips = this.recurse([...octetArray, nextNum], rest.substring(i + 1));
                    validIpAddress.push(...ips);
                }
            }


        } else {
            throw new Error(`somehow we got MORE than 3 octets! ${octetArray}`);
        }

        return validIpAddress;
    }

    private numStringIsValid(numString: string) {
        return this.validRange(numString) && this.doesNotStartWithZero(numString);
    }

    private validRange(numString: string) {
        let numInt = parseInt(numString);
        return !isNaN(numInt) && numInt >= 0 && numInt <= 255;

    }

    private doesNotStartWithZero(numString: string) {
        return numString.length === 1 || numString.length > 1 && numString[0] !== '0';
    }
}

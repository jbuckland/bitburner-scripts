/*
Generate IP Addresses
You are attempting to solve a Coding Contract. You have 10 tries remaining, after which the contract will self-destruct.


Given the following string containing only digits, return an array with all possible valid IP address combinations that can be created from the string:

57110170110

Note that an octet cannot begin with a '0' unless the number itself is actually 0. For example, '192.168.010.1' is not a valid IP.

Examples:

25525511135 -> [255.255.11.135, 255.255.111.35]
1938718066 -> [193.87.180.66]
 */
let OCTET_COUNT = 4;

//57110170110
//[57.110.170.110] //Correct!


//1905121860
//A: [ '190.51.218.60' ] //WRONG
//A: [190.51.218.60] //Correct, it's actual the string version of the array, not an array of strings

let validIpArrays = recurse([], '23103148204')

let validIpAddresses = validIpArrays.map(octetArray => octetArray.join('.'))

console.log(`valid ips: [${validIpAddresses.join(', ')}]`)


function recurse(octetArray, rest) {
    console.log(`recurse()`, octetArray, rest);

    let validIpAddress = [];

    if (octetArray.length === OCTET_COUNT) {
        if (rest.length === 0) {
            //validate
            let valid = true;
            for (const octString of octetArray) {
                valid = valid && numStringIsValid(octString);
            }
            validIpAddress = [octetArray];
        } else {
            //`We should not have 4 octets and still have remaining 'rest'
            //don't add anything to the valid ips
        }
    } else if (octetArray.length < OCTET_COUNT) {

        //grab up to the next three numbers and add them to the octetArray

        for (let i = 0; i < 3 && i < rest.length; i++) {
            let nextNum = rest.substring(0, i + 1)
            if (numStringIsValid(nextNum)) {
                let ips = recurse([...octetArray, nextNum], rest.substring(i + 1))
                validIpAddress.push(...ips)
            }
        }


    } else {
        throw new Error(`somehow we got MORE than 3 octets! ${octetArray}`)
    }

    return validIpAddress;
}


function numStringIsValid(numString) {
    return validRange(numString) && doesNotStartWithZero(numString);
}

function validRange(numString) {
    let numInt = parseInt(numString);
    return !isNaN(numInt) && numInt >= 0 && numInt <= 255;

}

function doesNotStartWithZero(numString) {
    return numString.length === 1 || numString.length > 1 && numString[0] !== '0'
}







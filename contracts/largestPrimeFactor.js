/*
Find Largest Prime Factor
A prime factor is a factor that is a prime number. What is the largest prime factor of 948,027,250?
 */


//find all the prime numbers up to X/2 (inclusive)
//starting from the top, find the first one that divides evenly into X

//finds primes up to a given number

let targetNumber = 948027250;

let primes = sieveOfEratosthenes(targetNumber/2);

console.log(primes);


function sieveOfEratosthenes(maxNumber) {
    let numbers = [false, false];
    for (let i = 2; i <= maxNumber; i++) {
        numbers.push(true)
    }


    let currPrime = 2;

    while (currPrime < maxNumber / 2) {

        let i = 2;
        let multipleOfPrime = 0;
        while (multipleOfPrime <= maxNumber) {
            multipleOfPrime = currPrime * i;
            numbers[multipleOfPrime] = false;
            i++;
        }

        currPrime = numbers.findIndex((value, index) => index > currPrime && value === true)
        if (!currPrime) {
            break;
        }
    }

    numbers = numbers.map((isPrime, index) => {
        if (isPrime) {
            return index;
        } else {
            return 0;
        }
    });

    return numbers.filter(n => n > 0);

}

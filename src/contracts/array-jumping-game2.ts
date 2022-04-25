import {IContractSolution} from '/contracts/types';
import {CodingContractType} from '/lib/consts';

export class ArrayJumpingGame2 implements IContractSolution {

    /**Array Jumping Game II
     You are given the following array of integers:

     3,1,0,3,5,2

     Each element in the array represents your MAXIMUM jump length at that position.
     This means that if you are at position i and your maximum jump length is n, you can jump to any position from i to i+n.
     Assuming you are initially positioned at the start of the array, determine the minimum number of jumps to reach the end of the array.
     If it's impossible to reach the end, then the answer should be 0.

     */

    public type: CodingContractType = CodingContractType.arrayJumpingGame2;



    public solve(input: number[]): string[] | number {
        let leastJumps = Number.MAX_VALUE;

        let numberArray: number[] = input;

        let moveQueue: IMove[] = [
            {position: 0, jumpCount: 0}
        ];

        while (moveQueue.length > 0) {

            let currMove = moveQueue.shift();
            if (currMove) {

                if (currMove.position === numberArray.length) {
                    if (currMove.jumpCount < leastJumps) {
                        leastJumps = currMove.jumpCount;
                    }
                    //console.log(`ArrayJumpingGame2 we made it to the end in ${currMove.jumpCount} jumps!`);
                    
                } else {
                    let jumpLength = numberArray[currMove.position];

                    for (let i = 1; i <= jumpLength; i++) {
                        moveQueue.push({
                            position: currMove.position + i,
                            jumpCount: currMove.jumpCount + 1
                        });
                    }
                }
                
            } else {
                throw new Error(`Queue was empty when it shouldn't have been!`);
            }
            //console.log(`ArrayJumpingGame2`, moveQueue);
        }


        return leastJumps;

    }

}


interface IMove {
    position: number,
    jumpCount: number


}

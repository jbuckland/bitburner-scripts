import {BaseSolver} from '/contracts/template-solver';
import {CodingContractType} from '/lib/consts';

export class ArrayJumpingGame2 extends BaseSolver {
    public debug: boolean = false;

    public type: CodingContractType = CodingContractType.arrayJumpingGame2;

    /**Array Jumping Game II
     You are given the following array of integers:

     7,4,2,2,2,2,1,5,4,0,5,6,3,1,5,1,2,1

     Each element in the array represents your MAXIMUM jump length at that position.
     This means that if you are at position i and your maximum jump length is n, you can jump to any position from i to i+n.
     Assuming you are initially positioned at the start of the array, determine the minimum number of jumps to reach the end of the array.
     If it's impossible to reach the end, then the answer should be 0.

     */


    public solve(input: number[]): string[] | number {
        let leastJumps = Number.MAX_VALUE;

        let numberArray: number[] = input;

        let moveQueue: IMove[] = [
            {position: 0, jumpCount: 0}
        ];

        while (moveQueue.length > 0) {

            let currMove = moveQueue.shift();
            if (currMove) {

                if (currMove.position === numberArray.length - 1) {

                    if (currMove.jumpCount < leastJumps) {
                        leastJumps = currMove.jumpCount;
                        this.debugPrint(`Made it to the end in ${leastJumps} jumps!`);
                    }
                    //console.log(`ArrayJumpingGame2 we made it to the end in ${currMove.jumpCount} jumps!`);

                } else {
                    let jumpLength = numberArray[currMove.position];

                    for (let i = 1; i < jumpLength + 1; i++) {
                        moveQueue.push({
                            position: currMove.position + i,
                            jumpCount: currMove.jumpCount + 1
                        });
                    }
                }

            } else {
                throw new Error(`Queue was empty when it shouldn't have been!`);
            }
            //this.debugPrint(`ArrayJumpingGame2`, moveQueue);
        }


        return leastJumps;

    }

}


interface IMove {
    jumpCount: number
    position: number,
}

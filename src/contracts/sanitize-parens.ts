import {BaseSolver} from '/contracts/template-solver';
import {CodingContractType} from '/lib/consts';

export class SanitizeParens extends BaseSolver {

    /**
     Given the following string:

     (aaa()()()(())a()))a

     remove the minimum number of invalid parentheses in order to validate the string.
     If there are multiple minimal ways to validate the string, provide all of the possible results.
     The answer should be provided as an array of strings.
     If it is impossible to validate the string the result should be an array with only an empty string.

     IMPORTANT: The string may contain letters, not just parentheses. Examples:
     "()())()" -> [()()(), (())()]
     "(a)())()" -> [(a)()(), (a())()]
     ")(" -> [""]
     */

    public type: CodingContractType = CodingContractType.sanitizeParens;


    public solve(input: string): string[] | number {
        let answerArray: string[] = [];


        let result = this.validate(input);

        if (result.isValid) {
            this.debugPrint(`input is already valid!`, input);

        } else {
            if (result.counter === 0) {
                this.debugPrint(`Correct number of parens, but invalid!`);
                answerArray = [''];
            } else {

                let extraParenType = '';
                let stringIndexStart = 0;
                if (result.counter > 0) {
                    extraParenType = '(';
                    stringIndexStart = 1; //you can't remove the first open paren (??)

                } else if (result.counter < 0) {
                    extraParenType = ')';

                }
                let numToRemove = Math.abs(result.counter);

                this.debugPrint(`${numToRemove} too many ${extraParenType}!`);
                //remove 'counter' number of 'extraParenType'


                for (let removeCount = 0; removeCount < numToRemove; removeCount++) {
                    //this.ns.print('removeCount', removeCount);
                    while (stringIndexStart < input.length) {
                        let parenToRemoveIndex = input.indexOf(extraParenType, stringIndexStart);
                        if (parenToRemoveIndex > -1) {

                            let newParenString = input.substring(0, parenToRemoveIndex) + input.substring(parenToRemoveIndex + 1);


                            if (this.validate(newParenString)) {
                                if (!answerArray.some(a => a.localeCompare(newParenString) === 0)) {
                                    answerArray.push(newParenString);
                                    //this.ns.print(`adding ${newParenString}`);
                                    //this.ns.print(`answerArray:`, answerArray);

                                } else {
                                    //this.ns.print(`${newParenString} already existed!`);
                                }
                            }
                        }

                        stringIndexStart++;
                    }
                }

            }
        }


        /*
        (()))()a(((
        
        2 too many (
        
        (()))()a(((
        
        
        
         */



        return answerArray;
    }

    private validate(parenString: string): { isValid: boolean, counter: number } {
        let valid = true;

        let counter = 0;
        for (let i = 0; i < parenString.length; i++) {
            if (parenString[i] === '(') {
                counter++;
            } else if (parenString[i] === ')') {
                counter--;
            }
            if (valid && counter < 0) {
                valid = false;
            }
        }
        return {counter: counter, isValid: valid};
    }


    public runTests(): boolean {
        let pass = true;

        pass = pass && this.solve('(aaa(()()(())a()))a') === [
            '(aaa()()()(())a())a',
            '(aaa()()()(()a()))a',
            '(aaa()()((())a()))a',
            '(aaa()(()(())a()))a',
            '(aaa(()()(())a()))a'
        ];


        return pass;

    }

}

import { random } from 'lodash';

export default class Utils {
    static genRandomNumber = (min: number, max: number) => random(min, max)
}


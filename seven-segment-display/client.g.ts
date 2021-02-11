namespace modules {
    /**
     * A 7-segment numeric display, with one or more digits.
     **/
    //% fixedInstances blockGap=8
    export class SevenSegmentDisplayClient extends jacdac.Client {

            private readonly _brightness : jacdac.RegisterClient<[number]>;
            private readonly _digits : jacdac.RegisterClient<[Buffer]>;            

            constructor(role: string) {
            super(jacdac.SRV_SEVEN_SEGMENT_DISPLAY, role);

            this._brightness = this.addRegister<[number]>(jacdac.SevenSegmentDisplayReg.Brightness, "u0.16");
            this._digits = this.addRegister<[Buffer]>(jacdac.SevenSegmentDisplayReg.Digits, "b");            
        }
    

        /**
        * Controls the brightness of the LEDs. ``0`` means off.
        */
        //% group="7-segment display" blockSetVariable=myModule
        //% blockCombine block="brightness" callInDebugger
        get brightness(): number {            
            const values = this._brightness.pauseUntilValues() as any[];
            return values[0];
        }
        /**
        * Controls the brightness of the LEDs. ``0`` means off.
        */
        //% group="7-segment display" blockSetVariable=myModule
        //% blockCombine block="brightness" callInDebugger
        set brightness(value: number) {
            const values = this._brightness.values as any[];
            values[0] = value;
            this._brightness.values = values as [number];
        }
        /**
        * Each byte encodes the display status of a digit using, 
        * where bit 0 encodes segment `A`, bit 1 encodes segments `B`, ..., bit 6 encodes segments `G`, and bit 7 encodes the decimal point (if present).
        * If incoming ``digits`` data is smaller than `digit_count`, the remaining digits will be cleared.
        * Thus, sending an empty ``digits`` payload clears the screen.
        * 
        * ```text
        *  - A -
        *  G   B
        *  |   |
        *  - F -
        *  |   |   -
        *  E   C  |DP|
        *  - D -   -
        * ```
        */
        //% group="7-segment display" blockSetVariable=myModule
        //% blockCombine block="digits" callInDebugger
        get digits(): Buffer {            
            const values = this._digits.pauseUntilValues() as any[];
            return values[0];
        }
        /**
        * Each byte encodes the display status of a digit using, 
        * where bit 0 encodes segment `A`, bit 1 encodes segments `B`, ..., bit 6 encodes segments `G`, and bit 7 encodes the decimal point (if present).
        * If incoming ``digits`` data is smaller than `digit_count`, the remaining digits will be cleared.
        * Thus, sending an empty ``digits`` payload clears the screen.
        * 
        * ```text
        *  - A -
        *  G   B
        *  |   |
        *  - F -
        *  |   |   -
        *  E   C  |DP|
        *  - D -   -
        * ```
        */
        //% group="7-segment display" blockSetVariable=myModule
        //% blockCombine block="digits" callInDebugger
        set digits(value: Buffer) {
            const values = this._digits.values as any[];
            values[0] = value;
            this._digits.values = values as [Buffer];
        } 

    }
    //% fixedInstance whenUsed
    export const sevenSegmentDisplay = new SevenSegmentDisplayClient("seven Segment Display");
}
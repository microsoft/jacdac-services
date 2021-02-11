namespace modules {
    /**
     * A client of multiple buttons
     */
    //% fixedInstances
    //% blockGap=8
    export class MultiTouchClient extends jacdac.SensorClient<number[]> {
        constructor(role: string) {
            super(jacdac.SRV_MULTITOUCH, role, "i32[]");
        }

        /**
         * Reads the current capacitance
         */
        //% blockId=jdmultitouchvalue block="%multiTouch value at $index"
        //% group="Touch"
        value(index: number): number {
            const values = this.values();
            const value = values[index >> 0];
            return value != null ? value : -1;
        }

        /**
         * Runs code when an event happens on the sensor
         * @param gesture 
         * @param handler 
         */
        //% blockId=jdmulittouchevent block="on %multiTouch $event at"
        //% group="Touch"
        onEvent(event: jacdac.MultitouchEvent, handler: (index: number) => void) {
            this.registerHandler(event, handler);
        }
    }

    //% fixedInstance whenUsed
    export const multiTouch = new MultiTouchClient("multitouch");
}

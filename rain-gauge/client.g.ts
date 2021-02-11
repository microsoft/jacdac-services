namespace modules {
    /**
     * Measures the amount of liquid precipitation over an area in a predefined period of time.
     **/
    //% fixedInstances blockGap=8
    export class RainGaugeClient extends jacdac.SensorClient<[number]> {
            

            constructor(role: string) {
            super(jacdac.SRV_RAIN_GAUGE, role, "u16.16");
            
        }
    

        /**
        * Total precipitation recorded so far.
        */
        //% group="Rain gauge" blockSetVariable=myModule
        //% blockCombine block="precipitation" callInDebugger
        get precipitation(): number {
            this._reading.pauseUntilValues();
            const values = this._reading.values as any[];
            return values[0];
        } 

    }
    //% fixedInstance whenUsed
    export const rainGauge = new RainGaugeClient("rain Gauge");
}
namespace modules {
    /**
     * A sensor that measures wind speed.
     **/
    //% fixedInstances blockGap=8
    export class WindSpeedClient extends jacdac.SensorClient<[number]> {
            

            constructor(role: string) {
            super(jacdac.SRV_WIND_SPEED, role, "u16.16");
            
        }
    

        /**
        * The velocity of the wind.
        */
        //% group="Wind speed" blockSetVariable=myModule
        //% blockCombine block="wind speed" callInDebugger
        get windSpeed(): number {
            this._reading.pauseUntilValues();
            const values = this._reading.values as any[];
            return values[0];
        } 

    }
    //% fixedInstance whenUsed
    export const windSpeed = new WindSpeedClient("wind Speed");
}
namespace modules {
    /**
     * A slider or rotary potentiometer.
     **/
    //% fixedInstances blockGap=8
    export class PotentiometerClient extends jacdac.SensorClient<[number]> {
            

            constructor(role: string) {
            super(jacdac.SRV_POTENTIOMETER, role, "u0.16");
            
        }
    

        /**
        * The relative position of the slider between `0` and `1`.
        */
        //% group="Potentiometer" blockSetVariable=myModule
        //% blockCombine block="position" callInDebugger
        get position(): number {
            this.setStreaming(true);            
            const values = this._reading.pauseUntilValues() as any[];
            return values[0];
        } 

    }
    //% fixedInstance whenUsed
    export const potentiometer = new PotentiometerClient("potentiometer");
}
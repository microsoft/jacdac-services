namespace modules {
    /**
     * A sensor that determines the distance of an object without any physical contact involved.
     **/
    //% fixedInstances blockGap=8
    export class DistanceClient extends jacdac.SensorClient<[number]> {
            

            constructor(role: string) {
            super(jacdac.SRV_DISTANCE, role, "u16.16");
            
        }
    

        /**
        * Current distance from the object
        */
        //% group="Distance" blockSetVariable=myModule
        //% blockCombine block="distance" callInDebugger
        get distance(): number {
            this._reading.pauseUntilValues();
            const values = this._reading.values as any[];
            return values[0];
        } 

    }
    //% fixedInstance whenUsed
    export const distance = new DistanceClient("distance");
}
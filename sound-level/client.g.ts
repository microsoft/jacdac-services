namespace modules {
    /**
     * A sound level detector sensor, gives a relative indication of the sound level.
     **/
    //% fixedInstances blockGap=8
    export class SoundLevelClient extends jacdac.SensorClient<[number]> {
            

            constructor(role: string) {
            super(jacdac.SRV_SOUND_LEVEL, role, "u0.16");
            
        }
    

        /**
        * The sound level detected by the microphone
        */
        //% group="Sound level" blockSetVariable=myModule
        //% blockCombine block="sound level" callInDebugger
        get soundLevel(): number {
            this._reading.pauseUntilValues();
            const values = this._reading.values as any[];
            return values[0];
        } 

        /**
         * Raised when a loud sound is detected
         */
        //% blockId=jacdac_on_soundlevel_loud
        //% block="loud" blockSetVariable=myModule
        //% group="Sound level"
        onLoud(handler: () => void) {
            this.registerEvent(jacdac.SoundLevelEvent.Loud, handler);
        }
        /**
         * Raised when a period of quietness is detected
         */
        //% blockId=jacdac_on_soundlevel_quiet
        //% block="quiet" blockSetVariable=myModule
        //% group="Sound level"
        onQuiet(handler: () => void) {
            this.registerEvent(jacdac.SoundLevelEvent.Quiet, handler);
        }
    }
    //% fixedInstance whenUsed
    export const soundLevel = new SoundLevelClient("sound Level");
}
namespace modules {
    //% fixedInstances
    //% blockGap=8
    export class MicrophoneClient extends jacdac.SensorClient {
        constructor(requiredDevice: string = null) {
            super("mic", jacdac.SRV_MICROPHONE, requiredDevice);
        }

        /**
         * Reads the microphone level between 0 (silent) and 255 (loud)
         */
        //% blockId=jacdacmicrophonevent block="%microphone sound level"
        //% group="Microphone"
        get soundLevel(): number {
            const s = this.state;
            if (!s || s.length < 1) return 0;
            return s.getNumber(NumberFormat.UInt8LE, 0);
        }
    }

    //% fixedInstance whenUsed
    export const microphone = new MicrophoneClient();
}
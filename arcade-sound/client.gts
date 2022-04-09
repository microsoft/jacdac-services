namespace modules {
    /**
     * A sound playing device.
     * 
     * This is typically run over an SPI connection, not regular single-wire Jacdac.
     **/
    //% fixedInstances blockGap=8
    export class ArcadeSoundClient extends jacdac.Client {

        private readonly _sampleRate : jacdac.RegisterClient<[number]>;
        private readonly _bufferSize : jacdac.RegisterClient<[number]>;
        private readonly _bufferPending : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_ARCADE_SOUND, role);

            this._sampleRate = this.addRegister<[number]>(jacdac.ArcadeSoundReg.SampleRate, jacdac.ArcadeSoundRegPack.SampleRate);
            this._bufferSize = this.addRegister<[number]>(jacdac.ArcadeSoundReg.BufferSize, jacdac.ArcadeSoundRegPack.BufferSize);
            this._bufferPending = this.addRegister<[number]>(jacdac.ArcadeSoundReg.BufferPending, jacdac.ArcadeSoundRegPack.BufferPending);            
        }
    

        /**
        * Get or set playback sample rate (in samples per second).
        * If you set it, read it back, as the value may be rounded up or down.
        */
        //% callInDebugger
        //% group="Arcade Sound"
        //% weight=100
        sampleRate(): number {
            this.start();            
            const values = this._sampleRate.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * Get or set playback sample rate (in samples per second).
        * If you set it, read it back, as the value may be rounded up or down.
        */
        //% group="Arcade Sound"
        //% weight=99
        //% value.defl=44100
        setSampleRate(value: number) {
            this.start();
            const values = this._sampleRate.values as any[];
            values[0] = value;
            this._sampleRate.values = values as [number];
        }

        /**
        * The size of the internal audio buffer.
        */
        //% callInDebugger
        //% group="Arcade Sound"
        //% weight=98
        bufferSize(): number {
            this.start();            
            const values = this._bufferSize.pauseUntilValues() as any[];
            return values[0];
        }

        /**
        * How much data is still left in the buffer to play.
        * Clients should not send more data than `buffer_size - buffer_pending`,
        * but can keep the `buffer_pending` as low as they want to ensure low latency
        * of audio playback.
        */
        //% callInDebugger
        //% group="Arcade Sound"
        //% weight=97
        bufferPending(): number {
            this.start();            
            const values = this._bufferPending.pauseUntilValues() as any[];
            return values[0];
        }


        /**
        * Play samples, which are single channel, signed 16-bit little endian values.
        */
        //% group="Arcade Sound"
        //% blockId=jacdac_arcadesound_play_cmd
        //% block="%arcadesound play $samples"
        //% weight=96
        play(samples: Buffer): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.ArcadeSoundCmd.Play, "b", [samples]))
        }
    
    }
    //% fixedInstance whenUsed weight=1 block="arcade sound1"
    export const arcadeSound1 = new ArcadeSoundClient("arcade Sound1");
}
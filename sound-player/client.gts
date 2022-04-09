namespace modules {
    /**
     * A device that can play various sounds stored locally. This service is typically paired with a ``storage`` service for storing sounds.
     **/
    //% fixedInstances blockGap=8
    export class SoundPlayerClient extends jacdac.Client {

        private readonly _volume : jacdac.RegisterClient<[number]>;            

        constructor(role: string) {
            super(jacdac.SRV_SOUND_PLAYER, role)

            this._volume = this.addRegister<[number]>(jacdac.SoundPlayerReg.Volume, jacdac.SoundPlayerRegPack.Volume)            
        }
    

        /**
        * Global volume of the output. ``0`` means completely off. This volume is mixed with each play volumes.
        */
        //% callInDebugger
        //% group="Sound"
        //% block="%soundplayer volume"
        //% blockId=jacdac_soundplayer_volume___get
        //% weight=100
        volume(): number {
            this.start();            
            const values = this._volume.pauseUntilValues() as any[];
            return values[0] * 100;
        }

        /**
        * Global volume of the output. ``0`` means completely off. This volume is mixed with each play volumes.
        */
        //% group="Sound"
        //% blockId=jacdac_soundplayer_volume___set
        //% block="set %soundplayer volume to %value"
        //% weight=99
        //% value.min=0
        //% value.max=100
        //% value.defl=100
        setVolume(value: number) {
            this.start();
            const values = this._volume.values as any[];
            values[0] = value / 100;
            this._volume.values = values as [number];
        }


        /**
        * Starts playing a sound.
        */
        //% group="Sound"
        //% blockId=jacdac_soundplayer_play_cmd
        //% block="%soundplayer play $name"
        //% weight=98
        play(name: string): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.jdpacked(jacdac.SoundPlayerCmd.Play, "s", [name]))
        }

        /**
        * Cancel any sound playing.
        */
        //% group="Sound"
        //% blockId=jacdac_soundplayer_cancel_cmd
        //% block="%soundplayer cancel"
        //% weight=97
        cancel(): void {
            this.start();
            this.sendCommand(jacdac.JDPacket.onlyHeader(jacdac.SoundPlayerCmd.Cancel))
        }
    
    }
    //% fixedInstance whenUsed weight=1 block="sound player1"
    export const soundPlayer1 = new SoundPlayerClient("sound Player1");
}